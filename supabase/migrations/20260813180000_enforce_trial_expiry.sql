/*
  # Trial orgs never actually expired — fix org_can_write

  org_can_write() treated status = 'trial' as always-writable, with no
  check against trial_ends_at, and nothing anywhere (no cron, no
  scheduled Edge Function) ever transitions status away from 'trial'
  based on that date either. The 14-day countdown shown in the UI was
  purely cosmetic — a trial org could create tests and tokens
  indefinitely.

  Fix: a trial org can write only while trial_ends_at is null (shouldn't
  happen in practice — create-organization always sets it) or still in
  the future. status stays 'trial' in the row either way (no new status
  value introduced) — this only gates the write path, matching every
  other billing-status gate in this function, none of which mutate
  status themselves.
*/

CREATE OR REPLACE FUNCTION org_can_write(check_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT (status = 'trial' AND (trial_ends_at IS NULL OR trial_ends_at > now()))
      OR status = 'active'
      OR (status = 'past_due' AND grace_ends_at IS NOT NULL AND grace_ends_at > now())
  FROM organizations WHERE id = check_org_id;
$$;
