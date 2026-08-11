/*
  # Per-test student blocking

  Class-level blocking (`class_students.blocked`, prior migration) bars a
  student from every Google-gated test under a class. Teachers also want
  to block one specific student from one specific test without touching
  their standing in the rest of the class — and to be able to configure
  that block while building the assessment, not just after the fact.

  1. New Tables
    - `test_blocked_students` — one row per (test, email) block. Works
      even when the test has no class (closes the "classless gated test
      can't block anyone" gap from the previous migration).

  2. Security
    - Same ownership shape as every other teacher-owned table: a teacher
      manages blocks only on their own tests.
*/

CREATE TABLE IF NOT EXISTS test_blocked_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  blocked_at timestamptz DEFAULT now(),
  UNIQUE (test_id, student_email)
);

CREATE INDEX IF NOT EXISTS idx_test_blocked_students_test_id ON test_blocked_students(test_id);
CREATE INDEX IF NOT EXISTS idx_test_blocked_students_org_id ON test_blocked_students(org_id);

CREATE OR REPLACE FUNCTION set_test_blocked_students_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM tests WHERE id = NEW.test_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_test_blocked_students_org_id ON test_blocked_students;
CREATE TRIGGER trg_set_test_blocked_students_org_id
  BEFORE INSERT ON test_blocked_students
  FOR EACH ROW EXECUTE FUNCTION set_test_blocked_students_org_id();

ALTER TABLE test_blocked_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_manage_own_test_blocks"
  ON test_blocked_students FOR ALL
  TO authenticated
  USING (test_id IN (SELECT id FROM tests WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
  WITH CHECK (test_id IN (SELECT id FROM tests WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())));

-- Student-facing exam-entry gate needs to check whether the signed-in
-- email is blocked on this specific test. Same shape as
-- students_read_own_enrollment on class_students.
CREATE POLICY "students_check_own_test_block"
  ON test_blocked_students FOR SELECT
  TO authenticated
  USING (student_email = (auth.jwt() ->> 'email'));
