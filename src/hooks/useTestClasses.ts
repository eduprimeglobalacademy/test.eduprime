import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTestClasses(testId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['test-classes', testId]

  const { data: classIds, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase.from('test_classes').select('class_id').eq('test_id', testId)
      return (data ?? []).map(r => r.class_id)
    },
    enabled: !!testId,
  })

  const setClassesMutation = useMutation({
    mutationFn: async (nextIds: string[]) => {
      if (!testId) return
      const current = classIds ?? []
      const toRemove = current.filter(id => !nextIds.includes(id))
      const toAdd = nextIds.filter(id => !current.includes(id))
      if (toRemove.length > 0) {
        const { error } = await supabase.from('test_classes').delete().eq('test_id', testId).in('class_id', toRemove)
        if (error) throw error
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from('test_classes').insert(toAdd.map(class_id => ({ test_id: testId, class_id })))
        if (error) throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    classIds: classIds ?? [],
    loading: !testId ? false : isLoading,
    setClasses: setClassesMutation.mutateAsync,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  }
}
