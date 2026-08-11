/*
  # org_active_test_count RPC

  A teacher can only SELECT their own tests (teachers_view_edit_delete_own_tests),
  not their org's — correct for privacy, but it means a teacher has no way
  to know the org-wide draft+live count that max_active_tests actually
  limits. TeacherDashboard's usage meter was quietly wrong for any org
  with more than one teacher: it only ever counted the signed-in teacher's
  own tests against the org-wide limit, so a teacher with 2 tests could
  see "2/10" and feel safe while a colleague's tests had already used up
  the other 8 — same shape as has_attempted(), a boolean/count-only RPC
  that doesn't leak the other teachers' actual test rows.
*/

CREATE OR REPLACE FUNCTION org_active_test_count(p_org_id uuid)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT count(*)::integer FROM tests WHERE org_id = p_org_id AND status IN ('draft', 'live');
$$;

GRANT EXECUTE ON FUNCTION org_active_test_count(uuid) TO authenticated;
