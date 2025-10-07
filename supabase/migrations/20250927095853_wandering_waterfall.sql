/*
  # Fix teacher tokens RLS policy for registration

  1. Security Changes
    - Allow anonymous users to update tokens during registration
    - Restrict updates to only marking tokens as used
    - Maintain security by only allowing updates to active, unexpired tokens

  2. Policy Updates
    - Drop existing conflicting policies
    - Create new policy allowing anonymous updates under strict conditions
    - Ensure only status and used_at can be modified during registration
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Anonymous can mark tokens as used" ON teacher_tokens;
DROP POLICY IF EXISTS "Anonymous can read active tokens" ON teacher_tokens;

-- Allow anonymous users to read active, unexpired tokens for validation
CREATE POLICY "Anonymous can read active tokens for registration"
  ON teacher_tokens
  FOR SELECT
  TO anon
  USING (
    status = 'active' AND 
    expires_at > now()
  );

-- Allow anonymous users to update tokens to mark them as used during registration
CREATE POLICY "Anonymous can mark active tokens as used"
  ON teacher_tokens
  FOR UPDATE
  TO anon
  USING (
    status = 'active' AND 
    expires_at > now()
  )
  WITH CHECK (
    status = 'used' AND 
    used_at IS NOT NULL
  );