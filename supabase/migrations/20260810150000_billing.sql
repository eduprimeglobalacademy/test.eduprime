/*
  # Phase 3 — Razorpay billing

  1. Schema Changes
    - `plans` gains `razorpay_plan_id` (set once each plan exists in the
      Razorpay dashboard/API) and `price_inr` (monthly, whole rupees).
    - `organizations` gains `razorpay_customer_id` and `grace_ends_at`.
      `grace_ends_at` is what makes the 7-day past_due grace period work
      without a cron job: it's set once, when the org is first marked
      past_due, and every write-gating check compares against it live —
      no scheduled function needs to flip anything.

  2. New Tables
    - `subscriptions` — one row per org's Razorpay subscription. Historical
      log too: a cancelled/expired row is never deleted, a new one is
      inserted if they resubscribe.

  3. Security / Enforcement
    - `org_can_write(org_id)` centralizes the hard-enforcement rule: writes
      allowed on trial/active, and on past_due only inside the grace
      window. Applied to the two actions that actually cost the platform
      money to keep offering — creating a test and issuing a new educator
      token — NOT to submitting/continuing an in-progress test attempt.
      A suspended org mid-exam is a support fire; blocking new tests and
      new tokens is not. This mirrors what the platform plan called out
      explicitly, so it's intentional, not an oversight.
    - `subscriptions` rows are only ever written by service_role (the
      create-subscription and webhook Edge Functions) — org admins can
      read their own org's row but never write it directly, since the
      row must reflect what Razorpay actually confirmed, not what the
      client claims happened.
*/

ALTER TABLE plans ADD COLUMN IF NOT EXISTS razorpay_plan_id text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_inr integer;

UPDATE plans SET price_inr = 1499 WHERE id = 'starter' AND price_inr IS NULL;
UPDATE plans SET price_inr = 4999 WHERE id = 'growth' AND price_inr IS NULL;
-- institution stays NULL — "custom", not self-serve checkout

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS razorpay_customer_id text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS grace_ends_at timestamptz;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  plan_id text NOT NULL REFERENCES plans(id),
  razorpay_subscription_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'created',
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_own_org_subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id());

CREATE POLICY "service_role_full_access_subscriptions"
  ON subscriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- Hard enforcement
-- ============================================================

CREATE OR REPLACE FUNCTION org_can_write(check_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT status IN ('trial', 'active')
      OR (status = 'past_due' AND grace_ends_at IS NOT NULL AND grace_ends_at > now())
  FROM organizations WHERE id = check_org_id;
$$;

GRANT EXECUTE ON FUNCTION org_can_write(uuid) TO authenticated, anon;

-- Split from the old FOR ALL policy on purpose: the billing gate belongs
-- only on INSERT (creating a new test / new token costs the platform
-- something ongoing). Reading, editing, or deleting what already exists —
-- including closing a live test or revoking a token — must keep working
-- regardless of payment status, or a lapsed org can't even wind itself down.

DROP POLICY IF EXISTS "teachers_manage_own_tests" ON tests;

CREATE POLICY "teachers_view_edit_delete_own_tests"
  ON tests FOR SELECT
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "teachers_update_own_tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "teachers_delete_own_tests"
  ON tests FOR DELETE
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "teachers_create_tests_if_org_can_write"
  ON tests FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND org_id = auth_teacher_org_id()
    AND org_can_write(org_id)
  );

DROP POLICY IF EXISTS "admin_manage_own_org_tokens" ON teacher_tokens;

CREATE POLICY "admin_view_own_org_tokens"
  ON teacher_tokens FOR SELECT
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id());

CREATE POLICY "admin_update_own_org_tokens"
  ON teacher_tokens FOR UPDATE
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id())
  WITH CHECK (is_admin() AND org_id = auth_admin_org_id());

CREATE POLICY "admin_delete_own_org_tokens"
  ON teacher_tokens FOR DELETE
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id());

CREATE POLICY "admin_create_own_org_tokens_if_org_can_write"
  ON teacher_tokens FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() AND org_id = auth_admin_org_id() AND org_can_write(org_id));
