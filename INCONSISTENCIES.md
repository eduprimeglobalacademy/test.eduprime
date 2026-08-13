# Inconsistencies audit

## Depth pass — nested/detail flows (round 2)

Round 1 (below) covered surface-level screens. This pass reads the nested flows underneath them directly — RLS policies, edge functions, and components that only render conditionally inside other components — rather than relying on summaries. Two significant findings, both fixed.

### 12. Blocked students silently did nothing unless "Require Google sign-in" was also on
**Where:** `src/components/student/TestInterface.tsx`, `resolveGate()`.
**What:** `resolveGate()` started with `if (!testData.require_google_auth) { setPhase('details'); return }` — for any test that doesn't require Google sign-in (the common case; it's opt-in, off by default), the function returned immediately and **never queried `test_blocked_students` at all**. A teacher could block a student's email from a test, see it reflected in the UI as blocked, and that student could still join the exact same test by typing any name/email/phone into the plain details form — the block was structurally unreachable for that entire class of test. This isn't a display bug or a dead field; it's a real access-control gap.
**Compounding UI issue:** the block-management panel (`BlockedStudentsPanel`) was itself only rendered when "Require Google sign-in" was checked (nested inside that toggle's conditional in `BehaviorFields.tsx`) — so a teacher on a non-Google-gated test couldn't even see the blocking UI, let alone discover it wasn't working.
**Status:** ✅ Fixed. Added the same `test_blocked_students` check to `checkDuplicate()` (the step that runs for every test, right after the student fills in the details form, regardless of Google-gating) — this is the path a non-Google-gated test always goes through, so blocking now works universally. Left the original check in `resolveGate()` in place for Google-gated tests too (redundant there, but harmless, and it gives an earlier "you're blocked" message before the student even fills the form). Also moved `BlockedStudentsPanel` out from under the "Require Google sign-in" toggle into its own always-visible "Blocked Students" card in `BehaviorFields.tsx`, since it's a genuinely independent feature.

### 13. `CollaboratorsModal.tsx` was fully dead code
**Where:** `src/components/teacher/CollaboratorsModal.tsx` (deleted).
**What:** A complete, working modal for adding/removing test collaborators — but grepping the entire codebase found **zero imports of it anywhere**, including in `TeacherDashboard.tsx`'s view-mode switch. `TestSettings.tsx` has its own independent inline implementation of the exact same feature (same `useTestCollaborators` hook, same add-by-email/remove behavior, just embedded in a card instead of a modal) — the modal appears to have been superseded by that inline version and simply never deleted.
**Status:** ✅ Fixed. Deleted the file. Verified no other file referenced it and the typecheck stayed clean.

### 14. Renewal webhook could silently revert a platform admin's manual plan override
**Where:** `supabase/functions/razorpay-webhook/index.ts`, the `subscription.activated`/`subscription.charged` handler (previously shared).
**What:** Both events wrote `organizations.plan_id = subscription.plan_id` (the plan stored on the **local** `subscriptions` row from when that Razorpay subscription was originally created). The platform console's own plan-reassignment action (`eduprime-admin`'s Organizations page, used for negotiated/custom deals or support overrides) only ever writes `organizations.plan_id` directly — it never touches the `subscriptions` table. So: platform staff move an org onto a different plan → the org keeps its existing, still-active Razorpay subscription tied to the *original* plan → the next renewal fires `subscription.charged` → the handler blindly resets `organizations.plan_id` back to the original plan, silently undoing the override, with no error or indication anywhere that it happened.
**Status:** ✅ Fixed. Split the switch case: `subscription.activated` (a subscription's first activation — the one moment the org is genuinely moving onto the plan they just subscribed to) still sets `plan_id`. `subscription.charged` (every subsequent renewal) now only resets `status`/`grace_ends_at`, leaving `plan_id` untouched — a renewal doesn't change which plan an org is on, so it never needed to touch that field.
**Not yet deployed** — this Edge Function change is in the repo but Edge Functions deploy separately from a normal push; flag before deploying to production since it touches live payment-webhook processing.

### 15. `validate-teacher-token` logged the raw token and phone number
**Where:** `supabase/functions/validate-teacher-token/index.ts`.
**What:** `console.log('Validating token:', token, 'for phone:', phoneNumber)` printed the secret one-time educator token and the registrant's phone number straight into Edge Function logs. Every other edge function in this codebase only `console.error`s on failure and never logs request payloads or secrets — this was the one exception, left over from what reads like an older, less-refactored file (the "Step 1/2/3" comment style and generic error messages don't match the newer functions' conventions). The token is described in the admin UI itself as something to "share securely with the educator"; logging it server-side undercuts that, even though by the time it's logged it's already been consumed in the same request.
**Status:** ✅ Fixed. Removed the log line. Confirmed (via grep across every edge function) no other request payload/secret is logged anywhere else in `supabase/functions/`.
**Not yet deployed** — same caveat as #14, this is an Edge Function change.


Found by reading the actual source across both repos (`test.eduprime` and `eduprime-admin`), cross-checking claimed behavior against real code paths, and grepping for known-risky patterns (hardcoded thresholds, duplicated types, dead fields, unfired triggers). Ordered by severity. Each gets fixed one at a time, checked off here as it's done, with a short note on what actually changed.

## High

### 1. Trial organizations never functionally expire
**Where:** `supabase/migrations/20260810150000_billing.sql`, `org_can_write(check_org_id)`.
**What:** The hard-enforcement function that gates creating new tests/tokens treats `status = 'trial'` as always-writable, with no check against `trial_ends_at`. Nothing else in the codebase (no cron job, no scheduled Edge Function, nothing in `supabase/functions/`) ever transitions an org's status away from `trial` based on that date either. The 14-day countdown shown in the UI is purely cosmetic — a trial org can create tests and tokens indefinitely unless a platform admin manually changes their status by hand.
**Impact:** Real revenue/business-logic gap, not just a display bug.
**Status:** ✅ Fixed. `org_can_write()` now requires `trial_ends_at IS NULL OR trial_ends_at > now()` for trial-status orgs (new migration `20260813180000_enforce_trial_expiry.sql`). `OrgStatusBanner` also gained a distinct "Trial expired — access restricted" state (matching the existing grace-expired styling) instead of floor-clamping to "0 days left" forever.

### 1b. (found while fixing #1) `AdminDashboard` never showed the trial banner at all
**Where:** `src/components/admin/AdminDashboard.tsx`.
**What:** `TeacherDashboard`'s status-banner gate correctly includes `'trial'`; `AdminDashboard`'s equivalent gate was missing it (`past_due`/`suspended`/`cancelled` only) — so the one role who'd actually act on a trial countdown (subscribe to a plan) never saw it on their own dashboard home screen.
**Status:** ✅ Fixed — added `'trial'` to `AdminDashboard`'s banner condition, matching `TeacherDashboard`.

## Medium

### 2. `eduprime-admin`'s duplicated `Organization` type is missing `student_billing_mode`
**Where:** `eduprime-admin/src/lib/supabase.ts` vs `test.eduprime/src/lib/supabase.ts`.
**What:** The admin console repo hand-duplicates several types from the main app (documented as intentional — the two repos are independent deployments). The `Organization` interface there has no `student_billing_mode` field, even though the main app added it (`'capped' | 'metered'`) and uses it to gate the students-per-test plan limit. Platform staff have zero visibility into which orgs are on metered student billing from the console.
**Status:** ✅ Fixed. Added `student_billing_mode` to `eduprime-admin`'s `Organization` type, and surfaced it in `OrgDetail.tsx`'s Plan & billing card — the Students/test tile now shows "Metered" instead of a numeric cap when applicable, plus an explanatory note.

### 3. `eduprime-admin`'s org-detail add-on list mislabels `extra_students` add-ons
**Where:** `eduprime-admin/src/pages/OrgDetail.tsx`, the "Add-on capacity" card.
**What:** `{addon.kind === 'extra_teachers' ? 'teacher seats' : 'active test slots'}` — a two-way ternary over what's now a three-way `kind`. An org's `extra_students` add-on renders with the label **"active test slots,"** which is simply wrong.
**Root cause:** same type drift as #2 — `AddonKind` in this repo is still `'extra_teachers' | 'extra_active_tests'`, missing `'extra_students'`.
**Status:** ✅ Fixed. `AddonKind` now includes `'extra_students'`; the label is now a proper `Record<AddonKind, string>` lookup (`ADDON_LABEL`), same pattern the main app's `BillingPanel.tsx` already used — no more silent fallback to the wrong case.

### 4. `eduprime-admin`'s `CapacityAddon` type is missing metered mode
**Where:** `eduprime-admin/src/lib/supabase.ts`, `CapacityAddon.mode`.
**What:** Typed as `'recurring' | 'one_time'`, missing `'metered'` (which the main app's equivalent type includes). In `OrgDetail.tsx`'s add-on list, a metered-mode row falls through to the one-time-bump display branch (`addon.expires_at ? ' until …' : ' this cycle'`), which is a misleading label for a running pay-per-use add-on.
**Status:** ✅ Fixed. `CapacityAddon.mode` now includes `'metered'`, with its own explicit label ("/unit, billed for actual usage each cycle") instead of falling through to the one-time-bump branch.

### 5. Grade-related stats inconsistently use the test's configured grading boundaries
**Where:** `src/components/teacher/TestReports.tsx`, `src/components/teacher/AnalyticsOverview.tsx`, `src/components/teacher/GradingFields.tsx` / `TestSettings.tsx` / `TestAuthoring.tsx`.
**What:** A test's Grading config (A/B/C/D% boundaries + a "passing grade minimum") is fully editable and saved to `grading_config`, but three different consumers treat it inconsistently:
  - The **per-student Grade column** in `TestReports` correctly uses the test's actual `grading_config` (via `getGrade(pct, test?.grading_config)`).
  - The **Grade Distribution pie chart**, on the exact same screen, buckets the same scores using a **hardcoded** 90/80/70/60 split, ignoring `grading_config` entirely — so the chart and the table below it can disagree about a borderline student's letter grade.
  - **Every "Pass Rate" stat** anywhere in the product (`TestReports`, `AnalyticsOverview`) uses a **hardcoded `>= 60`** cutoff. The "passing grade minimum" field a teacher configures in Grading is saved and round-tripped through the form, but is never read by anything that computes a pass rate.
**Status:** ✅ Fixed. `TestReports` now derives a single `gradingCfg` (the test's own `grading_config`, falling back to the same 90/80/70/60/60 defaults `GradingFields` itself defaults to) and uses it consistently for the pie chart buckets, the Pass Rate stat, and the per-student Grade column — all three now agree. The Pass Rate label also shows the actual threshold in use (`Pass Rate (≥{passingGrade}%)`) instead of a hardcoded "≥60%". `AnalyticsOverview` (a cross-test rollup, where each test can have its own passing grade) now checks each attempt against its *own* test's configured threshold rather than one global 60% cutoff, and its label changed to "Pass Rate (per-test threshold)" since a single percentage in the label would no longer be accurate across mixed thresholds.

## Low

### 6. "Default time per question" field is dead
**Where:** `src/components/teacher/BehaviorFields.tsx` (`timePerQuestion` field), `TestAuthoring.tsx`, `TestSettings.tsx`.
**What:** The field is rendered, defaults to `'60'`, and is threaded through both the creation-wizard and settings forms' state — but it is never written to any question's actual `time_limit_seconds` in either save path. Each question's own individually-set time limit is the only thing that actually takes effect. A teacher setting this field reasonably expects it to apply to new questions; it does nothing.
**Status:** ✅ Fixed, with an honest scope limit. All three question-creation paths (Add Question, Bulk Import, From Bank) now default a new question's `time_limit_seconds` to the configured value whenever per-question timing is on, instead of always `null`. What's *not* fixed (deliberately, rather than adding a `tests` table column for it): there's no database column to persist this default across a later visit — it only applies to questions added in the same authoring session where it's set. Since the exact same `BehaviorFields` component also renders this field inside Test Settings (for an already-created test) where it's structurally unable to affect anything (Test Settings never adds questions), the helper text under the field was made explicit about this rather than pretending it's a saved, persistent setting.

### 7. Promotion `status = 'expired'` is unreachable
**Where:** `supabase/migrations/20260811210602_platform_usage_and_promotions.sql` (schema), `eduprime-admin/src/pages/Promotions.tsx` (UI).
**What:** The `CHECK` constraint allows `'active' | 'expired' | 'archived'`, and the admin UI even filters by `'expired'` — but nothing anywhere (no button, no scheduled job, no trigger) ever sets a promotion to that value. A promotion past its `ends_at` still shows as `active` in the list forever, unless a human archives it by hand. (Redemption itself is unaffected — the redemption Edge Function does its own live date-range check independently.)
**Status:** ✅ Fixed, without adding a scheduled job. `Promotions.tsx` now computes a `displayStatus()` per row — an `'active'` promotion whose `ends_at` has passed reads and filters as `'expired'` in the UI, without ever writing to the stored column. The stored `status` column itself is untouched (Archive still operates on it directly), so this is purely a display-layer fix; redemption was already correct independently.

### 8. `ConnectGoogleButton` is asymmetric between the two dashboards
**Where:** `src/components/admin/AdminDashboard.tsx` (header, always visible) vs `src/components/teacher/TeacherDashboard.tsx` (not present at all — only reachable via `TeacherSettings`, a sub-screen).
**What:** Org admins get one-click Google-account linking right in their header; teachers have to know to go into Settings to find the same control, for what is otherwise an identical feature available to both roles. (This also means this repo's own `CLAUDE.md` — which describes `ConnectGoogleButton` as "shown in AdminDashboard/TeacherDashboard headers" — is inaccurate for the teacher case.)
**Status:** ✅ Fixed. Added `ConnectGoogleButton` to `TeacherDashboard`'s header, mirroring `AdminDashboard`'s placement exactly. It still also appears in `TeacherSettings`' Connected Accounts card — that's fine, both reflect the same live linked-status, same as the header. `CLAUDE.md`'s claim is now accurate for both roles, so no doc correction was needed.

### 9. `extra_students` add-on capacity duplicated instead of shared
**Where:** `src/hooks/useAddonCapacity.ts` vs `src/components/teacher/TestReports.tsx`.
**What:** The shared hook only aggregates `extra_teachers`/`extra_active_tests`. `TestReports.tsx` needs the equivalent for `extra_students` and re-implements the same active/non-expired aggregation query inline rather than extending the shared hook — works today, but it's a second copy of the same logic that can drift.
**Status:** ✅ Fixed. `useAddonCapacity` now also aggregates `extra_students` (the query already fetched every kind, it just wasn't summing this one). `TestReports.tsx` dropped its inline duplicate query and its own local state entirely in favor of the shared hook.

### 10. Leftover diagnostic migrations — investigated, correcting the original claim
**Where:** `supabase/migrations/20260813110000_diag2.sql`, `20260813120000_diag3.sql`, `20260813140000_diag5.sql`.
**Original claim (wrong):** assumed from session memory that these were disposable, always-fail diagnostic migrations that never recorded as "applied," making them safe to delete.
**What checking actually found:** all three are ordinary `CREATE POLICY` statements — they succeed, not fail — and `npx supabase migration list` confirms all three are recorded as applied on the **remote** database (they appear in both the `local` and `remote` columns). They're superseded (the policy they created is dropped entirely by the later `20260813150000_admin_decide_pending_test_rpc.sql`), so they no longer affect current schema behavior, but they are real, applied history, not orphaned no-ops.
**Decision: not deleting them.** Removing an already-applied migration's local file without first running `supabase migration repair --status reverted <version>` desyncs the repo from the remote's own migration ledger — anyone reconciling against the real database (or running a local reset from migrations) would see a mismatch. That's a real, if minor, risk for a purely cosmetic folder-tidiness benefit. Leaving superseded-but-applied migrations in place as permanent history is normal, correct migration hygiene, not an inconsistency worth the risk to "fix." This entry stays here as a record of the investigation and the corrected understanding, not as a pending task.
