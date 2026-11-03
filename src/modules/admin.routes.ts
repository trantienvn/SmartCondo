import { Router } from "express";
import bcrypt from "bcryptjs";
import { authenticate, requirePermission } from "../auth/auth.js";
import type { AuthenticatedRequest } from "../auth/types.js";
import { pool } from "../db/pool.js";

const router = Router();
router.use(authenticate);

router.post("/organizations", requirePermission("organization:manage"), async (request, response) => {
  const current = (request as AuthenticatedRequest).auth!;
  if (!current.scopes.some((scope) => scope.role === "SUPER_ADMIN")) {
    response.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only a system administrator can create an organization." } });
    return;
  }
  const { code, name, address, email, phone } = request.body ?? {};
  if (![code, name].every((value) => typeof value === "string" && value.trim())) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "code and name are required." } });
    return;
  }
  const created = await pool.query(
    `INSERT INTO organizations (code, name, address, email, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, code, name, address, email, phone, status, created_at, updated_at`,
    [code.trim(), name.trim(), address ?? null, email ?? null, phone ?? null],
  );
  response.status(201).json({ success: true, data: { organization: created.rows[0] } });
});

router.get("/users", requirePermission("user:manage"), async (request, response) => {
  const current = (request as AuthenticatedRequest).auth!;
  const users = await pool.query(
    `SELECT DISTINCT u.id, u.email, u.status, p.full_name, u.created_at,
            r.code AS role, ura.organization_id, ura.building_id
     FROM users u LEFT JOIN people p ON p.id = u.person_id
     JOIN user_role_assignments ura ON ura.user_id = u.id
     JOIN roles r ON r.id = ura.role_id
     WHERE EXISTS (
       SELECT 1 FROM user_role_assignments actor_scope
       JOIN roles actor_role ON actor_role.id = actor_scope.role_id
       WHERE actor_scope.user_id = $1 AND (
         actor_role.code = 'SUPER_ADMIN'
         OR (actor_scope.organization_id IS NOT NULL AND actor_scope.organization_id = ura.organization_id)
         OR (actor_scope.building_id IS NOT NULL AND actor_scope.building_id = ura.building_id)
         OR EXISTS (
           SELECT 1 FROM apartment_ownerships o JOIN apartments a ON a.id = o.apartment_id
           JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id JOIN buildings b ON b.id = bl.building_id
           WHERE o.person_id = u.person_id AND o.valid_from <= CURRENT_DATE AND (o.valid_to IS NULL OR o.valid_to >= CURRENT_DATE)
             AND (actor_role.code = 'SUPER_ADMIN' OR actor_scope.organization_id = b.organization_id OR actor_scope.building_id = b.id)
         )
         OR EXISTS (
           SELECT 1 FROM apartment_residencies ar JOIN apartments a ON a.id = ar.apartment_id
           JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id JOIN buildings b ON b.id = bl.building_id
           WHERE ar.person_id = u.person_id AND ar.valid_from <= CURRENT_DATE AND (ar.valid_to IS NULL OR ar.valid_to >= CURRENT_DATE)
             AND (actor_role.code = 'SUPER_ADMIN' OR actor_scope.organization_id = b.organization_id OR actor_scope.building_id = b.id)
         )
       )
     ) ORDER BY u.created_at DESC`,
    [current.userId],
  );
  response.json({ success: true, data: { users: users.rows } });
});

