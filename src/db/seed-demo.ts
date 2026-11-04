import "dotenv/config";
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { pool } from "./pool.js";

const emailDomain = "@smartcondo.local";
const password = process.env.SEED_DEMO_PASSWORD;
if (process.env.SEED_DEMO !== "true") {
  throw new Error("Demo seeding is opt-in. Set SEED_DEMO=true for this one-time command.");
}
if (!password || password.length < 12 || bcrypt.truncates(password)) {
  throw new Error("Set SEED_DEMO_PASSWORD to a 12-72 character password for newly created demo accounts.");
}
const seedPassword = password;

const demoUsers = [
  { username: "superadmin", name: "Demo System Administrator", role: "SUPER_ADMIN", scope: "global" },
  { username: "orgadmin", name: "Demo Organization Administrator", role: "ORG_ADMIN", scope: "organization" },
  { username: "manager", name: "Demo Building Manager", role: "BUILDING_MANAGER", scope: "building" },
  { username: "staff", name: "Demo Management Staff", role: "MANAGEMENT_STAFF", scope: "building" },
  { username: "accountant", name: "Demo Accountant", role: "ACCOUNTANT", scope: "building" },
  { username: "technician", name: "Demo Technician", role: "TECHNICIAN", scope: "building" },
  { username: "security", name: "Demo Security Staff", role: "SECURITY", scope: "building" },
  { username: "board", name: "Demo Management Board Member", role: "BOARD_MEMBER", scope: "building" },
  { username: "owner", name: "Demo Apartment Owner", role: "OWNER", scope: "apartment-101" },
  { username: "resident", name: "Demo Resident", role: "RESIDENT", scope: "apartment-102" },
] as const;

async function one<T>(client: PoolClient, sql: string, values: unknown[] = []): Promise<T> {
  const result = await client.query(sql, values);
  if (!result.rowCount) throw new Error("Could not create or find a required demo record.");
  return result.rows[0] as T;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const organization = await one<{ id: string }>(client,
      `INSERT INTO organizations (code, name, address)
       VALUES ('DEMO-ORG', 'SmartCondo Demo Organization', 'Demo address')
       ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
    );
    const building = await one<{ id: string }>(client,
      `INSERT INTO buildings (organization_id, code, name, address)
       VALUES ($1, 'DEMO-TOWER', 'SmartCondo Demo Tower', 'Demo address')
       ON CONFLICT (organization_id, code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
      [organization.id],
    );
    const block = await one<{ id: string }>(client,
      `INSERT INTO blocks (building_id, code, name)
       VALUES ($1, 'A', 'Demo Block A')
       ON CONFLICT (building_id, code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
      [building.id],
    );
    const floor = await one<{ id: string }>(client,
      `INSERT INTO floors (block_id, floor_number, name)
       VALUES ($1, 1, 'Demo Floor 1')
       ON CONFLICT (block_id, floor_number) DO UPDATE SET floor_number = EXCLUDED.floor_number
       RETURNING id`,
      [block.id],
    );
    const apartment101 = await one<{ id: string }>(client,
      `INSERT INTO apartments (floor_id, code, area_sqm, bedroom_count, bathroom_count)
       VALUES ($1, 'A-101', 72, 2, 1)
       ON CONFLICT (floor_id, code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
      [floor.id],
    );
    const apartment102 = await one<{ id: string }>(client,
      `INSERT INTO apartments (floor_id, code, area_sqm, bedroom_count, bathroom_count)
       VALUES ($1, 'A-102', 85, 3, 2)
       ON CONFLICT (floor_id, code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id`,
      [floor.id],
    );

    const availableRoles = await client.query("SELECT code FROM roles WHERE code = ANY($1::text[])", [demoUsers.map((user) => user.role)]);
    const roleCodes = new Set(availableRoles.rows.map((row) => row.code as string));
    const missingRoles = demoUsers.map((user) => user.role).filter((role) => !roleCodes.has(role));
    if (missingRoles.length) throw new Error(`Required roles are missing from the database: ${missingRoles.join(", ")}`);

    const userIds = new Map<string, string>();
    for (const user of demoUsers) {
      const email = `${user.username}${emailDomain}`;
      const existing = await client.query<{ id: string; person_id: string | null }>(
        "SELECT id, person_id FROM users WHERE lower(email) = $1 FOR UPDATE",
        [email],
      );
      let personId: string;
      let userId: string;
      if (existing.rowCount) {
        userId = existing.rows[0].id;
        if (existing.rows[0].person_id) {
          personId = existing.rows[0].person_id;
        } else {
          personId = (await one<{ id: string }>(client,
            `INSERT INTO people (full_name, email) VALUES ($1, $2)
             ON CONFLICT (lower(email)) WHERE email IS NOT NULL DO UPDATE SET email = EXCLUDED.email
             RETURNING id`,
            [user.name, email],
          )).id;
          await client.query("UPDATE users SET person_id = $2 WHERE id = $1 AND person_id IS NULL", [userId, personId]);
        }
      } else {
        personId = (await one<{ id: string }>(client,
          `INSERT INTO people (full_name, email) VALUES ($1, $2)
           ON CONFLICT (lower(email)) WHERE email IS NOT NULL DO UPDATE SET email = EXCLUDED.email
           RETURNING id`,
          [user.name, email],
        )).id;
        const passwordHash = await bcrypt.hash(seedPassword, 12);
        userId = (await one<{ id: string }>(client,
          `INSERT INTO users (person_id, email, password_hash) VALUES ($1, $2, $3)
           ON CONFLICT (lower(email)) DO UPDATE SET email = EXCLUDED.email
           RETURNING id`,
          [personId, email, passwordHash],
        )).id;
      }

      userIds.set(user.role, userId);
      await client.query(
        `INSERT INTO user_role_assignments (user_id, role_id, organization_id, building_id)
         SELECT $1, r.id, $3, $4 FROM roles r WHERE r.code = $2
         ON CONFLICT (user_id, role_id, organization_id, building_id) DO NOTHING`,
        [userId, user.role, user.scope === "global" ? null : user.scope === "organization" ? organization.id : null,
          user.scope === "building" ? building.id : null],
      );
    }

    const ownerId = userIds.get("OWNER")!;
    const residentId = userIds.get("RESIDENT")!;
    const ownerPerson = await one<{ person_id: string }>(client, "SELECT person_id FROM users WHERE id = $1", [ownerId]);
    const residentPerson = await one<{ person_id: string }>(client, "SELECT person_id FROM users WHERE id = $1", [residentId]);
    await client.query(
      `INSERT INTO apartment_ownerships (apartment_id, person_id, ownership_percent, valid_from)
       SELECT $1, $2, 100, CURRENT_DATE
       WHERE NOT EXISTS (SELECT 1 FROM apartment_ownerships WHERE apartment_id = $1 AND person_id = $2 AND valid_to IS NULL)`,
      [apartment101.id, ownerPerson.person_id],
    );
    await client.query(
      `INSERT INTO apartment_residencies (apartment_id, person_id, relationship, can_view_bills, can_pay_bills, valid_from)
       SELECT $1, $2, 'TENANT', true, true, CURRENT_DATE
       WHERE NOT EXISTS (SELECT 1 FROM apartment_residencies WHERE apartment_id = $1 AND person_id = $2 AND valid_to IS NULL)`,
      [apartment102.id, residentPerson.person_id],
    );

    await client.query("COMMIT");
    console.info("Demo seed completed. Available demo accounts:");
    for (const user of demoUsers) console.info(`- ${user.username}${emailDomain} (${user.role})`);
    console.info("Existing account passwords are never changed by this command.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await seed();
