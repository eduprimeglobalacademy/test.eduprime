import { supabase } from './supabase'
import type { UserRole } from './supabase'

/**
 * Session handoff across a subdomain boundary — used right after org
 * signup, which happens on the root domain, to land the new admin
 * already signed in on their own subdomain. Sessions live in per-origin
 * localStorage, so "sign in, then redirect" alone doesn't carry across;
 * the tokens have to travel in the URL. Uses the hash fragment
 * specifically (never sent to any server, unlike a query string) under a
 * name that can't collide with Supabase's own magic-link/OAuth params,
 * and is stripped from the visible URL immediately on consumption either
 * way — the tokens never persist as the page's address.
 */
export function buildSessionHandoffUrl(
  baseUrl: string,
  accessToken: string,
  refreshToken: string,
  impersonation?: { orgName: string; adminEmail: string }
): string {
  let hash = `handoff_access_token=${encodeURIComponent(accessToken)}&handoff_refresh_token=${encodeURIComponent(refreshToken)}`
  if (impersonation) {
    hash += `&handoff_impersonating=1&handoff_org_name=${encodeURIComponent(impersonation.orgName)}&handoff_admin_email=${encodeURIComponent(impersonation.adminEmail)}`
  }
  return `${baseUrl}#${hash}`
}

export async function consumeSessionHandoff(): Promise<boolean> {
  const hash = window.location.hash
  if (!hash.includes('handoff_access_token=')) return false

  const params = new URLSearchParams(hash.slice(1))
  const accessToken = params.get('handoff_access_token')
  const refreshToken = params.get('handoff_refresh_token')
  const impersonating = params.get('handoff_impersonating') === '1'
  const orgName = params.get('handoff_org_name')
  const adminEmail = params.get('handoff_admin_email')

  // Strip immediately regardless of outcome below.
  window.history.replaceState(null, '', window.location.pathname + window.location.search)

  if (!accessToken || !refreshToken) return false
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  if (error) return false

  // Handoff arrived from the standalone admin app's "view as" flow — no
  // return session to stash (the admin's real session lives on the admin
  // app's own origin), but the banner still needs orgName/adminEmail to
  // render and exitImpersonation needs to know there's nothing to restore.
  if (impersonating && orgName && adminEmail) {
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
      orgName,
      adminEmail,
      returnAccessToken: '',
      returnRefreshToken: '',
    } satisfies ImpersonationState))
  }

  return true
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

export async function exitImpersonation(): Promise<void> {
  const state = getImpersonationState()
  if (!state) return
  sessionStorage.removeItem(IMPERSONATION_KEY)

  // Handoff-originated impersonation (started from the standalone admin
  // app) has no return session to restore to — the admin's real session
  // lives on that app's own origin, not here. Just sign out of the org
  // session; the admin returns to the admin app tab, which was never
  // touched.
  if (!state.returnAccessToken || !state.returnRefreshToken) {
    await supabase.auth.signOut()
    return
  }

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

  // A failed/empty getUser() here just means "no user to report" — it does
  // NOT mean the session is bad. This runs on every auth-state-change event
  // (see AuthContext), including right after a fresh sign-in, often racing
  // the login form's own in-flight queries. Calling signOut() here used to
  // rip out a session that had just been established, turning a transient
  // getUser() hiccup into a false "user not found" on a correct login.
  if (error || !user) {
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
    // Same reasoning as above — a query hiccup isn't proof the session is
    // bad, so don't blow it away.
    return null
  }
}