/*
  # Restore missing teacher SELECT policy on test_attempts

  Found while verifying the student-capacity read-side gate work
  (TestReports.tsx showing "No Submissions Yet" for a test with 5 real,
  service-role-visible attempts). Direct pg_policies introspection
  showed test_attempts has ONLY the anon INSERT policy — no SELECT
  policy for authenticated teachers at all, pre-existing and unrelated
  to this session's changes (student_answers has the equivalent working
  policy, teacher_view_own_test_answers, confirming the pattern was
  intended here too but never applied/was dropped without a
  replacement). This has been silently blocking every teacher from
  seeing their own students' results via RLS.
*/

CREATE POLICY "teachers_view_own_tests_attempts"
  ON test_attempts FOR SELECT
  TO authenticated
  USING (owns_test(test_id) OR is_test_collaborator(test_id));
