DROP POLICY IF EXISTS "admin_approves_pending_tests" ON tests;
CREATE POLICY "admin_approves_pending_tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
