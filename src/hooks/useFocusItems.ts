import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TeacherFocusItem } from '../lib/supabase'

export function useFocusItems(teacherId: string | undefined) {
  const [items, setItems] = useState<TeacherFocusItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!teacherId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('teacher_focus')
      .select('*, classes(id, name, course_name, grade_level)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [teacherId])

  useEffect(() => { fetchItems() }, [fetchItems])

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
    await fetchItems()
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
    await fetchItems()
  }

  const removeFocus = async (id: string) => {
    const { error } = await supabase.from('teacher_focus').delete().eq('id', id)
    if (error) throw error
    await fetchItems()
  }

  return { items, loading, addStudentFocus, addClassFocus, removeFocus, refetch: fetchItems }
}
