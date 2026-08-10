/*
  # Phase 4 — Platform Super Admin

  1. New Tables
    - `platform_admins` — EduPrime staff, not tied to any single org. There
      is deliberately no self-serve way to become one: unlike `admin_users`
      (created via the create-organization Edge Function) or `teachers`
      (created via a token), a platform_admins row is only ever inserted
      by hand (SQL, after the person's auth user already exists) or via
      the Supabase dashboard. That's intentional — this table is the
      platform's actual security boundary, not something a signup flow
      should ever be able to reach.

  2. Security
    - Platform admins get cross-org SELECT on the tables the console
      needs for an org directory and MRR view: organizations (already
      public), plans, subscriptions, teachers, tests. They do NOT get
      access to test_attempts, student_answers, questions, or
      question_options — that's each org's end-user data, and "the
      platform can bill and support you" is a different scope than "the
      platform can read your students' answers." If a support case ever
      needs that, it should go through the org's own admin, not a
      standing grant.
    - Platform admins get UPDATE on organizations (to suspend/reactivate/
      reassign a plan by hand) and full access to plans (pricing/limits
      are a platform-level concern, not an org's).
*/

CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_reads_self"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

CREATE POLICY "platform_admin_updates_any_organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_manages_plans"
  ON plans FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_reads_all_subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform_admin_reads_all_teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform_admin_reads_all_tests"
  ON tests FOR SELECT
  TO authenticated
  USING (is_platform_admin());
