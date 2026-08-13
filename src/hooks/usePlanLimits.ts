import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Plan } from '../lib/supabase'
import { useTenant } from '../contexts/TenantContext'

/** Reads the current org's plan limits. NULL on any field means unlimited. */
export function usePlanLimits() {
  const { org } = useTenant()

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', org?.plan_id],
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('*').eq('id', org!.plan_id).maybeSingle()
      return (data as Plan | null) ?? null
    },
    enabled: !!org?.plan_id,
  })

  return { plan: plan ?? null, loading: !org?.plan_id ? false : isLoading }
}
