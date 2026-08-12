/*
  # Real, enforced student-capacity limits + fixed/metered billing

  max_students_per_test was 100% cosmetic — confirmed zero enforcement
  anywhere, test_attempts INSERT policy was `WITH CHECK (true)`. This
  adds real join-time enforcement (never something that could interrupt
  a student mid-exam — the attempt row is created once, at join, and
  never re-checked) plus two billing modes:
  - capped (default): fixed limit + optional purchased 'extra_students'
    add-on, same shape as the teacher/test add-ons.
  - metered: org opts in (own addon-subscription, quantity starts at 1),
    no cap at all, and each billing cycle the actual usage in the period
    just completed is computed and pushed as the next cycle's `quantity`
    via POST /v1/subscriptions/:id (schedule_change_at: cycle_end) — the
    closest real primitive Razorpay offers to metered billing (confirmed:
    no native usage-based billing API exists). This is an approximation,
    not a Razorpay-native metered product — flagged for live verification.
*/

ALTER TABLE plans ADD COLUMN IF NOT EXISTS addon_student_price_inr integer;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS razorpay_addon_student_plan_id text;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS student_billing_mode text NOT NULL DEFAULT 'capped'
  CHECK (student_billing_mode IN ('capped', 'metered'));

ALTER TABLE org_capacity_addons DROP CONSTRAINT org_capacity_addons_kind_check;
ALTER TABLE org_capacity_addons ADD CONSTRAINT org_capacity_addons_kind_check
  CHECK (kind IN ('extra_teachers', 'extra_active_tests', 'extra_students'));

ALTER TABLE org_capacity_addons DROP CONSTRAINT org_capacity_addons_mode_check;
ALTER TABLE org_capacity_addons ADD CONSTRAINT org_capacity_addons_mode_check
  CHECK (mode IN ('recurring', 'one_time', 'metered'));

-- Join-time only: the count is of already-created test_attempts rows for
-- this specific test, checked as part of the INSERT that creates a new
-- one. Metered-mode orgs are exempt entirely — they're billed for actual
-- usage after the fact, not capped upfront.
CREATE OR REPLACE FUNCTION org_within_test_student_limit(p_test_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    (SELECT o.student_billing_mode FROM tests t JOIN organizations o ON o.id = t.org_id WHERE t.id = p_test_id) = 'metered'
    OR (
      SELECT p.max_students_per_test FROM tests t
      JOIN organizations o ON o.id = t.org_id
      JOIN plans p ON p.id = o.plan_id
      WHERE t.id = p_test_id
    ) IS NULL
    OR (
      SELECT count(*) FROM test_attempts WHERE test_id = p_test_id
    ) < (
      (SELECT p.max_students_per_test FROM tests t JOIN organizations o ON o.id = t.org_id JOIN plans p ON p.id = o.plan_id WHERE t.id = p_test_id)
      + COALESCE((
          SELECT sum(a.quantity) FROM org_capacity_addons a
          JOIN tests t ON t.org_id = a.org_id
          WHERE t.id = p_test_id AND a.kind = 'extra_students' AND a.status = 'active'
            AND (a.expires_at IS NULL OR a.expires_at > now())
        ), 0)
    );
$$;

DROP POLICY IF EXISTS "anon_creates_test_attempts" ON test_attempts;
CREATE POLICY "anon_creates_test_attempts"
  ON test_attempts FOR INSERT
  TO anon
  WITH CHECK (org_within_test_student_limit(test_id));
