/*
  # Fix teacher authentication

  1. Schema Updates
    - Add `user_id` column to `teachers` table to link with Supabase Auth
    - Update foreign key constraints
    - Update RLS policies to work with proper auth integration

  2. Security
    - Update RLS policies to use `user_id` for authentication
    - Ensure teachers can only access their own data
*/

-- Add user_id column to teachers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teachers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE teachers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies for teachers table
DROP POLICY IF EXISTS "Teachers can read own profile" ON teachers;
DROP POLICY IF EXISTS "Teachers can update own profile" ON teachers;
DROP POLICY IF EXISTS "Admins can manage all teachers" ON teachers;

CREATE POLICY "Teachers can read own profile"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can update own profile"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all teachers"
  ON teachers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

-- Update tests table RLS policies to work with proper teacher auth
DROP POLICY IF EXISTS "Teachers can manage own tests" ON tests;

CREATE POLICY "Teachers can manage own tests"
  ON tests
  FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT teachers.id
      FROM teachers
      WHERE teachers.user_id = auth.uid()
    )
  );

-- Update questions table RLS policies
DROP POLICY IF EXISTS "Teachers can manage questions for own tests" ON questions;

CREATE POLICY "Teachers can manage questions for own tests"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    test_id IN (
      SELECT t.id
      FROM tests t
      JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
  );

-- Update question_options table RLS policies
DROP POLICY IF EXISTS "Teachers can manage options for own questions" ON question_options;

CREATE POLICY "Teachers can manage options for own questions"
  ON question_options
  FOR ALL
  TO authenticated
  USING (
    question_id IN (
      SELECT q.id
      FROM questions q
      JOIN tests t ON q.test_id = t.id
      JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
  );

-- Update test_attempts table RLS policies
DROP POLICY IF EXISTS "Teachers can view attempts for own tests" ON test_attempts;

CREATE POLICY "Teachers can view attempts for own tests"
  ON test_attempts
  FOR SELECT
  TO authenticated
  USING (
    test_id IN (
      SELECT t.id
      FROM tests t
      JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
  );

-- Update student_answers table RLS policies
DROP POLICY IF EXISTS "Teachers can view answers for own tests" ON student_answers;

CREATE POLICY "Teachers can view answers for own tests"
  ON student_answers
  FOR SELECT
  TO authenticated
  USING (
    attempt_id IN (
      SELECT ta.id
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
  );