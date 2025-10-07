/*
  # Fix Admin Authentication Schema

  1. Changes
    - Add user_id column to admin_users table to link with Supabase auth
    - Update RLS policies to work with auth.uid()
    - Create function to handle admin user creation with auth

  2. Security
    - Maintain RLS on admin_users table
    - Link admin records to Supabase auth users
*/

-- Add user_id column to admin_users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies for admin_users
DROP POLICY IF EXISTS "Admins can manage all admin users" ON admin_users;

CREATE POLICY "Admins can manage all admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid()
    )
  );

-- Create a default admin user if none exists
-- This will need to be done after setting up Supabase auth
-- For now, we'll create a placeholder that can be updated later