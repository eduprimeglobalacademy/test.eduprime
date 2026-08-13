# State Management Compliance Status

Gap analysis against `react-tanstack-query-state-management-standards.md`,
done against the actual code. The doc's own final word (§52) is the right
frame: *"The objective is not to use TanStack Query everywhere... make
state ownership explicit."* This records what already matches, what was
migrated in this pass, and what's a reasoned deferral rather than a gap
nobody noticed.

## Already compliant

**Core architecture (§3).** A single `QueryClient` is created once in
`src/main.tsx` with deliberate defaults (`staleTime: 30_000, retry: 1`),
wrapped around the app via `QueryClientProvider` — not re-instantiated per
render, defaults chosen intentionally rather than left at TanStack's
library defaults.

**State classification (§2, §52).** Local UI state (modal open/closed,
wizard step, mobile nav, sort column/direction, hover/copy-feedback state)
consistently stays in plain `useState` — e.g. `EducatorAnalytics`'
`sortKey`/`sortDesc`, `DashboardHome`'s `copiedId`. Nothing in this
codebase copies query data into a parallel `useState` without a genuine
draft/edit reason (§27) — where a component holds a local editable copy
(`TestAuthoring`'s draft question list, `BillingPanel`'s add-on quantity
picker) it's a real, intentional draft, not an accidental second source of
truth.

**Auth/permissions (§30, §31, §40).** Session state lives in one place
(`AuthContext`), not duplicated. Frontend never acts as the authorization
boundary anywhere in the app — RLS is (see `compliance-status.md`'s
Supabase section) — matching this standard's own golden rule #13/#14
exactly, independently of the Supabase-standard doc that says the same
thing.

## Adopted in this pass

**All small data hooks now own their server state correctly (§1, §13,
§14).** `usePlanLimits`, `useAddonCapacity`, `useClasses`, `useFocusItems`,
`useTestCollaborators`, `useClassRoster`, `useQuestionBank`,
`useTestBlockedStudents`, `useTestSections` — nine hooks total, every one
in `src/hooks/`. The last two (`useTestBlockedStudents`, `useTestSections`)
were plain `useEffect`+`useState`+manual-refetch before this pass; now on
`useQuery`. All nine had their write operations converted from bare async
functions that manually called a refetch to real `useMutation` calls with
`onSuccess: () => queryClient.invalidateQueries(...)` — the doc's explicit
rule #5/#13 ("use mutations for server writes"), not just "eventually
re-fetches." External call signatures were kept identical
(`mutateAsync` swapped in 1:1 for the old async functions), so no
consuming component needed to change.

**Three read-heavy components converted to `useQuery`:**
- `PendingApprovals.tsx` (admin approvals list + approve/reject mutation)
- `EducatorAnalytics.tsx` (admin analytics table/chart, read-only RPC)
- `DashboardHome.tsx`'s live-submission-count fetch (teacher dashboard) —
  given a shorter `staleTime` (10s vs. the app-wide 30s default)
  specifically because submission counts are genuinely volatile while a
  test is live, per §9's "choose staleTime based on data volatility."

All three verified live (signed in as both `admin@zenith-demo` and
`qatester@zenith-demo`, not just typechecked) — Analytics/Approvals tabs
and the teacher dashboard's live-test submission counts all render
correctly post-migration.

## Deliberately deferred (reasoned, not forgotten)

- **`BillingPanel.tsx`** — read/write of plans, subscription, invoices,
  add-ons, promo codes, all via Razorpay-backed Edge Functions
  (subscribe/cancel/purchase-addon/apply-promo/toggle-metered-billing).
  The standard itself calls out payments and financial operations as
  needing extra caution (§17: *"Be cautious for: Payments, Inventory,
  Financial operations"*). Refactoring the code paths that trigger real
  money movement during a broad state-management sweep is exactly the
  wrong moment to do it — this needs its own focused pass with its own
  testing, not a drive-by conversion alongside eight other files.
- **`AdminDashboard.tsx` / `TeacherDashboard.tsx`** — the two largest
  shell components (649 / 456 lines), already touched multiple times this
  session (mobile nav drawer, error boundaries, lazy-loading). They drive
  a large amount of interdependent derived UI state on top of their
  fetches. Migrating their data fetching is real, worthwhile follow-up
  work, but doing it inside an already-large multi-part session risks
  exactly the kind of regression this session has been finding and fixing
  in student-facing flows — better as its own reviewed pass.
- **`TestAuthoring.tsx` (1041 lines, the single largest file in the app),
  `TestSettings.tsx`, `TestPreview.tsx`, `TestReports.tsx`** — the test
  authoring/editing flow. This is actually the standard's own §26 pattern
  already (*"TanStack Query → server value, Form library → temporary
  draft, Mutation → submit"*) — the initial test/question load feeds a
  large local draft object that the user edits before saving, which is
  the *correct* shape per the doc, just not built on top of `useQuery`
  for the initial load yet. Converting just the load without touching the
  surrounding draft-state machinery is possible but non-trivial given the
  file's size and centrality to the core product feature; not attempted
  as a drive-by change here.
- **`TestInterface.tsx` (student exam-taking) and `ClassEnrollment.tsx`
  (student class-join)** — both are one-shot, anonymous, mutation-heavy
  flows (join → answer/enroll → submit), not read-heavy list/detail views.
  `TestInterface.tsx` in particular was just extensively reworked this
  session (validation-error state, fullscreen guard, refresh-survival
  snapshotting, a stray-session submit-auth fix) — it is not a good
  candidate for an additional broad refactor in the same session that
  just stabilized it. Neither file benefits much from `useQuery`'s
  caching/refetch machinery anyway, since there's nothing to re-fetch or
  share across renders in a flow the user only ever passes through once.
- **`OnboardingFlow.tsx` (org signup) / `RootMarketing.tsx`** — similar
  shape to the above: mostly one-shot mutations (create org, self-serve
  signup) rather than cached reads. Low value-to-risk ratio for this pass.
- **No query-key factories (§5).** Existing keys are simple, flat, and
  already consistent (`['classes', teacherId]`, `['test-sections', testId]`
  etc.) across all nine hooks. At this app's actual scale (a handful of
  query domains, not dozens of screens sharing complex filter state)
  introducing a `*.keys.ts` file per feature is the premature abstraction
  the standard's own §52 explicitly warns against — "the objective is not
  to use TanStack Query everywhere," and the same restraint applies to its
  supporting patterns.
- **No `features/api/hooks/components` folder restructuring (§6, §38).**
  `CLAUDE.md` documents the existing "components query Supabase directly,
  no repository/service layer" architecture as a deliberate choice, not
  an oversight — same reasoning `compliance-status.md` already recorded
  for the frontend-standards doc's API-layer-separation point. This
  standard's own architecture section (§39) agrees that layer is optional
  when RLS is already the real authorization boundary.
