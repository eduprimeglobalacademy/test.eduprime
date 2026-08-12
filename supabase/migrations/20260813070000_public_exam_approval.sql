/*
  # Public/open exams with admin approval

  A teacher-created test for an unknown/unbounded audience (hiring,
  onboarding — no enrolled class) now requires explicit org-admin
  approval before it can go live. New 'pending_approval' status; org
  admins otherwise have zero row-level visibility into individual tests
  by deliberate design (RLS restricts tests SELECT to the owning
  teacher — see org_teacher_analytics' migration comment) — rather than
  opening a broad SELECT, admins get exactly the narrow slice they need
  to act on: pending_approval tests in their own org, nothing else.
*/

ALTER TYPE test_status ADD VALUE IF NOT EXISTS 'pending_approval';
