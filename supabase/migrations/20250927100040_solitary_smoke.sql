/*
  # Reset and fix teacher tokens RLS policies

  1. Security Changes
    - Drop all existing policies that may be conflicting
    - Create new policies that allow anonymous token updates during registration
    - Maintain admin access for token management
    - Allow service role full access

  2. Policy Details
    - Anonymous users can read active, unexpired tokens
    - Anonymous users can update tokens to mark as used
    - Admins can create and manage all tokens
    - Service role has full access
*/

-- Disable RLS temporarily to clean up
ALTER TABLE teacher_tokens DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow anon update of active teacher tokens for signup" ON teacher_tokens;
DROP POLICY IF EXISTS "Anonymous can mark tokens as used" ON teacher_tokens;
DROP POLICY IF EXISTS "Anonymous can read active tokens for registration" ON teacher_tokens;
DROP POLICY IF EXISTS "Admins can create teacher tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "Admins can read teacher tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "Service role full access" ON teacher_tokens;
DROP POLICY IF EXISTS "Anonymous can mark active tokens as used" ON teacher_tokens;
DROP POLICY IF EXISTS "Anonymous can read valid tokens for registration" ON teacher_tokens;

-- Re-enable RLS
ALTER TABLE teacher_tokens ENABLE ROW LEVEL SECURITY;

-- Create new policies with correct permissions

-- Allow anonymous users to read active tokens for validation
CREATE POLICY "anon_read_active_tokens"
ON teacher_tokens
FOR SELECT
TO anon
USING (
  status = 'active' AND 
  expires_at > now()
);

-- Allow anonymous users to update tokens to mark as used
CREATE POLICY "anon_update_tokens_to_used"
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

-- Allow admins to create tokens
CREATE POLICY "admin_create_tokens"
ON teacher_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to read all tokens
CREATE POLICY "admin_read_all_tokens"
ON teacher_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow service role full access
CREATE POLICY "service_role_full_access"
ON teacher_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);