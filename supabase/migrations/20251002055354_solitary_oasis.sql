/*
  # Add admin delete policies for teacher management

  1. Security
    - Add policy for admins to delete teachers
    - Add policy for admins to delete teacher tokens
    - Ensure proper cascade deletion
*/

-- Allow admins to delete teachers
CREATE POLICY "admin_delete_teachers"
  ON teachers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Allow admins to delete teacher tokens
CREATE POLICY "admin_delete_tokens"
  ON teacher_tokens
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Ensure proper foreign key constraints for cascade deletion
ALTER TABLE teachers 
DROP CONSTRAINT IF EXISTS teachers_user_id_fkey;

ALTER TABLE teachers 
ADD CONSTRAINT teachers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) 
ON DELETE CASCADE;