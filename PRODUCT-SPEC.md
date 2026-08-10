# EduPrime — Product Specification

Functional spec of everything the application currently does — roles, data, workflows, business rules. No UI/visual language included; this is meant as input for redesigning the interface from scratch, not a description of the current interface.

## 1. What it is

A white-label, multi-tenant assessment (MCQ test) platform. Each customer ("organization") gets an isolated instance under their own subdomain (and optionally a custom domain), with their own branding, educators, classes, tests, and students. Organizations sign up self-serve, run a 14-day trial, then subscribe to a paid plan.

## 2. Roles

Four roles, strictly hierarchical in scope:

### Platform Super Admin
- Not tied to any organization — manages the platform itself.
- No self-serve signup path; created manually.
- Capabilities:
  - View a directory of every organization: name, subdomain, status, plan, teacher count, test count, next billing renewal, signup date.
  - See total MRR (monthly recurring revenue) across all paying organizations.
  - Reassign any organization's plan.
  - Suspend or reactivate any organization.
  - Activate a custom domain once its DNS/cert setup is confirmed outside the app.
  - View an audit log of every impersonation event (who, which org, when).
  - Impersonate an organization's admin account for support purposes (see §7).
- Explicitly does NOT have access to any organization's test content, student answers, or student attempt data — scope is limited to billing/account management, not end-user data.

### Organization Admin
- Scoped to exactly one organization.
- Capabilities:
  - Generate time-limited, single-use registration tokens for new educators (name + phone number bound to the token).
  - View all registration tokens (active / used / expired) and search/filter them.
  - Delete individual tokens or bulk-delete all expired tokens.
  - View all registered educators in the organization.
  - Revoke an educator's account (deletes their access).
  - View organization-wide stats: active/used/expired token counts, total educator count.
  - Manage billing: view current plan, trial/grace countdown, subscribe to a plan, see subscription renewal date.
  - Set the organization's custom domain (subject to plan eligibility).
  - Connect a Google account for sign-in.

### Teacher / Educator
- Scoped to exactly one organization; registers via an admin-issued token.
- Capabilities:
  - Create, edit, and delete tests/assessments.
  - Organize tests into classes/sections (see §5).
  - Add questions to a test manually, or bulk-import via a plain-text format.
  - Preview a test exactly as a student would see it.
  - Set a test's lifecycle status: draft → live → closed (and reopen/reactivate).
  - Configure per-test settings: duration, scheduling window, navigation rules, result visibility, timing mode, grading thresholds (see §6).
  - Share a live test via a short join code.
  - View submission analytics for a test: score distribution, pass rate, average/high/low scores, average completion time, a per-student results table.
  - Export a test's results to CSV.
  - Filter/search their own test list by status, class, title, description, or join code.
  - Connect a Google account for sign-in.

### Student
- No account, no login.
- Joins a specific test using a short alphanumeric code.
- Enters name, email, and phone number before starting (used for duplicate-attempt prevention and result identification — not an account).
- Takes the test under whatever timing/navigation rules the teacher configured.
- Sees a results screen immediately after submission (score, grade, question-by-question review) — not a re-fetched page, so it can't be revisited later independent of the original submission.
- Can download a PDF of their results.
- Is blocked from taking the same test twice (matched on test + email + phone).

## 3. Multi-tenancy

- Every organization is identified by a unique subdomain slug (`orgname.<platform-domain>`), resolved from the browser's hostname.
- Organizations may alternatively be reached via a fully custom domain, once that domain is DNS-configured (CNAME) and confirmed by the platform.
- Every piece of org-owned data (educators, tokens, classes, tests, attempts) is tagged to its organization; an organization can only ever see or act on its own data.
- Organization-level branding: display name, logo image, primary color, secondary color — applied throughout that organization's instance.
- A visitor on the platform's own root domain (no subdomain) sees generic platform marketing and a self-serve "create an organization" flow, not any specific org's content.
- An unrecognized/unresolvable subdomain shows a plain "no such organization" state.

## 4. Organization lifecycle & billing

