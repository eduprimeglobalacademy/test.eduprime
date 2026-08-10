import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Not signed in.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: platformAdmin } = await supabaseAdmin
      .from('platform_admins').select('id').eq('user_id', caller.id).maybeSingle()
    if (!platformAdmin) {
      return new Response(JSON.stringify({ error: 'Only platform admins can impersonate an organization.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { orgId, teacherId } = await req.json()
    const { data: org } = await supabaseAdmin.from('organizations').select('id, name').eq('id', orgId).maybeSingle()
    if (!org) {
      return new Response(JSON.stringify({ error: 'Organization not found.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // teacherId opts into impersonating a specific educator instead of the
    // org's admin — still scoped to this org (a teacherId from a different
    // org is rejected, not silently ignored).
    let targetEmail: string
    let targetLabel: string
    if (teacherId) {
      const { data: targetTeacher } = await supabaseAdmin
        .from('teachers').select('email, name').eq('id', teacherId).eq('org_id', orgId).maybeSingle()
      if (!targetTeacher) {
        return new Response(JSON.stringify({ error: 'That educator was not found in this organization.' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      targetEmail = targetTeacher.email
      targetLabel = targetTeacher.name
    } else {
      const { data: targetAdmin } = await supabaseAdmin
        .from('admin_users').select('email').eq('org_id', orgId).limit(1).maybeSingle()
      if (!targetAdmin) {
        return new Response(JSON.stringify({ error: 'This organization has no admin account to impersonate.' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      targetEmail = targetAdmin.email
      targetLabel = targetAdmin.email
    }

    // Mint a session for the target without ever touching their password:
    // generate a magic-link OTP server-side (service role), then
    // immediately redeem it server-side too. No email is sent —
    // generateLink only creates the token, it doesn't dispatch anything.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      throw linkError || new Error('Could not create an impersonation session.')
    }

    const anonClient = createClient(supabaseUrl, anonKey)
    const { data: sessionData, error: verifyError } = await anonClient.auth.verifyOtp({
      type: 'magiclink',
      token_hash: linkData.properties.hashed_token,
    })
    if (verifyError || !sessionData.session) {
      throw verifyError || new Error('Could not verify impersonation session.')
    }

    await supabaseAdmin.from('impersonation_log').insert([{
      platform_admin_id: platformAdmin.id,
      org_id: org.id,
      target_email: targetEmail,
    }])

    return new Response(
      JSON.stringify({
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
        orgName: org.name,
        adminEmail: targetLabel,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('impersonate-org error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to start impersonation.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
