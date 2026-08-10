/*
  # Fix stale brand-color defaults

  organizations.primary_color/secondary_color still defaulted to the old
  indigo/violet (#6366F1/#8B5CF6) from the Phase 0 migration — leftover
  from before the visual redesign moved the app's own default to
  burnt-orange (#EA580C). Every org created since then got branded with
  colors that don't match anything else in the product. New signups now
  set their own color explicitly (see create-organization), but the
  column default and the one pre-existing default org are corrected here
  too so nothing stale is left lying around.
*/

ALTER TABLE organizations ALTER COLUMN primary_color SET DEFAULT '#EA580C';
ALTER TABLE organizations ALTER COLUMN secondary_color SET DEFAULT '#EA580C';

UPDATE organizations
SET primary_color = '#EA580C', secondary_color = '#EA580C'
WHERE slug = 'default' AND primary_color = '#6366F1';
