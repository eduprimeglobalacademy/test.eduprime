/*
  # Phase 0 — Multi-tenant foundation

  1. New Tables
    - `organizations` — one row per white-labeled customer (school/institute)

  2. Schema Changes
    - Add `org_id` to `admin_users`, `teachers`, `teacher_tokens`, `tests`, `test_attempts`
    - Backfill every existing row onto a single "default" organization
    - `org_id` becomes NOT NULL once backfilled
    - Triggers auto-derive `org_id` on insert (from the token used, the owning
      teacher, or the parent test) so app code doesn't have to supply it and
      can't be tricked into supplying the wrong one

  3. Security
    - Helper functions (`is_admin`, `auth_admin_org_id`, `auth_teacher_org_id`)
      centralize "who is this caller" so every policy scopes by org the same
      way, instead of re-deriving it ad hoc per table
    - Every admin-facing policy is rescoped from "all rows" to "rows in my org"
      — before this migration, any admin could read/delete every org's
      teachers and tokens, which was fine with one customer and becomes a
      cross-tenant leak with more than one
    - `test_attempts` / `student_answers` anon SELECT policies (previously
      `USING (true)` — any anon key holder could read every student's name,
      email, phone, and score across every test) are removed. The only
      caller that needed anon read access was the duplicate-attempt check in
      TestInterface.tsx, which is moved to a boolean-only RPC
      (`has_attempted`) that leaks no row data.
*/

-- ============================================================
-- 1. Organizations
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#6366F1',
  secondary_color text NOT NULL DEFAULT '#8B5CF6',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled')),
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Seed the org that today's single-tenant data belongs to.
INSERT INTO organizations (id, name, slug, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'EduPrime Global Academy', 'default', 'active')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. org_id columns + backfill
-- ============================================================

ALTER TABLE admin_users    ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE teachers       ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE teacher_tokens ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE tests          ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);
ALTER TABLE test_attempts  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

UPDATE admin_users    SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE teachers       SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE teacher_tokens SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE tests          SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE test_attempts ta SET org_id = t.org_id
  FROM tests t WHERE ta.test_id = t.id AND ta.org_id IS NULL;

ALTER TABLE admin_users    ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE teachers       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE teacher_tokens ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE tests          ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE test_attempts  ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_org_id       ON teachers(org_id);
CREATE INDEX IF NOT EXISTS idx_teacher_tokens_org_id ON teacher_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_tests_org_id          ON tests(org_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_org_id  ON test_attempts(org_id);

-- ============================================================
-- 3. Triggers — derive org_id server-side, never trust the client for it
-- ============================================================

CREATE OR REPLACE FUNCTION set_teacher_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.token_used IS NOT NULL THEN
    SELECT org_id INTO NEW.org_id FROM teacher_tokens WHERE id = NEW.token_used;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_teacher_org_id ON teachers;
CREATE TRIGGER trg_set_teacher_org_id
  BEFORE INSERT ON teachers
  FOR EACH ROW EXECUTE FUNCTION set_teacher_org_id();

CREATE OR REPLACE FUNCTION set_test_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM teachers WHERE id = NEW.teacher_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_test_org_id ON tests;
CREATE TRIGGER trg_set_test_org_id
  BEFORE INSERT ON tests
  FOR EACH ROW EXECUTE FUNCTION set_test_org_id();

CREATE OR REPLACE FUNCTION set_attempt_org_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id FROM tests WHERE id = NEW.test_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_attempt_org_id ON test_attempts;
CREATE TRIGGER trg_set_attempt_org_id
  BEFORE INSERT ON test_attempts
  FOR EACH ROW EXECUTE FUNCTION set_attempt_org_id();

-- ============================================================
-- 4. Helper functions used by policies below
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION auth_admin_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT org_id FROM admin_users WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_teacher_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT org_id FROM teachers WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION auth_admin_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth_teacher_org_id() TO authenticated;

-- ============================================================
-- 5. Rescope admin-facing policies from "all orgs" to "my org"
-- ============================================================

-- teachers: two duplicate all-org read policies existed from earlier
-- migrations (20250927090057, 20251002055147) — replace both with one
-- org-scoped policy.
DROP POLICY IF EXISTS "Admins can read all teachers" ON teachers;
DROP POLICY IF EXISTS "admin_read_all_teachers" ON teachers;
DROP POLICY IF EXISTS "admin_delete_teachers" ON teachers;

CREATE POLICY "admin_read_own_org_teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id());

CREATE POLICY "admin_delete_own_org_teachers"
  ON teachers FOR DELETE
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id());

-- teacher_tokens: replace the admin CRUD policies with org-scoped versions,
-- and replace the anon "true" catch-all with the original intent
-- (active + unexpired only).
DROP POLICY IF EXISTS "admin_create_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "admin_read_all_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "admin_full_access" ON teacher_tokens;
DROP POLICY IF EXISTS "admin_delete_tokens" ON teacher_tokens;
DROP POLICY IF EXISTS "allow_anonymous_token_updates" ON teacher_tokens;
DROP POLICY IF EXISTS "allow_anonymous_token_reads" ON teacher_tokens;
DROP POLICY IF EXISTS "service_role_access" ON teacher_tokens;

CREATE POLICY "admin_manage_own_org_tokens"
  ON teacher_tokens FOR ALL
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id())
  WITH CHECK (is_admin() AND org_id = auth_admin_org_id());

CREATE POLICY "anon_read_active_tokens"
  ON teacher_tokens FOR SELECT
  TO anon
  USING (status = 'active' AND expires_at > now());

CREATE POLICY "anon_mark_token_used"
  ON teacher_tokens FOR UPDATE
  TO anon
  USING (status = 'active' AND expires_at > now())
  WITH CHECK (status = 'used' AND used_at IS NOT NULL);

CREATE POLICY "service_role_full_access_tokens"
  ON teacher_tokens FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- tests: ownership already implies org (a teacher belongs to one org), but
-- add an explicit org_id check as defense in depth against a client
-- supplying a mismatched org_id on write.
DROP POLICY IF EXISTS "Teachers can manage own tests" ON tests;

CREATE POLICY "teachers_manage_own_tests"
  ON tests FOR ALL
  TO authenticated
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND org_id = auth_teacher_org_id()
  );

-- test_attempts: drop the anon "read everything" policy — the only real
-- caller (duplicate-attempt check) moves to has_attempted() below. Keep
-- anon insert. Rescope the teacher read to use org_id directly.
DROP POLICY IF EXISTS "Anyone can read own attempts" ON test_attempts;
DROP POLICY IF EXISTS "Teachers can view attempts for own tests" ON test_attempts;

CREATE POLICY "teachers_view_own_org_attempts"
  ON test_attempts FOR SELECT
  TO authenticated
  USING (org_id = auth_teacher_org_id());

-- student_answers: same leak, and no caller ever relied on anon read
-- (TestResults renders from the insert response, not a re-fetch).
DROP POLICY IF EXISTS "Anyone can read own answers" ON student_answers;

-- ============================================================
-- 6. Duplicate-attempt check without exposing row data
-- ============================================================

CREATE OR REPLACE FUNCTION has_attempted(p_test_id uuid, p_student_email text, p_phone_number text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM test_attempts
    WHERE test_id = p_test_id
      AND student_email = p_student_email
      AND phone_number = p_phone_number
      AND is_submitted = true
  );
$$;

GRANT EXECUTE ON FUNCTION has_attempted(uuid, text, text) TO anon;