router.post("/users", requirePermission("user:manage"), async (request, response) => {
  const current = (request as AuthenticatedRequest).auth!;
  const { email, password, fullName, phone, roleCode, organizationId, buildingId } = request.body ?? {};
  if (![email, password, fullName, roleCode].every((value) => typeof value === "string" && value.trim())) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "email, password, fullName, and roleCode are required." } });
    return;
  }
  if (password.length < 12 || bcrypt.truncates(password)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Password must be between 12 and 72 characters." } });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "email is invalid." } });
    return;
  }
  const isSuperAdmin = current.scopes.some((scope) => scope.role === "SUPER_ADMIN");
  if (["SUPER_ADMIN", "ORG_ADMIN"].includes(roleCode) && !isSuperAdmin) {
    response.status(403).json({ success: false, error: { code: "ROLE_ASSIGNMENT_FORBIDDEN", message: "Only a system administrator can assign administrative roles." } });
    return;
  }

  const roleResult = await pool.query("SELECT id FROM roles WHERE code = $1", [roleCode]);
  if (!roleResult.rowCount) {
    response.status(400).json({ success: false, error: { code: "UNKNOWN_ROLE", message: "roleCode is not recognized." } });
    return;
  }
  const roleId = roleResult.rows[0].id as string;
  const residentRole = ["OWNER", "RESIDENT"].includes(roleCode);
  if (!residentRole && !organizationId && !buildingId && roleCode !== "SUPER_ADMIN") {
    response.status(400).json({ success: false, error: { code: "SCOPE_REQUIRED", message: "Staff accounts need an organization or building scope." } });
    return;
  }
  if (buildingId) {
    const permittedBuilding = await pool.query(
      `SELECT b.organization_id FROM buildings b WHERE b.id = $1 AND EXISTS (
         SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
         WHERE s.user_id = $2 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
       )`,
      [buildingId, current.userId],
    );
    if (!permittedBuilding.rowCount) {
      response.status(403).json({ success: false, error: { code: "SCOPE_FORBIDDEN", message: "Building is outside your assigned scope." } });
      return;
    }
    if (organizationId && organizationId !== permittedBuilding.rows[0].organization_id) {
      response.status(400).json({ success: false, error: { code: "SCOPE_MISMATCH", message: "organizationId does not match buildingId." } });
      return;
    }
  } else if (organizationId && !isSuperAdmin) {
    const permittedOrganization = await pool.query(
      `SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
       WHERE s.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = $2)`,
      [current.userId, organizationId],
    );
    if (!permittedOrganization.rowCount) {
      response.status(403).json({ success: false, error: { code: "SCOPE_FORBIDDEN", message: "Organization is outside your assigned scope." } });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existingPerson = await client.query("SELECT id FROM people WHERE lower(email) = $1", [email.trim().toLowerCase()]);
    const personId = existingPerson.rowCount
      ? existingPerson.rows[0].id
      : (await client.query(
          `INSERT INTO people (full_name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
          [fullName.trim(), email.trim().toLowerCase(), phone ?? null],
        )).rows[0].id;
    const hash = await bcrypt.hash(password, 12);
    const user = await client.query(
      `INSERT INTO users (person_id, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, email, status, created_at`,
      [personId, email.trim().toLowerCase(), hash],
    );
    const resolvedOrganizationId = organizationId ?? (buildingId ? (await client.query("SELECT organization_id FROM buildings WHERE id = $1", [buildingId])).rows[0]?.organization_id : null);
    await client.query(
      `INSERT INTO user_role_assignments (user_id, role_id, organization_id, building_id)
       VALUES ($1, $2, $3, $4)`,
      [user.rows[0].id, roleId, residentRole ? null : resolvedOrganizationId, residentRole ? null : (buildingId ?? null)],
    );
    await client.query("COMMIT");
    response.status(201).json({ success: true, data: { user: { ...user.rows[0], fullName: fullName.trim(), role: roleCode, organizationId: residentRole ? null : resolvedOrganizationId, buildingId: residentRole ? null : (buildingId ?? null) } } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.patch("/users/:id/status", requirePermission("user:manage"), async (request, response) => {
  const { status } = request.body ?? {};
  if (!(["ACTIVE", "LOCKED", "DISABLED"] as unknown[]).includes(status)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "status must be ACTIVE, LOCKED, or DISABLED." } });
    return;
  }
  const updated = await pool.query(
    `UPDATE users u SET status = $2, updated_at = now()
     WHERE u.id = $1 AND EXISTS (
       SELECT 1 FROM user_role_assignments target WHERE target.user_id = u.id AND EXISTS (
         SELECT 1 FROM user_role_assignments actor JOIN roles r ON r.id = actor.role_id
         WHERE actor.user_id = $3 AND (r.code = 'SUPER_ADMIN' OR actor.organization_id = target.organization_id OR actor.building_id = target.building_id)
       ) OR EXISTS (
         SELECT 1 FROM user_role_assignments actor JOIN roles actor_role ON actor_role.id = actor.role_id
         JOIN apartment_ownerships o ON o.person_id = u.person_id
         JOIN apartments a ON a.id = o.apartment_id JOIN floors f ON f.id = a.floor_id
         JOIN blocks bl ON bl.id = f.block_id JOIN buildings b ON b.id = bl.building_id
         WHERE actor.user_id = $3 AND o.valid_from <= CURRENT_DATE AND (o.valid_to IS NULL OR o.valid_to >= CURRENT_DATE)
           AND (actor_role.code = 'SUPER_ADMIN' OR actor.organization_id = b.organization_id OR actor.building_id = b.id)
       ) OR EXISTS (
         SELECT 1 FROM user_role_assignments actor JOIN roles actor_role ON actor_role.id = actor.role_id
         JOIN apartment_residencies ar ON ar.person_id = u.person_id
         JOIN apartments a ON a.id = ar.apartment_id JOIN floors f ON f.id = a.floor_id
         JOIN blocks bl ON bl.id = f.block_id JOIN buildings b ON b.id = bl.building_id
         WHERE actor.user_id = $3 AND ar.valid_from <= CURRENT_DATE AND (ar.valid_to IS NULL OR ar.valid_to >= CURRENT_DATE)
           AND (actor_role.code = 'SUPER_ADMIN' OR actor.organization_id = b.organization_id OR actor.building_id = b.id)
       )
     ) RETURNING u.id, u.email, u.status, u.updated_at`,
    [request.params.id, status, (request as AuthenticatedRequest).auth!.userId],
  );
  if (!updated.rowCount) {
    response.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found in your assigned scope." } });
    return;
  }
  response.json({ success: true, data: { user: updated.rows[0] } });
});

export default router;
