/*
  # Fix teacher_tokens INSERT policy for admins

  1. Security Changes
    - Drop existing problematic policies on teacher_tokens
    - Create new INSERT policy allowing authenticated admin users
    - Create new SELECT policy for reading tokens
    - Ensure admins can manage teacher tokens properly

  2. Policy Details
    - INSERT: Allow authenticated users who exist in admin_users table
    - SELECT: Allow service_role and authenticated admins to read tokens
    - Anonymous users can only read valid, unused tokens for registration
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Anonymous can read valid tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "Service role can manage teacher tokens" ON teacher_tokens;

-- Create new INSERT policy for admins
CREATE POLICY "Admins can create teacher tokens"
  ON teacher_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE user_id = auth.uid())
  );

-- Create new SELECT policy for admins and service role
CREATE POLICY "Admins can read teacher tokens"
  ON teacher_tokens
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE user_id = auth.uid())
  );

-- Allow anonymous users to read valid tokens for registration
CREATE POLICY "Anonymous can read valid tokens for registration"
  ON teacher_tokens
  FOR SELECT
  TO anon
  USING (
    expires_at > now() AND used_at IS NULL
  );

-- Allow service role full access for system operations
CREATE POLICY "Service role full access"
  ON teacher_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);