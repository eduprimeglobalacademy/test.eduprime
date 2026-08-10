/*
  # Cleanup — untracked policies discovered on first deploy

  This project's remote database had 6 migrations applied directly
  (2025-10-01) that were never committed to supabase/migrations — visible
  via `supabase migration list` as remote-only versions. They re-created
  several RLS policies under new names rather than replacing the
  originals, so every migration in this repo that does
  `DROP POLICY IF EXISTS "<old name>"` correctly no-ops against them (the
  old name was already gone) while leaving the new-named duplicate fully
  intact and un-superseded.

  Confirmed by dumping the live schema (`supabase db dump`) before writing
  this file — most duplicates are harmless (same ownership-scoped logic
  under a new name). Six are not:

    - teacher_tokens: admin_manage_tokens — FOR ALL, any admin_users row,
      with no org_id check at all. Cross-tenant: an admin from org A could
      read/create/update/delete org B's tokens through this policy alone,
      regardless of every org-scoped policy this repo's migrations added.
    - teacher_tokens: anonymous_token_read / anonymous_token_update —
      USING (true) for anon on SELECT and UPDATE. Exactly the
      unrestricted-token problem the very first Phase 0 pass fixed, still
      open under these two names.
    - student_answers: public_read_answers — USING (true) for anon SELECT.
      The exact PII leak fixed in Phase 0 (every student's answers,
      readable by anyone holding the public anon key), reopened under a
      name none of this repo's migrations knew to drop.
    - test_attempts: public_read_attempts — same shape, same fix, same
      reopening. Every student's name/email/phone/score, readable by
      anyone with the anon key.
    - tests: teacher_manage_own_tests — FOR ALL, ownership-scoped but with
      no org_can_write() check. Phase 3's entire billing enforcement
      (blocking new tests when an org is suspended/past the grace period)
      does nothing against a teacher hitting this policy instead of the
      gated teachers_create_tests_if_org_can_write one — both are
      permissive policies, so Postgres ORs them: whichever policy allows
      a row wins.

  Also drops test_attempts: teacher_view_own_test_attempts — not a
  security issue (still ownership-scoped, just redundant now that
  teachers_view_own_org_attempts exists), included for the same reason
  the rest of this repo consolidates duplicate policies: two policies
  covering the same case under different names is how the *next* mistake
  like this one happens.
*/

DROP POLICY IF EXISTS "admin_manage_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "anonymous_token_read" ON teacher_tokens;
DROP POLICY IF EXISTS "anonymous_token_update" ON teacher_tokens;
DROP POLICY IF EXISTS "public_read_answers" ON student_answers;
DROP POLICY IF EXISTS "public_read_attempts" ON test_attempts;
DROP POLICY IF EXISTS "teacher_manage_own_tests" ON tests;
DROP POLICY IF EXISTS "teacher_view_own_test_attempts" ON test_attempts;
