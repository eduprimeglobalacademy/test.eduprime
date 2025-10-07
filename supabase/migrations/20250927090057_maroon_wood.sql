/*
  # Add admin access to teachers table

  1. Security
    - Add policy for admins to read teachers table
    - Allows admin users to view all registered teachers for management purposes
*/

-- Allow admins to read all teachers
CREATE POLICY "Admins can read all teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );