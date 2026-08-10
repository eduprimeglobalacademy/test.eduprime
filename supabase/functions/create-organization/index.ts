import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RESERVED_SLUGS = new Set(['www', 'app', 'api', 'admin', 'mail', 'default', 'assets', 'static'])
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/
const TRIAL_DAYS = 14

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orgName, slug, adminName, adminEmail, adminPassword } = await req.json()

    if (!orgName?.trim() || !slug?.trim() || !adminName?.trim() || !adminEmail?.trim() || !adminPassword) {
      return new Response(
        JSON.stringify({ error: 'All fields are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedSlug = slug.trim().toLowerCase()

    if (!SLUG_RE.test(normalizedSlug) || RESERVED_SLUGS.has(normalizedSlug)) {
      return new Response(
        JSON.stringify({ error: 'That subdomain is not available. Use lowercase letters, numbers, and hyphens only.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Step 1: reserve the slug
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert([{
        name: orgName.trim(),
        slug: normalizedSlug,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      }])
      .select()
      .single()

    if (orgError || !org) {
      const message = orgError?.code === '23505'
        ? 'That subdomain is already taken.'
        : 'Failed to create organization.'
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: create the admin's auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail.trim(),
      password: adminPassword,
    })

    if (authError || !authData.user) {
      await supabaseAdmin.from('organizations').delete().eq('id', org.id)
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create admin account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: create the org-scoped admin profile
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert([{
        user_id: authData.user.id,
        org_id: org.id,
        email: adminEmail.trim(),
        name: adminName.trim(),
      }])
      .select()
      .single()

    if (adminError) {
      await supabaseAdmin.from('organizations').delete().eq('id', org.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin profile.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        org: { slug: org.slug, name: org.name },
        user: { id: authData.user.id, email: adminUser.email, name: adminUser.name, role: 'admin' },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
