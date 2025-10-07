/*
  # Add status field to teacher_tokens

  1. Changes
    - Add `status` enum field to track token state
    - Update existing tokens to have 'active' status
    - Add policy for anonymous users to update token status

  2. Security
    - Allow anonymous users to mark tokens as 'used'
    - Maintain existing admin policies
*/

-- Create enum for token status
CREATE TYPE token_status AS ENUM ('active', 'used', 'expired');

-- Add status column to teacher_tokens
ALTER TABLE teacher_tokens 
ADD COLUMN status token_status DEFAULT 'active';

-- Update existing tokens to have active status
UPDATE teacher_tokens 
SET status = CASE 
  WHEN used_at IS NOT NULL THEN 'used'::token_status
  WHEN expires_at < now() THEN 'expired'::token_status
  ELSE 'active'::token_status
END;

-- Drop existing policies
DROP POLICY IF EXISTS "Anonymous can read valid tokens for registration" ON teacher_tokens;
DROP POLICY IF EXISTS "Anonymous can mark tokens as used" ON teacher_tokens;
DROP POLICY IF EXISTS "Admins can create teacher tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "Admins can read teacher tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "Service role full access" ON teacher_tokens;

-- Allow anonymous users to read active tokens
CREATE POLICY "Anonymous can read active tokens"
  ON teacher_tokens
  FOR SELECT
  TO anon
  USING (status = 'active' AND expires_at > now());

-- Allow anonymous users to mark tokens as used (atomic operation)
CREATE POLICY "Anonymous can mark tokens as used"
  ON teacher_tokens
  FOR UPDATE
  TO anon
  USING (status = 'active' AND expires_at > now())
  WITH CHECK (status = 'used');

-- Admin policies
CREATE POLICY "Admins can create teacher tokens"
  ON teacher_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can read teacher tokens"
  ON teacher_tokens
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  ));

-- Service role full access
CREATE POLICY "Service role full access"
  ON teacher_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);