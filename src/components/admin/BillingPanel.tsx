import { useEffect, useState } from 'react'
import { Check, CreditCard } from 'lucide-react'
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

export function BillingPanel() {
  const { user } = useAuth()
  const { org } = useTenant()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [org?.id])

  const fetchData = async () => {
    setLoading(true)
    const { data: plansData } = await supabase.from('plans').select('*').order('sort_order')
    setPlans(plansData || [])

    if (org?.id) {
      const { data: subData } = await supabase
        .from('subscriptions').select('*').eq('org_id', org.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      setSubscription(subData)
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

  if (loading) return <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>

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
                <Button variant="outline" className="w-full" disabled>Current plan</Button>
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

      {org && <CustomDomainCard org={org} />}
    </div>
  )
}
