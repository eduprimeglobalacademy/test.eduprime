/*
  # Fix — organizations had no RLS policies

  RLS was enabled on `organizations` in the tenancy migration but no policy
  was ever added, which means deny-all for every role except service_role.
  TenantContext resolves the current org by slug as an anon (pre-login)
  request on every page load — without a policy that query returns zero
  rows and the whole app falls through to the "no such organization" page
  for every visitor.

  1. Security
    - Branding fields (name, slug, logo, colors) are not sensitive — same
      exposure as visiting the subdomain itself — so anon + authenticated
      get SELECT on all organizations.
    - Org admins can UPDATE their own org (name/logo/colors) — no UI uses
      this yet, but the policy is needed before a settings screen can ship
      without another silent RLS gap.
    - No INSERT/DELETE policy for anon/authenticated: organizations are
      only created via the create-organization Edge Function (service_role,
      bypasses RLS) and never deleted from the client.
*/

CREATE POLICY "anyone_can_read_organizations"
  ON organizations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_update_own_organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_admin() AND id = auth_admin_org_id())
  WITH CHECK (is_admin() AND id = auth_admin_org_id());
