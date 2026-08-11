/*
  # Class roster + optional Google-auth gate before exam entry

  Students have never authenticated on this platform — they join via a
  test code with a self-reported name/email/phone. This adds an
  opt-in-per-test alternative: a teacher can require a student to prove
  their identity via Google sign-in before they can even enter a code,
  and (when the test belongs to a class) require they already be on
  that class's roster — enrolled via a magic link the teacher shares,
  which is the only thing `class_students` rows get written by, besides
  the teacher's own management of the roster.

  1. New Tables
    - `class_students` — one row per student enrolled in one class, via
      Google sign-in at `/enroll?class=<id>`. `blocked` is what lets a
      teacher bar a specific enrolled student from that class's gated
      tests even though they still have a valid test code.

  2. Schema Changes
    - `tests.require_google_auth` — nullable-safe boolean, default false,
      so every existing and future test keeps the anonymous code-only
      flow unless a teacher opts in.

  3. Security
    - Teacher manages their own classes' rosters, same ownership shape
      as every other teacher-owned table.
    - A signed-in student (an authenticated Supabase user with no
      admin_users/teachers row — a different identity than teacher/admin
      accounts on this same project) may only ever insert or read the
      roster row matching their OWN authenticated email — enforced via
      `auth.jwt() ->> 'email'`, not something the client can spoof by
      sending a different email in the request body. They can never see
      another student's row or another class's roster.
*/

CREATE TABLE IF NOT EXISTS class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  student_name text,
  blocked boolean NOT NULL DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (class_id, student_email)
);

CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_org_id ON class_students(org_id);

CREATE OR REPLACE FUNCTION set_class_students_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM classes WHERE id = NEW.class_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_class_students_org_id ON class_students;
CREATE TRIGGER trg_set_class_students_org_id
  BEFORE INSERT ON class_students
  FOR EACH ROW EXECUTE FUNCTION set_class_students_org_id();

ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_manage_own_class_roster"
  ON class_students FOR ALL
  TO authenticated
  USING (class_id IN (SELECT id FROM classes WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
  WITH CHECK (class_id IN (SELECT id FROM classes WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())));

CREATE POLICY "students_enroll_self"
  ON class_students FOR INSERT
  TO authenticated
  WITH CHECK (student_email = (auth.jwt() ->> 'email'));

CREATE POLICY "students_read_own_enrollment"
  ON class_students FOR SELECT
  TO authenticated
  USING (student_email = (auth.jwt() ->> 'email'));

-- ============================================================
-- tests.require_google_auth
-- ============================================================

ALTER TABLE tests ADD COLUMN IF NOT EXISTS require_google_auth boolean NOT NULL DEFAULT false;
