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

    const { enable } = await req.json()
    const { data: org } = await supabaseAdmin.from('organizations').select('*').eq('id', adminUser.org_id).single()

    if (!enable) {
      // Disable: cancel the metered addon-subscription and drop back to capped.
      const { data: meteredAddon } = await supabaseAdmin
        .from('org_capacity_addons').select('*')
        .eq('org_id', adminUser.org_id).eq('kind', 'extra_students').eq('mode', 'metered').eq('status', 'active')
        .maybeSingle()
      if (meteredAddon?.razorpay_addon_subscription_id) {
        await razorpay(`/subscriptions/${meteredAddon.razorpay_addon_subscription_id}/cancel`, {
          method: 'POST', body: JSON.stringify({ cancel_at_cycle_end: 0 }),
        }).catch((err) => console.error('Failed to cancel metered addon-subscription:', err))
        await supabaseAdmin.from('org_capacity_addons').update({ status: 'cancelled' }).eq('id', meteredAddon.id)
      }
      await supabaseAdmin.from('organizations').update({ student_billing_mode: 'capped' }).eq('id', org.id)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Enable
    const { data: mainSubscription } = await supabaseAdmin
      .from('subscriptions').select('*').eq('org_id', org.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!mainSubscription || ['cancelled', 'completed'].includes(mainSubscription.status)) {
      return new Response(JSON.stringify({ error: 'Flexible billing requires an active subscription — subscribe to a plan first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', org.plan_id).single()
    if (plan.addon_student_price_inr == null || !plan.razorpay_addon_student_plan_id) {
      return new Response(JSON.stringify({ error: "Flexible student billing isn't available on your current plan." }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!org.razorpay_customer_id) {
      return new Response(JSON.stringify({ error: 'No billing profile on file yet — try again after your first subscription payment.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const addonSub = await razorpay('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: plan.razorpay_addon_student_plan_id,
        customer_id: org.razorpay_customer_id,
        customer_notify: 1,
        total_count: TOTAL_BILLING_CYCLES,
        quantity: 1,
        notes: { org_id: org.id, kind: 'extra_students', addon: 'true', metered: 'true' },
      }),
    })

    const { error: insertError } = await supabaseAdmin.from('org_capacity_addons').insert([{
      org_id: org.id, kind: 'extra_students', quantity: 1, mode: 'metered', status: 'active',
      razorpay_addon_subscription_id: addonSub.id, unit_price_inr: plan.addon_student_price_inr,
    }])
    if (insertError) throw insertError

    await supabaseAdmin.from('organizations').update({ student_billing_mode: 'metered' }).eq('id', org.id)

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('razorpay-toggle-metered-billing error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to update billing mode.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
