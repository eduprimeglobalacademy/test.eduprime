/*
  # Dedicated, restrictive trial plan

  New orgs previously defaulted to plan_id='growth' for the whole 14-day
  trial (25 teachers, unlimited active tests, 500 students/test) — full
  paid-tier capacity with nothing to actually push someone toward
  subscribing. Trial is now its own plan with real limits: enough to
  genuinely try the product with one class, not enough to run on
  indefinitely for free. Adjustable later from eduprime-admin's Plans page
  without another migration.
*/

INSERT INTO plans (id, name, max_teachers, max_active_tests, max_students_per_test, sort_order, is_public, price_inr, razorpay_plan_id)
VALUES ('trial', 'Trial', 1, 1, 20, 0, false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE organizations ALTER COLUMN plan_id SET DEFAULT 'trial';
