import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Upload, Download, AlertCircle, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface CreateQuestionPageProps {
  testId: string
  onBack: () => void
  onQuestionsUpdated: () => void
}

interface QuestionOption {
  id: string
  option_text: string
  is_correct: boolean
  option_order: number
}

interface Question {
  id: string
  question_text: string
  question_order: number
  points: number
  time_limit_seconds: number | null
  options: QuestionOption[]
  isNew?: boolean
}

export function CreateQuestionPage({ testId, onBack, onQuestionsUpdated }: CreateQuestionPageProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testTitle, setTestTitle] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [testId])

  const fetchData = async () => {
    try {
      const { data: testData } = await supabase.from('tests').select('title').eq('id', testId).single()
      if (testData) setTestTitle(testData.title)
      const { data: qData, error: qError } = await supabase.from('questions').select('*, question_options (*)').eq('test_id', testId).order('question_order')
      if (qError) throw qError
      setQuestions((qData || []).map(q => ({
        ...q,
        options: (q.question_options || []).sort((a: any, b: any) => a.option_order - b.option_order)
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => {
    const newQ: Question = {
      id: `new-${Date.now()}`,
      question_text: '',
      question_order: questions.length + 1,
      points: 1,
      time_limit_seconds: null,
      isNew: true,
      options: [
        { id: `opt-${Date.now()}-0`, option_text: '', is_correct: true, option_order: 1 },
        { id: `opt-${Date.now()}-1`, option_text: '', is_correct: false, option_order: 2 },
        { id: `opt-${Date.now()}-2`, option_text: '', is_correct: false, option_order: 3 },
        { id: `opt-${Date.now()}-3`, option_text: '', is_correct: false, option_order: 4 },
      ]
    }
    setQuestions(prev => [...prev, newQ])
    setExpandedQuestion(newQ.id)
    setTimeout(() => document.getElementById(`q-${newQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const updateOption = (qId: string, optId: string, field: string, value: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const opts = q.options.map(o => {
        if (field === 'is_correct' && value === true) return { ...o, is_correct: o.id === optId }
        if (o.id === optId) return { ...o, [field]: value }
        return o
      })
      return { ...q, options: opts }
    }))
  }

  const addOption = (qId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const newOpt: QuestionOption = {
        id: `opt-${Date.now()}`,
        option_text: '',
        is_correct: false,
        option_order: q.options.length + 1
      }
      return { ...q, options: [...q.options, newOpt] }
    }))
  }

  const removeOption = (qId: string, optId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.options.length <= 2) return q
      const filtered = q.options.filter(o => o.id !== optId)
      if (filtered.every(o => !o.is_correct) && filtered.length > 0) filtered[0].is_correct = true
      return { ...q, options: filtered.map((o, i) => ({ ...o, option_order: i + 1 })) }
    }))
  }

  const removeQuestion = async (id: string) => {
    const q = questions.find(q => q.id === id)
    if (!q) return
    if (!q.isNew) {
      const { error } = await supabase.from('questions').delete().eq('id', id)
      if (error) { setError(error.message); return }
    }
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, question_order: i + 1 })))
  }

  const parseBulkImport = () => {
    const lines = bulkText.trim().split('\n').filter(l => l.trim())
    const newQuestions: Question[] = []
    let currentQ: Question | null = null
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (/^(\d+)[.)]\s+/.test(trimmed)) {
        if (currentQ) newQuestions.push(currentQ)
        const qText = trimmed.replace(/^(\d+)[.)]\s+/, '')
        currentQ = {
          id: `new-${Date.now()}-${newQuestions.length}`,
          question_text: qText,
          question_order: questions.length + newQuestions.length + 1,
          points: 1,
          time_limit_seconds: null,
          isNew: true,
          options: []
        }
      } else if (/^[A-E][.)]\s+/.test(trimmed) && currentQ) {
        const isCorrect = trimmed.includes('*') || trimmed.startsWith('A.')
        const optText = trimmed.replace(/^[A-E][.)]\s+/, '').replace('*', '').trim()
        currentQ.options.push({
          id: `opt-${Date.now()}-${currentQ.options.length}`,
          option_text: optText,
          is_correct: isCorrect,
          option_order: currentQ.options.length + 1
        })
      }
    }
    if (currentQ) newQuestions.push(currentQ)
    if (newQuestions.length > 0) {
      setQuestions(prev => [...prev, ...newQuestions])
      setBulkText('')
      setShowBulkInput(false)
      setSuccess(`${newQuestions.length} question(s) imported successfully`)
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError('No valid questions found. Use format: "1. Question text" followed by "A. Option" lines.')
    }
  }

  const downloadTemplate = () => {
    const tmpl = `1. What is 2 + 2?
A. 3
B. 4*
C. 5
D. 6

2. Which planet is closest to the Sun?
A. Mercury*
B. Venus
C. Earth
D. Mars

Note: Mark correct answers with * or put correct answer first (A.)
`
    const blob = new Blob([tmpl], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'question_template.txt'
    a.click()
  }

  const saveAll = async () => {
    setError('')
    setSuccess('')
    for (const q of questions) {
      if (!q.question_text.trim()) { setError('All questions must have text'); return }
      if (q.options.length < 2) { setError('Each question needs at least 2 options'); return }
      if (q.options.some(o => !o.option_text.trim())) { setError('All options must have text'); return }
      if (!q.options.some(o => o.is_correct)) { setError('Each question must have one correct answer'); return }
    }
    setSaving(true)
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const qData = { test_id: testId, question_text: q.question_text, question_order: i + 1, points: q.points, time_limit_seconds: q.time_limit_seconds }
        let qId = q.id
        if (q.isNew) {
          const { data, error } = await supabase.from('questions').insert([qData]).select().single()
          if (error) throw error
          qId = data.id
        } else {
          const { error } = await supabase.from('questions').update({ ...qData }).eq('id', q.id)
          if (error) throw error
          await supabase.from('question_options').delete().eq('question_id', q.id)
        }
        const optData = q.options.map((o, j) => ({ question_id: qId, option_text: o.option_text, is_correct: o.is_correct, option_order: j + 1 }))
        const { error: optErr } = await supabase.from('question_options').insert(optData)
        if (optErr) throw optErr
      }
      setSuccess('All questions saved successfully!')
      setTimeout(() => { setSuccess(''); onQuestionsUpdated() }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save questions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><LoadingSpinner size="lg" /></div>

  const letters = ['A', 'B', 'C', 'D', 'E', 'F']

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="page-header sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="w-4 h-4" />Back
              </Button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{testTitle}</p>
                <p className="text-xs text-gray-500">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowBulkInput(!showBulkInput)}>
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Bulk Import</span>
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Template</span>
              </Button>
              <Button onClick={saveAll} loading={saving} size="sm">
                <Save className="w-4 h-4" />Save All
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-sm text-emerald-700 font-medium">{success}</p>
          </div>
        )}

        {/* Bulk Import */}
        {showBulkInput && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Bulk Import Questions</h3>
            <p className="text-xs text-gray-500 mb-4">
              Format: "1. Question text" followed by "A. Option" lines. Mark correct answers with * or first option (A.) is assumed correct.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="1. What is 2 + 2?&#10;A. 3&#10;B. 4*&#10;C. 5&#10;D. 6"
              className="input-base min-h-[140px] font-mono text-sm resize-y w-full"
            />
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowBulkInput(false)}>Cancel</Button>
              <Button onClick={parseBulkImport} disabled={!bulkText.trim()}>Import Questions</Button>
            </div>
          </div>
        )}

        {/* Questions list */}
        <div className="space-y-4">
          {questions.map((question, qi) => {
            const isExpanded = expandedQuestion === question.id
            return (
              <div key={question.id} id={`q-${question.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Question header (collapsed) */}
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                  className="w-full flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {qi + 1}
                    </div>
                    <p className={`text-sm font-medium truncate ${question.question_text ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {question.question_text || 'New Question'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500 hidden sm:block">{question.points} pt{question.points !== 1 ? 's' : ''}</span>
                    <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </button>

                {/* Question expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 sm:px-6 py-6 space-y-5">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Question Text *</label>
                        <textarea
                          value={question.question_text}
                          onChange={(e) => updateQuestion(question.id, 'question_text', e.target.value)}
                          placeholder="Enter your question"
                          className="input-base resize-y min-h-[80px] w-full"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-3">
                        <Input
                          label="Points"
                          type="number"
                          min="1"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 1)}
                        />
                        <Input
                          label="Time limit (seconds)"
                          type="number"
                          min="5"
                          placeholder="No limit"
                          value={question.time_limit_seconds || ''}
                          onChange={(e) => updateQuestion(question.id, 'time_limit_seconds', e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </div>
                    </div>

                    {/* Options */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Answer Options *</p>
                      <div className="space-y-2.5">
                        {question.options.map((opt, oi) => (
                          <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${opt.is_correct ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${opt.is_correct ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {letters[oi]}
                              </span>
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={opt.is_correct}
                                onChange={() => updateOption(question.id, opt.id, 'is_correct', true)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                title="Mark as correct"
                              />
                            </div>
                            <input
                              type="text"
                              value={opt.option_text}
                              onChange={(e) => updateOption(question.id, opt.id, 'option_text', e.target.value)}
                              placeholder={`Option ${letters[oi]}`}
                              className="flex-1 text-sm border-0 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400"
                            />
                            {question.options.length > 2 && (
                              <button onClick={() => removeOption(question.id, opt.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <button
                          onClick={() => addOption(question.id)}
                          disabled={question.options.length >= 6}
                          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />Add Option
                        </button>
                        <p className="text-xs text-gray-400">Select radio button to mark correct answer</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <Button variant="outline" size="sm" onClick={() => removeQuestion(question.id)} className="text-red-500 border-red-200 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />Delete Question
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add question button */}
        <button
          onClick={addQuestion}
          className="mt-4 w-full p-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-gray-400 hover:text-indigo-600 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Question</span>
        </button>

        {questions.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Button onClick={saveAll} loading={saving} size="lg">
              <Save className="w-5 h-5" />
              Save All Questions
            </Button>
          </div>
        )}

        {questions.length === 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Yet</h3>
            <p className="text-gray-500 text-sm mb-4">Add questions manually or use bulk import</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={addQuestion}>
                <Plus className="w-4 h-4" />Add First Question
              </Button>
              <Button variant="outline" onClick={() => setShowBulkInput(true)}>
                <Upload className="w-4 h-4" />Bulk Import
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
