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
      .from('admin_users').select('org_id, email').eq('user_id', user.id).maybeSingle()
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Only an organization admin can manage billing.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions').select('*').eq('org_id', adminUser.org_id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (!subscription || ['cancelled', 'completed'].includes(subscription.status)) {
      return new Response(JSON.stringify({ error: 'No active subscription to cancel.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await razorpay(`/subscriptions/${subscription.razorpay_subscription_id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancel_at_cycle_end: 0 }),
    })

    // organizations.status flips to 'cancelled' via razorpay-webhook's
    // subscription.cancelled handler once Razorpay fires it — not set
    // here, so there's exactly one place that ever writes that transition.

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('razorpay-cancel-subscription error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to cancel subscription.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
