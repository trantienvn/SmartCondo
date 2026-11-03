import { Router } from "express";
import { authenticate, requirePermission } from "../auth/auth.js";
import type { AuthenticatedRequest } from "../auth/types.js";
import { pool } from "../db/pool.js";
import { writeAudit } from "../db/audit.js";

const router = Router();
router.use(authenticate);

const invoiceAccess = (apartmentExpression: string, residentPermission = "can_view_bills") => `(
  EXISTS (
    SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
    JOIN apartments scoped_apartment ON scoped_apartment.id = ${apartmentExpression}
    JOIN floors scoped_floor ON scoped_floor.id = scoped_apartment.floor_id
    JOIN blocks scoped_block ON scoped_block.id = scoped_floor.block_id
    JOIN buildings scoped_building ON scoped_building.id = scoped_block.building_id
    WHERE s.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = scoped_building.organization_id OR s.building_id = scoped_building.id)
  )
  OR EXISTS (
    SELECT 1 FROM users u JOIN apartment_ownerships o ON o.person_id = u.person_id
    WHERE u.id = $1 AND o.apartment_id = ${apartmentExpression} AND o.valid_from <= CURRENT_DATE AND (o.valid_to IS NULL OR o.valid_to >= CURRENT_DATE)
  )
  OR EXISTS (
    SELECT 1 FROM users u JOIN apartment_residencies r ON r.person_id = u.person_id
    WHERE u.id = $1 AND r.apartment_id = ${apartmentExpression} AND r.${residentPermission} = true
      AND r.valid_from <= CURRENT_DATE AND (r.valid_to IS NULL OR r.valid_to >= CURRENT_DATE)
  )
)`;

router.get("/utility-readings", requirePermission("utility:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const apartmentFilter = typeof request.query.apartmentId === "string" ? request.query.apartmentId : null;
  const result = await pool.query(
    `SELECT ur.id, ur.apartment_id, a.code AS apartment_code, ur.period_start, ur.period_end,
            ur.electric_previous, ur.electric_current, ur.water_previous, ur.water_current,
            ur.recorded_by, ur.note, ur.created_at
     FROM utility_readings ur JOIN apartments a ON a.id = ur.apartment_id
     JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id
     JOIN buildings b ON b.id = bl.building_id
     WHERE ($2::uuid IS NULL OR ur.apartment_id = $2)
       AND ${invoiceAccess("ur.apartment_id")}
     ORDER BY ur.period_end DESC LIMIT 200`,
    [userId, apartmentFilter],
  );
  response.json({ success: true, data: { readings: result.rows } });
});

router.post("/utility-readings", requirePermission("utility:manage"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const { apartmentId, periodStart, periodEnd, electricPrevious, electricCurrent, waterPrevious, waterCurrent, note } = request.body ?? {};
  const numericValues = [electricPrevious, electricCurrent, waterPrevious, waterCurrent].map(Number);
  if (typeof apartmentId !== "string" || typeof periodStart !== "string" || typeof periodEnd !== "string" || !validDate(periodStart) || !validDate(periodEnd) || numericValues.some((value) => !Number.isFinite(value) || value < 0) || numericValues[1] < numericValues[0] || numericValues[3] < numericValues[2]) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "A valid apartment, date range, and non-decreasing meter readings are required." } });
    return;
  }
  const created = await pool.query(
    `INSERT INTO utility_readings (apartment_id, period_start, period_end, electric_previous, electric_current, water_previous, water_current, recorded_by, note)
     SELECT a.id, $3, $4, $5, $6, $7, $8, $1, $9 FROM apartments a
     WHERE a.id = $2 AND ${invoiceAccess("a.id")}
     RETURNING id, apartment_id, period_start, period_end, electric_previous, electric_current, water_previous, water_current, recorded_by, note, created_at`,
    [userId, apartmentId, periodStart, periodEnd, ...numericValues, note ?? null],
  );
  if (!created.rowCount) {
    response.status(404).json({ success: false, error: { code: "APARTMENT_NOT_FOUND", message: "Apartment not found in your assigned scope." } });
    return;
  }
  response.status(201).json({ success: true, data: { reading: created.rows[0] } });
});

router.get("/fee-types", requirePermission("billing:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const buildingId = typeof request.query.buildingId === "string" ? request.query.buildingId : null;
  const rows = await pool.query(
    `SELECT ft.id, ft.building_id, ft.code, ft.name, ft.calculation_method, ft.unit_price, ft.active
     FROM fee_types ft JOIN buildings b ON b.id = ft.building_id
     WHERE ($2::uuid IS NULL OR ft.building_id = $2) AND EXISTS (
       SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
       WHERE s.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
     ) ORDER BY ft.name`,
    [userId, buildingId],
  );
  response.json({ success: true, data: { feeTypes: rows.rows } });
});

