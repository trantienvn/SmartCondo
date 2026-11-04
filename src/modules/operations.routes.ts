import { Router } from "express";
import { authenticate, requirePermission } from "../auth/auth.js";
import type { AuthenticatedRequest } from "../auth/types.js";
import { pool } from "../db/pool.js";
import { writeAudit } from "../db/audit.js";

const router = Router();
router.use(authenticate);

const apartmentAccess = `EXISTS (
  SELECT 1 FROM user_role_assignments s JOIN roles role ON role.id = s.role_id
  JOIN buildings b ON b.id = (
    SELECT bl.building_id FROM floors f JOIN blocks bl ON bl.id = f.block_id
    WHERE f.id = (SELECT a.floor_id FROM apartments a WHERE a.id = $2)
  )
  WHERE s.user_id = $1 AND (role.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
) OR EXISTS (
  SELECT 1 FROM users u JOIN apartment_ownerships o ON o.person_id = u.person_id
  WHERE u.id = $1 AND o.apartment_id = $2 AND o.valid_from <= CURRENT_DATE AND (o.valid_to IS NULL OR o.valid_to >= CURRENT_DATE)
) OR EXISTS (
  SELECT 1 FROM users u JOIN apartment_residencies r ON r.person_id = u.person_id
  WHERE u.id = $1 AND r.apartment_id = $2 AND r.valid_from <= CURRENT_DATE AND (r.valid_to IS NULL OR r.valid_to >= CURRENT_DATE)
)`;

router.get("/maintenance-requests", requirePermission("maintenance:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const rows = await pool.query(
    `SELECT m.id, m.apartment_id, a.code AS apartment_code, m.reported_by, m.title, m.description,
            m.priority, m.status, m.assigned_to, m.completed_at, m.created_at, m.updated_at
     FROM maintenance_requests m JOIN apartments a ON a.id = m.apartment_id
     WHERE ${apartmentAccess.replaceAll("$2", "m.apartment_id")}
     ORDER BY CASE m.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, m.created_at DESC
     LIMIT 200`,
    [userId],
  );
  response.json({ success: true, data: { maintenanceRequests: rows.rows } });
});

