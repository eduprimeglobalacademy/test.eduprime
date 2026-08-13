import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TestCollaborator } from '../lib/supabase'

export function useTestCollaborators(testId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['test-collaborators', testId]

  const { data: collaborators, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<TestCollaborator[]> => {
      const { data } = await supabase.rpc('get_test_collaborators', { p_test_id: testId })
      return data ?? []
    },
    enabled: !!testId,
  })

  const addMutation = useMutation({
    mutationFn: async (email: string): Promise<string | null> => {
      if (!testId) return 'Missing test'
      const { data: found, error: lookupError } = await supabase.rpc('find_teacher_in_org', { p_email: email.trim() })
      if (lookupError) return 'Lookup failed. Please try again.'
      const teacher = found?.[0]
      if (!teacher) return 'No educator in your organization has that email.'

      const { error: insertError } = await supabase.from('test_collaborators').insert([{ test_id: testId, teacher_id: teacher.id }])
      if (insertError) {
        return insertError.code === '23505' ? 'That educator is already a collaborator on this test.' : 'Failed to add collaborator.'
      }
      return null
    },
    // mutationFn returns a string (not a throw) for expected failures like
    // "already a collaborator" — only invalidate on the genuine null-error success path.
    onSuccess: (result) => { if (result === null) queryClient.invalidateQueries({ queryKey }) },
  })

  const removeMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      await supabase.from('test_collaborators').delete().eq('id', collaboratorId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    collaborators: collaborators ?? [],
    loading: !testId ? false : isLoading,
    addByEmail: addMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  }
}
