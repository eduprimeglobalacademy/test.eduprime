/*
  # Phase 5 — Custom domains

  Lets an org serve the platform from their own domain (tests.orgname.com)
  instead of only orgname.eduprime.app. Gated to Growth/Institution in the
  UI, matching the original platform plan's "custom domain as a paid
  add-on" call — not re-litigated here.

  What this migration does NOT do: talk to Vercel. Actually routing
  tests.orgname.com to this app requires the domain to be added in the
  Vercel project dashboard (or via Vercel's API, which needs a token this
  environment doesn't have) and the customer's DNS to CNAME to Vercel.
  Until that's done, requests to the custom domain never reach this app at
  all — so `custom_domain_status` is a UX/communication field ("we're on
  it" vs "this is live"), not a security gate. There's no privilege
  escalation from an org admin setting their own org's status early: RLS
  already confines them to their own row, and a hostname nothing points
  DNS at never generates a request in the first place.

  1. Schema Changes
    - `organizations.custom_domain` (unique — two orgs can't claim the
      same hostname) and `custom_domain_status` ('pending' | 'active').
    - A trigger resets status to 'pending' whenever the domain value
      itself changes, so editing the domain always requires re-activation
      rather than silently keeping a stale "active" flag pointed at a
      hostname that was never actually verified.

  2. Security
    - No new RLS policies needed — `admin_update_own_organization` (org
      admin, own org) and `platform_admin_updates_any_organization`
      (platform admin, any org) already grant full row UPDATE, which
      covers these two columns too. Nothing at the RLS layer stops an org
      admin from setting custom_domain_status='active' on their own row
      directly, matching the "no real security stake either way" point
      above. The trigger below does add one real (if narrow) guard: any
      update that changes custom_domain in the same statement forces
      status back to 'pending', so the common case — an org admin setting
      a domain and immediately marking it active in one call — always
      lands on 'pending'. Confirming activation is expected to be a
      platform-admin action; nothing structurally prevents a org admin
      from bypassing that with a second, separate status-only update, but
      that field only communicates status to the org — it grants no
      actual routing until the domain is live in Vercel regardless.
*/

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain_status text
  CHECK (custom_domain_status IN ('pending', 'active'));

CREATE OR REPLACE FUNCTION reset_custom_domain_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.custom_domain IS DISTINCT FROM OLD.custom_domain THEN
    NEW.custom_domain_status := CASE WHEN NEW.custom_domain IS NULL THEN NULL ELSE 'pending' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_custom_domain_status ON organizations;
CREATE TRIGGER trg_reset_custom_domain_status
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION reset_custom_domain_status();
