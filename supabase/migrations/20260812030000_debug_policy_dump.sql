-- Diagnostic step from live RLS debugging (student test-submission bug —
-- see 20260812050000 for the actual root cause and fix). This step
-- replaced every existing test_attempts policy with one broad TO public
-- INSERT WITH CHECK (true) policy to rule out role-scoping as the cause.
-- It wasn't the cause — kept as a no-op record so local migration history
-- matches what was actually applied remotely at the time.
SELECT 1;
