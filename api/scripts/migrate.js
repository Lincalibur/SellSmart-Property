// Runs every not-yet-applied db/migrations/*.sql file against DATABASE_URL,
// in filename order, inside one transaction. No migration tool chosen yet
// (see db/README.md) -- this is the plain runner that keeps that decision
// valid for local dev and CI while a real database exists to run against.
//
// Tracks what's already run in a schema_migrations table so this script is
// safe to invoke repeatedly against a database that persists across runs
// (e.g. the QA environment's docker-compose Postgres, deploy/qa-refresh.sh)
// -- found the hard way when a second run against an already-migrated
// database failed with "relation already exists" (42P07), since a plain
// unconditional replay of every file was only ever exercised against a
// fresh database before (CI's Postgres service container, recreated every
// run). CI and any brand-new database are unaffected: schema_migrations
// starts empty, every file is "not yet applied", and the net effect is
// identical to before.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const migrationsDir = fileURLToPath(new URL("../../db/migrations", import.meta.url));

async function migrate() {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query("SELECT filename FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.filename));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`Applying ${file}`);
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

await migrate();
