import { Router } from "express";
import { authenticate, requirePermission } from "../auth/auth.js";
import type { AuthenticatedRequest } from "../auth/types.js";
import { pool } from "../db/pool.js";

const router = Router();
const auth = (request: AuthenticatedRequest) => request.auth!;
const scoped = (alias: string) => `EXISTS (
  SELECT 1 FROM user_role_assignments scope
  JOIN roles assigned_role ON assigned_role.id = scope.role_id
  WHERE scope.user_id = $1 AND (
    assigned_role.code = 'SUPER_ADMIN'
    OR scope.organization_id = ${alias}.organization_id
    OR scope.building_id = ${alias}.id
  )
)`;

const apartmentRelationshipScope = `(
  EXISTS (SELECT 1 FROM users u JOIN apartment_ownerships o ON o.person_id = u.person_id
    WHERE u.id = $1 AND o.apartment_id = a.id AND o.valid_from <= CURRENT_DATE AND (o.valid_to IS NULL OR o.valid_to >= CURRENT_DATE))
  OR EXISTS (SELECT 1 FROM users u JOIN apartment_residencies r ON r.person_id = u.person_id
    WHERE u.id = $1 AND r.apartment_id = a.id AND r.valid_from <= CURRENT_DATE AND (r.valid_to IS NULL OR r.valid_to >= CURRENT_DATE))
)`;

router.use(authenticate);

router.get("/organizations", requirePermission("organization:read"), async (request, response) => {
  const current = auth(request as AuthenticatedRequest);
  const result = await pool.query(
    `SELECT o.id, o.code, o.name, o.address, o.email, o.phone, o.status, o.created_at, o.updated_at
     FROM organizations o WHERE EXISTS (
       SELECT 1 FROM user_role_assignments scope JOIN roles r ON r.id = scope.role_id
       WHERE scope.user_id = $1 AND (
         r.code = 'SUPER_ADMIN' OR scope.organization_id = o.id OR
         EXISTS (SELECT 1 FROM buildings assigned_building WHERE assigned_building.id = scope.building_id AND assigned_building.organization_id = o.id)
       )
     ) ORDER BY o.name`,
    [current.userId],
  );
  response.json({ success: true, data: { organizations: result.rows } });
});

router.get("/buildings", requirePermission("building:read"), async (request, response) => {
  const current = auth(request as AuthenticatedRequest);
  const result = await pool.query(
    `SELECT b.id, b.organization_id, b.code, b.name, b.address, b.status, b.created_at, b.updated_at
     FROM buildings b WHERE ${scoped("b")} ORDER BY b.name`,
    [current.userId],
  );
  response.json({ success: true, data: { buildings: result.rows } });
});

router.post("/buildings", requirePermission("building:manage"), async (request, response) => {
  const current = auth(request as AuthenticatedRequest);
  const { organizationId, code, name, address } = request.body ?? {};
  if (![organizationId, code, name].every((value) => typeof value === "string" && value.trim())) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "organizationId, code, and name are required." } });
    return;
  }

  const organizationScope = await pool.query(
    `SELECT 1 FROM user_role_assignments scope JOIN roles r ON r.id = scope.role_id
     WHERE scope.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR scope.organization_id = $2)`,
    [current.userId, organizationId],
  );
  if (!organizationScope.rowCount) {
    response.status(403).json({ success: false, error: { code: "SCOPE_FORBIDDEN", message: "Organization is outside your assigned scope." } });
    return;
  }

  const result = await pool.query(
    `INSERT INTO buildings (organization_id, code, name, address)
     VALUES ($1, $2, $3, $4)
     RETURNING id, organization_id, code, name, address, status, created_at, updated_at`,
    [organizationId, code.trim(), name.trim(), address ?? null],
  );
  response.status(201).json({ success: true, data: { building: result.rows[0] } });
});

router.post("/buildings/:buildingId/blocks", requirePermission("building:manage"), async (request, response) => {
  const userId = auth(request as AuthenticatedRequest).userId;
  const { code, name } = request.body ?? {};
  if (![code, name].every((value) => typeof value === "string" && value.trim())) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "code and name are required." } });
    return;
  }
  const created = await pool.query(
    `INSERT INTO blocks (building_id, code, name)
     SELECT b.id, $3, $4 FROM buildings b WHERE b.id = $2 AND ${scoped("b")}
     RETURNING id, building_id, code, name, created_at`,
    [userId, request.params.buildingId, code.trim(), name.trim()],
  );
  if (!created.rowCount) {
    response.status(404).json({ success: false, error: { code: "BUILDING_NOT_FOUND", message: "Building not found in your assigned scope." } });
    return;
  }
  response.status(201).json({ success: true, data: { block: created.rows[0] } });
});

