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

async function razorpay(path: string) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    headers: { Authorization: RAZORPAY_AUTH, 'Content-Type': 'application/json' },
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
      return new Response(JSON.stringify({ error: 'Only an organization admin can view billing.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // An org can have accumulated multiple subscription rows over time
    // (each Subscribe/plan-switch inserts a new one) — pull invoices
    // across all of them, not just the latest.
    const { data: subs } = await supabaseAdmin
      .from('subscriptions').select('razorpay_subscription_id').eq('org_id', adminUser.org_id)

    const invoices: Array<{ id: string; amount: number; currency: string; status: string; shortUrl: string | null; issuedAt: string | null }> = []
    for (const sub of subs || []) {
      const result = await razorpay(`/invoices?subscription_id=${sub.razorpay_subscription_id}`)
      for (const item of result.items || []) {
        invoices.push({
          id: item.id,
          amount: item.amount ?? 0,
          currency: item.currency ?? 'INR',
          status: item.status,
          shortUrl: item.short_url ?? null,
          issuedAt: item.date ? new Date(item.date * 1000).toISOString() : null,
        })
      }
    }

    invoices.sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''))

    return new Response(
      JSON.stringify({ invoices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('razorpay-list-invoices error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to load invoices.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
