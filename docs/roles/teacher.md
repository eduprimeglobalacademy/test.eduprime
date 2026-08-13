# Role: Teacher / Educator

## Who this is

The person building and running assessments, scoped to one organization (`teachers` table). Created only via the token-based onboarding flow: an org admin generates a one-time access token, the prospective teacher registers with it via `RegisterModal` (name, email, phone, the token, a password). No self-serve teacher signup exists — you need a token from your org's admin. See [Sign-up & onboarding](../features/authentication-and-onboarding.md).

## Signing in

Same `SignInModal` as the org admin, from the org's own `LandingPage` — email/password, or "Continue with Google" once linked from the dashboard's Connected Accounts (see [Sign-up & onboarding](../features/authentication-and-onboarding.md)).

## The dashboard shell

`TeacherDashboard` — header (org logo/name, "Welcome, {name}", sign out) plus a left sidebar (desktop only) with these sections, in order:

1. **Dashboard** — home/overview.
2. **Classes** — with an inline shortlist of the first 6 classes directly under the nav item (each showing a live-test-count badge, click to jump straight in); "+N more…" beyond that opens the full Classes grid.
3. **All Assessments** — every test across every class, with search and status/class filters.
4. **Analytics** — cross-test performance rollup: average score, pass rate, assessments graded, average score by class, and a "lowest performing assessments" list worth a second look.
5. **Focus** — a badge shows the count of flagged items (students or tests a teacher has starred for follow-up).
6. **Settings** — profile, password, connected accounts (Google linking).

Below the nav: an "Active assessments" usage meter (org-wide count against the plan's limit, plus any purchased add-on capacity) — informational; the real enforcement is a database-level rejection when a teacher tries to activate a test past the limit.

If the org's status is `trial`, `past_due`, `suspended`, or `cancelled`, an `OrgStatusBanner` shows at the top of the content area.

**Two screens render full-screen, outside this shell entirely:** Preview and Reports (see below) — they replace the whole dashboard chrome rather than nesting inside a panel.

## Building and running a test — the full loop

1. **Classes** (optional): organize tests under a class ("Section A", with free-text course/grade/term), or skip and create a one-off assessment with no class. See [Classes](../features/classes.md).
2. **Author** the test: basic info → behavior/timing → grading, then add questions (manually, via bulk-import text, or pulled from the shared org-wide question bank), optionally organized into timed sections. See [Test authoring](../features/test-authoring.md), [Question types](../features/question-types.md), [Sections & timing](../features/sections-and-timing.md), [Question bank](../features/question-bank.md).
3. **Configure**: collaborators (other teachers in the org who can also work on this test) and blocked students (per-test blocklist), from Test Settings. See [Collaborators & blocked students](../features/collaborators-and-blocked-students.md).
4. **Preview**: a full-screen, read-only walkthrough of exactly what a student will see, with correct answers revealed — nothing here is graded or saved, it's purely a teacher-facing check.
5. **Activate**: a test starts as `draft` (or `pending_approval` if it's a public exam awaiting org-admin sign-off). Activating moves it to `live`, at which point the join code and share link work for students. This is gated by the org's active-test plan limit — hitting it shows a specific "buy more slots or upgrade" message rather than a raw error.
6. **Close** a live test at any time (e.g. after the exam window ends) — this doesn't delete anything, it just stops new joins. A closed test can be **reactivated**, but lands back in `draft` first (not straight back to `live`), so re-activating is a deliberate second step.
7. **Reports**: once students start submitting, the full-screen Reports view shows stats, charts, and a per-student results table, exportable to CSV. See [Reports & analytics](../features/reports-and-analytics.md) and [Grading & results](../features/grading-and-results.md).

## Notable UI details worth knowing

- The **status action button** on each test card in the list is the primary lifecycle control (Activate → Close → Reactivate), not a settings screen.
- A field in Test Settings' Behavior section — "Default time per question (seconds)" — is currently **non-functional**: it's captured in the form and given a default of `60`, but it is never actually written to any question's time limit on save, in either the initial creation wizard or the settings screen. Each question's own individual time-limit field (set per-question in the question editor) is what actually takes effect. Don't rely on this field doing anything yet.
- The **"Passing grade minimum"** field in Grading config is saved but, as of this writing, not read anywhere that computes a pass rate — both the per-test Reports pass-rate stat and the cross-test Analytics pass-rate stat use a fixed 60% cutoff regardless of what's configured here. Only the A–D letter-grade boundaries (also configured on the same screen) actually affect what a student/teacher sees per-attempt.

## What a teacher does *not* do

They don't manage billing, can't create other educator accounts (that's the org admin, via tokens), and their Analytics view is scoped to their own tests only — never another teacher's, unless added as a collaborator on a specific test.
