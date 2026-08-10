/*
  # Phase 5 — Support impersonation (view-as-org)

  Lets a platform admin act as an org's admin for support, without ever
  knowing or resetting that admin's password.

  1. New Tables
    - `impersonation_log` — append-only audit trail. No UPDATE/DELETE
      policy for anyone but service_role: a record of who impersonated
      whom, and when, is only useful if it can't be quietly edited after
      the fact.

  2. Security
    - Only service_role writes it (from the impersonate-org Edge
      Function, right before minting the session) — a platform admin
      can't self-report a fake entry or skip logging one.
    - Platform admins can read the log (their own actions, and each
      other's — small trusted staff group, and being able to see "did
      someone else already impersonate this org today" is useful).
*/

CREATE TABLE IF NOT EXISTS impersonation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_admin_id uuid NOT NULL REFERENCES platform_admins(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  target_email text NOT NULL,
  started_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impersonation_log_org_id ON impersonation_log(org_id);

ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_reads_impersonation_log"
  ON impersonation_log FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "service_role_writes_impersonation_log"
  ON impersonation_log FOR INSERT
  TO service_role
  WITH CHECK (true);
