/*
  # Close the reactivation gap in max_active_tests enforcement

  org_within_active_test_limit() (20260812060000_hard_enforce_plan_limits.sql)
  is only wired into the tests INSERT policy. TestList.tsx's status toggle
  (draft -> live -> closed -> draft -> ...) is a plain UPDATE, so a closed
  test could be reactivated with zero regard for the plan's active-test
  limit — the limit only ever stopped *creating* new tests, never
  *reactivating* closed ones. A BEFORE UPDATE trigger closes that: reusing
  the same limit function (the row being reactivated is currently 'closed',
  so it's correctly excluded from its own count, same as an INSERT checking
  before the new row exists).
*/

CREATE OR REPLACE FUNCTION check_test_reactivation_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('draft', 'live') AND OLD.status = 'closed' AND NOT org_within_active_test_limit(NEW.org_id) THEN
    RAISE EXCEPTION 'Active test limit reached for this organization'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_test_reactivation_limit ON tests;
CREATE TRIGGER enforce_test_reactivation_limit
  BEFORE UPDATE ON tests
  FOR EACH ROW
  EXECUTE FUNCTION check_test_reactivation_limit();
