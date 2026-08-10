import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Plan } from '../lib/supabase'
import { useTenant } from '../contexts/TenantContext'

/** Reads the current org's plan limits. NULL on any field means unlimited. */
export function usePlanLimits() {
  const { org } = useTenant()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org?.plan_id) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    supabase.from('plans').select('*').eq('id', org.plan_id).maybeSingle().then(({ data }) => {
      if (cancelled) return
      setPlan(data as Plan | null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [org?.plan_id])

  return { plan, loading }
}
