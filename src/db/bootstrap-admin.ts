import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./pool.js";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const fullName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
if (!email || !password || !fullName || password.length < 12 || bcrypt.truncates(password)) {
  throw new Error("Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, and a 12-72 character BOOTSTRAP_ADMIN_PASSWORD.");
}

const client = await pool.connect();
try {
  await client.query("BEGIN");
  const existing = await client.query("SELECT id FROM users WHERE lower(email) = $1", [email]);
  if (existing.rowCount) throw new Error("A user with this email already exists.");
  const person = await client.query("INSERT INTO people (full_name, email) VALUES ($1, $2) RETURNING id", [fullName, email]);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await client.query(
    "INSERT INTO users (person_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    [person.rows[0].id, email, passwordHash],
  );
  await client.query(
    `INSERT INTO user_role_assignments (user_id, role_id)
     SELECT $1, id FROM roles WHERE code = 'SUPER_ADMIN'`,
    [user.rows[0].id],
  );
  await client.query("COMMIT");
  console.info(`Created bootstrap administrator ${email}. Remove bootstrap credentials from the environment now.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
