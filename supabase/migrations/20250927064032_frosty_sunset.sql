/*
  # Add time_limit_seconds column to questions table

  1. Changes
    - Add `time_limit_seconds` column to `questions` table
    - Set as nullable integer for per-question timing functionality
    - Add default value of NULL (no time limit by default)

  2. Notes
    - Used IF NOT EXISTS to prevent errors if column already exists
    - Column allows NULL values for questions without individual time limits
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'time_limit_seconds'
  ) THEN
    ALTER TABLE questions ADD COLUMN time_limit_seconds integer DEFAULT NULL;
  END IF;
END $$;