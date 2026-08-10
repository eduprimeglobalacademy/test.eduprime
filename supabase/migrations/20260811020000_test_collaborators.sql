/*
  # Co-teaching (test collaborators)

  Lets a second teacher share ownership of a specific test: view/edit its
  questions, view its reports. One teacher still creates a test and stays
  the only one who can delete it, add/remove collaborators, or is counted
  against plan limits for it — collaboration is additive access, not
  co-ownership of billing/quota.

  1. New Tables
    - `test_collaborators` — join table, test_id + teacher_id, unique pair.

  2. Bug fix, found while writing this
    - `teachers_view_own_org_attempts` (Phase 0) scoped test_attempts SELECT
      to `org_id = auth_teacher_org_id()` — org-wide, not test-ownership-
      scoped. Any teacher could already read every other teacher's
      students' attempts (name/email/phone/score) within the same org,
      which was never the intent (the original single-tenant policy this
      replaced, "Teachers can view attempts for own tests", was correctly
      ownership-scoped). Replaced with a policy scoped to tests the
      teacher owns or collaborates on, same shape as everything else here.

  3. Security
    - `test_collaborators` itself: only the test's owning teacher can
      add/remove rows (INSERT/DELETE). SELECT is open to the owner and to
      whoever is already listed, so a collaborator can see who else has
      access — not to arbitrary other teachers.
    - tests/questions/question_options: existing owner-only policies
      extended with an OR clause for collaborators, rather than replaced,
      so ownership semantics (and the org_can_write billing gate on
      INSERT, untouched here) stay exactly as they were.
    - Collaborators can view and edit test content and view attempts —
      not delete the test, not manage collaborators, not create new tests
      under this grant (that's still gated by teacher_id ownership +
      org_can_write on the tests INSERT policy from Phase 3, unchanged).
    - `owns_test()`/`is_test_collaborator()` are SECURITY DEFINER on
      purpose, not an oversight: tests' own SELECT policy calls
      is_test_collaborator() (queries test_collaborators), and
      test_collaborators' own policy calls owns_test() (queries tests) —
      a genuine cross-table circular reference. As plain functions, each
      call would re-trigger the other table's RLS evaluation, which
      re-triggers the first again. SECURITY DEFINER runs the function's
      internal query as its owner (bypassing RLS for that query only),
      which breaks the cycle the same way this repo's very first migration
      history had to learn to do for the admin_users self-reference bug.
*/

CREATE TABLE IF NOT EXISTS test_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  UNIQUE (test_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_test_collaborators_test_id ON test_collaborators(test_id);
CREATE INDEX IF NOT EXISTS idx_test_collaborators_teacher_id ON test_collaborators(teacher_id);

ALTER TABLE test_collaborators ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_test_collaborator(check_test_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM test_collaborators tc
    JOIN teachers te ON te.id = tc.teacher_id
    WHERE tc.test_id = check_test_id AND te.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION owns_test(check_test_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM tests t
    JOIN teachers te ON te.id = t.teacher_id
    WHERE t.id = check_test_id AND te.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_test_collaborator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION owns_test(uuid) TO authenticated;

CREATE POLICY "owner_manages_collaborators"
  ON test_collaborators FOR ALL
  TO authenticated
  USING (owns_test(test_id))
  WITH CHECK (owns_test(test_id));

CREATE POLICY "collaborators_see_own_listing"
  ON test_collaborators FOR SELECT
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- ============================================================
-- Extend existing owner-only access to include collaborators
-- ============================================================

DROP POLICY IF EXISTS "teachers_view_edit_delete_own_tests" ON tests;
CREATE POLICY "teachers_view_edit_delete_own_tests"
  ON tests FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    OR is_test_collaborator(id)
  );

DROP POLICY IF EXISTS "teachers_update_own_tests" ON tests;
CREATE POLICY "teachers_update_own_tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    OR is_test_collaborator(id)
  )
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    OR is_test_collaborator(id)
  );

DROP POLICY IF EXISTS "teacher_manage_own_questions" ON questions;
CREATE POLICY "teacher_manage_own_questions"
  ON questions FOR ALL
  TO authenticated
  USING (
    test_id IN (SELECT t.id FROM tests t JOIN teachers te ON t.teacher_id = te.id WHERE te.user_id = auth.uid())
    OR is_test_collaborator(test_id)
  )
  WITH CHECK (
    test_id IN (SELECT t.id FROM tests t JOIN teachers te ON t.teacher_id = te.id WHERE te.user_id = auth.uid())
    OR is_test_collaborator(test_id)
  );

DROP POLICY IF EXISTS "teacher_manage_own_options" ON question_options;
CREATE POLICY "teacher_manage_own_options"
  ON question_options FOR ALL
  TO authenticated
  USING (
    question_id IN (
      SELECT q.id FROM questions q JOIN tests t ON q.test_id = t.id JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
    OR question_id IN (SELECT id FROM questions WHERE is_test_collaborator(test_id))
  )
  WITH CHECK (
    question_id IN (
      SELECT q.id FROM questions q JOIN tests t ON q.test_id = t.id JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
    OR question_id IN (SELECT id FROM questions WHERE is_test_collaborator(test_id))
  );

-- Replaces the org-wide bug described above with proper per-test scoping.
DROP POLICY IF EXISTS "teachers_view_own_org_attempts" ON test_attempts;
CREATE POLICY "teachers_view_own_tests_attempts"
  ON test_attempts FOR SELECT
  TO authenticated
  USING (owns_test(test_id) OR is_test_collaborator(test_id));

CREATE POLICY "collaborators_view_test_answers"
  ON student_answers FOR SELECT
  TO authenticated
  USING (
    attempt_id IN (SELECT id FROM test_attempts WHERE is_test_collaborator(test_id))
  );

-- ============================================================
-- Finding a colleague to add as a collaborator
-- ============================================================

-- Teachers have no SELECT visibility into other teachers' rows at all
-- (only their own, plus admins can read everyone in their org) — adding a
-- broad "teachers can read other teachers in their org" policy would
-- expose phone numbers and token_used to every colleague just to support
-- typing an email into an "add collaborator" box. This RPC returns only
-- what that box needs, scoped to the caller's own org.
CREATE OR REPLACE FUNCTION find_teacher_in_org(p_email text)
RETURNS TABLE (id uuid, name text, email text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT t.id, t.name, t.email
  FROM teachers t
  WHERE t.email = p_email
    AND t.org_id = auth_teacher_org_id();
$$;

GRANT EXECUTE ON FUNCTION find_teacher_in_org(text) TO authenticated;

-- Same problem in reverse: listing a test's collaborators with their
-- name/email for display would come back null on those fields via a
-- plain embedded join, since the viewer (the test owner, usually) has no
-- RLS visibility into other teachers' rows. SECURITY DEFINER bypasses
-- that for this narrow, already-access-checked read.
CREATE OR REPLACE FUNCTION get_test_collaborators(p_test_id uuid)
RETURNS TABLE (id uuid, teacher_id uuid, name text, email text, added_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT tc.id, tc.teacher_id, te.name, te.email, tc.added_at
  FROM test_collaborators tc
  JOIN teachers te ON te.id = tc.teacher_id
  WHERE tc.test_id = p_test_id
    AND (owns_test(p_test_id) OR is_test_collaborator(p_test_id));
$$;

GRANT EXECUTE ON FUNCTION get_test_collaborators(uuid) TO authenticated;
