/*
  # Work around stale enum-plan caching for the new 'pending_approval' value

  Verified: is_admin() and auth_admin_org_id() both evaluate correctly for
  the admin and match the test's org_id exactly (confirmed via direct RPC
  calls), yet the real RLS-enforced UPDATE still failed with a native
  Postgres "new row violates row-level security policy" error. 'pending_approval'
  was added to test_status via ALTER TYPE ... ADD VALUE in a separate
  migration just before these policies were created — Supabase's pooled
  connections (Supavisor/PgBouncer) can hold prepared-statement plans
  compiled before a new enum value existed, causing comparisons against
  it to misbehave until those plans are invalidated. Casting to text
  sidesteps enum-OID plan caching entirely.
*/

DROP POLICY IF EXISTS "admin_reads_pending_approval_tests" ON tests;
CREATE POLICY "admin_reads_pending_approval_tests"
  ON tests FOR SELECT
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id() AND status::text = 'pending_approval');

DROP POLICY IF EXISTS "admin_approves_pending_tests" ON tests;
CREATE POLICY "admin_approves_pending_tests"
  ON tests FOR UPDATE
  TO authenticated
  USING (is_admin() AND org_id = auth_admin_org_id() AND status::text = 'pending_approval')
  WITH CHECK (is_admin() AND org_id = auth_admin_org_id());
