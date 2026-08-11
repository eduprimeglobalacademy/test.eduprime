/*
  # Platform usage metrics + promotions tracking

  Backs the new standalone platform admin app (separate repo, same
  Supabase project). Two independent additions:

  1. `get_platform_usage()` — a SECURITY DEFINER function returning what
     can honestly be measured about Supabase resource usage from inside
     Postgres itself: database size, row counts on the tables that
     actually grow with usage, and the auth.users count. Deliberately
     does NOT attempt storage bytes, bandwidth/egress, or function
     invocations — those are metered by Supabase's own billing system
     and only exposed via the Management API (no org-level token
     available to this project), so the admin app shows those as
     "check your Supabase dashboard" rather than faking a number.
     Gated by is_platform_admin() (defined in
     20260810170000_platform_admin.sql) inside the function body, not
     just left unlisted, so a non-platform-admin caller is rejected
     even though the function itself runs with elevated privileges.

  2. `promotions` — an internal tracking list for the platform team
     (code, description, free-text discount note, validity window,
     status). Not wired into Razorpay billing yet — that needs
     researching what Razorpay's subscription API supports for coupons
     first, deliberately out of scope here. RLS scoped to
     is_platform_admin(), same shape as every other platform-only table.
*/

CREATE OR REPLACE FUNCTION get_platform_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'auth_users_count', (SELECT count(*) FROM auth.users),
    'organizations_count', (SELECT count(*) FROM organizations),
    'teachers_count', (SELECT count(*) FROM teachers),
    'tests_count', (SELECT count(*) FROM tests),
    'test_attempts_count', (SELECT count(*) FROM test_attempts),
    'student_answers_count', (SELECT count(*) FROM student_answers)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_usage() TO authenticated;

-- ============================================================
-- promotions
-- ============================================================

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_note text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
  created_by uuid REFERENCES platform_admins(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_manages_promotions"
  ON promotions FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
