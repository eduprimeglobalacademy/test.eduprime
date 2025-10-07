/*
  # Remove magic link system and simplify test access

  1. Changes
    - Remove magic_link column from tests table
    - Update test creation to not require magic_link
    - Simplify test access to use only test codes

  2. Security
    - Maintain existing RLS policies
    - Keep test code based access
*/

-- Remove magic_link column from tests table
ALTER TABLE tests DROP COLUMN IF EXISTS magic_link;

-- Update tests table constraints if needed
-- The test_code column remains as the primary way to access tests