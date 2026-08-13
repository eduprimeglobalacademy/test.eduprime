# Feature: Impersonation ("View as")

Lets EduPrime platform staff sign in as an org's admin, or as one specific teacher, for support purposes — without ever touching that person's password. This feature genuinely spans two repositories: the trigger and target-picker UI live in the separate platform console (`eduprime-admin`), while the actual signed-in experience happens here, on the org's own subdomain. See `eduprime-admin/docs/features/impersonation.md` for the full round trip, including how the session is minted server-side (a magic-link token generated and immediately redeemed server-side, so no email is ever sent and the target's password is never read or reset).

## What happens in this app

The main app's `AuthProvider` looks for a session handoff in the URL's hash fragment on load (`consumeSessionHandoff()`) — this is the same mechanism used for the ordinary post-org-signup handoff (root domain → new subdomain), extended with a few extra fields when the handoff originated from an impersonation start rather than a normal signup. It calls `supabase.auth.setSession()` with the handed-off tokens, then stashes the org name and target admin/teacher's email in `sessionStorage` so the UI knows this is an impersonation session and not a normal sign-in.

A persistent amber banner (`ImpersonationBanner`) then renders at the very top of the app, **outside** the normal role-based view switch — so it's visible no matter which dashboard or screen ends up rendering underneath it: *"Viewing as **{org}** ({email}) — support session"*, with an **Exit** button.

While impersonating, the platform admin genuinely sees and can act on everything that account can — row-level security scopes all data correctly because it keys off the impersonated account's own `admin_users`/`teachers` row, not which browser tab or origin the request came from.

## Exiting

Clicking Exit clears the stashed impersonation state and signs out of the impersonated session. Because this kind of impersonation originates from the separate platform console (a different origin entirely), there's no "return session" to restore locally — the platform admin's real, untouched session is sitting in their still-open platform-console tab in another window, not something this app needs to hand back.

## Scope

Only an org's **admin** account or one specific **teacher** account can be impersonated — never a student (students never have accounts to impersonate in the first place) and never another platform admin. Every impersonation *start* (never the exit) is logged append-only, server-side, in a way the platform admin who triggered it cannot edit, delete, or skip.
