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

    const { code } = await req.json()
    if (!code?.trim()) {
      return new Response(JSON.stringify({ error: 'Enter a promo code.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mirrors the admin_reads_redeemable_promotions RLS policy — this
    // function runs as service_role and bypasses RLS, so the same
    // validation has to be re-checked explicitly here.
    const nowIso = new Date().toISOString()
    const { data: promo } = await supabaseAdmin
      .from('promotions').select('*')
      .ilike('code', code.trim())
      .eq('status', 'active')
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .or(`org_id.is.null,org_id.eq.${adminUser.org_id}`)
      .maybeSingle()

    if (!promo || !promo.razorpay_offer_id) {
      return new Response(JSON.stringify({ error: 'That code is not valid.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions').select('*').eq('org_id', adminUser.org_id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (subscription && !['cancelled', 'completed'].includes(subscription.status)) {
      await razorpay(`/subscriptions/${subscription.razorpay_subscription_id}`, {
        method: 'POST',
        body: JSON.stringify({ offer_id: promo.razorpay_offer_id }),
      })
      return new Response(
        JSON.stringify({ applied: true, message: 'Promo applied to your subscription.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No active subscription yet — hand the offer id back so the client
    // can carry it into razorpay-create-subscription when they subscribe.
    return new Response(
      JSON.stringify({ applied: false, offerId: promo.razorpay_offer_id, message: promo.discount_note || 'Promo applied — pick a plan to use it.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('razorpay-apply-promo error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Could not apply that code.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
