/*
  # Reusable question bank

  Lets a teacher save a question (with its options) once and reuse it
  across tests, instead of retyping it. Shared at the org level, not just
  the creating teacher — a school running several sections of the same
  course benefits most when any of their teachers can pull from it.

  1. New Tables
    - `question_bank_items` / `question_bank_options` — deliberately
      separate from `questions`/`question_options` rather than reusing
      those tables with a nullable test_id. A bank item isn't "a question
      not yet attached to a test", it's a template: adding it to a test
      COPIES it into that test's own questions/question_options rows, so
      editing the test's copy later never mutates the shared bank source,
      and editing the bank source never silently changes a test that
      already shipped to students.

  2. Security
    - Org-wide SELECT (any teacher in the org can browse and reuse any
      bank item, matching the "shared across the org" intent) but
      write access (create/update/delete) restricted to the teacher who
      created it — reusing someone else's saved question is fine, editing
      it out from under them isn't.
*/

CREATE TABLE IF NOT EXISTS question_bank_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  points integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_bank_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_item_id uuid REFERENCES question_bank_items(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false,
  option_order integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_question_bank_items_org_id ON question_bank_items(org_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_options_item_id ON question_bank_options(bank_item_id);

CREATE OR REPLACE FUNCTION set_bank_item_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM teachers WHERE id = NEW.teacher_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_bank_item_org_id ON question_bank_items;
CREATE TRIGGER trg_set_bank_item_org_id
  BEFORE INSERT ON question_bank_items
  FOR EACH ROW EXECUTE FUNCTION set_bank_item_org_id();

ALTER TABLE question_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_reads_bank_items"
  ON question_bank_items FOR SELECT
  TO authenticated
  USING (org_id = auth_teacher_org_id());

CREATE POLICY "teacher_manages_own_bank_items"
  ON question_bank_items FOR ALL
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "org_reads_bank_options"
  ON question_bank_options FOR SELECT
  TO authenticated
  USING (bank_item_id IN (SELECT id FROM question_bank_items WHERE org_id = auth_teacher_org_id()));

CREATE POLICY "teacher_manages_own_bank_options"
  ON question_bank_options FOR ALL
  TO authenticated
  USING (bank_item_id IN (SELECT id FROM question_bank_items WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
  WITH CHECK (bank_item_id IN (SELECT id FROM question_bank_items WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())));
