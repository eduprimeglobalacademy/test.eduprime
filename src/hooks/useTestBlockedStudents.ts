import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TestBlockedStudent } from '../lib/supabase'

export function useTestBlockedStudents(testId: string | undefined) {
  const [blocked, setBlocked] = useState<TestBlockedStudent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBlocked = useCallback(async () => {
    if (!testId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('test_blocked_students').select('*').eq('test_id', testId).order('blocked_at', { ascending: false })
    setBlocked(data || [])
    setLoading(false)
  }, [testId])

  useEffect(() => { fetchBlocked() }, [fetchBlocked])

  const blockStudent = async (email: string) => {
    if (!testId) throw new Error('Save the assessment before blocking students')
    const { error } = await supabase.from('test_blocked_students').insert([{ test_id: testId, student_email: email.trim() }])
    if (error) throw error
    await fetchBlocked()
  }

  const unblockStudent = async (id: string) => {
    const { error } = await supabase.from('test_blocked_students').delete().eq('id', id)
    if (error) throw error
    await fetchBlocked()
  }

  return { blocked, loading, blockStudent, unblockStudent, refetch: fetchBlocked }
}
