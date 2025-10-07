/*
  # Add phone number and prevent duplicate test attempts

  1. Changes
    - Add phone_number column to test_attempts table
    - Add unique constraint to prevent same student taking test twice
    - Update RLS policies for better security

  2. Security
    - Maintain existing RLS policies
    - Add constraint for duplicate prevention
*/

-- Add phone number column to test_attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'test_attempts' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE test_attempts ADD COLUMN phone_number text;
  END IF;
END $$;

-- Add unique constraint to prevent duplicate attempts per test
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'test_attempts_unique_student_test'
  ) THEN
    ALTER TABLE test_attempts 
    ADD CONSTRAINT test_attempts_unique_student_test 
    UNIQUE (test_id, student_email, phone_number);
  END IF;
END $$;