router.post("/maintenance-requests", requirePermission("maintenance:submit"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const { apartmentId, title, description, priority = "MEDIUM" } = request.body ?? {};
  if (typeof apartmentId !== "string" || typeof title !== "string" || !title.trim() || typeof description !== "string" || !description.trim() || !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "apartmentId, title, description, and a supported priority are required." } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query(
      `INSERT INTO maintenance_requests (apartment_id, reported_by, title, description, priority)
       SELECT a.id, $1, $3, $4, $5 FROM apartments a WHERE a.id = $2 AND (${apartmentAccess})
       RETURNING id, apartment_id, reported_by, title, description, priority, status, created_at`,
      [userId, apartmentId, title.trim(), description.trim(), priority],
    );
    if (!created.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ success: false, error: { code: "APARTMENT_NOT_FOUND", message: "Apartment not found in your assigned scope." } });
      return;
    }
    await client.query(
      "INSERT INTO maintenance_events (request_id, actor_id, to_status, note) VALUES ($1, $2, 'PENDING', 'Request submitted')",
      [created.rows[0].id, userId],
    );
    await client.query("COMMIT");
    response.status(201).json({ success: true, data: { maintenanceRequest: created.rows[0] } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.patch("/maintenance-requests/:requestId", requirePermission("maintenance:manage"), async (request, response) => {
  const current = (request as AuthenticatedRequest).auth!;
  const operationalRole = current.scopes.some((scope) => ["SUPER_ADMIN", "ORG_ADMIN", "BUILDING_MANAGER", "MANAGEMENT_STAFF", "TECHNICIAN"].includes(scope.role));
  if (!operationalRole) {
    response.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Only management or technical staff can change request status." } });
    return;
  }
  const { status, assignedTo, note } = request.body ?? {};
  if (status != null && !["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Unsupported maintenance status." } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const currentRequest = await client.query(
      `SELECT m.id, m.status, m.apartment_id, bl.building_id FROM maintenance_requests m
       JOIN apartments a ON a.id = m.apartment_id JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id
       WHERE m.id = $2 AND EXISTS (
         SELECT 1 FROM user_role_assignments s JOIN roles role ON role.id = s.role_id
         JOIN buildings b ON b.id = bl.building_id
         WHERE s.user_id = $1 AND (role.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
       ) FOR UPDATE OF m`,
      [current.userId, request.params.requestId],
    );
    if (!currentRequest.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ success: false, error: { code: "REQUEST_NOT_FOUND", message: "Maintenance request not found in your scope." } });
      return;
    }
    const before = currentRequest.rows[0].status as string;
    const after = (status ?? before) as string;
    const allowed: Record<string, string[]> = {
      PENDING: ["PENDING", "IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
      COMPLETED: ["COMPLETED"],
      CANCELLED: ["CANCELLED"],
    };
    if (!allowed[before]?.includes(after)) {
      await client.query("ROLLBACK");
      response.status(409).json({ success: false, error: { code: "INVALID_STATUS_TRANSITION", message: `Cannot change status from ${before} to ${after}.` } });
      return;
    }
    if (assignedTo) {
      const assignee = await client.query(
        `SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
         WHERE s.user_id = $1 AND r.code = 'TECHNICIAN' AND s.building_id = $2`,
        [assignedTo, currentRequest.rows[0].building_id],
      );
      if (!assignee.rowCount) {
        await client.query("ROLLBACK");
        response.status(400).json({ success: false, error: { code: "INVALID_ASSIGNEE", message: "Assignee must be a technician assigned to this building." } });
        return;
      }
    }
    const updated = await client.query(
      `UPDATE maintenance_requests SET status = $2::varchar,
         assigned_to = COALESCE($3, assigned_to),
         completed_at = CASE WHEN $2::varchar = 'COMPLETED' THEN now() ELSE completed_at END,
         updated_at = now() WHERE id = $1
       RETURNING id, apartment_id, title, priority, status, assigned_to, completed_at, updated_at`,
      [currentRequest.rows[0].id, after, assignedTo ?? null],
    );
    if (before !== after || assignedTo) {
      await client.query(
        "INSERT INTO maintenance_events (request_id, actor_id, from_status, to_status, note) VALUES ($1, $2, $3, $4, $5)",
        [currentRequest.rows[0].id, current.userId, before, after, note ?? null],
      );
      await writeAudit(client, { actorId: current.userId, buildingId: currentRequest.rows[0].building_id, action: "maintenance_request.update", resourceType: "maintenance_request", resourceId: currentRequest.rows[0].id, details: { fromStatus: before, toStatus: after, assignedTo: assignedTo ?? null } });
    }
    await client.query("COMMIT");
    response.json({ success: true, data: { maintenanceRequest: updated.rows[0] } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.get("/dashboard/summary", requirePermission("dashboard:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const requestedBuilding = typeof request.query.buildingId === "string" ? request.query.buildingId : null;
  const buildings = await pool.query(
    `SELECT b.id FROM buildings b WHERE ($2::uuid IS NULL OR b.id = $2) AND EXISTS (
       SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
       WHERE s.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
     )`,
    [userId, requestedBuilding],
  );
  if (requestedBuilding && !buildings.rowCount) {
    response.status(404).json({ success: false, error: { code: "BUILDING_NOT_FOUND", message: "Building not found in your assigned scope." } });
    return;
  }
  const buildingIds = buildings.rows.map((row) => row.id as string);
  const [apartmentCounts, invoiceTotals, requestCounts, utilityTotals] = await Promise.all([
    pool.query(
      `SELECT count(DISTINCT a.id)::int AS total,
         count(DISTINCT a.id) FILTER (WHERE EXISTS (
           SELECT 1 FROM apartment_residencies r WHERE r.apartment_id = a.id AND r.valid_from <= CURRENT_DATE AND (r.valid_to IS NULL OR r.valid_to >= CURRENT_DATE)
         ))::int AS occupied
       FROM apartments a JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id
       WHERE bl.building_id = ANY($1::uuid[]) AND a.operational_status <> 'INACTIVE'`,
      [buildingIds],
    ),
    pool.query(
      `SELECT COALESCE(sum(i.total_amount), 0) AS billed,
         COALESCE(sum(COALESCE(i.total_amount, 0) - COALESCE(p.paid, 0)), 0) AS outstanding
       FROM invoices i JOIN apartments a ON a.id = i.apartment_id JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id
       LEFT JOIN (SELECT invoice_id, sum(amount) AS paid FROM payments WHERE status = 'RECORDED' GROUP BY invoice_id) p ON p.invoice_id = i.id
       WHERE bl.building_id = ANY($1::uuid[]) AND i.status <> 'VOID'`,
      [buildingIds],
    ),
    pool.query(
      `SELECT count(*) FILTER (WHERE m.status IN ('PENDING', 'IN_PROGRESS'))::int AS open,
         count(*) FILTER (WHERE m.status = 'COMPLETED' AND m.completed_at >= date_trunc('month', now()))::int AS completed_this_month
       FROM maintenance_requests m JOIN apartments a ON a.id = m.apartment_id JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id
       WHERE bl.building_id = ANY($1::uuid[])`,
      [buildingIds],
    ),
    pool.query(
      `SELECT COALESCE(sum(electric_current - electric_previous), 0) AS electricity_usage,
         COALESCE(sum(water_current - water_previous), 0) AS water_usage
       FROM utility_readings ur JOIN apartments a ON a.id = ur.apartment_id JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id
       WHERE bl.building_id = ANY($1::uuid[]) AND ur.period_end >= date_trunc('month', CURRENT_DATE)::date`,
      [buildingIds],
    ),
  ]);
  response.json({
    success: true,
    data: {
      buildingIds,
      apartments: apartmentCounts.rows[0],
      invoices: invoiceTotals.rows[0],
      maintenance: requestCounts.rows[0],
      utilities: utilityTotals.rows[0],
      generatedAt: new Date().toISOString(),
    },
  });
});

router.get("/notifications", requirePermission("notification:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const rows = await pool.query(
    `SELECT n.id, n.title, n.content, n.publish_at, nr.read_at, n.created_at
     FROM notification_recipients nr JOIN notifications n ON n.id = nr.notification_id
     WHERE nr.user_id = $1 AND (n.publish_at IS NULL OR n.publish_at <= now())
     ORDER BY n.publish_at DESC NULLS LAST, n.created_at DESC LIMIT 100`,
    [userId],
  );
  response.json({ success: true, data: { notifications: rows.rows } });
});

router.post("/notifications", requirePermission("notification:manage"), async (request, response) => {
  const current = (request as AuthenticatedRequest).auth!;
  const { buildingId, title, content, publishAt } = request.body ?? {};
  if (typeof buildingId !== "string" || typeof title !== "string" || !title.trim() || typeof content !== "string" || !content.trim()) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "buildingId, title, and content are required." } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const notification = await client.query(
      `INSERT INTO notifications (organization_id, building_id, created_by, title, content, publish_at)
       SELECT b.organization_id, b.id, $1, $3, $4, COALESCE($5::timestamptz, now()) FROM buildings b
       WHERE b.id = $2 AND EXISTS (
         SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
         WHERE s.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
       ) RETURNING id, building_id, organization_id, title, content, publish_at, created_at`,
      [current.userId, buildingId, title.trim(), content.trim(), publishAt ?? null],
    );
    if (!notification.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ success: false, error: { code: "BUILDING_NOT_FOUND", message: "Building not found in your assigned scope." } });
      return;
    }
    await client.query(
      `INSERT INTO notification_recipients (notification_id, user_id)
       SELECT $1, DISTINCT_USERS.id FROM (
         SELECT DISTINCT u.id FROM users u
         JOIN apartment_ownerships o ON o.person_id = u.person_id
         JOIN apartments a ON a.id = o.apartment_id JOIN floors f ON f.id = a.floor_id
         JOIN blocks bl ON bl.id = f.block_id
         WHERE bl.building_id = $2 AND u.status = 'ACTIVE' AND o.valid_from <= CURRENT_DATE AND (o.valid_to IS NULL OR o.valid_to >= CURRENT_DATE)
         UNION
         SELECT DISTINCT u.id FROM users u
         JOIN apartment_residencies r ON r.person_id = u.person_id
         JOIN apartments a ON a.id = r.apartment_id JOIN floors f ON f.id = a.floor_id
         JOIN blocks bl ON bl.id = f.block_id
         WHERE bl.building_id = $2 AND u.status = 'ACTIVE' AND r.valid_from <= CURRENT_DATE AND (r.valid_to IS NULL OR r.valid_to >= CURRENT_DATE)
       ) AS DISTINCT_USERS
       ON CONFLICT DO NOTHING`,
      [notification.rows[0].id, buildingId],
    );
    await writeAudit(client, { actorId: current.userId, organizationId: notification.rows[0].organization_id, buildingId, action: "notification.publish", resourceType: "notification", resourceId: notification.rows[0].id });
    await client.query("COMMIT");
    response.status(201).json({ success: true, data: { notification: notification.rows[0] } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.post("/notifications/:notificationId/read", requirePermission("notification:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const updated = await pool.query(
    `UPDATE notification_recipients SET read_at = COALESCE(read_at, now())
     WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id, read_at`,
    [request.params.notificationId, userId],
  );
  if (!updated.rowCount) {
    response.status(404).json({ success: false, error: { code: "NOTIFICATION_NOT_FOUND", message: "Notification was not found for this account." } });
    return;
  }
  response.json({ success: true, data: { notification: updated.rows[0] } });
});

export default router;
