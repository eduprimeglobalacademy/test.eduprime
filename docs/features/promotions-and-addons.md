# Feature: Promotions & capacity add-ons

## Promotions (discount codes)

Created and managed entirely by platform staff, in the separate platform console (see `eduprime-admin/docs/features/promotions.md` for the authoring side). From the org admin's side, all there is: a code field on the Billing screen (see [Billing](billing-and-plans.md)) — type a code, apply it, and either it takes effect immediately on an existing subscription or gets remembered for the next plan they subscribe to.

A promo code can be scoped to one specific organization (only that org can redeem it — used for negotiated/founding-customer discounts) or left unscoped ("any org," a generic public code). Redeeming maps to a real Razorpay Offer, which must already exist on Razorpay's dashboard (there's no API to create one) — the platform console just records its ID and metadata for tracking and lets orgs redeem it.

## Capacity add-ons

The mechanism behind "Add capacity" in Billing (see [Billing](billing-and-plans.md) for the org-facing flow). Two purchase shapes exist, and they're genuinely different Razorpay objects, not just a UI label difference:

- **Recurring add-on**: a *separate, dedicated Razorpay subscription* just for that extra capacity, billed monthly alongside the main plan subscription. (Razorpay's Subscription Add-ons API is deprecated, so this product doesn't use it — each add-on type on each plan needs its own pre-created Razorpay Plan, configured by platform staff, and purchasing creates a subscription against that plan.) Buying more of the same kind again **consolidates** into the existing add-on subscription (updates its quantity) rather than creating a second one.
- **One-time bump**: a single Razorpay Order, paid once, effective only for the current billing cycle — no ongoing subscription created at all, and nothing to remove afterward; it simply stops applying once the cycle ends.

Both cover the same three dimensions plan limits do: extra teacher seats, extra active-test slots, extra students-per-test.

## Flexible (metered) student billing

A third option specifically for the students-per-test dimension, distinct from either add-on shape above: instead of buying fixed extra capacity, the org pays per actual student each cycle with no cap at all. See [Billing](billing-and-plans.md) and [Plan limits](plan-limits.md) for how this changes enforcement.
