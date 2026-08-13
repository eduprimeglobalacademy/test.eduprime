# Feature: Plan limits

## The three dimensions every plan controls

Every plan (`starter` / `growth` / `institution`, plus any negotiated custom plan platform staff assign by hand) sets three limits, each independently nullable — `NULL` means unlimited on that dimension:

- **Max teachers** — how many educator accounts the org can have registered.
- **Max active tests** — how many tests can be in `draft` or `live` status at once (closed tests don't count against this).
- **Max students per test** — how many individual results are visible per test before older/excess ones lock (see below) — this one behaves differently from the other two, see "A limit that gates viewing, not writing."

## The dedicated trial plan

New organizations default to a `trial` plan — deliberately restrictive (1 teacher, 1 active test, 20 students per test), not a full-featured tier. This was a conscious change from an earlier version of the product where new orgs got the full Growth-tier trial; the trial is now meant to let someone genuinely try the product, not run it at scale for free.

## Where enforcement actually happens — soft UI meters vs. hard database gates

This is the single most important thing to understand about plan limits: **two different enforcement mechanisms exist, and they don't always cover the same ground.**

- **Soft/informational**: usage meters shown in the org admin and teacher dashboards (educator seats used, active tests used) — these are visibility only. Seeing "4/5 educators used" doesn't stop anything by itself.
- **Hard/enforced at the database layer**: the actual write attempt (creating a new teacher token, activating a test) is rejected outright if it would exceed the effective limit (plan limit + any purchased add-on capacity — see [Promotions & capacity add-ons](promotions-and-addons.md)). The UI catches this specific rejection and shows a clear, actionable message ("buy more seats/slots from Billing, or upgrade your plan") instead of a raw database error — but the actual enforcement is the database rejection, not the UI check. A client-side pre-check also runs first purely so the message is accurate before the request even goes out, but it isn't what's actually stopping the write.

## A limit that gates viewing, not writing

The students-per-test limit is handled completely differently from the other two, and this was a deliberate design decision worth understanding: it never blocks a student from completing or submitting a test, no matter how many students take it. What it gates is **how many of those results the teacher can see** in Reports — past the limit, the earliest-submitted results stay visible and later ones lock behind a "buy more capacity" prompt (see [Reports & analytics](reports-and-analytics.md)). This was chosen specifically over the alternative of blocking the *write* (rejecting a student's submission once a test is "full") — that alternative was rejected because it would mean a student who spent the whole exam period completing a test could be rejected at the very last step, submission time, which is unacceptable regardless of billing status.

Two situations make this limit not apply at all: an org on **metered student billing** (pay-per-actual-student, no cap — see [Billing](billing-and-plans.md)), and any **public exam** (see [Public exams](public-exams.md)), where an unknown/uncapped headcount is the whole premise.

## Plan downgrades don't retroactively break anything

If a platform admin moves an org onto a plan with lower limits than its current usage, nothing existing is affected — the org just can't add more of that resource until it's back under the new limit. (The platform console does warn about this before committing the change, listing exactly which limits are already exceeded — see `eduprime-admin/docs`.)