- **Signup**: a prospective customer provides an organization name, a desired subdomain, and their own name/email/password. This creates the organization, an auth account, and that person as its first Org Admin, in one step. The organization starts on a 14-day full-featured trial.
- **Status states**: `trial`, `active`, `past_due`, `suspended`, `cancelled`.
- **Plans** (three tiers):
  - **Starter**: up to 5 educator accounts, up to 10 tests active at once (draft+live combined), up to 100 students per test.
  - **Growth**: up to 25 educator accounts, unlimited active tests, up to 500 students per test. (Trial organizations are placed on Growth-equivalent limits regardless of what they'll eventually pay for.)
  - **Institution**: unlimited on every dimension. Not self-serve — requires contacting the platform directly rather than checking out.
- **Plan limits are shown to the org admin/teacher as usage indicators** (e.g. "3 of 5 educators used") that warn as a limit is approached or reached, without blocking anything below the hard-enforcement line described next.
- **Subscription flow**: an org admin selects a paid plan, completes checkout through a payment gateway, and the organization's subscription record tracks status and next renewal date. Subscription state changes (activated, payment failed, cancelled, etc.) are driven by the payment gateway's own webhook events, not by anything the browser asserts.
- **Grace period**: if a renewal payment fails, the organization is marked `past_due` but keeps full access for 7 days from that point. After the grace period lapses (tracked as a real timestamp, evaluated live — not dependent on a background job running on schedule), further access is restricted per the enforcement rule below.
- **Hard enforcement** (the only two actions actually blocked by billing state): creating a new test, and issuing a new educator registration token. Both require the organization to be on `trial`/`active`, or on `past_due` still within its grace window. Everything else — viewing/editing/closing existing tests, students finishing an assessment already in progress, viewing past results — continues working regardless of billing status, so a billing lapse never interrupts something already underway.
- **Suspend/reactivate**: the platform can suspend an organization directly (same enforcement effect as a lapsed grace period) or reactivate one immediately, overriding pending payment status.

## 5. Classes / course sections

- A class represents one section of a course a teacher runs (e.g. "Grade 10 — Section A, Biology 101, 2026 Spring term").
- Fields: section name, course/subject name, grade/year level, academic term — all free text, all optional except the section name.
- A teacher creates classes inline while creating or editing a test, or ahead of time.
- A test may optionally belong to one class; tests with no class are one-off assessments.
- Teachers can filter and search their test list by class.
- A test's reporting view shows which class it belongs to.

## 6. Test authoring & configuration

Per-test settings a teacher configures:
- Title, description.
- Overall duration in minutes (optional — no limit if unset).
- Scheduling window: optional start time and end time during which the test is joinable.
- **Timing mode**: either one overall countdown for the whole test, or a per-question timer (each question auto-advances when its own time limit expires).
- Whether students may navigate back to previous questions or must move forward only.
- Whether students see their results immediately after submitting.
- **Grading thresholds**: configurable percentage cutoffs for grades A/B/C/D and a separate passing-grade percentage (defaults: A=90, B=80, C=70, D=60, Pass=60; anything below D is F).
- Auto-submit when the timer expires.
- Status: `draft` (not visible to students) → `live` (joinable via code) → `closed` (no longer joinable, results/reporting available); can be moved backward (reactivated) as well as forward.
- A unique, short, human-typeable join code is generated per test.

### Questions
- Each question: text, point value, display order, optional individual time limit (used only in per-question timing mode).
- Each question has 2 or more answer options, each flagged correct or incorrect (single-correct-answer model), with a display order.
- Questions can be added/edited/removed/reordered individually.
- **Bulk import**: a plain-text format — a line starting with a number (`1.` or `1)`) starts a new question; subsequent lines starting with a letter A–E (`A.` or `A)`) are that question's options, in order. An option is marked correct either with a trailing `*`, or by default if it's the first option (`A.`) and nothing else is marked. A downloadable template file demonstrates the format.

## 7. Support impersonation

- The platform can act as a specific organization's admin account for support purposes, without ever knowing or resetting that admin's password.
- Every use is logged: which platform admin, which organization, which admin account, and when — logged automatically as part of starting the session, not self-reported.
- The platform admin can end the impersonated session and return to their own account at any point.
- Scoped to the organization's admin account only, not individual teacher accounts.

## 8. Authentication

- Email + password is the default for Org Admins and Teachers.
- Google sign-in is available as an alternate credential, but only after being explicitly connected from within an already-authenticated session — there's no cold "sign up with Google" path, since account creation only happens through the token-invite (teachers) or organization-signup (admins) flows.
- Students never authenticate; identity for a test attempt is just the name/email/phone they supply when starting it.
- Duplicate-attempt prevention for students is a lookup (not a raw data read) — it can confirm "this student already completed this test" without exposing any other student's data.

## 9. Data entities (functional, not schema-literal)

- **Organization** — name, subdomain slug, custom domain (optional), branding (logo, two brand colors), status, current plan, trial/grace period timestamps, billing customer reference, signup date.
- **Plan** — name, per-resource limits (max educators, max active tests, max students per test — any of which can be "unlimited"), monthly price, external billing-provider plan reference.
- **Subscription** — links an organization to a plan via the payment gateway's subscription object; tracks gateway status and next renewal date; historical (a new one is created if an org resubscribes after cancelling, old ones aren't deleted).
- **Org Admin account** — name, email, which organization, linked login identity.
- **Educator registration token** — the name/phone the token was issued for, expiry, single-use status (active/used/expired), which admin issued it, which organization.
- **Teacher/Educator account** — name, email, phone, which organization, which token it was redeemed from.
- **Class** — section name, course name, grade level, term, which teacher, which organization.
- **Test** — everything in §6, plus which teacher, which organization, which class (optional).
- **Question** — belongs to a test; text, points, order, optional time limit.
- **Question option** — belongs to a question; text, correct flag, order.
- **Test attempt** — belongs to a test; student's name/email/phone, start/submit timestamps, total score, max possible score, time taken, submitted flag. One per student per test (enforced).
- **Student answer** — belongs to an attempt and a question; which option was selected, correctness, points earned.
- **Platform Admin account** — name, email, linked login identity. Not tied to an organization.
- **Impersonation record** — which platform admin, which organization, which admin account, timestamp. Append-only.

## 10. Reporting & export

- Per-test analytics for teachers: total submissions, average/highest/lowest score (as percentages), pass rate at the configured passing threshold, average time taken, a pie/bar visualization of grade distribution, and a full per-student results table.
- CSV export of a test's results (name, email, score, max score, percentage, time taken, submission timestamp).
- Students get a PDF of their own individual results (score, grade, per-question breakdown).

## 11. Explicitly out of scope today

Worth knowing for a redesign so nothing is assumed to exist that doesn't:
- No SSO beyond Google (no SAML/enterprise identity provider integration).
- No physically isolated database per customer — all organizations share one database, separated logically.
- No self-serve custom-domain automation — DNS/certificate setup is a manual step coordinated outside the app.
- No impersonation of individual teacher accounts, only org admins.
- No co-teaching / multiple teachers per class or per test — one teacher owns each.
- No student accounts, saved history across tests, or cross-test student profile.
- No question banks shared/reused across tests (each test's questions are its own).
- No mobile app — web only.
