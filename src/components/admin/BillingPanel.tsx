import { useEffect, useState } from 'react'
import { Check, CreditCard, Receipt, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Plan, Subscription } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTenant } from '../../contexts/TenantContext'
import { openRazorpayCheckout } from '../../lib/razorpay'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { OrgStatusBanner } from '../billing/OrgStatusBanner'
import { CustomDomainCard } from './CustomDomainCard'
import { planFeatureBullets } from '../../lib/plans'

interface Invoice {
  id: string
  amount: number
  currency: string
  status: string
  shortUrl: string | null
  issuedAt: string | null
}

export function BillingPanel() {
  const { user } = useAuth()
  const { org } = useTenant()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => { fetchData() }, [org?.id])

  const fetchData = async () => {
    setLoading(true)
    // Negotiated/custom plans (is_public = false) are assigned by platform
    // staff to one specific org, not browsable by every other org here —
    // still include the org's own current plan even if it's private, so an
    // org already on a custom deal sees its own plan card.
    const plansQuery = org?.id
      ? supabase.from('plans').select('*').or(`is_public.eq.true,id.eq.${org.plan_id}`)
      : supabase.from('plans').select('*').eq('is_public', true)
    const { data: plansData } = await plansQuery.order('sort_order')
    setPlans(plansData || [])

    if (org?.id) {
      const { data: subData } = await supabase
        .from('subscriptions').select('*').eq('org_id', org.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      setSubscription(subData)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-list-invoices`
        const response = await fetch(apiUrl, { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } })
        const result = await response.json()
        if (response.ok) setInvoices(result.invoices || [])
      } catch {
        // Invoice history is supplementary — a failure here shouldn't block the rest of the billing page.
      }
    }
    setLoading(false)
  }

  const handleSubscribe = async (planId: string) => {
    if (!org) return
    setError('')
    setCheckingOut(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-create-subscription`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not start checkout.')

      await openRazorpayCheckout({
        subscriptionId: result.subscriptionId,
        razorpayKeyId: result.razorpayKeyId,
        orgName: result.orgName,
        adminEmail: result.adminEmail,
        planName: result.planName,
        onSuccess: () => fetchData(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setCheckingOut(null)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-cancel-subscription`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not cancel subscription.')
      setShowCancelConfirm(false)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>

  const canCancel = subscription && !['cancelled', 'completed'].includes(subscription.status)

  return (
    <div className="space-y-6">
      {org && <OrgStatusBanner org={org} subscription={subscription} />}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
      )}

      <div className="grid sm:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = org?.plan_id === plan.id && ['active', 'trial'].includes(org.status)
          const selfServe = plan.razorpay_plan_id && plan.price_inr != null
          return (
            <Card key={plan.id} className={isCurrent ? 'ring-2 ring-[var(--brand-primary)]' : ''}>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                <p className="text-2xl font-bold text-ink mt-2">
                  {plan.price_inr != null ? <>₹{plan.price_inr.toLocaleString('en-IN')}<span className="text-sm font-normal text-ink-faint">/mo</span></> : 'Custom'}
                </p>
              </div>
              <ul className="space-y-2 mb-6">
                {planFeatureBullets(plan).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-ink-soft">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" disabled>Current plan</Button>
                  {canCancel && (
                    <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setShowCancelConfirm(true)}>
                      Cancel subscription
                    </Button>
                  )}
                </div>
              ) : selfServe ? (
                <Button className="w-full" loading={checkingOut === plan.id} onClick={() => handleSubscribe(plan.id)}>
                  <CreditCard className="w-4 h-4" />
                  Subscribe
                </Button>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => window.location.assign(`mailto:sales@eduprime.app?subject=Institution plan for ${org?.name}&body=Hi, I'd like to talk about the Institution plan for ${org?.name}. My account email is ${user?.email}.`)}>
                  Contact us
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      {invoices.length > 0 && (
        <Card>
          <h3 className="text-base font-semibold text-ink mb-4 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--brand-primary)]" />
            Payment history
          </h3>
          <div className="divide-y divide-app">
            {invoices.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-ink">₹{(inv.amount / 100).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-ink-faint">{inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'} · <span className="capitalize">{inv.status}</span></p>
                </div>
                {inv.shortUrl && (
                  <a href={inv.shortUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--brand-primary)] inline-flex items-center gap-1 shrink-0">
                    Receipt <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {org && <CustomDomainCard org={org} />}

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-app animate-in">
            <div className="p-6">
              <h3 className="text-lg font-bold text-ink mb-2">Cancel your subscription?</h3>
              <p className="text-ink-faint text-sm mb-6">
                This takes effect immediately. Creating new assessments and educator tokens will be paused until you subscribe again — existing tests, results, and students in progress are unaffected.
              </p>
              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCancelConfirm(false)} className="flex-1" disabled={cancelling}>Keep subscription</Button>
                <Button variant="danger" onClick={handleCancel} loading={cancelling} className="flex-1">Cancel subscription</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
