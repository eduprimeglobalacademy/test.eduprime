/*
  # Assign one assessment to multiple classes

  tests.class_id stays exactly as-is (nullable, single FK) — every
  existing single-class or classless test keeps behaving identically.
  This adds test_classes as the actual multi-assignment list; class_id is
  kept in sync by the application as "the first selected class" purely so
  every place that already reads it for display keeps showing something
  sensible without being rewritten.
*/

CREATE TABLE IF NOT EXISTS test_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_test_classes_test_id ON test_classes(test_id);
CREATE INDEX IF NOT EXISTS idx_test_classes_class_id ON test_classes(class_id);

CREATE OR REPLACE FUNCTION set_test_classes_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM tests WHERE id = NEW.test_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_test_classes_org_id ON test_classes;
CREATE TRIGGER trg_set_test_classes_org_id
  BEFORE INSERT ON test_classes
  FOR EACH ROW EXECUTE FUNCTION set_test_classes_org_id();

ALTER TABLE test_classes ENABLE ROW LEVEL SECURITY;

-- Same ownership shape as tests' own INSERT check (hard_enforce_plan_limits.sql)
-- and class_students' teachers_manage_own_class_roster: a teacher may only link
-- their own tests to their own classes.
CREATE POLICY "teachers_manage_own_test_classes"
  ON test_classes FOR ALL
  TO authenticated
  USING (
    test_id IN (SELECT id FROM tests WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    test_id IN (SELECT id FROM tests WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
    AND class_id IN (SELECT id FROM classes WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  );

-- Same "non-sensitive, you have the id" reasoning as public_read_classes
-- (20260811193227) and the existing anon `tests` policy — a student
-- resolving a live test by code needs to know every class it's assigned
-- to, to check their own enrollment against any of them.
CREATE POLICY "public_reads_test_classes"
  ON test_classes FOR SELECT
  TO anon, authenticated
  USING (test_id IN (SELECT id FROM tests WHERE status = 'live'));
