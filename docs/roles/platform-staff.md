# Role: Platform Staff (EduPrime's own team)

## Who this is

EduPrime's own staff — not tied to any customer organization, and not really a role that lives inside *this* repository's UI at all anymore. A `platform_admins` row (bootstrapped by hand — no self-serve path, see this repo's `CLAUDE.md` "Environment" section) identifies someone as platform staff.

## Where they actually work

**The real console is a separate application and repository** (`eduprime-admin`), deployed on its own subdomain (`admin.*`). This repo (`test.eduprime`) deliberately ships **no platform-admin UI** — that code was removed on purpose so customer bundles never contain platform-only functionality. See `eduprime-admin/docs/` for everything platform staff actually do day to day: browsing every organization, adjusting plans/status/domains by hand, managing the pricing catalogue, running promotions, and watching platform-wide analytics.

## What this repo *does* still contain for platform staff

Two small things, both intentionally minimal:

1. **A redirect screen.** If a platform admin account somehow signs in to this app (any host, including a mistyped one — this check runs before tenant resolution even matters), they see a small "Wrong app for platform staff" card with a link to the real console, instead of anything resembling a dashboard.
2. **The impersonation banner and exit flow.** When platform staff use the separate console's "View as" feature, the actual impersonated session happens *here*, on the target org's own subdomain — a persistent amber banner ("Viewing as **{org}** ({email}) — support session") with an Exit button, mounted outside the normal role-based view switch so it's visible no matter what screen renders underneath. See [Impersonation](../features/impersonation.md) for the full round trip between the two repos.

## Why this split exists

Platform staff need cross-org visibility and billing/support controls that have nothing to do with any single customer's branded experience — and critically, they deliberately do **not** get standing access to any org's actual test content or student data (no `test_attempts`, `student_answers`, or `questions` queries anywhere in the platform console). The one way to see inside an org's real data is impersonation — a distinct, fully logged, deliberate action, not something that falls out of normal platform-console browsing.
