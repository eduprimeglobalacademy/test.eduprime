/*
  # Fix: generating a new educator token has been broken since multi-tenancy

  teacher_tokens.org_id is NOT NULL (set by the tenancy migration), but
  unlike every other org-scoped table (teachers, tests, test_attempts,
  classes, class_students, question_bank_items, test_blocked_students,
  teacher_focus — all of which got a `set_..._org_id()` BEFORE INSERT
  trigger), teacher_tokens never did. AdminDashboard's "Generate Token"
  never sends org_id in the insert payload (there's nothing on the client
  to derive it from — an org admin doesn't have their own org_id sitting
  in state, that's exactly what triggers like this exist to avoid needing).

  Net effect: NEW.org_id was always NULL, so the existing RLS policy's
  `org_id = auth_admin_org_id()` check was always `NULL = uuid` → NULL →
  rejected, always surfacing as the same generic 42501 the billing-status
  gate also produces. It read as "billing must be blocking this" and hid
  a completely unrelated bug — token creation through the actual UI has
  likely never worked, only ever exercised in this project via seed
  scripts that supplied org_id explicitly.
*/

CREATE OR REPLACE FUNCTION set_token_org_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := auth_admin_org_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_token_org_id ON teacher_tokens;
CREATE TRIGGER trg_set_token_org_id
  BEFORE INSERT ON teacher_tokens
  FOR EACH ROW EXECUTE FUNCTION set_token_org_id();
