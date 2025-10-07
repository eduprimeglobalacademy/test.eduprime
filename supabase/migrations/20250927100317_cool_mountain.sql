/*
  # Allow anonymous users to update teacher tokens during registration

  1. Security
    - Allow anonymous users to update tokens only to mark them as used
    - Maintain all existing admin policies
    - Ensure tokens can only be updated once (from active to used)
*/

-- First, let's see what policies exist and drop the problematic ones
DROP POLICY IF EXISTS "anon_read_active_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "anon_update_tokens_to_used" ON teacher_tokens;
DROP POLICY IF EXISTS "admin_create_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "admin_read_all_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "service_role_full_access" ON teacher_tokens;

-- Create a policy that allows anonymous users to read active tokens
CREATE POLICY "anon_read_active_tokens" ON teacher_tokens
  FOR SELECT
  TO anon
  USING (status = 'active' AND expires_at > now());

-- Create a policy that allows anonymous users to update tokens to mark as used
CREATE POLICY "anon_update_tokens_to_used" ON teacher_tokens
  FOR UPDATE
  TO anon
  USING (status = 'active' AND expires_at > now())
  WITH CHECK (status = 'used' AND used_at IS NOT NULL);

-- Recreate admin policies
CREATE POLICY "admin_create_tokens" ON teacher_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "admin_read_all_tokens" ON teacher_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Service role full access
CREATE POLICY "service_role_full_access" ON teacher_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);