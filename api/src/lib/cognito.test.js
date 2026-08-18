// Integration test against a real Cognito-compatible endpoint (LocalStack
// in CI -- see the api-test job in .github/workflows/ci.yml, which also
// creates the test user pool and role groups this relies on). Same "test
// the real thing" bar as s3.js/email.js's tests. Unlike sign-in JWT
// verification (middleware/auth.js, still untestable without a real pool
// issuing real tokens), these admin operations work fully against
// LocalStack.
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { AdminCreateUserCommand, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { addUserToGroup, cognito, getUser, listUsers, removeUserFromGroup, setUserEnabled, USER_POOL_ID } from "./cognito.js";

const username = `test-${randomUUID()}`;
const email = `${username}@example.example`;

before(async () => {
  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
      MessageAction: "SUPPRESS",
    })
  );
});

after(async () => {
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: username }));
});

test("listUsers includes the test user", async () => {
  const { users } = await listUsers({ limit: 60 });
  assert.ok(users.some((u) => u.username === username));
});

test("getUser returns the user with an empty group list initially", async () => {
  const user = await getUser(username);
  assert.equal(user.email, email);
  assert.deepEqual(user.groups, []);
});

test("addUserToGroup / removeUserFromGroup actually change group membership", async () => {
  await addUserToGroup(username, "seller");
  assert.deepEqual((await getUser(username)).groups, ["seller"]);

  await removeUserFromGroup(username, "seller");
  assert.deepEqual((await getUser(username)).groups, []);
});

test("setUserEnabled actually disables and re-enables the user", async () => {
  await setUserEnabled(username, false);
  assert.equal((await getUser(username)).enabled, false);

  await setUserEnabled(username, true);
  assert.equal((await getUser(username)).enabled, true);
});
