// Runs every db/migrations/*.sql file against DATABASE_URL, in filename
// order, inside one transaction. No migration tool chosen yet (see
// db/README.md) -- this is the plain runner that keeps that decision valid
// for local dev and CI while a real database exists to run against.
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
    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`Applying ${file}`);
      await client.query(sql);
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
