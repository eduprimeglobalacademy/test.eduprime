/*
  # Add-on capacity: extra teacher seats / extra active-test slots

  org_within_teacher_limit()/org_within_active_test_limit() (see
  20260812060000_hard_enforce_plan_limits.sql) compare live usage
  directly against plans.max_teachers/max_active_tests — an org that
  needs one more seat had no path but "upgrade the whole plan." This
  adds a per-org add-on ledger and folds its active quantity into both
  limit checks, alongside per-plan add-on pricing so the purchase flow
  knows what to charge.
*/

ALTER TABLE plans ADD COLUMN IF NOT EXISTS addon_teacher_price_inr integer;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS addon_test_price_inr integer;

-- Placeholder per-unit prices on the two self-serve tiers — adjustable
-- later from eduprime-admin's Plans page. NULL everywhere else (already
-- unlimited / not self-serve) means add-ons simply aren't offered there.
UPDATE plans SET addon_teacher_price_inr = 299, addon_test_price_inr = 99 WHERE id = 'starter' AND addon_teacher_price_inr IS NULL;
UPDATE plans SET addon_teacher_price_inr = 199, addon_test_price_inr = 49 WHERE id = 'growth' AND addon_teacher_price_inr IS NULL;

CREATE TABLE IF NOT EXISTS org_capacity_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('extra_teachers', 'extra_active_tests')),
  quantity integer NOT NULL CHECK (quantity > 0),
  mode text NOT NULL CHECK (mode IN ('recurring', 'one_time')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'cancelled')),
  -- NULL for recurring rows (capacity lasts until explicitly removed).
  -- Set for one_time rows to the org's period/trial end at purchase time —
  -- the limit functions below stop counting a row once this passes, no
  -- cleanup job needed.
  expires_at timestamptz,
  razorpay_addon_id text,
  razorpay_order_id text,
  unit_price_inr integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE org_capacity_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_own_org_addons"
  ON org_capacity_addons FOR SELECT
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id());

-- INSERT/UPDATE only via service_role, from inside the purchase/remove
-- Edge Functions and the webhook — same as every other billing-write
-- path in this schema (subscriptions, organizations.status).

CREATE OR REPLACE FUNCTION org_within_teacher_limit(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT (
    SELECT p.max_teachers FROM organizations o JOIN plans p ON p.id = o.plan_id WHERE o.id = p_org_id
  ) IS NULL
  OR (
    (SELECT count(*) FROM teachers WHERE org_id = p_org_id)
    + (SELECT count(*) FROM teacher_tokens WHERE org_id = p_org_id AND status = 'active' AND expires_at > now())
  ) < (
    (SELECT p.max_teachers FROM organizations o JOIN plans p ON p.id = o.plan_id WHERE o.id = p_org_id)
    + COALESCE((
        SELECT sum(quantity) FROM org_capacity_addons
        WHERE org_id = p_org_id AND kind = 'extra_teachers' AND status = 'active'
          AND (expires_at IS NULL OR expires_at > now())
      ), 0)
  );
$$;

CREATE OR REPLACE FUNCTION org_within_active_test_limit(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT (
    SELECT p.max_active_tests FROM organizations o JOIN plans p ON p.id = o.plan_id WHERE o.id = p_org_id
  ) IS NULL
  OR (
    SELECT count(*) FROM tests WHERE org_id = p_org_id AND status IN ('draft', 'live')
  ) < (
    (SELECT p.max_active_tests FROM organizations o JOIN plans p ON p.id = o.plan_id WHERE o.id = p_org_id)
    + COALESCE((
        SELECT sum(quantity) FROM org_capacity_addons
        WHERE org_id = p_org_id AND kind = 'extra_active_tests' AND status = 'active'
          AND (expires_at IS NULL OR expires_at > now())
      ), 0)
  );
$$;
