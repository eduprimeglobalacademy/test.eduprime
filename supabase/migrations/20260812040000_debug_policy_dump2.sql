-- Diagnostic step from live RLS debugging (student test-submission bug —
-- see 20260812050000 for the actual root cause and fix). This step only
-- inspected pg_policy/pg_class metadata; no schema change. Kept as a
-- no-op record so local migration history matches what was applied
-- remotely at the time.
SELECT 1;
