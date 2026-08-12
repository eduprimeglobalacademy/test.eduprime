/*
  # Revert the write-time student cap — enforcement moves to read-side

  20260813030000 gated test_attempts INSERT on capacity — but that table
  is only ever inserted once, at final submission (TestInterface.tsx),
  not at join time. A capacity block there means a student could
  complete an entire exam and only discover the block at the very end —
  worse than no enforcement at all, and exactly the "riskier kind of
  block" the original hard-limits migration explicitly avoided for this
  reason.

  Real fix: capacity gates whether the ORG can VIEW results past their
  included limit (TestReports.tsx, application-level), not whether a
  student can submit. No RLS/write-path change needed for that — a
  teacher already legitimately owns full SELECT access to their own
  test's attempts; withholding detail past a cap is a product/paywall
  UI decision, not a security boundary. org_within_test_student_limit()
  is no longer used by anything and is dropped along with it.
*/

DROP POLICY IF EXISTS "anon_creates_test_attempts" ON test_attempts;
CREATE POLICY "anon_creates_test_attempts"
  ON test_attempts FOR INSERT
  TO anon
  WITH CHECK (true);

DROP FUNCTION IF EXISTS org_within_test_student_limit(uuid);
