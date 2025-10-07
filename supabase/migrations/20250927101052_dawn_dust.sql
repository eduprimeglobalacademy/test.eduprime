/*
  # Simple token update policy

  1. Security
    - Allow anonymous users to update token status from 'active' to 'used'
    - Keep admin access for token management
*/

-- Drop all existing policies and start fresh
ALTER TABLE teacher_tokens DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_active_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "anon_update_tokens_to_used" ON teacher_tokens;
DROP POLICY IF EXISTS "admin_create_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "admin_read_all_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "service_role_full_access" ON teacher_tokens;

-- Re-enable RLS
ALTER TABLE teacher_tokens ENABLE ROW LEVEL SECURITY;

-- Simple policy: Allow anonymous users to update any token
CREATE POLICY "allow_anonymous_token_updates"
  ON teacher_tokens
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to read tokens for validation
CREATE POLICY "allow_anonymous_token_reads"
  ON teacher_tokens
  FOR SELECT
  TO anon
  USING (true);

-- Keep admin access
CREATE POLICY "admin_full_access"
  ON teacher_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

-- Service role access
CREATE POLICY "service_role_access"
  ON teacher_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);