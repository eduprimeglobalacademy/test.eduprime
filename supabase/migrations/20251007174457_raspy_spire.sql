/*
  # Add grading system configuration to tests

  1. Changes
    - Add grading_config JSONB column to tests table to store grading thresholds
    - Set default grading configuration (A=90%, B=80%, C=70%, D=60%, Pass=60%)

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

-- Add grading configuration column to tests table
ALTER TABLE tests ADD COLUMN IF NOT EXISTS grading_config JSONB DEFAULT '{
  "aGrade": 90,
  "bGrade": 80, 
  "cGrade": 70,
  "dGrade": 60,
  "passingGrade": 60
}'::jsonb;