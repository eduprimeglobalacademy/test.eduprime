import React, { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, signOut as authSignOut, consumeSessionHandoff } from '../lib/auth'
import type { AuthUser } from '../lib/auth'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await authSignOut()
    setUser(null)
  }

  useEffect(() => {
    // Consume a cross-subdomain session handoff (post org-signup) before
    // the first refreshUser() check — otherwise that check runs against
    // no session yet and this landing page briefly (or permanently, until
    // the next auth event) reads as logged out.
    consumeSessionHandoff().then(() => refreshUser())

    // Covers the OAuth redirect-back case reliably: supabase-js parses the
    // access token out of the URL and fires SIGNED_IN, which may land
    // after this component's first refreshUser() call already resolved
    // with no session. Also catches token refresh and cross-tab sign-out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshUser()
    })
    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}