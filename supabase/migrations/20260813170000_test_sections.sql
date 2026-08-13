/*
  # Test sections — configurable cross-section navigation and timing

  Adds an optional grouping layer above questions. A test with zero
  `test_sections` rows behaves exactly as today — `questions.section_id`
  is nullable specifically so every existing test (and every test that
  never opts into sections) stays "unsectioned" with no behavior change.

  timing_mode:
    - 'untimed' — no section-level timer, only the test-level duration_minutes
      (if set) bounds it, same as today's no-timer case.
    - 'fixed' — one countdown of duration_minutes for the whole section.
    - 'per_question_summed' — one countdown for the whole section equal to
      the SUM of its questions' time_limit_seconds — a new mode, distinct
      from the existing per_question_timing (which gives each question its
      own independent hard-cutoff countdown).

  allow_free_navigation: true = student can jump to any section anytime;
  false = sequential/locked — once you leave a section you can't return.
  Within-section back-navigation keeps using the existing test-level
  allow_navigation_back flag rather than duplicating it per section.
*/

CREATE TABLE IF NOT EXISTS test_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  title text NOT NULL,
  section_order integer NOT NULL,
  timing_mode text NOT NULL DEFAULT 'untimed' CHECK (timing_mode IN ('untimed', 'fixed', 'per_question_summed')),
  duration_minutes integer,
  allow_free_navigation boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_sections_test_id ON test_sections(test_id);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES test_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_section_id ON questions(section_id);

ALTER TABLE test_sections ENABLE ROW LEVEL SECURITY;

-- Same ownership shape as `questions`: a teacher manages sections on tests
-- they own or collaborate on; students/anon never touch this table
-- directly (TestInterface reads it through the test_id join like it does
-- for questions), so a plain SELECT-if-you-can-see-the-test policy is
-- enough for the exam-taking read path too.
CREATE POLICY "teachers_manage_own_test_sections"
  ON test_sections FOR ALL
  TO authenticated
  USING (test_id IN (SELECT id FROM tests WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())) OR test_id IN (SELECT test_id FROM test_collaborators WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
  WITH CHECK (test_id IN (SELECT id FROM tests WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())) OR test_id IN (SELECT test_id FROM test_collaborators WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())));

CREATE POLICY "anon_reads_live_test_sections"
  ON test_sections FOR SELECT
  TO anon
  USING (test_id IN (SELECT id FROM tests WHERE status = 'live'));
