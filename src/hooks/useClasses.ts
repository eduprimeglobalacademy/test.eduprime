import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Class } from '../lib/supabase'

export function useClasses(teacherId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['classes', teacherId]

  const { data: classes, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!teacherId,
  })

  const createClass = async (input: { name: string; course_name?: string; grade_level?: string; academic_term?: string }) => {
    if (!teacherId) throw new Error('Missing teacher')
    const { data, error } = await supabase.from('classes').insert([{ teacher_id: teacherId, ...input }]).select().single()
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey })
    return data as Class
  }

  const updateClass = async (id: string, patch: { name?: string; course_name?: string; grade_level?: string; academic_term?: string }) => {
    const { data, error } = await supabase.from('classes').update(patch).eq('id', id).select().single()
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey })
    return data as Class
  }

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey })
  }

  return {
    classes: classes ?? [],
    loading: !teacherId ? false : isLoading,
    createClass,
    updateClass,
    deleteClass,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  }
}

export function classLabel(cls: Pick<Class, 'name' | 'course_name'>): string {
  return cls.course_name ? `${cls.course_name} — ${cls.name}` : cls.name
}
