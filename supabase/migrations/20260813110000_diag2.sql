DROP POLICY IF EXISTS "admin_approves_pending_tests" ON tests;
CREATE POLICY "admin_approves_pending_tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id() AND status::text = 'pending_approval')
  WITH CHECK (is_admin());