router.get("/buildings/:buildingId/blocks", requirePermission("building:read"), async (request, response) => {
  const userId = auth(request as AuthenticatedRequest).userId;
  const rows = await pool.query(
    `SELECT bl.id, bl.building_id, bl.code, bl.name,
       COALESCE(jsonb_agg(jsonb_build_object('id', f.id, 'floorNumber', f.floor_number, 'name', f.name)) FILTER (WHERE f.id IS NOT NULL), '[]'::jsonb) AS floors
     FROM blocks bl JOIN buildings b ON b.id = bl.building_id
     LEFT JOIN floors f ON f.block_id = bl.id
     WHERE bl.building_id = $2 AND ${scoped("b")}
     GROUP BY bl.id ORDER BY bl.name`,
    [userId, request.params.buildingId],
  );
  if (!rows.rowCount) {
    const visibleBuilding = await pool.query(`SELECT 1 FROM buildings b WHERE b.id = $2 AND ${scoped("b")}`, [userId, request.params.buildingId]);
    if (!visibleBuilding.rowCount) {
      response.status(404).json({ success: false, error: { code: "BUILDING_NOT_FOUND", message: "Building not found in your assigned scope." } });
      return;
    }
  }
  response.json({ success: true, data: { blocks: rows.rows } });
});

router.post("/blocks/:blockId/floors", requirePermission("building:manage"), async (request, response) => {
  const userId = auth(request as AuthenticatedRequest).userId;
  const floorNumber = Number(request.body?.floorNumber);
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : null;
  if (!Number.isInteger(floorNumber)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "floorNumber must be an integer." } });
    return;
  }
  const created = await pool.query(
    `INSERT INTO floors (block_id, floor_number, name)
     SELECT bl.id, $3, $4 FROM blocks bl JOIN buildings b ON b.id = bl.building_id
     WHERE bl.id = $2 AND ${scoped("b")}
     RETURNING id, block_id, floor_number, name`,
    [userId, request.params.blockId, floorNumber, name],
  );
  if (!created.rowCount) {
    response.status(404).json({ success: false, error: { code: "BLOCK_NOT_FOUND", message: "Block not found in your assigned scope." } });
    return;
  }
  response.status(201).json({ success: true, data: { floor: created.rows[0] } });
});

router.get("/apartments", requirePermission("apartment:read"), async (request, response) => {
  const current = auth(request as AuthenticatedRequest);
  const page = Math.max(1, Number(request.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 25)));
  if (!Number.isInteger(page) || !Number.isInteger(limit)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "page and limit must be integers." } });
    return;
  }
  const result = await pool.query(
    `SELECT a.id, a.floor_id, a.code, a.area_sqm, a.bedroom_count, a.bathroom_count, a.operational_status,
            f.floor_number, bl.id AS block_id, bl.name AS block_name,
            b.id AS building_id, b.name AS building_name, b.organization_id
     FROM apartments a JOIN floors f ON f.id = a.floor_id
     JOIN blocks bl ON bl.id = f.block_id JOIN buildings b ON b.id = bl.building_id
     WHERE (${scoped("b")} OR ${apartmentRelationshipScope}) ORDER BY b.name, bl.name, f.floor_number, a.code
     LIMIT $2 OFFSET $3`,
    [current.userId, limit, (page - 1) * limit],
  );
  response.json({ success: true, data: { apartments: result.rows, page, limit } });
});

router.post("/apartments", requirePermission("apartment:manage"), async (request, response) => {
  const current = auth(request as AuthenticatedRequest);
  const { floorId, code, areaSqm, bedroomCount, bathroomCount } = request.body ?? {};
  if (![floorId, code].every((value) => typeof value === "string" && value.trim())) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "floorId and code are required." } });
    return;
  }
  const result = await pool.query(
    `INSERT INTO apartments (floor_id, code, area_sqm, bedroom_count, bathroom_count)
     SELECT f.id, $3, $4, $5, $6
     FROM floors f JOIN blocks bl ON bl.id = f.block_id
     JOIN buildings b ON b.id = bl.building_id
     WHERE f.id = $2 AND ${scoped("b")}
     RETURNING id, floor_id, code, area_sqm, bedroom_count, bathroom_count, operational_status, created_at`,
    [current.userId, floorId, code.trim(), areaSqm ?? null, bedroomCount ?? null, bathroomCount ?? null],
  );
  if (!result.rowCount) {
    response.status(404).json({ success: false, error: { code: "FLOOR_NOT_FOUND", message: "Floor not found in your assigned scope." } });
    return;
  }
  response.status(201).json({ success: true, data: { apartment: result.rows[0] } });
});

export default router;
