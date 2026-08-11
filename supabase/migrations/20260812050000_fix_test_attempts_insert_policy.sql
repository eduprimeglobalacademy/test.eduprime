/*
  # Fix student test submission (root cause of the RLS debugging session)

  The real bug was never the INSERT policy — `WITH CHECK (true)` for anon
  was correct and in place the whole time. It was TestInterface.tsx's
  `.insert([...]).select().single()` on test_attempts: PostgREST's
  RETURNING clause is subject to the same RLS as a SELECT, and there is
  deliberately no anon-facing SELECT policy on test_attempts (see
  20260810120000_platform_organizations.sql — anon SELECT was removed
  because it let any anon-key holder read every student's name, email,
  phone, and score across every test). That combination made every
  student submission fail with a 42501 "violates row-level security
  policy" error, 100% reproducibly. The actual fix is in the client code:
  the attempt id is now generated client-side and the SELECT-back is
  dropped entirely, so no SELECT policy is needed. This migration just
  restores a single, clean, properly-named INSERT policy in place of the
  disposable one used to isolate the cause.
*/

DROP POLICY IF EXISTS "zzz_debug_allow_all" ON test_attempts;
DROP POLICY IF EXISTS "public_create_attempts" ON test_attempts;
DROP POLICY IF EXISTS "Anyone can create test attempts" ON test_attempts;

CREATE POLICY "anon_creates_test_attempts"
  ON test_attempts FOR INSERT
  TO anon
  WITH CHECK (true);
