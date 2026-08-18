// Epic #14: Compliance hardening. Unlike lib/notify.js's deliberately
// fire-and-forget emails, an audit record is the compliance requirement
// itself, not a side effect of one -- it must not silently fail to exist.
// logAudit is always called with the *same* client a route is already
// running its state change through (withUserContext/withOtpAccess/etc.),
// inside that same transaction, so the audit row and the event it
// documents commit or roll back together.
//
// Never uses RETURNING -- db/migrations/0022_audit_log.sql's INSERT policy
// is a bare WITH CHECK (true), so any session role can append, but only
// admin has a SELECT policy on this table. Skipping RETURNING is the same
// workaround already used for anonymous inserts elsewhere (db/README.md).
export async function logAudit(client, { actorType, actorId, action, resourceType, resourceId, ip, metadata }) {
  await client.query(
    `INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, ip_address, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorType, actorId ?? null, action, resourceType, resourceId, ip ?? null, metadata ? JSON.stringify(metadata) : null]
  );
}
