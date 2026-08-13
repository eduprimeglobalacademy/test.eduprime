import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useTenant } from '../contexts/TenantContext'

/** Sum of the current org's active add-on capacity, by kind. 0 when none purchased. */
export function useAddonCapacity() {
  const { org } = useTenant()

  const { data } = useQuery({
    queryKey: ['addon-capacity', org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('org_capacity_addons')
        .select('kind, quantity, expires_at')
        .eq('org_id', org!.id)
        .eq('status', 'active')
      return data ?? []
    },
    enabled: !!org?.id,
  })

  const now = Date.now()
  const live = (data ?? []).filter(a => !a.expires_at || new Date(a.expires_at).getTime() > now)
  const sumFor = (kind: string) => live.filter(a => a.kind === kind).reduce((s, a) => s + a.quantity, 0)

  return {
    extraTeachers: sumFor('extra_teachers'),
    extraActiveTests: sumFor('extra_active_tests'),
    extraStudents: sumFor('extra_students'),
  }
}
