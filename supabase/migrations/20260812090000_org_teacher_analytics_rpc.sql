/*
  # org_teacher_analytics RPC

  Org admins have no RLS visibility into tests/test_attempts (owner-scoped
  to the teacher only — see 20260811020000's comment on why an org-wide
  SELECT policy on these tables was removed as a privacy leak). That
  leaves admins with zero insight into what each educator is actually
  doing: test counts, submissions, scores. Same shape as
  org_active_test_count() — a row-returning, access-checked aggregate
  RPC instead of opening broad SELECT policies back up.
*/

CREATE OR REPLACE FUNCTION org_teacher_analytics(p_org_id uuid)
RETURNS TABLE (
  teacher_id uuid,
  teacher_name text,
  teacher_email text,
  total_tests integer,
  draft_count integer,
  live_count integer,
  closed_count integer,
  total_attempts integer,
  avg_score_pct numeric,
  last_activity_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT
    t.id,
    t.name,
    t.email,
    count(distinct tests.id)::integer,
    count(distinct tests.id) filter (where tests.status = 'draft')::integer,
    count(distinct tests.id) filter (where tests.status = 'live')::integer,
    count(distinct tests.id) filter (where tests.status = 'closed')::integer,
    count(distinct ta.id) filter (where ta.is_submitted)::integer,
    round(avg(ta.total_score::numeric / nullif(ta.max_score, 0) * 100) filter (where ta.is_submitted), 1),
    greatest(max(tests.created_at), max(ta.submitted_at))
  FROM teachers t
  LEFT JOIN tests ON tests.teacher_id = t.id
  LEFT JOIN test_attempts ta ON ta.test_id = tests.id
  WHERE t.org_id = p_org_id
    AND is_admin()
    AND auth_admin_org_id() = p_org_id
  GROUP BY t.id, t.name, t.email;
$$;

GRANT EXECUTE ON FUNCTION org_teacher_analytics(uuid) TO authenticated;