router.post("/fee-types", requirePermission("billing:manage"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const { buildingId, code, name, calculationMethod, unitPrice } = request.body ?? {};
  const price = typeof unitPrice === "string" || typeof unitPrice === "number" ? String(unitPrice) : "";
  if (typeof buildingId !== "string" || ![code, name].every((value) => typeof value === "string" && value.trim()) || !["FIXED", "PER_SQM", "ELECTRICITY", "WATER", "MANUAL"].includes(calculationMethod) || !/^\d+(\.\d{1,2})?$/.test(price)) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "buildingId, code, name, calculationMethod, and a non-negative two-decimal unitPrice are required." } });
    return;
  }
  const created = await pool.query(
    `INSERT INTO fee_types (building_id, code, name, calculation_method, unit_price)
     SELECT b.id, $3, $4, $5, $6 FROM buildings b WHERE b.id = $2 AND EXISTS (
       SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
       WHERE s.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
     ) RETURNING id, building_id, code, name, calculation_method, unit_price, active`,
    [userId, buildingId, code.trim(), name.trim(), calculationMethod, price],
  );
  if (!created.rowCount) {
    response.status(404).json({ success: false, error: { code: "BUILDING_NOT_FOUND", message: "Building not found in your assigned scope." } });
    return;
  }
  response.status(201).json({ success: true, data: { feeType: created.rows[0] } });
});

router.get("/invoices", requirePermission("billing:read"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const result = await pool.query(
    `SELECT i.id, i.invoice_number, i.apartment_id, a.code AS apartment_code, i.billing_period_id,
            i.status, i.issued_at, i.due_date, i.total_amount,
            COALESCE(sum(p.amount) FILTER (WHERE p.status = 'RECORDED'), 0) AS paid_amount,
            i.total_amount - COALESCE(sum(p.amount) FILTER (WHERE p.status = 'RECORDED'), 0) AS balance_due
     FROM invoices i JOIN apartments a ON a.id = i.apartment_id
     LEFT JOIN payments p ON p.invoice_id = i.id
     WHERE ${invoiceAccess("i.apartment_id")}
     GROUP BY i.id, a.code ORDER BY i.due_date DESC LIMIT 200`,
    [userId],
  );
  response.json({ success: true, data: { invoices: result.rows } });
});

router.post("/billing-periods", requirePermission("billing:manage"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const { buildingId, periodStart, periodEnd, dueDate } = request.body ?? {};
  if (typeof buildingId !== "string" || ![periodStart, periodEnd, dueDate].every((date) => typeof date === "string" && validDate(date)) || periodEnd < periodStart) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "buildingId and valid periodStart, periodEnd, and dueDate are required." } });
    return;
  }
  const created = await pool.query(
    `INSERT INTO billing_periods (building_id, period_start, period_end, due_date, created_by)
     SELECT b.id, $3, $4, $5, $1 FROM buildings b WHERE b.id = $2 AND EXISTS (
       SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
       WHERE s.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
     ) RETURNING id, building_id, period_start, period_end, due_date, status, created_at`,
    [userId, buildingId, periodStart, periodEnd, dueDate],
  );
  if (!created.rowCount) {
    response.status(404).json({ success: false, error: { code: "BUILDING_NOT_FOUND", message: "Building not found in your assigned scope." } });
    return;
  }
  response.status(201).json({ success: true, data: { billingPeriod: created.rows[0] } });
});

