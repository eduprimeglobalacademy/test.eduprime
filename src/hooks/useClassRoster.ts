import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useClassRoster(classId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['class-roster', classId]

  const { data: roster, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase.from('class_students').select('*').eq('class_id', classId).order('joined_at', { ascending: false })
      return data ?? []
    },
    enabled: !!classId,
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_students').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const addMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name?: string }) => {
      if (!classId) throw new Error('Missing class')
      const { error } = await supabase
        .from('class_students')
        .upsert([{ class_id: classId, student_email: email.trim(), student_name: name?.trim() || null }], { onConflict: 'class_id,student_email' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    roster: roster ?? [],
    loading: !classId ? false : isLoading,
    removeStudent: removeMutation.mutateAsync,
    addStudent: (email: string, name?: string) => addMutation.mutateAsync({ email, name }),
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  }
}
