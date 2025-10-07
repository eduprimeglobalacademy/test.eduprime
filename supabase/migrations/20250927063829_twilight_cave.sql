/*
  # Add navigation and timing columns to tests table

  1. New Columns
    - `allow_navigation_back` (boolean) - Controls if students can navigate back to previous questions
    - `per_question_timing` (boolean) - Enables per-question timers instead of overall test timer

  2. Updates
    - Add columns with appropriate defaults
    - Update existing tests to have sensible defaults
*/

-- Add the missing columns to tests table
ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS allow_navigation_back boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS per_question_timing boolean DEFAULT false;

-- Update any existing tests to have the default values
UPDATE tests 
SET 
  allow_navigation_back = true,
  per_question_timing = false
WHERE 
  allow_navigation_back IS NULL 
  OR per_question_timing IS NULL;