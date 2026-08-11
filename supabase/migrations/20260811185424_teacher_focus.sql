/*
  # Teacher Focus — a personal watchlist

  Teachers asked for a way to manually flag a specific student (by email
  — students aren't authenticated accounts, they're identified by the
  email they enter when joining a test) or a whole class as "keep an eye
  on this" and see it surfaced separately from the rest of the dashboard.
  Deliberately manual only — no automatic below-threshold triggering.

  1. New Tables
    - `teacher_focus` — one row per flagged student or class, owned by
      one teacher. `kind` discriminates which of `student_email`/
      `class_id` is populated; the CHECK constraint enforces exactly one
      shape per row rather than trusting the client to leave the other
      column null.

  2. Security
    - Same ownership shape as `classes`: a teacher manages their own
      focus list. No admin-read policy — unlike `classes`, this is a
      personal watchlist, not org-oversight data, so there's nothing for
      an org admin to review here.
*/

CREATE TABLE IF NOT EXISTS teacher_focus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('student', 'class')),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  student_email text,
  student_name text,
  note text,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (kind = 'student' AND student_email IS NOT NULL AND class_id IS NULL) OR
    (kind = 'class' AND class_id IS NOT NULL AND student_email IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_teacher_focus_teacher_id ON teacher_focus(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_focus_org_id ON teacher_focus(org_id);

CREATE OR REPLACE FUNCTION set_teacher_focus_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM teachers WHERE id = NEW.teacher_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_teacher_focus_org_id ON teacher_focus;
CREATE TRIGGER trg_set_teacher_focus_org_id
  BEFORE INSERT ON teacher_focus
  FOR EACH ROW EXECUTE FUNCTION set_teacher_focus_org_id();

ALTER TABLE teacher_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_manage_own_focus"
  ON teacher_focus FOR ALL
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
