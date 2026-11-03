import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock($1)", [7300920261103n.toString()]);
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const files = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const alreadyApplied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [file],
    );
    if (alreadyApplied.rowCount) continue;

    try {
      await client.query("BEGIN");
      await client.query(await readFile(path.join(migrationsDirectory, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.info(`Applied migration ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  try {
    await client.query("SELECT pg_advisory_unlock($1)", [7300920261103n.toString()]);
  } finally {
    client.release();
  }
  await pool.end();
}
