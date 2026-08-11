/*
  # Restore anonymous student write access to test_attempts / student_answers

  Critical bug found via end-to-end student-flow testing: submitting a test
  as an anonymous student failed outright with a 42501 RLS violation on
  INSERT into test_attempts. The original migration (20250927033854) created
  open `TO anon WITH CHECK (true)` INSERT policies for both test_attempts
  and student_answers — students never authenticate, so this is the only
  way test submission can work at all. Neither policy is dropped by name in
  any tracked migration, but the live database's actual policy set had
  drifted from what's tracked (see the untracked-policy cleanup migration,
  20260811000000, whose own name acknowledges this happened before) — this
  migration doesn't try to diagnose exactly when/how, it just re-asserts
  the policies that must exist, idempotently, so this can't silently
  regress again.

  This was never caught by seed data or admin/teacher testing because
  seeding writes via service_role (bypasses RLS entirely) and this session's
  earlier real usage never exercised the actual student submit path.
*/

DROP POLICY IF EXISTS "Anyone can create test attempts" ON test_attempts;
CREATE POLICY "Anyone can create test attempts"
  ON test_attempts FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create answers" ON student_answers;
CREATE POLICY "Anyone can create answers"
  ON student_answers FOR INSERT
  TO anon
  WITH CHECK (true);
