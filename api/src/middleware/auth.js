import { CognitoJwtVerifier } from "aws-jwt-verify";

// Verifies against Cognito's public JWKS -- no secret to manage, no call to
// Cognito on every request (the verifier caches the key set). Same code
// works unchanged at every growth stage; only the pool ID env var changes
// per environment.
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  try {
    const payload = await verifier.verify(token);
    req.user = {
      id: payload.sub,
      groups: payload["cognito:groups"] ?? [],
    };
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}

// One or more of: "seller", "buyer", "provider", "admin" -- matches the
// Cognito groups created in terraform/modules/auth.
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.groups ?? [];
    const isAllowed = allowedRoles.some((role) => userRoles.includes(role));

    if (!isAllowed) {
      return res.status(403).json({ error: "You don't have access to do that." });
    }

    next();
  };
}
