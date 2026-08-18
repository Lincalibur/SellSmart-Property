-- Epic #14: Compliance hardening. Immutable log of document views/downloads
-- and offer state changes, per docs/Infrastructure-Hosting-Plan.md #4
-- ("Audit trail... actor, timestamp, IP"). actor_id/actor_type are plain
-- text, not FKs -- an actor can be a Cognito user id, a buyer identified
-- only by email (no account), or a webhook role name, and this table must
-- keep working even if the actor's own row is later deleted/expired.
CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type    text NOT NULL,
  actor_id      text,
  action        text NOT NULL,
  resource_type text NOT NULL,
  resource_id   text NOT NULL,
  ip_address    text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_resource_idx ON audit_log (resource_type, resource_id);
CREATE INDEX audit_log_created_at_idx ON audit_log (created_at);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Any session role may append -- this table is only ever written by
-- trusted server code (api/src/lib/audit.js), alongside the state change
-- it documents, never by a public/client-facing route directly. Same
-- "capability, not identity" reasoning as otp_bearer, not a real open
-- door. Never uses RETURNING (see api/src/lib/audit.js), so no writer role
-- needs a matching SELECT policy -- the same anonymous-insert workaround
-- documented in db/README.md.
CREATE POLICY any_role_appends_audit_log ON audit_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY admin_reads_audit_log ON audit_log
  FOR SELECT
  USING (current_setting('app.current_user_role', true) = 'admin');

-- Deliberately no UPDATE/DELETE policy at all, for any role including
-- admin -- under FORCE RLS that makes every row here genuinely immutable
-- once written, which is the actual compliance requirement (an evidentiary
-- trail that admin itself can edit or delete isn't one). One-off deviation
-- from the admin_full_access FOR ALL convention every other table uses --
-- see db/README.md.
