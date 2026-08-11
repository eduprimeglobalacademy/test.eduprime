/*
  # Platform admin read access to admin_users

  Fixes a gap from the original Phase 4 grant (20260810170000_platform_admin.sql):
  platform admins got cross-org SELECT on organizations/plans/subscriptions/
  teachers/tests for the console's org directory and support views, but
  admin_users was left out — so "admin contact" on an org never had a row
  to read, in either the old SuperAdminConsole or the new standalone
  eduprime-admin app. Same posture as the existing teachers grant: email/
  name only, no access to test_attempts/student_answers/questions.
*/

CREATE POLICY "platform_admin_reads_all_admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (is_platform_admin());
