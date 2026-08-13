import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000
const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
const RAZORPAY_AUTH = 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

async function razorpay(path: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: RAZORPAY_AUTH, 'Content-Type': 'application/json' },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error?.description || 'Razorpay request failed')
  return body
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Signature must be verified against the raw body text — parsing to
  // JSON and re-serializing would change whitespace and break the HMAC.
  const rawBody = await req.text()
  const signature = req.headers.get('X-Razorpay-Signature') ?? ''

  if (!WEBHOOK_SECRET || !signature) {
    return new Response('Missing signature', { status: 401 })
  }

  const expected = await hmacHex(WEBHOOK_SECRET, rawBody)
  if (!timingSafeEqual(expected, signature)) {
    console.error('razorpay-webhook: signature mismatch')
    return new Response('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody)

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // One-time capacity-bump payments are order-based, not subscription-based
  // — no subscription.entity on this event at all. Capacity is only ever
  // granted here, never on the client's optimistic Checkout callback, same
  // discipline as every subscription status change in this file.
  if (event.event === 'payment.captured') {
    const orderId = event?.payload?.payment?.entity?.order_id
    if (orderId) {
      const { data: addonRow } = await supabaseAdmin
        .from('org_capacity_addons').select('id').eq('razorpay_order_id', orderId).eq('status', 'pending').maybeSingle()
      if (addonRow) {
        await supabaseAdmin.from('org_capacity_addons').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', addonRow.id)
      }
    }
    return new Response('ok', { status: 200 })
  }

  const subscriptionEntity = event?.payload?.subscription?.entity
  const razorpaySubscriptionId = subscriptionEntity?.id

  if (!razorpaySubscriptionId) {
    // Event type we don't key off a subscription — acknowledge so
    // Razorpay doesn't retry, nothing to do.
    return new Response('ok', { status: 200 })
  }

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions').select('*').eq('razorpay_subscription_id', razorpaySubscriptionId).maybeSingle()

  if (!subscription) {
    // Add-on subscriptions (extra_teachers/extra_active_tests/extra_students)
    // aren't rows in `subscriptions` — they're tracked only via
    // org_capacity_addons.razorpay_addon_subscription_id. The one thing that
    // needs to happen here: a metered-billing addon recalculates its own
    // `quantity` for the *next* cycle based on actual usage in the period
    // that was just charged — the closest real primitive Razorpay offers to
    // metered billing (no native usage-based billing API exists, confirmed).
    if (event.event === 'subscription.charged') {
      const { data: addonRow } = await supabaseAdmin
        .from('org_capacity_addons').select('*')
        .eq('razorpay_addon_subscription_id', razorpaySubscriptionId).eq('mode', 'metered').eq('status', 'active')
        .maybeSingle()
      if (addonRow) {
        const { count } = await supabaseAdmin
          .from('test_attempts').select('id, tests!inner(org_id)', { count: 'exact', head: true })
          .eq('tests.org_id', addonRow.org_id)
          .eq('is_submitted', true)
          .gte('submitted_at', addonRow.updated_at)
        const nextQuantity = Math.max(1, count ?? 1)
        await razorpay(`/subscriptions/${razorpaySubscriptionId}`, {
          method: 'POST',
          body: JSON.stringify({ quantity: nextQuantity, schedule_change_at: 'cycle_end' }),
        }).catch((err) => console.error('Failed to update metered addon quantity:', err))
        await supabaseAdmin.from('org_capacity_addons')
          .update({ quantity: nextQuantity, updated_at: new Date().toISOString() })
          .eq('id', addonRow.id)
      }
    }
    return new Response('ok', { status: 200 })
  }

  const currentPeriodEnd = subscriptionEntity.current_end
    ? new Date(subscriptionEntity.current_end * 1000).toISOString()
    : subscription.current_period_end

  await supabaseAdmin.from('subscriptions').update({
    status: subscriptionEntity.status,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  }).eq('id', subscription.id)

  switch (event.event) {
    // Only the initial activation of a subscription should set plan_id —
    // that's the one moment the org is genuinely moving onto the plan
    // they just subscribed to. A recurring charged/renewal event doesn't
    // change which plan they're on and previously reset plan_id anyway,
    // which meant a platform admin's manual plan override (Organizations
    // page in the platform console only ever writes organizations.plan_id,
    // never subscriptions.plan_id) would silently get reverted back to
    // whatever plan this Razorpay subscription was originally created
    // against, on the very next renewal charge.
    case 'subscription.activated':
      await supabaseAdmin.from('organizations').update({
        status: 'active',
        plan_id: subscription.plan_id,
        grace_ends_at: null,
      }).eq('id', subscription.org_id)
      break

    case 'subscription.charged':
      await supabaseAdmin.from('organizations').update({
        status: 'active',
        grace_ends_at: null,
      }).eq('id', subscription.org_id)
      break

    case 'subscription.pending': {
      // Payment retry in progress — don't reset an already-running grace
      // clock on repeated pending webhooks for the same failure.
      const { data: org } = await supabaseAdmin
        .from('organizations').select('status, grace_ends_at').eq('id', subscription.org_id).single()
      if (org && org.status !== 'past_due') {
        await supabaseAdmin.from('organizations').update({
          status: 'past_due',
          grace_ends_at: new Date(Date.now() + GRACE_PERIOD_MS).toISOString(),
        }).eq('id', subscription.org_id)
      }
      break
    }

    case 'subscription.halted':
      await supabaseAdmin.from('organizations').update({ status: 'suspended' }).eq('id', subscription.org_id)
      break

    case 'subscription.cancelled':
      await supabaseAdmin.from('organizations').update({ status: 'cancelled' }).eq('id', subscription.org_id)
      break

    default:
      console.log('razorpay-webhook: unhandled event', event.event)
  }

  return new Response('ok', { status: 200 })
})
