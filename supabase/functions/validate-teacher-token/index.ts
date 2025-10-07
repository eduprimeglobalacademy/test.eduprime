import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, phoneNumber, name, email, password } = await req.json()

    // Create Supabase client with service role key for elevated privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create regular Supabase client for auth operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    console.log('Validating token:', token, 'for phone:', phoneNumber)

    // Step 1: Atomically check and mark token as used
    const { data: updatedToken, error: tokenError } = await supabaseAdmin
      .from('teacher_tokens')
      .update({ 
        status: 'used',
        used_at: new Date().toISOString() 
      })
      .eq('token', token)
      .eq('phone_number', phoneNumber)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .select()
      .single()

    if (tokenError || !updatedToken) {
      console.error('Token validation failed:', tokenError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token, already used, or expired. Please contact your administrator.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Token validated and marked as used:', updatedToken.id)

    // Step 2: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      console.error('Auth signup failed:', authError)
      
      // Rollback: Mark token as active again
      await supabaseAdmin
        .from('teacher_tokens')
        .update({ 
          status: 'active',
          used_at: null 
        })
        .eq('id', updatedToken.id)

      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create user account' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Auth user created:', authData.user.id)

    // Step 3: Create teacher profile
    const { data: teacherData, error: teacherError } = await supabaseAdmin
      .from('teachers')
      .insert([{
        user_id: authData.user.id,
        name,
        email,
        phone_number: phoneNumber,
        token_used: updatedToken.id,
      }])
      .select()
      .single()

    if (teacherError) {
      console.error('Teacher profile creation failed:', teacherError)
      
      // Rollback: Mark token as active again
      await supabaseAdmin
        .from('teacher_tokens')
        .update({ 
          status: 'active',
          used_at: null 
        })
        .eq('id', updatedToken.id)

      return new Response(
        JSON.stringify({ error: 'Failed to create teacher profile' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Teacher profile created successfully:', teacherData.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: authData.user.id,
          email: teacherData.email,
          role: 'teacher',
          name: teacherData.name,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})