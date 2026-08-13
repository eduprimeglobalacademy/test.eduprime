import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useFocusItems(teacherId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['focus-items', teacherId]

  const { data: items, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('teacher_focus')
        .select('*, classes(id, name, course_name, grade_level)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!teacherId,
  })

  const addStudentFocus = async (input: { email: string; name?: string; note?: string }) => {
    if (!teacherId) throw new Error('Missing teacher')
    const { error } = await supabase.from('teacher_focus').insert([{
      teacher_id: teacherId,
      kind: 'student',
      student_email: input.email.trim(),
      student_name: input.name?.trim() || null,
      note: input.note?.trim() || null,
    }])
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey })
  }

  const addClassFocus = async (input: { classId: string; note?: string }) => {
    if (!teacherId) throw new Error('Missing teacher')
    const { error } = await supabase.from('teacher_focus').insert([{
      teacher_id: teacherId,
      kind: 'class',
      class_id: input.classId,
      note: input.note?.trim() || null,
    }])
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey })
  }

  const removeFocus = async (id: string) => {
    const { error } = await supabase.from('teacher_focus').delete().eq('id', id)
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey })
  }

  return {
    items: items ?? [],
    loading: !teacherId ? false : isLoading,
    addStudentFocus,
    addClassFocus,
    removeFocus,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  }
}
