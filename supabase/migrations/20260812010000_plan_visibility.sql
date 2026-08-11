/*
  # Plan visibility — public vs negotiated/custom

  Bug found while seeding a realistic negotiated-plan scenario: BillingPanel
  (org admin's own Billing screen) selects every row in `plans` unconditionally
  and renders each as a browsable, "Contact us"-able pricing card — including
  a plan created for one specific customer's negotiated deal, shown to every
  other org too.

  `is_public` distinguishes the three canned self-serve tiers (Starter/Growth/
  Institution) from a plan created by hand for a specific customer (same
  "no self-serve, platform staff only" posture as platform_admins and the
  plans table itself — see plan_tiers.sql). Existing rows default to public;
  a negotiated plan should be inserted with is_public = false. The platform
  admin console's org-detail plan selector is unaffected — it needs to see
  every plan (including private ones) to assign them.
*/

ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
