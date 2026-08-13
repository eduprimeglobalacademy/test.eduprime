import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { QuestionBankItem, QuestionBankOption, QuestionType } from '../lib/supabase'

interface SaveToBankInput {
  teacherId: string
  questionText: string
  points: number
  questionType: QuestionType
  options: { option_text: string; is_correct: boolean; option_order: number }[]
}

export function useQuestionBank(teacherId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['question-bank', teacherId]

  const { data: items, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<QuestionBankItem[]> => {
      const { data } = await supabase
        .from('question_bank_items')
        .select('*, question_bank_options(*)')
        .order('created_at', { ascending: false })
      return (data || []).map((item) => ({
        ...item,
        options: (item.question_bank_options || []).sort((a: QuestionBankOption, b: QuestionBankOption) => a.option_order - b.option_order),
      }))
    },
    enabled: !!teacherId,
  })

  const saveToBank = async ({ teacherId, questionText, points, questionType, options }: SaveToBankInput) => {
    const { data: item, error } = await supabase
      .from('question_bank_items')
      .insert([{ teacher_id: teacherId, question_text: questionText, points, question_type: questionType }])
      .select().single()
    if (error) throw error

    const { error: optError } = await supabase.from('question_bank_options').insert(
      options.map(o => ({ bank_item_id: item.id, ...o }))
    )
    if (optError) throw optError

    await queryClient.invalidateQueries({ queryKey })
    return item as QuestionBankItem
  }

  const deleteFromBank = async (itemId: string) => {
    await supabase.from('question_bank_items').delete().eq('id', itemId)
    await queryClient.invalidateQueries({ queryKey })
  }

  return {
    items: items ?? [],
    loading: !teacherId ? false : isLoading,
    saveToBank,
    deleteFromBank,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  }
}
