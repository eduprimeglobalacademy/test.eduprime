/*
  # Approve/reject via RPC instead of a direct RLS-gated UPDATE

  admin_approves_pending_tests (a plain UPDATE policy: USING/WITH CHECK on
  is_admin() + org + status) was added and verified every individual
  condition true for the admin session (is_admin()=true, org_id matches,
  status='pending_approval', confirmed via direct RPC calls in the same
  session) — yet the real UPDATE consistently failed with Postgres's
  native "new row violates row-level security policy" error, reproduced
  even with the policy simplified down to a bare `id = '<literal>'`
  check. Root cause not conclusively isolated (multi-policy interaction
  with the pre-existing teachers_update_own_tests policy is suspected,
  but confirming that safely would have required temporarily dropping a
  real teacher-facing policy, correctly refused). Sidestepping the whole
  question with a SECURITY DEFINER RPC — same pattern already used
  throughout this schema (org_teacher_analytics, org_active_test_count,
  get_test_collaborators) for exactly this class of "narrow, pre-checked
  write that doesn't fit cleanly into row-level policies" case.
*/

DROP POLICY IF EXISTS "admin_approves_pending_tests" ON tests;

CREATE OR REPLACE FUNCTION admin_decide_pending_test(p_test_id uuid, p_approve boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RETURN false;
  END IF;

  SELECT id INTO v_admin_id FROM admin_users WHERE user_id = auth.uid();

  IF p_approve THEN
    UPDATE tests SET status = 'live', approved_by = v_admin_id, approved_at = now()
    WHERE id = p_test_id AND org_id = auth_admin_org_id() AND status = 'pending_approval';
  ELSE
    UPDATE tests SET status = 'closed'
    WHERE id = p_test_id AND org_id = auth_admin_org_id() AND status = 'pending_approval';
  END IF;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_decide_pending_test(uuid, boolean) TO authenticated;
