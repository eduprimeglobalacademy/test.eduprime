import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../contexts/TenantContext'

/** Sum of the current org's active add-on capacity, by kind. 0 when none purchased. */
export function useAddonCapacity() {
  const { org } = useTenant()
  const [extraTeachers, setExtraTeachers] = useState(0)
  const [extraActiveTests, setExtraActiveTests] = useState(0)
  const [extraStudents, setExtraStudents] = useState(0)

  useEffect(() => {
    if (!org?.id) return
    let cancelled = false
    supabase
      .from('org_capacity_addons')
      .select('kind, quantity, expires_at')
      .eq('org_id', org.id)
      .eq('status', 'active')
      .then(({ data }) => {
        if (cancelled || !data) return
        const now = Date.now()
        const live = data.filter(a => !a.expires_at || new Date(a.expires_at).getTime() > now)
        setExtraTeachers(live.filter(a => a.kind === 'extra_teachers').reduce((s, a) => s + a.quantity, 0))
        setExtraActiveTests(live.filter(a => a.kind === 'extra_active_tests').reduce((s, a) => s + a.quantity, 0))
        setExtraStudents(live.filter(a => a.kind === 'extra_students').reduce((s, a) => s + a.quantity, 0))
      })
    return () => { cancelled = true }
  }, [org?.id])

  return { extraTeachers, extraActiveTests, extraStudents }
}
