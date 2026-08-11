import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ClassStudent } from '../lib/supabase'

export function useClassRoster(classId: string | undefined) {
  const [roster, setRoster] = useState<ClassStudent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRoster = useCallback(async () => {
    if (!classId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('class_students').select('*').eq('class_id', classId).order('joined_at', { ascending: false })
    setRoster(data || [])
    setLoading(false)
  }, [classId])

  useEffect(() => { fetchRoster() }, [fetchRoster])

  const removeStudent = async (id: string) => {
    const { error } = await supabase.from('class_students').delete().eq('id', id)
    if (error) throw error
    await fetchRoster()
  }

  const addStudent = async (email: string, name?: string) => {
    if (!classId) throw new Error('Missing class')
    const { error } = await supabase
      .from('class_students')
      .upsert([{ class_id: classId, student_email: email.trim(), student_name: name?.trim() || null }], { onConflict: 'class_id,student_email' })
    if (error) throw error
    await fetchRoster()
  }

  return { roster, loading, removeStudent, addStudent, refetch: fetchRoster }
}
