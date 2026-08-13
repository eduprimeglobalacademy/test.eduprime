# Feature: Tenancy, branding & custom domains

## How a hostname becomes an organization

Every request resolves a tenant purely from `window.location.hostname` (`src/lib/tenant.ts`, applied in `TenantContext`):

- **`orgname.eduprime.app`** (or `orgname.localhost` in local dev) → the subdomain is extracted and matched against `organizations.slug`.
- **A platform root host** (bare `eduprime.app`/`www.eduprime.app`, `localhost`, any `*.vercel.app` preview) → never a tenant. This check is deliberately separate from subdomain matching, not just "slug came back empty" — a hostname can fail the subdomain match *and* not be a platform host, which is exactly the third case:
- **A genuine custom domain** — anything that's neither of the above is looked up against `organizations.custom_domain`, but **only** if that org's `custom_domain_status` is `'active'`. A domain still stuck on `'pending'` resolves to nothing, same as an unrecognized hostname.

If none of these match, the visitor sees `OrgNotFound`. If they're on a platform root host with no tenant, they see `RootMarketing` (the EduPrime-branded signup/marketing site) instead of a 404.

## What "branding" actually changes

Two CSS custom properties, `--brand-primary` and `--brand-secondary`, set on `document.documentElement` the moment an org resolves (defaulting to EduPrime's own indigo/violet if unset). Every themed surface — buttons, the `Button`/`Input` UI primitives, gradient text, badges — reads from these variables via `color-mix()`-derived hover/active shades, not separately stored colors. The org's name and logo also override the browser tab's title and favicon at the same moment.

**Not everything is themed yet.** Most teacher/admin dashboard screens still hardcode indigo/violet Tailwind classes directly rather than these variables — only the public-facing surfaces (landing page, student test-taking) and the shared UI primitives fully respect an org's brand colors today. Don't assume every corner of the teacher dashboard will visually match a customer's brand.

## Who sets branding, and where

- **Org admin**, self-serve, any time: the Branding screen in their dashboard (logo URL + two color pickers, live-applied on save, no publish step) — see [Org Admin role](../roles/org-admin.md).
- **During onboarding**: the same fields appear as step 2 of the first-run `OnboardingFlow` wizard, skippable.
- **Platform staff**, on the org's behalf: the same fields exist in the platform console's org detail page (`eduprime-admin`), for support situations.

There is no image upload anywhere in the product — branding a logo means pasting a URL to an already-hosted image. A broken/missing URL falls back to a small placeholder, never a broken image icon.

## Custom domains

Available on Growth and Institution plans (gated in the UI, not at the database layer — there's no real security stake in who can flip the activation status field, just a UX gate on who's offered the option).

The **value** (e.g. `tests.customer.edu`) is set by the org admin from their Billing page. A database trigger resets `custom_domain_status` back to `'pending'` any time the domain value changes, so editing it always requires re-activation — you can't silently keep "live" status while pointing at a different domain.

**Activation** (`'pending'` → `'active'`) is a **platform-staff-only action**, done from the platform console by clicking the pending/live pill next to the domain. This is explicitly a communication step, not automation — nothing in this product talks to Vercel's API. The real sequence to get a custom domain working:

1. Org admin sets the domain value in their Billing page → status starts `pending`.
2. Org admin points their own DNS at `cname.vercel-dns.com` (a CNAME record) — instructions for this are shown right in the Billing page's Custom Domain card.
3. Someone on the platform side manually adds the domain in the Vercel project dashboard.
4. Once DNS has actually propagated and the domain works, platform staff click the pill to mark it `active` in the platform console — purely reflecting reality at that point, not causing it.

Until step 4, visiting the custom domain resolves to nothing (`OrgNotFound`), even if DNS and Vercel are both already configured correctly — the `custom_domain_status = 'active'` check in tenant resolution is the actual gate.

## The isolated-database tier (does not exist)

Every organization shares one Supabase project/database, isolated purely by row-level security. A fully separate database per (very large) customer was considered and deliberately not built — it would be a genuine architecture fork (per-tenant connection routing or per-tenant deployments), not a config flag, and there's no customer today actually requesting it. If this changes, it's a real project, not a checkbox.
