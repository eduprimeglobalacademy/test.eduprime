# Feature: Sign-up, sign-in & onboarding

## The three account-creation paths (deliberately, there are only three)

Every admin/teacher account on the platform is created by exactly one of these — there is no generic "sign up" form anywhere that creates a standing account from scratch:

### 1. Org signup — creates an organization *and* its first admin, together
From the root marketing site (`RootMarketing`), "Create your organization" opens `CreateOrganizationModal`: org name, subdomain (auto-slugified from the name, editable), admin name/email/password, and optional brand color + logo URL. Submitting calls the `create-organization` Edge Function (needs service-role privileges the anon key doesn't have), which creates the `organizations` row (defaulting to the `trial` plan, 14-day trial), the admin's auth user, and the `admin_users` row — atomically, as one step from the customer's point of view. The browser then signs in immediately (on the root domain) and is redirected to `https://{slug}.eduprime.app?welcome=1`, carrying the fresh session across the subdomain boundary via a URL hash fragment (never a query string) that the destination page consumes on load and immediately strips from the visible URL. Landing with `?welcome=1` triggers the first-run `OnboardingFlow` instead of the normal dashboard.

### 2. Educator token registration — creates a teacher, tied to one org
An org admin generates a token (name + phone number, valid 7 days, single-use) from their Educator Management screen. The teacher registers via `RegisterModal` (name, email, phone, the token, a password) from their org's own `LandingPage`. This flows through the `validate-teacher-token` Edge Function, which checks/consumes the token and creates the `teachers` row — `org_id` is derived server-side from the token, never trusted from client input. **The token's phone number must match what the teacher enters at registration** — this is the actual identity check, not just a shared secret.

### 3. Platform-admin bootstrap — by hand, no UI at all
Genuinely different from the other two: someone with database access creates the auth user, then inserts a `platform_admins` row directly via SQL. There is no self-serve path and no in-product flow for this on purpose — it's a rare, deliberate action reserved for EduPrime's own staff. See [Platform Staff](../roles/platform-staff.md).

**Students never go through any of this** — see [Student role](../roles/student.md).

## Signing in

One shared `SignInModal` (email/password, or "Continue with Google") used by both org admins and teachers, opened from their org's own `LandingPage`. Auth sessions are **not scoped to a subdomain** — a session established on one host technically works from any host — but the product only ever offers sign-in from within an org's own landing page, never from the root marketing domain (which instead has a small "EduPrime team sign in" link, meant only for platform staff).

Role is resolved by checking, in order, `platform_admins` → `admin_users` → `teachers` for a row matching the signed-in auth user — whichever matches first determines the role. A correct password for an account that doesn't exist in any of these tables (or exists in a different org's org-scoped table under a mismatched context) is treated the same as "user not found," never a partial/wrong-role login.

## Google sign-in — link-while-authenticated, not cold signup

This is the one part of the auth system worth being precise about, because the shape is deliberate and easy to get backwards:

- **`connectGoogleAccount()`** (the "Connect Google" button shown in both dashboards, under Connected Accounts / header) calls Supabase's `linkIdentity()` **from an already-signed-in session** — it attaches a Google identity to that exact existing auth user.
- **Only after that** does **`signInWithGoogle()`** (the "Continue with Google" button on the sign-in modal) work for that account.
- A cold Google sign-in for an email that's never been linked fails safe: either Supabase rejects it outright, or it succeeds at the Supabase Auth layer but lands on an auth user with no matching `admin_users`/`teachers` row — which resolves to the exact same "user not found" as any other unrecognized account. It is **not** a way to create a new admin/teacher account, and it deliberately bypasses none of the token/`create-organization` gating above.

This shape was chosen specifically because the realistic customer here is a school already on Google Workspace, not an enterprise with a SAML identity provider to wire up — full SAML SSO would need Supabase's paid Enterprise add-on plus per-customer metadata exchange for a need this audience mostly doesn't have.

## Student-side Google sign-in is different again

Two distinct student-facing Google flows exist, neither of which creates a login-capable account:

- **Class roster self-enrollment** (`/enroll?class={id}`): sign in with Google → confirm name/email → added to that class's `class_students` roster. Purely a roster/allowlist entry, not an account.
- **Gated test entry**: if a specific test has "require Google sign-in" enabled, a student must sign in with Google before they can even enter the test code — see [Taking a test](test-taking.md) for how that interacts with class enrollment and per-test blocking.

## First-run onboarding (org admin only)

Landing with `?welcome=1` right after org creation shows a 3-step wizard instead of the normal dashboard — Plan (browse tiers, or "Continue with free trial"), Branding (logo + colors, skippable), and "Invite your first educator" (generate a token right there, skippable). Every step can be skipped; nothing here is a gate on using the product. Finishing (or skipping to the end) lands on the normal dashboard, with the generated token (if any) shown one more time as a reminder that it can also always be found later in Educator Management.
