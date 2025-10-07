/*
  # Add admin access to teachers table

  1. Security
    - Add policy for admins to read all teacher data
    - Admins need to see all registered teachers in the dashboard
*/

-- Add policy for admins to read all teacher data
CREATE POLICY "admin_read_all_teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );