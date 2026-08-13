import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TestSection, SectionTimingMode } from '../lib/supabase'

type SectionFields = Partial<Pick<TestSection, 'title' | 'timing_mode' | 'duration_minutes' | 'allow_free_navigation'>>

export function useTestSections(testId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['test-sections', testId]

  const { data: sections, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<TestSection[]> => {
      const { data } = await supabase.from('test_sections').select('*').eq('test_id', testId).order('section_order')
      return data ?? []
    },
    enabled: !!testId,
  })
  const sectionsList = sections ?? []

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!testId) return
      const { error } = await supabase.from('test_sections').insert([{
        test_id: testId, title, section_order: sectionsList.length + 1,
      }])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, fields }: { id: string; fields: SectionFields }) => {
      const { error } = await supabase.from('test_sections').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('test_sections').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const idx = sectionsList.findIndex(s => s.id === id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || swapIdx < 0 || swapIdx >= sectionsList.length) return
      const a = sectionsList[idx], b = sectionsList[swapIdx]
      await Promise.all([
        supabase.from('test_sections').update({ section_order: b.section_order }).eq('id', a.id),
        supabase.from('test_sections').update({ section_order: a.section_order }).eq('id', b.id),
      ])
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    sections: sectionsList,
    loading: !testId ? false : isLoading,
    addSection: addMutation.mutateAsync,
    updateSection: (id: string, fields: SectionFields) => updateMutation.mutateAsync({ id, fields }),
    removeSection: removeMutation.mutateAsync,
    reorderSection: (id: string, direction: 'up' | 'down') => reorderMutation.mutateAsync({ id, direction }),
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  }
}

export type { SectionTimingMode }
