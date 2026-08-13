import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TestSection, SectionTimingMode } from '../lib/supabase'

type SectionFields = Partial<Pick<TestSection, 'title' | 'timing_mode' | 'duration_minutes' | 'allow_free_navigation'>>

export function useTestSections(testId: string | undefined) {
  const [sections, setSections] = useState<TestSection[]>([])
  const [loading, setLoading] = useState(!!testId)

  const fetchSections = useCallback(async () => {
    if (!testId) { setSections([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('test_sections').select('*').eq('test_id', testId).order('section_order')
    setSections(data || [])
    setLoading(false)
  }, [testId])

  useEffect(() => { fetchSections() }, [fetchSections])

  const addSection = async (title: string) => {
    if (!testId) return
    const { error } = await supabase.from('test_sections').insert([{
      test_id: testId, title, section_order: sections.length + 1,
    }])
    if (error) throw error
    await fetchSections()
  }

  const updateSection = async (id: string, fields: SectionFields) => {
    const { error } = await supabase.from('test_sections').update(fields).eq('id', id)
    if (error) throw error
    await fetchSections()
  }

  const removeSection = async (id: string) => {
    const { error } = await supabase.from('test_sections').delete().eq('id', id)
    if (error) throw error
    await fetchSections()
  }

  const reorderSection = async (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapIdx < 0 || swapIdx >= sections.length) return
    const a = sections[idx], b = sections[swapIdx]
    await Promise.all([
      supabase.from('test_sections').update({ section_order: b.section_order }).eq('id', a.id),
      supabase.from('test_sections').update({ section_order: a.section_order }).eq('id', b.id),
    ])
    await fetchSections()
  }

  return { sections, loading, addSection, updateSection, removeSection, reorderSection, refetch: fetchSections }
}

export type { SectionTimingMode }
