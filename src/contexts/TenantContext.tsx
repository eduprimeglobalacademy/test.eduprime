import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Organization } from '../lib/supabase'
import { resolveSlugFromHostname, isPlatformRootHost } from '../lib/tenant'

interface TenantContextType {
  org: Organization | null
  loading: boolean
  notFound: boolean
  isRootDomain: boolean
  refetchOrg: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

function applyBrandColors(org: Organization | null) {
  const root = document.documentElement
  if (org?.primary_color) root.style.setProperty('--brand-primary', org.primary_color)
  else root.style.removeProperty('--brand-primary')

  if (org?.secondary_color) root.style.setProperty('--brand-secondary', org.secondary_color)
  else root.style.removeProperty('--brand-secondary')

  // Browser tab identity — white-label customers get their own name/icon
  // here too, not just in-page branding. Only touches the tab when an org
  // actually resolved; the root marketing page keeps index.html's static
  // "EduPrime Global Academy" title/favicon.
  if (org?.name) document.title = org.name

  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (org?.logo_url) {
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }
    favicon.href = org.logo_url
  } else if (favicon) {
    favicon.href = '/vite.svg'
  }
}

interface TenantProviderProps {
  children: React.ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const isRootDomain = isPlatformRootHost(window.location.hostname)

  const refetchOrg = useCallback(async () => {
    const hostname = window.location.hostname
    const slug = resolveSlugFromHostname(hostname)

    if (!slug && isPlatformRootHost(hostname)) {
      setLoading(false)
      return
    }

    const query = slug
      ? supabase.from('organizations').select('*').eq('slug', slug).maybeSingle()
      // Not a *.eduprime.app subdomain and not a platform host either —
      // only a genuine, platform-admin-activated custom domain resolves;
      // a domain still stuck on 'pending' behaves the same as unknown.
      : supabase.from('organizations').select('*').eq('custom_domain', hostname).eq('custom_domain_status', 'active').maybeSingle()

    const { data, error } = await query
    if (error || !data) {
      setNotFound(true)
    } else {
      setOrg(data as Organization)
      applyBrandColors(data as Organization)
    }
    setLoading(false)
  }, [])

  useEffect(() => { refetchOrg() }, [refetchOrg])

  const value = { org, loading, notFound, isRootDomain, refetchOrg }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
