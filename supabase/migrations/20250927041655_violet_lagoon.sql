/*
  # Create demo admin user

  1. New Tables
    - Creates a demo admin user in the admin_users table
  2. Security
    - Links to Supabase auth system properly
  3. Notes
    - This creates the database record, but the actual auth user (admin@edutest.com) 
      needs to be created in Supabase Auth dashboard with password 'admin123'
*/

-- Insert demo admin user record
-- Note: This assumes the auth user will be created with this UUID
-- In practice, you'd create the auth user first and use its actual UUID
INSERT INTO admin_users (id, email, name, user_id) 
VALUES (
  gen_random_uuid(),
  'admin@edutest.com',
  'System Administrator',
  NULL  -- This will need to be updated with actual auth user UUID
) ON CONFLICT (email) DO NOTHING;