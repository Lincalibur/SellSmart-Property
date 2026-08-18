import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminEnableUserCommand,
  AdminDisableUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// COGNITO_ENDPOINT points this at LocalStack for local dev/CI, same
// pattern as lib/s3.js/lib/email.js -- unset in production, where the SDK
// talks to real Cognito using the ECS task's IAM role. No AWS account
// exists yet, so nothing here has been exercised against a real user pool
// -- only LocalStack (terraform/modules/auth defines the seller/buyer/
// provider/admin groups this reads/writes).
export const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? "af-south-1",
  endpoint: process.env.COGNITO_ENDPOINT || undefined,
});

export const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

// "One of seller/buyer/provider/admin" -- see requireRole's comment in
// middleware/auth.js. Back-office role changes go through this list, not
// an arbitrary group name, the same way providers.js validates category.
export const ROLE_GROUPS = ["seller", "buyer", "provider", "admin"];

function toUserJson(user) {
  const attrs = Object.fromEntries((user.Attributes ?? user.UserAttributes ?? []).map((a) => [a.Name, a.Value]));
  return {
    username: user.Username,
    email: attrs.email,
    enabled: user.Enabled,
    status: user.UserStatus,
    createdAt: user.UserCreateDate,
  };
}

export async function listUsers({ limit, paginationToken } = {}) {
  const result = await cognito.send(
    new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: limit, PaginationToken: paginationToken })
  );
  return {
    users: result.Users.map(toUserJson),
    nextToken: result.PaginationToken,
  };
}

export async function getUser(username) {
  const [user, groups] = await Promise.all([
    cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: username })),
    cognito.send(new AdminListGroupsForUserCommand({ UserPoolId: USER_POOL_ID, Username: username })),
  ]);
  return { ...toUserJson(user), groups: groups.Groups.map((g) => g.GroupName) };
}

export async function addUserToGroup(username, groupName) {
  await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: USER_POOL_ID, Username: username, GroupName: groupName }));
}

export async function removeUserFromGroup(username, groupName) {
  await cognito.send(
    new AdminRemoveUserFromGroupCommand({ UserPoolId: USER_POOL_ID, Username: username, GroupName: groupName })
  );
}

export async function setUserEnabled(username, enabled) {
  const Command = enabled ? AdminEnableUserCommand : AdminDisableUserCommand;
  await cognito.send(new Command({ UserPoolId: USER_POOL_ID, Username: username }));
}
