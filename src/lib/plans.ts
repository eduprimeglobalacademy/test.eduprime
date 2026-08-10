import type { Plan } from './supabase'

// Qualitative extras not captured by the numeric limits on the plan row —
// kept alongside (not instead of) the derived numbers below so support
// level / custom domain availability has one place to edit.
const QUALITATIVE_FEATURES: Record<string, string[]> = {
  starter: ['Email support'],
  growth: ['Custom domain', 'Priority support'],
  institution: ['Dedicated onboarding & SLA'],
}

/**
 * Feature bullets for a plan, derived from its actual stored limits rather
 * than hardcoded copy — a plan's numbers can only drift out of sync with
 * what's displayed if this function itself is wrong, not from someone
 * forgetting to update marketing copy after a limits change.
 */
export function planFeatureBullets(plan: Plan): string[] {
  return [
    plan.max_teachers === null ? 'Unlimited educator accounts' : `${plan.max_teachers} educator accounts`,
    plan.max_active_tests === null ? 'Unlimited active tests' : `${plan.max_active_tests} active tests`,
    plan.max_students_per_test === null ? 'Unlimited students per test' : `${plan.max_students_per_test} students per test`,
    ...(QUALITATIVE_FEATURES[plan.id] || []),
  ]
}
