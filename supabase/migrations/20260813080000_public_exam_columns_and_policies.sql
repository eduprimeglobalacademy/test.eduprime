ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_public_exam boolean NOT NULL DEFAULT false;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES admin_users(id);
ALTER TABLE tests ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Narrow, deliberate exception to "admins can't see individual tests" —
-- only the specific slice they need to act on.
CREATE POLICY "admin_reads_pending_approval_tests"
  ON tests FOR SELECT
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id() AND status = 'pending_approval');

CREATE POLICY "admin_approves_pending_tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id() AND status = 'pending_approval')
  WITH CHECK (is_admin() AND org_id = auth_admin_org_id());
