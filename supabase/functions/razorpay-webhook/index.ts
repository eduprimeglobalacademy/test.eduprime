import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

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
  const subscriptionEntity = event?.payload?.subscription?.entity
  const razorpaySubscriptionId = subscriptionEntity?.id

  if (!razorpaySubscriptionId) {
    // Event type we don't key off a subscription (e.g. a bare payment
    // event) — acknowledge so Razorpay doesn't retry, nothing to do.
    return new Response('ok', { status: 200 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions').select('*').eq('razorpay_subscription_id', razorpaySubscriptionId).maybeSingle()

  if (!subscription) {
    console.error('razorpay-webhook: unknown subscription', razorpaySubscriptionId)
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
    case 'subscription.activated':
    case 'subscription.charged':
      await supabaseAdmin.from('organizations').update({
        status: 'active',
        plan_id: subscription.plan_id,
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
