/*
  # Configurable extra student details for public exams

  Public exams (is_public_exam) collected the same name/email/phone as
  every other test. Teachers running a public exam (open recruitment
  drives, inter-college tests) often need more — college name, section,
  course, year of study, semester — but not every public exam needs all
  five, and no other test needs any of them. Rather than hardcoding the
  five as always-collected, the teacher picks which apply per test:
  tests.student_detail_fields is that chosen subset (a plain text array of
  field keys, validated in the app layer — this is a small fixed palette,
  not a generic custom-field system). test_attempts gets one nullable
  column per possible field, populated only for the ones a given test
  actually asked for; every existing/non-public test leaves them all null.
*/

ALTER TABLE tests ADD COLUMN IF NOT EXISTS student_detail_fields text[] NOT NULL DEFAULT '{}';

ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS college_name text;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS course text;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS year_of_study text;
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS semester text;
