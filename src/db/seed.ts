import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

export async function runSeed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.info("Starting SmartCondo demo data seeding...");

    // 1. Organization
    const orgResult = await client.query(
      `INSERT INTO organizations (code, name, address, email, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ["ORG-SMARTCONDO", "Tập đoàn Quản lý Bất động sản SmartCondo", "123 Đường Mai Chí Thọ, TP. Thủ Đức, TP. HCM", "contact@smartcondo.vn", "02838889999"],
    );
    const orgId = orgResult.rows[0].id;

    // 2. Building
    const buildingResult = await client.query(
      `INSERT INTO buildings (organization_id, code, name, address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [orgId, "DMT", "Tòa nhà Diamond Tower", "123 Đường Mai Chí Thọ, An Phú, TP. Thủ Đức"],
    );
    const buildingId = buildingResult.rows[0].id;

    // 3. Blocks
    const blockAResult = await client.query(
      `INSERT INTO blocks (building_id, code, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (building_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [buildingId, "BLOCK-A", "Khối Ruby (Tháp A)"],
    );
    const blockAId = blockAResult.rows[0].id;

    const blockBResult = await client.query(
      `INSERT INTO blocks (building_id, code, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (building_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [buildingId, "BLOCK-B", "Khối Sapphire (Tháp B)"],
    );
    const blockBId = blockBResult.rows[0].id;

    // 4. Floors
    const floor1Result = await client.query(
      `INSERT INTO floors (block_id, floor_number, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (block_id, floor_number) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [blockAId, 1, "Tầng 1 (Tháp A)"],
    );
    const floor1Id = floor1Result.rows[0].id;

    const floor2Result = await client.query(
      `INSERT INTO floors (block_id, floor_number, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (block_id, floor_number) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [blockBId, 2, "Tầng 2 (Tháp B)"],
    );
    const floor2Id = floor2Result.rows[0].id;

    // 5. Apartments
    const aptA101Result = await client.query(
      `INSERT INTO apartments (floor_id, code, area_sqm, bedroom_count, bathroom_count, operational_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (floor_id, code) DO UPDATE SET area_sqm = EXCLUDED.area_sqm
       RETURNING id`,
      [floor1Id, "A-101", 85.50, 2, 2, "ACTIVE"],
    );
    const aptA101Id = aptA101Result.rows[0].id;

    const aptA102Result = await client.query(
      `INSERT INTO apartments (floor_id, code, area_sqm, bedroom_count, bathroom_count, operational_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (floor_id, code) DO UPDATE SET area_sqm = EXCLUDED.area_sqm
       RETURNING id`,
      [floor1Id, "A-102", 72.00, 2, 1, "ACTIVE"],
    );
    const aptA102Id = aptA102Result.rows[0].id;

    await client.query(
      `INSERT INTO apartments (floor_id, code, area_sqm, bedroom_count, bathroom_count, operational_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (floor_id, code) DO UPDATE SET area_sqm = EXCLUDED.area_sqm`,
      [floor2Id, "B-201", 95.00, 3, 2, "ACTIVE"],
    );

    await client.query(
      `INSERT INTO apartments (floor_id, code, area_sqm, bedroom_count, bathroom_count, operational_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (floor_id, code) DO UPDATE SET area_sqm = EXCLUDED.area_sqm`,
      [floor2Id, "B-202", 64.00, 2, 1, "ACTIVE"],
    );

    // 6. Demo Users & Accounts
    const usersToCreate = [
      { email: "admin@smartcondo.vn", pass: "Admin@123456", name: "Trần Quốc Bảo (Super Admin)", role: "SUPER_ADMIN", scoped: false },
      { email: "manager@smartcondo.vn", pass: "Manager@123", name: "Nguyễn Văn Quản Lý", role: "BUILDING_MANAGER", scoped: true },
      { email: "accountant@smartcondo.vn", pass: "Accountant@123", name: "Lê Thị Kế Toán", role: "ACCOUNTANT", scoped: true },
      { email: "tech@smartcondo.vn", pass: "Tech@123", name: "Phạm Văn Kỹ Thuật", role: "TECHNICIAN", scoped: true },
      { email: "owner@smartcondo.vn", pass: "Owner@123", name: "Vũ Thị Chủ Hộ", role: "OWNER", scoped: false },
      { email: "resident@smartcondo.vn", pass: "Resident@123", name: "Hoàng Minh Tuấn", role: "RESIDENT", scoped: false },
    ];

    const userMap = new Map<string, { userId: string; personId: string }>();

    for (const u of usersToCreate) {
      let personId: string;
      const existingPerson = await client.query("SELECT id FROM people WHERE lower(email) = $1", [u.email]);
      if (existingPerson.rowCount) {
        personId = existingPerson.rows[0].id;
      } else {
        const createdPerson = await client.query(
          "INSERT INTO people (full_name, email, phone) VALUES ($1, $2, $3) RETURNING id",
          [u.name, u.email, "090" + Math.floor(1000000 + Math.random() * 9000000)],
        );
        personId = createdPerson.rows[0].id;
      }

      let userId: string;
      const existingUser = await client.query("SELECT id FROM users WHERE lower(email) = $1", [u.email]);
      if (existingUser.rowCount) {
        userId = existingUser.rows[0].id;
      } else {
        const passwordHash = await bcrypt.hash(u.pass, 10);
        const createdUser = await client.query(
          "INSERT INTO users (person_id, email, password_hash, status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id",
          [personId, u.email, passwordHash],
        );
        userId = createdUser.rows[0].id;
      }

      // Role assignment
      const roleRow = await client.query("SELECT id FROM roles WHERE code = $1", [u.role]);
      if (roleRow.rowCount) {
        const roleId = roleRow.rows[0].id;
        await client.query(
          `INSERT INTO user_role_assignments (user_id, role_id, organization_id, building_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [userId, roleId, u.scoped ? orgId : null, u.scoped ? buildingId : null],
        );
      }

      userMap.set(u.email, { userId, personId });
    }

    const residentPerson = userMap.get("resident@smartcondo.vn")!.personId;
    const ownerPerson = userMap.get("owner@smartcondo.vn")!.personId;
    const managerUser = userMap.get("manager@smartcondo.vn")!.userId;

    // 7. Ownership & Residency for Apartment A-101
    await client.query(
      `INSERT INTO apartment_ownerships (apartment_id, person_id, ownership_percent, valid_from)
       VALUES ($1, $2, 100.00, '2025-01-01')
       ON CONFLICT (id, apartment_id) DO NOTHING`,
      [aptA101Id, ownerPerson],
    );

    await client.query(
      `INSERT INTO apartment_residencies (apartment_id, person_id, relationship, can_view_bills, can_pay_bills, valid_from)
       VALUES ($1, $2, 'TENANT', true, true, '2025-01-01')
       ON CONFLICT (id, apartment_id) DO NOTHING`,
      [aptA101Id, residentPerson],
    );

    // 8. Fee Types for Diamond Tower
    const feeConfigs = [
      { code: "QL-SQM", name: "Phí quản lý vận hành tòa nhà", method: "PER_SQM", price: "15000.00" },
      { code: "DIEN-SH", name: "Tiền điện sinh hoạt", method: "ELECTRICITY", price: "3200.00" },
      { code: "NUOC-SH", name: "Tiền nước sinh hoạt", method: "WATER", price: "18500.00" },
      { code: "XE-MAY", name: "Phí trông giữ xe máy", method: "FIXED", price: "120000.00" },
    ];

    const feeMap = new Map<string, string>();
    for (const f of feeConfigs) {
      const insertedFee = await client.query(
        `INSERT INTO fee_types (building_id, code, name, calculation_method, unit_price, active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (building_id, code) DO UPDATE SET unit_price = EXCLUDED.unit_price
         RETURNING id`,
        [buildingId, f.code, f.name, f.method, f.price],
      );
      feeMap.set(f.code, insertedFee.rows[0].id);
    }

    // 9. Utility Readings for A-101 and A-102
    await client.query(
      `INSERT INTO utility_readings (apartment_id, period_start, period_end, electric_previous, electric_current, water_previous, water_current, recorded_by, note)
       VALUES ($1, '2026-10-01', '2026-10-31', 120, 285, 45, 68, $2, 'Chốt số công tơ định kỳ tháng 10/2026')
       ON CONFLICT DO NOTHING`,
      [aptA101Id, managerUser],
    );

    await client.query(
      `INSERT INTO utility_readings (apartment_id, period_start, period_end, electric_previous, electric_current, water_previous, water_current, recorded_by, note)
       VALUES ($1, '2026-10-01', '2026-10-31', 80, 215, 30, 48, $2, 'Chốt số công tơ định kỳ tháng 10/2026')
       ON CONFLICT DO NOTHING`,
      [aptA102Id, managerUser],
    );

    // 10. Billing Period & Invoices
    const periodResult = await client.query(
      `INSERT INTO billing_periods (building_id, period_start, period_end, due_date, status, created_by)
       VALUES ($1, '2026-10-01', '2026-10-31', '2026-11-20', 'ISSUED', $2)
       ON CONFLICT (building_id, period_start, period_end) DO UPDATE SET status = 'ISSUED'
       RETURNING id`,
      [buildingId, managerUser],
    );
    const periodId = periodResult.rows[0].id;

    // Create Invoice for A-101
    const invA101Result = await client.query(
      `INSERT INTO invoices (billing_period_id, apartment_id, invoice_number, total_amount, due_date, status, issued_at)
       VALUES ($1, $2, $3, 2356000.00, '2026-11-20', 'ISSUED', now())
       ON CONFLICT (billing_period_id, apartment_id) DO UPDATE SET total_amount = EXCLUDED.total_amount, status = 'ISSUED'
       RETURNING id`,
      [periodId, aptA101Id, "HD-202610-A101"],
    );
    const invA101Id = invA101Result.rows[0].id;

    // Line items for A-101 invoice
    await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [invA101Id]);
    await client.query(
      `INSERT INTO invoice_items (invoice_id, fee_type_id, description, quantity, unit_price, amount)
       VALUES 
       ($1, $2, 'Phí quản lý vận hành (85.5 m²)', 85.50, 15000.00, 1282500.00),
       ($1, $3, 'Tiền điện sinh hoạt (165 kWh: 120 -> 285)', 165.00, 3200.00, 528000.00),
       ($1, $4, 'Tiền nước sinh hoạt (23 m³: 45 -> 68)', 23.00, 18500.00, 425500.00),
       ($1, $5, 'Phí trông giữ 01 xe máy', 1.00, 120000.00, 120000.00)`,
      [invA101Id, feeMap.get("QL-SQM"), feeMap.get("DIEN-SH"), feeMap.get("NUOC-SH"), feeMap.get("XE-MAY")],
    );

    // Create Invoice for A-102
    const invA102Result = await client.query(
      `INSERT INTO invoices (billing_period_id, apartment_id, invoice_number, total_amount, due_date, status, issued_at)
       VALUES ($1, $2, $3, 1965000.00, '2026-11-20', 'ISSUED', now())
       ON CONFLICT (billing_period_id, apartment_id) DO UPDATE SET total_amount = EXCLUDED.total_amount, status = 'ISSUED'
       RETURNING id`,
      [periodId, aptA102Id, "HD-202610-A102"],
    );
    const invA102Id = invA102Result.rows[0].id;

    await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [invA102Id]);
    await client.query(
      `INSERT INTO invoice_items (invoice_id, fee_type_id, description, quantity, unit_price, amount)
       VALUES 
       ($1, $2, 'Phí quản lý vận hành (72.0 m²)', 72.00, 15000.00, 1080000.00),
       ($1, $3, 'Tiền điện sinh hoạt (135 kWh: 80 -> 215)', 135.00, 3200.00, 432000.00),
       ($1, $4, 'Tiền nước sinh hoạt (18 m³: 30 -> 48)', 18.00, 18500.00, 333000.00),
       ($1, $5, 'Phí trông giữ 01 xe máy', 1.00, 120000.00, 120000.00)`,
      [invA102Id, feeMap.get("QL-SQM"), feeMap.get("DIEN-SH"), feeMap.get("NUOC-SH"), feeMap.get("XE-MAY")],
    );

    // 11. Maintenance Request
    const residentUser = userMap.get("resident@smartcondo.vn")!.userId;
    const techUser = userMap.get("tech@smartcondo.vn")!.userId;

    const maintenanceResult = await client.query(
      `INSERT INTO maintenance_requests (apartment_id, reported_by, title, description, priority, status, assigned_to)
       VALUES ($1, $2, 'Kiểm tra rò rỉ van nước bồn rửa bát', 'Vòi xả nước dưới bồn rửa chén rỉ nước liên tục vào ban đêm.', 'HIGH', 'IN_PROGRESS', $3)
       RETURNING id`,
      [aptA101Id, residentUser, techUser],
    );
    await client.query(
      "INSERT INTO maintenance_events (request_id, actor_id, from_status, to_status, note) VALUES ($1, $2, 'PENDING', 'IN_PROGRESS', 'Kỹ thuật viên đã tiếp nhận và đang tiến hành kiểm tra')",
      [maintenanceResult.rows[0].id, techUser],
    );

    // 12. Notification
    const notifResult = await client.query(
      `INSERT INTO notifications (organization_id, building_id, created_by, title, content, publish_at)
       VALUES ($1, $2, $3, 'Thông báo bảo dưỡng định kỳ hệ thống thang máy', 'Ban quản lý Diamond Tower trân trọng thông báo lịch kiểm tra và bảo dưỡng thang máy định kỳ Tháp Ruby vào sáng Thứ Bảy từ 08:30 đến 11:30. Quý cư dân vui lòng sử dụng thang hàng trong khung giờ trên.', now())
       RETURNING id`,
      [orgId, buildingId, managerUser],
    );
    await client.query(
      "INSERT INTO notification_recipients (notification_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [notifResult.rows[0].id, residentUser],
    );

    await client.query("COMMIT");
    console.info("SmartCondo demo data seeded successfully!");
    console.info("\n--- TÀI KHOẢN DEMO SẴN SÀNG ---");
    console.info("1. Ban Quản Lý (Trưởng BQL): manager@smartcondo.vn / Manager@123");
    console.info("2. Kế toán tòa nhà:          accountant@smartcondo.vn / Accountant@123");
    console.info("3. Kỹ thuật viên:           tech@smartcondo.vn / Tech@123");
    console.info("4. Cư dân (Căn A-101):      resident@smartcondo.vn / Resident@123");
    console.info("5. Chủ sở hữu (Căn A-101):   owner@smartcondo.vn / Owner@123");
    console.info("6. Quản trị tối cao:        admin@smartcondo.vn / Admin@123456");
    console.info("-------------------------------\n");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seeding failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  runSeed()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
