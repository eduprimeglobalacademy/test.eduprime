import { AlertTriangle, Check, Clock } from 'lucide-react'
import type { Organization, Subscription } from '../../lib/supabase'
import { formatDateTime } from '../../lib/utils'

interface OrgStatusBannerProps {
  org: Organization
  subscription?: Subscription | null
}

export function OrgStatusBanner({ org, subscription }: OrgStatusBannerProps) {
  if (org.status === 'trial' && org.trial_ends_at) {
    const daysLeft = Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000))
    return (
      <div className="flex items-start gap-3 p-4 bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-soft)] rounded-xl">
        <Clock className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[var(--brand-primary-darker)]">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left in your trial</p>
          <p className="text-xs text-[var(--brand-primary-dark)] mt-0.5">Subscribe to a plan to keep access after {formatDateTime(org.trial_ends_at)}.</p>
        </div>
      </div>
    )
  }

  if (org.status === 'past_due' && org.grace_ends_at) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900">Payment failed — your last renewal didn't go through</p>
          <p className="text-xs text-amber-700 mt-0.5">Full access continues until {formatDateTime(org.grace_ends_at)}. After that, new assessments and educator tokens are paused until payment succeeds.</p>
        </div>
      </div>
    )
  }

  if (org.status === 'suspended') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-900">Account suspended</p>
          <p className="text-xs text-red-700 mt-0.5">Creating new assessments and educator tokens is paused. Existing tests, results, and students in progress are unaffected. Contact support if you believe this is a mistake.</p>
        </div>
      </div>
    )
  }

  if (org.status === 'active' && subscription?.current_period_end) {
    return (
      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
        <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Subscription active</p>
          <p className="text-xs text-emerald-700 mt-0.5">Next renewal {formatDateTime(subscription.current_period_end)}.</p>
        </div>
      </div>
    )
  }

  return null
}
