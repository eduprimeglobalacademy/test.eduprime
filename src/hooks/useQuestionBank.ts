import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { QuestionBankItem, QuestionBankOption } from '../lib/supabase'

interface SaveToBankInput {
  teacherId: string
  questionText: string
  points: number
  options: { option_text: string; is_correct: boolean; option_order: number }[]
}

export function useQuestionBank(teacherId: string | undefined) {
  const [items, setItems] = useState<QuestionBankItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!teacherId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('question_bank_items')
      .select('*, question_bank_options(*)')
      .order('created_at', { ascending: false })
    setItems((data || []).map((item) => ({
      ...item,
      options: (item.question_bank_options || []).sort((a: QuestionBankOption, b: QuestionBankOption) => a.option_order - b.option_order),
    })))
    setLoading(false)
  }, [teacherId])

  useEffect(() => { fetchItems() }, [fetchItems])

  const saveToBank = async ({ teacherId, questionText, points, options }: SaveToBankInput) => {
    const { data: item, error } = await supabase
      .from('question_bank_items')
      .insert([{ teacher_id: teacherId, question_text: questionText, points }])
      .select().single()
    if (error) throw error

    const { error: optError } = await supabase.from('question_bank_options').insert(
      options.map(o => ({ bank_item_id: item.id, ...o }))
    )
    if (optError) throw optError

    await fetchItems()
    return item as QuestionBankItem
  }

  const deleteFromBank = async (itemId: string) => {
    await supabase.from('question_bank_items').delete().eq('id', itemId)
    await fetchItems()
  }

  return { items, loading, saveToBank, deleteFromBank, refetch: fetchItems }
}
