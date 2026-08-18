import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: true },
  // Without this, a connectivity problem hangs indefinitely instead of
  // failing fast -- painful to diagnose in CI, where a hung job just times
  // out with no useful log output.
  connectionTimeoutMillis: 5000,
  // Same reasoning, but for a query that's actually running -- e.g. stuck
  // behind a lock from another transaction that never committed/rolled back.
  statement_timeout: 10000,
});

// Runs `fn` inside a transaction with the signed-in user's ID and role set
// as session variables. Row-Level Security policies (see db/migrations)
// read these via current_setting('app.current_user_id') /
// current_setting('app.current_user_role') -- this is the one place that
// wiring happens, so every route gets RLS enforcement for free by calling
// this instead of pool.query directly.
export async function withUserContext(user, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [user?.id ?? ""]);
    await client.query("SELECT set_config('app.current_user_role', $1, true)", [
      user?.groups?.[0] ?? "",
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
