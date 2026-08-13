/*
  # Multiple question types (single_select, multi_select, true_false, short_answer)

  Every question/answer today is hardcoded single-select MCQ. This adds a
  type discriminator plus the extra answer columns each new type needs,
  additively — existing rows default to 'single_select' and keep using
  `selected_option_id` exactly as before, so no existing test or grading
  path changes behavior.

  - `multi_select`: correctness is exact-set-match, computed client-side
    (TestInterface.tsx) same as single_select is today — no DB-side
    grading logic exists for any type, so none is added here.
  - `short_answer`: reuses `question_options` as "acceptable answers"
    (each an `is_correct=true` row) rather than a new table — matches the
    existing shape (options belong to a question) and needs zero new
    schema for the authoring side.
  - `true_false`: no new columns — it's a thin UI convention over
    single_select's existing 2-option shape.

  question_bank_items/options get the same column so bank questions carry
  their type through when copied into a test's own questions.
*/

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'single_select'
    CHECK (question_type IN ('single_select', 'multi_select', 'true_false', 'short_answer'));

ALTER TABLE student_answers
  ADD COLUMN IF NOT EXISTS selected_option_ids uuid[],
  ADD COLUMN IF NOT EXISTS answer_text text;

ALTER TABLE question_bank_items
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'single_select'
    CHECK (question_type IN ('single_select', 'multi_select', 'true_false', 'short_answer'));
