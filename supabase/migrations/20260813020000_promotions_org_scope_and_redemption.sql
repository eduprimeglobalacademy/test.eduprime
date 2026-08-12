/*
  # Org-scoped promotions + org-admin redemption

  promotions was a flat, platform-admin-only tracking list with zero
  connection to actual billing. Adds org-scoping (null = generic code
  anyone can redeem, set = locked to one org) and a razorpay_offer_id —
  Razorpay has no create-offer API (dashboard-only, confirmed against
  their live docs), but POST /v1/subscriptions and POST
  /v1/subscriptions/:id both accept a documented, live `offer_id` param,
  so a platform admin creates the discount in Razorpay's own dashboard
  and pastes the id here, same manual-prerequisite pattern as
  razorpay_plan_id everywhere else in this schema.

  New narrow SELECT policy lets an org admin read only what they need to
  redeem: active, in-date, and either generic or locked to their own
  org — never another org's codes.
*/

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS razorpay_offer_id text;

CREATE POLICY "admin_reads_redeemable_promotions"
  ON promotions FOR SELECT
  TO authenticated
  USING (
    is_admin()
    AND status = 'active'
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
    AND (org_id IS NULL OR org_id = auth_admin_org_id())
  );
