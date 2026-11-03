import { Router } from "express";
import { authenticate, requirePermission } from "../auth/auth.js";
import type { AuthenticatedRequest } from "../auth/types.js";
import { pool } from "../db/pool.js";

const router = Router();
router.use(authenticate);
const validDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

const apartmentInScope = `EXISTS (
  SELECT 1 FROM apartments a JOIN floors f ON f.id = a.floor_id
  JOIN blocks bl ON bl.id = f.block_id JOIN buildings b ON b.id = bl.building_id
  JOIN user_role_assignments s ON s.user_id = $1 JOIN roles r ON r.id = s.role_id
  WHERE a.id = $2 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
)`;

async function findOrCreatePerson(client: import("pg").PoolClient, input: Record<string, unknown>) {
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" && input.email.trim() ? input.email.trim().toLowerCase() : null;
  const phone = typeof input.phone === "string" && input.phone.trim() ? input.phone.trim() : null;
  if (!fullName) throw new Error("VALIDATION: fullName is required.");
  if (email) {
    const existing = await client.query("SELECT id FROM people WHERE lower(email) = $1", [email]);
    if (existing.rowCount) return existing.rows[0].id as string;
  }
  const created = await client.query(
    "INSERT INTO people (full_name, email, phone) VALUES ($1, $2, $3) RETURNING id",
    [fullName, email, phone],
  );
  return created.rows[0].id as string;
}

router.get("/apartments/:apartmentId/owners", requirePermission("people:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const rows = await pool.query(
    `SELECT o.id, o.person_id, p.full_name, p.email, p.phone, o.ownership_percent, o.valid_from, o.valid_to
     FROM apartment_ownerships o JOIN people p ON p.id = o.person_id
     WHERE o.apartment_id = $2 AND ${apartmentInScope} ORDER BY o.valid_from DESC`,
    [userId, request.params.apartmentId],
  );
  response.json({ success: true, data: { owners: rows.rows } });
});

router.post("/apartments/:apartmentId/owners", requirePermission("people:manage"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const { fullName, email, phone, ownershipPercent = 100, validFrom } = request.body ?? {};
  const percentage = Number(ownershipPercent);
  if (typeof fullName !== "string" || !fullName.trim() || !Number.isFinite(percentage) || percentage <= 0 || percentage > 100 || !validDate(validFrom)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "fullName, validFrom, and ownershipPercent (0-100] are required." } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const apartment = await client.query(`SELECT id FROM apartments WHERE id = $2 AND ${apartmentInScope} FOR UPDATE`, [userId, request.params.apartmentId]);
    if (!apartment.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ success: false, error: { code: "APARTMENT_NOT_FOUND", message: "Apartment not found in your assigned scope." } });
      return;
    }
    const active = await client.query(
      "SELECT COALESCE(sum(ownership_percent), 0) AS total FROM apartment_ownerships WHERE apartment_id = $1 AND valid_to IS NULL",
      [request.params.apartmentId],
    );
    if (Number(active.rows[0].total) + percentage > 100) {
      await client.query("ROLLBACK");
      response.status(409).json({ success: false, error: { code: "OWNERSHIP_PERCENT_EXCEEDED", message: "Active ownership shares cannot exceed 100%." } });
      return;
    }
    const personId = await findOrCreatePerson(client, { fullName, email, phone });
    const created = await client.query(
      `INSERT INTO apartment_ownerships (apartment_id, person_id, ownership_percent, valid_from)
       VALUES ($1, $2, $3, $4) RETURNING id, apartment_id, person_id, ownership_percent, valid_from, valid_to`,
      [request.params.apartmentId, personId, percentage, validFrom],
    );
    await client.query("COMMIT");
    response.status(201).json({ success: true, data: { ownership: created.rows[0] } });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && error.message.startsWith("VALIDATION:")) {
      response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: error.message.slice(11) } });
      return;
    }
    throw error;
  } finally {
    client.release();
  }
});

router.get("/apartments/:apartmentId/residents", requirePermission("people:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const rows = await pool.query(
    `SELECT r.id, r.person_id, p.full_name, p.email, p.phone, r.relationship, r.can_view_bills, r.can_pay_bills, r.valid_from, r.valid_to
     FROM apartment_residencies r JOIN people p ON p.id = r.person_id
     WHERE r.apartment_id = $2 AND ${apartmentInScope} ORDER BY r.valid_from DESC`,
    [userId, request.params.apartmentId],
  );
  response.json({ success: true, data: { residents: rows.rows } });
});

router.post("/apartments/:apartmentId/residents", requirePermission("people:manage"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const { fullName, email, phone, relationship = "TENANT", canViewBills = false, canPayBills = false, validFrom } = request.body ?? {};
  if (typeof fullName !== "string" || !fullName.trim() || !validDate(validFrom) || !["OWNER", "TENANT", "FAMILY", "OTHER"].includes(relationship)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "fullName, validFrom, and a supported relationship are required." } });
    return;
  }
  if (typeof canViewBills !== "boolean" || typeof canPayBills !== "boolean" || (canPayBills && !canViewBills)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Bill permissions must be boolean; payment permission requires bill visibility." } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const apartment = await client.query(`SELECT id FROM apartments WHERE id = $2 AND ${apartmentInScope} FOR UPDATE`, [userId, request.params.apartmentId]);
    if (!apartment.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ success: false, error: { code: "APARTMENT_NOT_FOUND", message: "Apartment not found in your assigned scope." } });
      return;
    }
    const personId = await findOrCreatePerson(client, { fullName, email, phone });
    const created = await client.query(
      `INSERT INTO apartment_residencies (apartment_id, person_id, relationship, can_view_bills, can_pay_bills, valid_from)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, apartment_id, person_id, relationship, can_view_bills, can_pay_bills, valid_from, valid_to`,
      [request.params.apartmentId, personId, relationship, canViewBills, canPayBills, validFrom],
    );
    await client.query("COMMIT");
    response.status(201).json({ success: true, data: { residency: created.rows[0] } });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && error.message.startsWith("VALIDATION:")) {
      response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: error.message.slice(11) } });
      return;
    }
    throw error;
  } finally {
    client.release();
  }
});

router.post("/apartments/:apartmentId/owners/:ownershipId/end", requirePermission("people:manage"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const ended = await pool.query(
    `UPDATE apartment_ownerships o SET valid_to = CURRENT_DATE
     WHERE o.id = $3 AND o.apartment_id = $2 AND o.valid_to IS NULL AND ${apartmentInScope}
     RETURNING o.id, o.valid_from, o.valid_to`,
    [userId, request.params.apartmentId, request.params.ownershipId],
  );
  if (!ended.rowCount) {
    response.status(404).json({ success: false, error: { code: "OWNERSHIP_NOT_FOUND", message: "Active ownership was not found in your scope." } });
    return;
  }
  response.json({ success: true, data: { ownership: ended.rows[0] } });
});

router.post("/apartments/:apartmentId/residents/:residencyId/end", requirePermission("people:manage"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const ended = await pool.query(
    `UPDATE apartment_residencies r SET valid_to = CURRENT_DATE
     WHERE r.id = $3 AND r.apartment_id = $2 AND r.valid_to IS NULL AND ${apartmentInScope}
     RETURNING r.id, r.valid_from, r.valid_to`,
    [userId, request.params.apartmentId, request.params.residencyId],
  );
  if (!ended.rowCount) {
    response.status(404).json({ success: false, error: { code: "RESIDENCY_NOT_FOUND", message: "Active residency was not found in your scope." } });
    return;
  }
  response.json({ success: true, data: { residency: ended.rows[0] } });
});

export default router;
