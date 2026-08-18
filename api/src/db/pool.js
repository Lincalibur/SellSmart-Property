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

// Buyers don't have accounts yet (see db/README.md), so OTPs/offers
// (issue #7) use a capability model instead of requireAuth: knowing the
// OTP's unguessable uuid is what proves it's yours. Rather than a
// permissive `USING (true)` SELECT policy -- which would leak every OTP's
// buyer PII to anonymous requests if a future bug ever ran an unfiltered
// query -- this sets a session var the RLS policies in
// db/migrations/0010_otps_rls.sql pin to the *one* row the API already
// validated the caller knows the id of.
export async function withOtpAccess(otpId, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_role', 'otp_bearer', true)");
    await client.query("SELECT set_config('app.current_otp_id', $1, true)", [otpId]);
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

// PayFast's ITN webhook (issue #9) calls in with no Cognito token at all --
// it's authenticated by verifying PayFast's signature on the payload
// (api/src/routes/payments.js), not anything RLS can see. Same
// "the id is the capability" pattern as withOtpAccess: pins to the one
// payment row the ITN's m_payment_id (a uuid the API generated and gave to
// PayFast at checkout) refers to, per db/migrations/0014_payments_rls.sql.
export async function withPaymentWebhookAccess(paymentId, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_role', 'payfast_webhook', true)");
    await client.query("SELECT set_config('app.current_payment_id', $1, true)", [paymentId]);
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

// DocuSign Connect's completion webhook (issue #10) calls in with no
// Cognito token either, authenticated by an HMAC signature on the payload
// (api/src/lib/docusign.js), not anything RLS can see. Same pattern again,
// but keyed on envelope_id rather than an id this API minted itself --
// DocuSign generates it when the envelope is created, and the API only
// learns it afterward (db/migrations/0016_otps_envelope.sql,
// 0017_otps_envelope_rls.sql).
export async function withDocusignWebhookAccess(envelopeId, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_role', 'docusign_webhook', true)");
    await client.query("SELECT set_config('app.current_envelope_id', $1, true)", [envelopeId]);
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
