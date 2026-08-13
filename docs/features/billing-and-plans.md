# Feature: Billing (Razorpay)

Everything here lives in the org admin's Billing screen (`BillingPanel`). All payment processing goes through Razorpay; no card details or payment credentials are ever handled directly by this app.

## Choosing/subscribing to a plan

The Billing screen lists every plan the org is eligible to see — every public (self-serve) plan, plus the org's own current plan even if it's a private/negotiated one (so an org already on a custom deal still sees their own plan card). The `trial` plan itself is never shown as a selectable card here (it's a transient starting state, communicated instead by the status banner). Selecting a self-serve plan (one with both a price and a Razorpay plan ID configured) opens Razorpay Checkout via a subscription created server-side. A plan with no price (a negotiated/custom tier) shows "Contact us" instead, pre-filling a mailto to EduPrime sales with the org's name and admin email.

## Cancelling

A confirmation dialog is explicit about the effect: cancellation takes effect **immediately** — creating new assessments and new educator tokens pauses until subscribing again, but everything that already exists (tests, results, students mid-exam) is completely unaffected. This mirrors the same "gate creation, never gate what already exists" principle used throughout billing enforcement.

## Account status and what each one means

- **`trial`** — the 14-day evaluation period, on the restrictive dedicated trial plan (see [Plan limits](plan-limits.md)).
- **`active`** — a paid, current subscription.
- **`past_due`** — a payment failed; a 7-day grace period starts from the *first* failure (repeated webhook retries don't keep resetting this clock), during which the org keeps full write access. Shown via a status banner in both dashboards.
- **`suspended`** — grace period expired without payment, or a platform admin suspended the org by hand. New assessments and tokens are paused; nothing existing is touched.
- **`cancelled`** — subscription cancelled (by the org or by staff).

Only `trial`, `active`, and still-within-grace `past_due` orgs can create new tests or teacher tokens — this is enforced by a database function (`org_can_write`), not just a UI check, and applies identically whether the write attempt comes from the normal UI or the teacher-token Edge Function.

## Promo codes

A "Have a promo code?" field right on the Billing screen. Applying a valid code either applies it immediately (if the org already has an active subscription — updates the live Razorpay subscription to add the offer) or, if they don't have a subscription yet, remembers it and applies it automatically to whichever plan they subscribe to next. See [Promotions & capacity add-ons](promotions-and-addons.md) for how codes are created.

## Buying extra capacity

If the org's current plan offers add-on pricing on any dimension (teacher seats, active-test slots, students-per-test), an "Add capacity" card lets the org buy more without changing tiers — either as a **recurring monthly add-on** (only offered once the org has an active subscription) or a **one-time bump for just this billing cycle** (available regardless of subscription state, paid as a standalone Razorpay order rather than a subscription change). Active add-ons are listed with their cost and expiry (recurring ones can be removed; one-time bumps just expire on their own). See [Promotions & capacity add-ons](promotions-and-addons.md) for the full mechanics.

## Flexible (metered) student billing

An alternative to buying fixed extra student-capacity: instead of a per-test cap plus paid bumps, the org pays per actual student who submits, each billing cycle, with no upfront cap at all. Toggling this on requires an active subscription already in place. While enabled, the students-per-test plan limit doesn't apply to any test at all (see [Plan limits](plan-limits.md)) — every result on every test is always fully visible regardless of headcount. Switching back to fixed-limit billing is available any time.

## Invoice history and custom domain

Payment history (amount, date, status, a receipt link when available) is fetched live from Razorpay and shown at the bottom of the Billing screen. The Custom Domain configuration card also lives here — see [Tenancy, branding & custom domains](tenancy-and-branding.md) for the full domain-activation flow, which spans this screen and the platform console.
