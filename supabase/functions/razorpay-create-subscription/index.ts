import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
const RAZORPAY_AUTH = 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

// Razorpay subscriptions require a finite total_count of billing cycles —
// there's no literal "until cancelled". 120 monthly cycles (10 years)
// approximates that; cancellation happens through the subscription's
// cancel API / dashboard, not by running out of cycles.
const TOTAL_BILLING_CYCLES = 120

async function razorpay(path: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: RAZORPAY_AUTH, 'Content-Type': 'application/json' },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error?.description || 'Razorpay request failed')
  return body
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not signed in.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: adminUser } = await supabaseAdmin
      .from('admin_users').select('org_id, email').eq('user_id', user.id).maybeSingle()
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Only an organization admin can manage billing.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { planId, offerId } = await req.json()
    const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', planId).maybeSingle()
    if (!plan || !plan.razorpay_plan_id) {
      return new Response(JSON.stringify({ error: 'That plan is not available for self-serve checkout — contact us.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: org } = await supabaseAdmin.from('organizations').select('*').eq('id', adminUser.org_id).single()

    // Switching plans while already subscribed would otherwise leave two
    // concurrent Razorpay subscriptions running (this only ever creates,
    // never replaces) — cancel whatever's currently active/pending first.
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions').select('*').eq('org_id', org.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existingSub && !['cancelled', 'completed'].includes(existingSub.status)) {
      await razorpay(`/subscriptions/${existingSub.razorpay_subscription_id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancel_at_cycle_end: 0 }),
      }).catch((err) => console.error('Failed to cancel prior subscription before switching plans:', err))
    }

    let razorpayCustomerId = org.razorpay_customer_id
    if (!razorpayCustomerId) {
      const customer = await razorpay('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: org.name, email: adminUser.email, fail_existing: 0 }),
      })
      razorpayCustomerId = customer.id
      await supabaseAdmin.from('organizations').update({ razorpay_customer_id: razorpayCustomerId }).eq('id', org.id)
    }

    const subscription = await razorpay('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: plan.razorpay_plan_id,
        customer_id: razorpayCustomerId,
        customer_notify: 1,
        total_count: TOTAL_BILLING_CYCLES,
        notes: { org_id: org.id, org_slug: org.slug },
        ...(typeof offerId === 'string' && offerId ? { offer_id: offerId } : {}),
      }),
    })

    await supabaseAdmin.from('subscriptions').insert([{
      org_id: org.id,
      plan_id: plan.id,
      razorpay_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
    }])

    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        razorpayKeyId: RAZORPAY_KEY_ID,
        planName: plan.name,
        orgName: org.name,
        adminEmail: adminUser.email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('razorpay-create-subscription error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to start checkout.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
