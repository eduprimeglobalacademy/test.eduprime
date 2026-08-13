# Standards Compliance Status

Gap analysis against `frontend-engineering-standards.md` and
`supabase-baas-engineering-standards.md`, done against the actual code
(reading every relevant file, not assuming from the standards' framing).
Full literal compliance with every point in both docs — feature-folder
restructuring, a server-state library, a full test suite, a schema
validation library, rate-limiting infra, a general audit-log system,
route-based code splitting — would be a multi-week rewrite. That wasn't
attempted blindly. This records what's already true, what was fixed in
this pass, and what's a deliberate, reasoned deferral rather than an
oversight.

## Already compliant (verified, not just assumed)

**Supabase / RLS (the app's strongest area).** Every client-accessible
table has RLS policies scoped to the caller's own org via
`is_admin()`/`auth_admin_org_id()`/`auth_teacher_org_id()` helper
functions (`SECURITY DEFINER`, `SET search_path = public` pinned — exact
match for standard #44). Ownership is never trusted from the client
(`auth.uid()`-keyed policies throughout). Plan-capacity and billing-status
limits are enforced at the RLS `WITH CHECK` layer, not just in the UI —
confirmed live against the remote DB during a prior session pass.
Migrations are fully version-controlled, small, and never rewritten after
being applied (`npx supabase migration list` matches local exactly).
Edge Functions are used for exactly what standard #4/#36 says they should
be: payments, webhooks, impersonation, org creation — never a giant
do-everything function. Realtime isn't used anywhere, correctly, per
standard #33's "don't enable it for everything." Supabase Storage isn't
used either — logo URLs are external links, no upload feature exists yet
(standard #28-32 don't apply until that's built).

**Frontend states.** Loading/empty/error states are handled deliberately
and specifically almost everywhere (confirmed across dozens of screens
this session) — not a blanket "Something went wrong" for every case.
Frontend authorization is consistently treated as UX only, never the real
boundary (RLS is), matching standard #19's golden rule exactly.

**Design system.** CSS custom properties (`--brand-primary` etc.) plus
shared utility classes and `Button`/`Input`/`Card`/`LoadingSpinner`
primitives — standard #5, already in place before this pass.

## Fixed in this pass

- **Service-role key was reachable from the browser bundle** (`AdminDashboard.tsx` fallback + an unused `getServiceRoleClient` in `auth.ts`) — the single most serious gap found. Removed both call sites; confirmed the key no longer appears anywhere in a production build. Also renamed the local `.env`'s `VITE_SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY` (no `VITE_` prefix) so Vite can't inline it even by future accident — matches standard #5/#28 exactly. **The key was already shipped in prior builds and should be rotated in the Supabase dashboard; this fix stops the leak going forward, it doesn't un-expose what's already out.**
- `.env.example` added to both repos (was missing — standard #63's recommended structure calls for it explicitly). Fixed a `.gitignore` blanket `.env*` pattern that was silently excluding it too.
- `src/lib/database.types.ts` — real generated types via `supabase gen types typescript`, committed, with `npm run db:types` to regenerate (standard #21). Not swapped in to replace the hand-written interfaces in `lib/supabase.ts` yet — see "Deliberately deferred" below.
- `ErrorBoundary` component added (standard #36 — none existed before). Wraps the whole app as a last-resort safety net, plus the three chart-heavy sections that have actually broken this session (`EducatorAnalytics`, `AnalyticsOverview`, `TestReports`' chart grid) as section-level boundaries.
- A handful of `any` types tightened where it was actually safe (`utils.ts`, several inline sort comparators). Two attempted `onChange<K extends keyof T>` generic tightenings were reverted after TypeScript correctly flagged them as unsound — see below.

## Deliberately deferred (reasoned, not forgotten)

- **No API-client/service layer** (standard #10). Components call Supabase directly. This reads as a frontend-standard gap but is explicit, sanctioned behavior under the Supabase-specific standard #3: *"Do not create a custom backend endpoint for every CRUD operation if RLS already provides a correct security boundary."* RLS is that boundary here. Also documented as a deliberate choice in `CLAUDE.md`.
- **No server-state library** (React Query/SWR, standard #8/#9). Plain `useEffect` + `useState` fetch pattern throughout, consistently. Standard #8 itself says "use a state library only when the complexity justifies it" — at this app's current scale that threshold hasn't been hit. Revisit if duplicate-fetch overhead (e.g. `usePlanLimits`/`useAddonCapacity` each fetching independently) becomes a measured problem, not a hypothetical one.
- **Hand-written types not replaced by generated ones.** `database.types.ts` now exists as ground truth (see above), but swapping every component's imports from the hand-written interfaces in `lib/supabase.ts` to the generated `Database['public']['Tables'][...]` shape is a real refactor with its own regression surface — dozens of files, and the hand-written types carry extra computed/joined fields (e.g. `Test.classes`, populated only when a caller embeds it) that need deliberate modeling on top of the raw generated shape, not a blind find-replace. Do this as its own reviewed change, not a side effect of a broad compliance pass.
- **`select('*')` used broadly instead of column-scoped selects** (standard #23). Confirmed widespread across the codebase. Not a security issue — RLS already scopes which *rows* are visible regardless of which columns are selected — so this is a data-minimization/performance concern, not a hole. Deprioritized under the current data volumes; worth a pass if any screen's payload size becomes a measured problem.
- **No test suite** (standard #38/#39). `CLAUDE.md` already states this explicitly: no test runner configured. Adding one (choice of framework, initial coverage of the RLS-critical paths per standard #54) is a real, separate initiative — not attempted as part of a docs-compliance pass.
- **No rate limiting beyond Supabase Auth's own** (standard #50) and **no general audit-log table** beyond `impersonation_log` (standard #47). Both are real gaps and both are new infrastructure/features, not "bring existing code in line" fixes — out of scope here. Worth prioritizing before this app handles a materially larger user base, particularly rate limits on the `impersonate-org` and `razorpay-apply-promo` Edge Functions.
- **No route-based code splitting.** The production build emits one >1.3MB JS chunk every time (Vite's own build warning flags this on every build). Fixing it means restructuring around `React.lazy()` per role-dashboard at minimum — a real, bounded, worthwhile follow-up, just not bundled into this pass.
- **No pagination on admin list screens** (educator tokens, org list, etc. — standard #32). All render everything with a client-side max-height scroll + search filter. Fine at current data volumes (tens of rows); would need server-side pagination before that stops being true.
- **Two `onChange` generics reverted, not tightened.** `BehaviorFields`/`GradingFields`/`TestSettings`/`TestAuthoring` share a single `update(key, value: any)` pattern where one function typed against a combined `Form` supertype gets passed into components expecting a narrower slice of it. A fully generic `<K extends keyof T>(key: K, value: T[K])` version of that is something TypeScript correctly rejects as unsound (verified — it broke the build). The `any` here is a deliberate, working simplification of a real pattern, not an oversight; standard #35's own guidance is "types should improve correctness, not become an enormous layer of duplicated boilerplate," which forcing this through would have been.
