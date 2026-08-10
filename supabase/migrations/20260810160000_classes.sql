/*
  # Classes / course sections

  An org can run several sections of the same course, or several courses
  entirely, at once (e.g. "Biology 101 — Section A" and "Section B", or
  unrelated "Biology 101" vs "Chemistry 101"). Until now `tests` only knew
  its teacher and org — there was no way to tell two sections' tests apart,
  filter a teacher's assessment list by section, or report on a specific
  section separately from the rest of a teacher's tests.

  1. New Tables
    - `classes` — a course section, owned by one teacher. Modeled on the
      four axes schools/SIS platforms (PowerSchool, Google Classroom,
      Ed-Fi) commonly separate: academic term, grade/year level, course
      or subject, and section. All four are free-text on purpose (e.g.
      "2026 Spring", "Grade 10", "Biology 101", "Section A") rather than
      their own normalized/lookup tables — there's no requirement yet for
      cross-org reporting *by* grade or term, just tagging and filtering
      within one org, so a rigid taxonomy would be premature.

  2. Schema Changes
    - `tests.class_id` — nullable, so every existing test (and any future
      one-off assessment not tied to a section) keeps working unchanged.

  3. Security
    - Same ownership shape as `tests`: a teacher manages their own classes;
      an org admin can read (not write) every class in their org for
      oversight, matching how admins already read all teachers.
    - `tests` INSERT/UPDATE additionally requires that `class_id`, if set,
      belongs to a class owned by that same teacher — otherwise a test
      could be filed under another teacher's (or another org's) class by
      simply sending a different id.
*/

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name text NOT NULL,
  course_name text,
  grade_level text,
  academic_term text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_org_id ON classes(org_id);

CREATE OR REPLACE FUNCTION set_class_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM teachers WHERE id = NEW.teacher_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_class_org_id ON classes;
CREATE TRIGGER trg_set_class_org_id
  BEFORE INSERT ON classes
  FOR EACH ROW EXECUTE FUNCTION set_class_org_id();

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_manage_own_classes"
  ON classes FOR ALL
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "admin_read_own_org_classes"
  ON classes FOR SELECT
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id());

-- ============================================================
-- tests.class_id
-- ============================================================

ALTER TABLE tests ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tests_class_id ON tests(class_id);

DROP POLICY IF EXISTS "teachers_update_own_tests" ON tests;
CREATE POLICY "teachers_update_own_tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND (class_id IS NULL OR class_id IN (SELECT id FROM classes WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
  );

DROP POLICY IF EXISTS "teachers_create_tests_if_org_can_write" ON tests;
CREATE POLICY "teachers_create_tests_if_org_can_write"
  ON tests FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND org_id = auth_teacher_org_id()
    AND org_can_write(org_id)
    AND (class_id IS NULL OR class_id IN (SELECT id FROM classes WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
  );
