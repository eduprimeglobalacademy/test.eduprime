import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TestCollaborator } from '../lib/supabase'

export function useTestCollaborators(testId: string | undefined) {
  const [collaborators, setCollaborators] = useState<TestCollaborator[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCollaborators = useCallback(async () => {
    if (!testId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.rpc('get_test_collaborators', { p_test_id: testId })
    setCollaborators(data || [])
    setLoading(false)
  }, [testId])

  useEffect(() => { fetchCollaborators() }, [fetchCollaborators])

  const addByEmail = async (email: string): Promise<string | null> => {
    if (!testId) return 'Missing test'
    const { data: found, error: lookupError } = await supabase.rpc('find_teacher_in_org', { p_email: email.trim() })
    if (lookupError) return 'Lookup failed. Please try again.'
    const teacher = found?.[0]
    if (!teacher) return 'No educator in your organization has that email.'

    const { error: insertError } = await supabase.from('test_collaborators').insert([{ test_id: testId, teacher_id: teacher.id }])
    if (insertError) {
      return insertError.code === '23505' ? 'That educator is already a collaborator on this test.' : 'Failed to add collaborator.'
    }
    await fetchCollaborators()
    return null
  }

  const remove = async (collaboratorId: string) => {
    await supabase.from('test_collaborators').delete().eq('id', collaboratorId)
    await fetchCollaborators()
  }

  return { collaborators, loading, addByEmail, remove, refetch: fetchCollaborators }
}
