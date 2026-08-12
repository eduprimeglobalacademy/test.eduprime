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

const KIND_LABEL: Record<string, string> = {
  extra_teachers: 'Extra teacher seat (this cycle)',
  extra_active_tests: 'Extra active test slot (this cycle)',
}

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

    const { kind, quantity } = await req.json()
    if (!['extra_teachers', 'extra_active_tests'].includes(kind) || !Number.isInteger(quantity) || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid add-on request.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: org } = await supabaseAdmin.from('organizations').select('*').eq('id', adminUser.org_id).single()
    const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', org.plan_id).single()
    const unitPrice = kind === 'extra_teachers' ? plan.addon_teacher_price_inr : plan.addon_test_price_inr
    if (unitPrice == null) {
      return new Response(JSON.stringify({ error: "Add-ons aren't available on your current plan." }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions').select('current_period_end').eq('org_id', org.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const expiresAt = subscription?.current_period_end || org.trial_ends_at || null

    const amount = unitPrice * 100 * quantity
    const order = await razorpay('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount, currency: 'INR',
        notes: { org_id: org.id, kind, quantity: String(quantity) },
      }),
    })

    const { data: addonRow, error: insertError } = await supabaseAdmin.from('org_capacity_addons').insert([{
      org_id: org.id,
      kind, quantity, mode: 'one_time', status: 'pending',
      expires_at: expiresAt,
      razorpay_order_id: order.id,
      unit_price_inr: unitPrice,
    }]).select().single()
    if (insertError) throw insertError

    return new Response(
      JSON.stringify({
        orderId: order.id,
        razorpayKeyId: RAZORPAY_KEY_ID,
        amount,
        orgName: org.name,
        adminEmail: adminUser.email,
        description: KIND_LABEL[kind],
        addonRowId: addonRow.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('razorpay-purchase-capacity-bump error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to start checkout.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