router.post("/billing-periods/:periodId/generate", requirePermission("billing:manage"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const periodResult = await client.query(
      `SELECT bp.* FROM billing_periods bp JOIN buildings b ON b.id = bp.building_id
       WHERE bp.id = $2 AND bp.status = 'DRAFT' AND EXISTS (
         SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
         WHERE s.user_id = $1 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
       ) FOR UPDATE`,
      [userId, request.params.periodId],
    );
    if (!periodResult.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ success: false, error: { code: "BILLING_PERIOD_NOT_FOUND", message: "Draft billing period not found in your scope." } });
      return;
    }
    const period = periodResult.rows[0];
    const fees = await client.query(
      "SELECT id, code, name, calculation_method, unit_price FROM fee_types WHERE building_id = $1 AND active = true ORDER BY code",
      [period.building_id],
    );
    if (fees.rows.some((fee) => fee.calculation_method === "MANUAL")) {
      await client.query("ROLLBACK");
      response.status(409).json({ success: false, error: { code: "MANUAL_FEE_REQUIRES_INPUT", message: "Manual fee types must be entered explicitly before invoice generation." } });
      return;
    }
    const apartments = await client.query(
      `SELECT a.id, a.code, a.area_sqm FROM apartments a JOIN floors f ON f.id = a.floor_id
       JOIN blocks bl ON bl.id = f.block_id WHERE bl.building_id = $1 AND a.operational_status = 'ACTIVE'`,
      [period.building_id],
    );
    let generated = 0;
    for (const apartment of apartments.rows) {
      const invoiceNumber = `${String(period.period_start).slice(0, 10).replaceAll("-", "")}-${apartment.id.slice(0, 8)}`;
      const invoice = await client.query(
        `INSERT INTO invoices (billing_period_id, apartment_id, invoice_number, due_date)
         VALUES ($1, $2, $3, $4) ON CONFLICT (billing_period_id, apartment_id) DO NOTHING RETURNING id`,
        [period.id, apartment.id, invoiceNumber, period.due_date],
      );
      if (!invoice.rowCount) continue;
      for (const fee of fees.rows) {
        let quantity = "1";
        if (fee.calculation_method === "PER_SQM") quantity = apartment.area_sqm ?? "0";
        if (fee.calculation_method === "ELECTRICITY" || fee.calculation_method === "WATER") {
          const reading = await client.query(
            "SELECT (electric_current - electric_previous)::text AS electric_usage, (water_current - water_previous)::text AS water_usage FROM utility_readings WHERE apartment_id = $1 AND period_start = $2 AND period_end = $3",
            [apartment.id, period.period_start, period.period_end],
          );
          if (!reading.rowCount) {
            await client.query("ROLLBACK");
            response.status(409).json({ success: false, error: { code: "METER_READING_MISSING", message: `Utility reading missing for apartment ${apartment.code}.` } });
            return;
          }
          quantity = fee.calculation_method === "ELECTRICITY" ? reading.rows[0].electric_usage : reading.rows[0].water_usage;
        }
        const unitPrice = String(fee.unit_price);
        const item = await client.query(
          `INSERT INTO invoice_items (invoice_id, fee_type_id, description, quantity, unit_price, amount)
           VALUES ($1, $2, $3, $4::numeric, $5::numeric, round($4::numeric * $5::numeric, 2))
           RETURNING amount::text AS amount`,
          [invoice.rows[0].id, fee.id, fee.name, quantity, unitPrice],
        );
        await client.query("UPDATE invoices SET total_amount = total_amount + $2::numeric WHERE id = $1", [invoice.rows[0].id, item.rows[0].amount]);
      }
      generated += 1;
    }
    await client.query("UPDATE billing_periods SET status = 'GENERATED' WHERE id = $1", [period.id]);
    await writeAudit(client, { actorId: userId, buildingId: period.building_id, action: "billing_period.generate", resourceType: "billing_period", resourceId: period.id, details: { invoicesGenerated: generated } });
    await client.query("COMMIT");
    response.json({ success: true, data: { billingPeriodId: period.id, invoicesGenerated: generated } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.post("/billing-periods/:periodId/issue", requirePermission("billing:manage"), async (request, response) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const period = await client.query(
      `UPDATE billing_periods bp SET status = 'ISSUED'
       WHERE bp.id = $1 AND bp.status = 'GENERATED' AND EXISTS (
         SELECT 1 FROM user_role_assignments s JOIN roles r ON r.id = s.role_id
         JOIN buildings b ON b.id = bp.building_id
         WHERE s.user_id = $2 AND (r.code = 'SUPER_ADMIN' OR s.organization_id = b.organization_id OR s.building_id = b.id)
       ) RETURNING bp.id`,
      [request.params.periodId, (request as AuthenticatedRequest).auth!.userId],
    );
    if (!period.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ success: false, error: { code: "BILLING_PERIOD_NOT_FOUND", message: "Generated billing period not found in your scope." } });
      return;
    }
    await client.query("UPDATE invoices SET status = 'ISSUED', issued_at = now(), updated_at = now() WHERE billing_period_id = $1 AND status = 'DRAFT'", [period.rows[0].id]);
    await writeAudit(client, { actorId: (request as AuthenticatedRequest).auth!.userId, action: "billing_period.issue", resourceType: "billing_period", resourceId: period.rows[0].id });
    await client.query("COMMIT");
    response.json({ success: true, data: { billingPeriodId: period.rows[0].id, status: "ISSUED" } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.post("/payments", requirePermission("payment:record"), async (request, response) => {
  const userId = (request as AuthenticatedRequest).auth!.userId;
  const current = (request as AuthenticatedRequest).auth!;
  const { invoiceId, amount, method, reference, idempotencyKey } = request.body ?? {};
  const paymentAmount = typeof amount === "string" || typeof amount === "number" ? String(amount) : "";
  if (typeof invoiceId !== "string" || !/^\d+(\.\d{1,2})?$/.test(paymentAmount) || Number(paymentAmount) <= 0 || !["CASH", "BANK_TRANSFER", "SIMULATED"].includes(method) || (idempotencyKey != null && (typeof idempotencyKey !== "string" || idempotencyKey.length > 100))) {
    response.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "invoiceId, positive amount, and supported method are required." } });
    return;
  }
  const residentAccount = current.scopes.some((scope) => ["OWNER", "RESIDENT"].includes(scope.role))
    && !current.scopes.some((scope) => ["SUPER_ADMIN", "ORG_ADMIN", "BUILDING_MANAGER", "MANAGEMENT_STAFF", "ACCOUNTANT"].includes(scope.role));
  if (residentAccount && method !== "SIMULATED") {
    response.status(403).json({ success: false, error: { code: "PAYMENT_METHOD_FORBIDDEN", message: "Resident portal payments are simulated until a real provider is integrated." } });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const invoice = await client.query(
      `SELECT i.*, b.id AS building_id FROM invoices i JOIN apartments a ON a.id = i.apartment_id
       JOIN floors f ON f.id = a.floor_id JOIN blocks bl ON bl.id = f.block_id
       JOIN buildings b ON b.id = bl.building_id
       WHERE i.id = $2 AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID') AND ${invoiceAccess("i.apartment_id", "can_pay_bills")}
       FOR UPDATE OF i`,
      [userId, invoiceId],
    );
    if (!invoice.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ success: false, error: { code: "INVOICE_NOT_FOUND", message: "Payable invoice not found in your scope." } });
      return;
    }
    const target = invoice.rows[0];
    if (idempotencyKey) {
      const previous = await client.query("SELECT id, amount, method, status, paid_at FROM payments WHERE invoice_id = $1 AND idempotency_key = $2", [target.id, idempotencyKey]);
      if (previous.rowCount) {
        await client.query("COMMIT");
        response.json({ success: true, data: { payment: previous.rows[0] }, replayed: true });
        return;
      }
    }
    const totals = await client.query(
      `SELECT COALESCE(sum(amount), 0)::text AS paid,
              (i.total_amount - COALESCE(sum(amount), 0))::text AS balance
       FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id AND p.status = 'RECORDED'
       WHERE i.id = $1 GROUP BY i.id`,
      [target.id],
    );
    const overpayment = await client.query("SELECT $1::numeric > $2::numeric AS value", [paymentAmount, totals.rows[0].balance]);
    if (overpayment.rows[0].value) {
      await client.query("ROLLBACK");
      response.status(409).json({ success: false, error: { code: "OVERPAYMENT", message: "Payment exceeds the remaining invoice balance." } });
      return;
    }
    const created = await client.query(
      `INSERT INTO payments (invoice_id, amount, method, reference, received_by, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, invoice_id, amount, method, status, reference, paid_at`,
      [target.id, paymentAmount, method, reference ?? null, residentAccount ? null : userId, idempotencyKey ?? null],
    );
    const statusResult = await client.query(
      `UPDATE invoices i SET status = CASE WHEN i.total_amount <= (
         SELECT COALESCE(sum(p.amount), 0) FROM payments p WHERE p.invoice_id = i.id AND p.status = 'RECORDED'
       ) THEN 'PAID' ELSE 'PARTIALLY_PAID' END, updated_at = now()
       WHERE i.id = $1 RETURNING i.status`,
      [target.id],
    );
    const nextStatus = statusResult.rows[0].status as string;
    const balanceAfter = await client.query(
      `SELECT (i.total_amount - COALESCE(sum(p.amount) FILTER (WHERE p.status = 'RECORDED'), 0))::text AS balance
       FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id WHERE i.id = $1 GROUP BY i.id`,
      [target.id],
    );
    await writeAudit(client, { actorId: userId, buildingId: target.building_id, action: "payment.record", resourceType: "payment", resourceId: created.rows[0].id, details: { invoiceId: target.id, amount: paymentAmount, method, invoiceStatus: nextStatus } });
    await client.query("COMMIT");
    response.status(201).json({ success: true, data: { payment: created.rows[0], invoiceStatus: nextStatus, balanceDue: balanceAfter.rows[0].balance } });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export default router;
