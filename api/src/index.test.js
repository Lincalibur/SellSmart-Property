// Smoke test only: confirms the app wires up (routes registered, no
// throw on import) without needing a live database or Cognito pool. Real
// request/response tests belong to the listings & search epic once there's
// a database to run them against.
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NODE_ENV = "test";
process.env.COGNITO_USER_POOL_ID = "af-south-1_test";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";

const { app } = await import("./index.js");

test("app exposes a health check route", () => {
  const healthRoute = app._router.stack.find(
    (layer) => layer.route?.path === "/health"
  );
  assert.ok(healthRoute, "expected GET /health to be registered");
});
