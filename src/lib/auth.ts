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

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  
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