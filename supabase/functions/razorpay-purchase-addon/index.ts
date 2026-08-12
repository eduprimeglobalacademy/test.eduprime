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
      .from('admin_users').select('org_id').eq('user_id', user.id).maybeSingle()
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Only an organization admin can manage billing.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { kind, quantity } = await req.json()
    if (!['extra_teachers', 'extra_active_tests', 'extra_students'].includes(kind) || !Number.isInteger(quantity) || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid add-on request.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: mainSubscription } = await supabaseAdmin
      .from('subscriptions').select('*').eq('org_id', adminUser.org_id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!mainSubscription || ['cancelled', 'completed'].includes(mainSubscription.status)) {
      return new Response(JSON.stringify({ error: 'Add-ons require an active subscription — subscribe to a plan first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: org } = await supabaseAdmin.from('organizations').select('plan_id, razorpay_customer_id').eq('id', adminUser.org_id).single()
    const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', org.plan_id).single()

    const unitPrice = kind === 'extra_teachers' ? plan.addon_teacher_price_inr
      : kind === 'extra_active_tests' ? plan.addon_test_price_inr
      : plan.addon_student_price_inr
    const addonPlanId = kind === 'extra_teachers' ? plan.razorpay_addon_teacher_plan_id
      : kind === 'extra_active_tests' ? plan.razorpay_addon_test_plan_id
      : plan.razorpay_addon_student_plan_id
    if (unitPrice == null || !addonPlanId) {
      return new Response(JSON.stringify({ error: "Add-ons aren't available on your current plan." }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!org.razorpay_customer_id) {
      return new Response(JSON.stringify({ error: 'No billing profile on file yet — try again after your first subscription payment.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Consolidate into one dedicated addon-subscription per org+kind rather
    // than accumulating a new Razorpay subscription on every purchase —
    // POST /v1/subscriptions/:id supports updating `quantity` directly.
    const { data: existing } = await supabaseAdmin
      .from('org_capacity_addons').select('*')
      .eq('org_id', adminUser.org_id).eq('kind', kind).eq('mode', 'recurring').eq('status', 'active')
      .maybeSingle()

    if (existing && existing.razorpay_addon_subscription_id) {
      const newQuantity = existing.quantity + quantity
      await razorpay(`/subscriptions/${existing.razorpay_addon_subscription_id}`, {
        method: 'POST',
        body: JSON.stringify({ quantity: newQuantity, schedule_change_at: 'now' }),
      })
      const { error: updateError } = await supabaseAdmin.from('org_capacity_addons')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (updateError) throw updateError
    } else {
      const addonSub = await razorpay('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: addonPlanId,
          customer_id: org.razorpay_customer_id,
          customer_notify: 1,
          total_count: TOTAL_BILLING_CYCLES,
          quantity,
          notes: { org_id: adminUser.org_id, kind, addon: 'true' },
        }),
      })
      const { error: insertError } = await supabaseAdmin.from('org_capacity_addons').insert([{
        org_id: adminUser.org_id,
        kind, quantity, mode: 'recurring', status: 'active',
        razorpay_addon_subscription_id: addonSub.id,
        unit_price_inr: unitPrice,
      }])
      if (insertError) throw insertError
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('razorpay-purchase-addon error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to purchase add-on.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
