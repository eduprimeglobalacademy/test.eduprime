# Role: Org Admin

## Who this is

The person running one customer organization's account — a school/institute owner or administrator. Scoped entirely to their own org (the `admin_users` table — the name predates multi-tenancy, back when there was only ever one org). Created in exactly two ways: automatically when someone signs up a new organization ([Sign-up & onboarding](../features/authentication-and-onboarding.md)), or by a platform admin assigning them a plan/creating their org by hand on the customer's behalf. There's no "invite another admin" flow — one org, one admin account, by design.

## Signing in

Same `SignInModal` every role uses, reached from their own org's `LandingPage` (email/password, or "Continue with Google" once linked — see [Sign-up & onboarding](../features/authentication-and-onboarding.md)). Not reachable from the root marketing domain except via a small "EduPrime team sign in" link meant for platform staff, not org admins — an org admin signs in from their own subdomain.

## What they see: the dashboard shell

`AdminDashboard` — a fixed left sidebar with 5 sections, always visible (desktop):

1. **Dashboard** (home) — Educator Management: create/revoke educator access tokens, browse registered educators, see token stats (active/used/expired). This is the default landing screen and where new org admins land first.
2. **Analytics** — org-wide educator activity: tests created, attempts, average scores per educator, sortable table + a "tests per educator" chart. See [Reports & analytics](../features/reports-and-analytics.md).
3. **Approvals** — public exams awaiting sign-off before they can go live. See [Public exams](../features/public-exams.md).
4. **Branding** — logo and brand colors, shown everywhere the org's students/teachers see the platform.
5. **Billing** — plan, subscription, invoices, add-on capacity, promo codes, custom domain. See [Billing](../features/billing-and-plans.md).

Below the nav: a Refresh button and (once a plan is loaded) a usage meter for educator seats used vs. the plan's limit.

If the org's account status is `past_due`, `suspended`, or `cancelled`, an `OrgStatusBanner` appears above whichever screen is showing.

## First-run experience

The very first time an org admin lands after signing up (`?welcome=1` in the URL), they see a 3-step `OnboardingFlow` instead of the normal dashboard: pick a plan (or skip and stay on trial), set branding (logo + colors, or skip), and generate a token for their first educator (or skip). Every step is skippable — this is a fast-path setup wizard, not a gate. See [Sign-up & onboarding](../features/authentication-and-onboarding.md) for the full mechanics.

## Core responsibilities

**Educator access** (Dashboard/home): generate one-time, 7-day-valid tokens for new teachers to register with, search/filter existing tokens (active/used/expired), delete a token, or revoke a registered educator's account entirely (permanently deletes their auth user and `teachers` row — irreversible). Generating a token is gated by the org's plan/billing status: a plan-limit check runs client-side first for an accurate message, and the database enforces it again regardless (a generic RLS rejection is caught and shown as a billing/limit message).

**Public exam approval** (Approvals): a teacher-created "public exam" (no enrolled class, unknown headcount — e.g. a hiring test) can't go live until an org admin approves it here. See [Public exams](../features/public-exams.md).

**Branding**: logo URL + two brand colors, applied live across the entire org's site the moment they're saved — no publish step.

**Billing**: everything money-related for the org lives here — see [Billing](../features/billing-and-plans.md) for the full picture (plan selection, Razorpay checkout, add-on capacity, promo codes, custom domain, invoice history).

## What an org admin does *not* do

They don't author tests, don't see individual student answers, and don't manage classes — that's all the [Teacher](teacher.md) role. An org admin's own "Analytics" view is aggregate-only (per-educator activity), not the detailed per-question breakdown a teacher sees in their own test reports.
