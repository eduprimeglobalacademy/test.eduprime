/*
  # Hard-enforce plan limits (max_teachers, max_active_tests)

  Until now, `max_teachers`/`max_active_tests`/`max_students_per_test`
  were purely cosmetic — UsageMeter shows a bar and a warning, but nothing
  actually stopped a write past the limit (only org STATUS is hard-gated,
  via org_can_write). That's a real gap: a plan's limits are meaningless
  if they're only ever advisory, and it's exactly what a negotiated custom
  plan needs to be enforceable for it to mean anything.

  This adds two SECURITY DEFINER checks and wires them into the two writes
  that actually consume plan capacity:
  - org_within_teacher_limit: blocks issuing a NEW educator token once
    (existing teachers + still-active unused tokens) would meet or exceed
    max_teachers. Counting outstanding tokens too (not just seated
    teachers) matters — otherwise an org could mint far more tokens than
    its limit while none are redeemed yet, then have them all land at
    once and blow past the cap retroactively.
  - org_within_active_test_limit: blocks creating a new test once
    (draft + live tests) would meet or exceed max_active_tests — matches
    exactly what TeacherDashboard's UsageMeter already counts.

  NULL on either limit column means unlimited (existing convention), so
  Growth/Institution/custom plans with NULL there are simply never
  blocked by these checks.

  Deliberately NOT touched: max_students_per_test. Enforcing that would
  mean blocking a student's own test_attempts INSERT once a test is "full"
  — a materially different, riskier kind of block (denying a student who
  showed up to take a scheduled exam, vs. stopping an admin/teacher from
  provisioning past what they're paying for) that deserves its own
  decision, not a bundled-in side effect of this migration.
*/

CREATE OR REPLACE FUNCTION org_within_teacher_limit(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT (
    SELECT p.max_teachers FROM organizations o JOIN plans p ON p.id = o.plan_id WHERE o.id = p_org_id
  ) IS NULL
  OR (
    (SELECT count(*) FROM teachers WHERE org_id = p_org_id)
    + (SELECT count(*) FROM teacher_tokens WHERE org_id = p_org_id AND status = 'active' AND expires_at > now())
  ) < (
    SELECT p.max_teachers FROM organizations o JOIN plans p ON p.id = o.plan_id WHERE o.id = p_org_id
  );
$$;

GRANT EXECUTE ON FUNCTION org_within_teacher_limit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION org_within_active_test_limit(p_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT (
    SELECT p.max_active_tests FROM organizations o JOIN plans p ON p.id = o.plan_id WHERE o.id = p_org_id
  ) IS NULL
  OR (
    SELECT count(*) FROM tests WHERE org_id = p_org_id AND status IN ('draft', 'live')
  ) < (
    SELECT p.max_active_tests FROM organizations o JOIN plans p ON p.id = o.plan_id WHERE o.id = p_org_id
  );
$$;

GRANT EXECUTE ON FUNCTION org_within_active_test_limit(uuid) TO authenticated;

DROP POLICY IF EXISTS "admin_create_own_org_tokens_if_org_can_write" ON teacher_tokens;
CREATE POLICY "admin_create_own_org_tokens_if_org_can_write"
  ON teacher_tokens FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() AND org_id = auth_admin_org_id() AND org_can_write(org_id) AND org_within_teacher_limit(org_id));

DROP POLICY IF EXISTS "teachers_create_tests_if_org_can_write" ON tests;
CREATE POLICY "teachers_create_tests_if_org_can_write"
  ON tests FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND org_id = auth_teacher_org_id()
    AND org_can_write(org_id)
    AND org_within_active_test_limit(org_id)
    AND (class_id IS NULL OR class_id IN (SELECT id FROM classes WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
  );
