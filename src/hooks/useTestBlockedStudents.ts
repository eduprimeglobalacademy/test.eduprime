import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TestBlockedStudent } from '../lib/supabase'

export function useTestBlockedStudents(testId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['test-blocked-students', testId]

  const { data: blocked, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<TestBlockedStudent[]> => {
      const { data } = await supabase.from('test_blocked_students').select('*').eq('test_id', testId).order('blocked_at', { ascending: false })
      return data ?? []
    },
    enabled: !!testId,
  })

  const blockMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!testId) throw new Error('Save the assessment before blocking students')
      const { error } = await supabase.from('test_blocked_students').insert([{ test_id: testId, student_email: email.trim() }])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('test_blocked_students').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    blocked: blocked ?? [],
    loading: !testId ? false : isLoading,
    blockStudent: blockMutation.mutateAsync,
    unblockStudent: unblockMutation.mutateAsync,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  }
}
