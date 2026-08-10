/*
  # Phase 2 — Plan tiers (soft launch)

  1. New Tables
    - `plans` — Starter / Growth / Institution, with per-resource limits.
      NULL on a limit column means unlimited.

  2. Schema Changes
    - `organizations.plan_id` references `plans`. New orgs default to
      `growth` — during the 14-day trial every org gets full-featured
      limits regardless of what they'll actually buy; Phase 3 (billing)
      is what moves plan_id to whatever the customer pays for once the
      trial converts.

  3. Security
    - Plans are public (anon + authenticated SELECT) — pricing pages need
      to read them before login. Only service_role can write, there's no
      admin UI for editing plans yet.

  4. Enforcement
    - Soft only, on purpose: the UI shows usage against the limit and
      warns, nothing here blocks a write. Hard enforcement is Phase 3,
      once there's a paying customer and downgrade path to fall back to.
*/

CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  max_teachers integer,
  max_active_tests integer,
  max_students_per_test integer,
  sort_order integer NOT NULL
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_plans"
  ON plans FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO plans (id, name, max_teachers, max_active_tests, max_students_per_test, sort_order) VALUES
  ('starter',     'Starter',     5,   10,   100,  1),
  ('growth',      'Growth',      25,  NULL, 500,  2),
  ('institution', 'Institution', NULL, NULL, NULL, 3)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id text REFERENCES plans(id) DEFAULT 'growth';
UPDATE organizations SET plan_id = 'growth' WHERE plan_id IS NULL;
ALTER TABLE organizations ALTER COLUMN plan_id SET NOT NULL;
