-- Diagnostic only, scoped to one specific disposable test row, removed immediately after.
DROP POLICY IF EXISTS "admin_approves_pending_tests" ON tests;
CREATE POLICY "admin_approves_pending_tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (id = '31d80ed8-09ac-48fb-b54e-50d1cd284f71')
  WITH CHECK (id = '31d80ed8-09ac-48fb-b54e-50d1cd284f71');
