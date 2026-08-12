/*
  # Fix recurring add-ons: Subscriptions Addons API is deprecated

  Confirmed against Razorpay's live docs — the Addons API
  (POST/DELETE /v1/subscriptions/{id}/addons) is deprecated and gone
  ("You are unable to use the Add-Ons feature since it is deprecated").
  razorpay-purchase-addon/razorpay-remove-addon (shipped earlier this
  session) call it and will fail against real Razorpay.

  Fix: a recurring add-on becomes its own dedicated Razorpay subscription,
  priced via a separate per-kind Razorpay Plan, with `quantity` = units
  purchased — POST /v1/subscriptions (quantity), POST /v1/subscriptions/:id
  (update quantity), and /cancel are all still live, confirmed.
*/

ALTER TABLE plans ADD COLUMN IF NOT EXISTS razorpay_addon_teacher_plan_id text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS razorpay_addon_test_plan_id text;

ALTER TABLE org_capacity_addons RENAME COLUMN razorpay_addon_id TO razorpay_addon_subscription_id;
