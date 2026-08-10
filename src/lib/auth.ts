import { supabase } from './supabase'
import { createClient } from '@supabase/supabase-js'
import type { UserRole } from './supabase'

// Create a service role client for admin operations (fallback to regular client if service key not available)
const getServiceRoleClient = () => {
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey) {
    return createClient(import.meta.env.VITE_SUPABASE_URL!, serviceRoleKey)
  }
  // Fallback to regular client if service role key is not available
  return supabase
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name: string
}

export interface AuthResult {
  user: AuthUser | null
  error: string | null
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Handle specific error cases
    if (error.message.includes('Email not confirmed')) {
      return {
        user: null,
        error: 'Please check your email and click the confirmation link before signing in.'
      }
    }
    
    return {
      user: null,
      error: error.message.includes('Invalid login credentials') 
        ? 'Invalid email or password. Please check your credentials.'
        : error.message
    }
  }

  if (data.user) {
    // Platform admin check first — cross-org staff take priority over any
    // org-scoped role, and in practice no one should be both.
    const { data: platformAdminData } = await supabase
      .from('platform_admins')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (platformAdminData) {
      return {
        user: {
          id: platformAdminData.id,
          email: platformAdminData.email,
          role: 'platform_admin',
          name: platformAdminData.name,
        },
        error: null
      }
    }

    // Check if admin - use simple query to avoid recursion
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (adminData && !adminError) {
      return {
        user: {
          id: adminData.id,
          email: adminData.email,
          role: 'admin',
          name: adminData.name,
        },
        error: null
      }
    }

    // Check if teacher - use simple query to avoid recursion
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (teacherData && !teacherError) {
      return {
        user: {
          id: data.user.id,
          email: teacherData.email,
          role: 'teacher',
          name: teacherData.name,
        },
        error: null
      }
    }
  }

  return {
    user: null,
    error: 'User not found in system'
  }
}

export async function signUpTeacher(
  name: string,
  email: string,
  phoneNumber: string,
  token: string,
  password: string
): Promise<AuthUser | null> {
  try {
    // Use the Edge Function to handle the complete registration process
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-teacher-token`
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        token: token.trim(),
        password: password.trim(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Registration failed')
    }

    // After successful registration, sign in the user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    })

    if (signInError || !signInData.user) {
      throw new Error('Registration successful but sign-in failed. Please try signing in manually.')
    }

    // Get the current user details
    const currentUser = await getCurrentUser()
    return currentUser
  } catch (error) {
    console.error('Teacher registration error:', error)
    throw error
  }
}

/**
 * Cold Google sign-in. Only works for an auth user that's already had
 * Google linked via connectGoogleAccount() below — someone who's never
 * linked it will hit Supabase's "no account" / "email already registered
 * under a different provider" case, which surfaces as a normal sign-in
 * error, not a security hole (no admin_users/teachers row means
 * getCurrentUser() returns null regardless of how the auth user got
 * created). This is deliberately not a self-serve account-creation path —
 * org admin/teacher accounts only exist via the token/create-organization
 * flows, and this doesn't bypass that.
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  })
  if (error) throw error
}

/**
 * Links Google to the CURRENTLY authenticated account. Requires an
 * existing session on purpose — linking only while already signed in
 * (rather than auto-linking a cold Google sign-in to any account sharing
 * that email) avoids the account-takeover shape where a same-named
 * Google account could otherwise attach itself to someone else's org.
 */
export async function connectGoogleAccount(): Promise<void> {
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  })
  if (error) throw error
}

export async function isGoogleConnected(): Promise<boolean> {
  const { data } = await supabase.auth.getUserIdentities()
  return (data?.identities || []).some(i => i.provider === 'google')
}

const IMPERSONATION_KEY = 'eduprime_impersonation'

export interface ImpersonationState {
  orgName: string
  adminEmail: string
  returnAccessToken: string
  returnRefreshToken: string
}

export function getImpersonationState(): ImpersonationState | null {
  const raw = sessionStorage.getItem(IMPERSONATION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Platform-admin-only: switches the current browser session to an org's
 * admin (default) or a specific educator within that org (teacherId), for
 * support.
 */
export async function startImpersonation(orgId: string, teacherId?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in.')

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/impersonate-org`
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ orgId, teacherId }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to start impersonation.')

  // Stash the platform admin's own session before overwriting it, so
  // exitImpersonation can restore it exactly.
  sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
    orgName: result.orgName,
    adminEmail: result.adminEmail,
    returnAccessToken: session.access_token,
    returnRefreshToken: session.refresh_token,
  } satisfies ImpersonationState))

  const { error } = await supabase.auth.setSession({
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
  })
  if (error) throw error
}

export async function exitImpersonation(): Promise<void> {
  const state = getImpersonationState()
  if (!state) return
  sessionStorage.removeItem(IMPERSONATION_KEY)
  await supabase.auth.setSession({
    access_token: state.returnAccessToken,
    refresh_token: state.returnRefreshToken,
  })
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error

  // If this happened mid-impersonation, don't leave stale return-session
  // tokens around for a later, unrelated session to pick up.
  sessionStorage.removeItem(IMPERSONATION_KEY)

  // Clear any local storage or session data if needed
  localStorage.removeItem('supabase.auth.token')
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser()

  // If user token is invalid, clear the session
  if (error || !user) {
    await supabase.auth.signOut()
    return null
  }

  try {
    const { data: platformAdminData } = await supabase
      .from('platform_admins')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (platformAdminData) {
      return {
        id: platformAdminData.id,
        email: platformAdminData.email,
        role: 'platform_admin',
        name: platformAdminData.name,
      }
    }

    // Check if admin - use simple query to avoid recursion
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminData && !adminError) {
      return {
        id: adminData.id,
        email: adminData.email,
        role: 'admin',
        name: adminData.name,
      }
    }

    // Check if teacher - use simple query to avoid recursion
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (teacherData && !teacherError) {
      return {
        id: user.id,
        email: teacherData.email,
        role: 'teacher',
        name: teacherData.name,
      }
    }

    return null
  } catch (error) {
    // If any database query fails, clear the session
    await supabase.auth.signOut()
    return null
  }
}