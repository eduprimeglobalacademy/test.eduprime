/*
  # Remove problematic RLS policies causing infinite recursion

  1. Security Changes
    - Drop all existing RLS policies that cause circular dependencies
    - Create simple, direct policies without cross-table references
    - Ensure no recursive policy evaluation

  2. Tables Affected
    - admin_users: Simplified admin access
    - teachers: Direct user-based access
    - teacher_tokens: Admin-only management
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage teacher tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "Anyone can read valid tokens for registration" ON teacher_tokens;
DROP POLICY IF EXISTS "Admins can manage all teachers" ON teachers;
DROP POLICY IF EXISTS "Teachers can read own profile" ON teachers;
DROP POLICY IF EXISTS "Teachers can update own profile" ON teachers;

-- Create simple, non-recursive policies for admin_users
CREATE POLICY "Admin users can manage themselves"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create simple policies for teachers
CREATE POLICY "Teachers can manage own profile"
  ON teachers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create simple policies for teacher_tokens (admin access only)
CREATE POLICY "Service role can manage teacher tokens"
  ON teacher_tokens
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Anonymous can read valid tokens"
  ON teacher_tokens
  FOR SELECT
  TO anon
  USING (expires_at > now() AND used_at IS NULL);