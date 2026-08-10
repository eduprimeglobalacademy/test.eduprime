import { useState, useEffect } from 'react'
import { ArrowLeft, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test, Question, QuestionOption } from '../../lib/supabase'

interface TestPreviewProps {
  testId: string
  onBack: () => void
}

interface TestQuestion extends Question {
  options: QuestionOption[]
}

export function TestPreview({ testId, onBack }: TestPreviewProps) {
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchTestData() }, [testId])

  const fetchTestData = async () => {
    try {
      const { data: testData, error: testError } = await supabase.from('tests').select('*').eq('id', testId).single()
      if (testError) throw testError
      setTest(testData)
      const { data: qData, error: qError } = await supabase.from('questions').select('*, question_options (*)').eq('test_id', testId).order('question_order')
      if (qError) throw qError
      setQuestions(qData.map(q => ({ ...q, options: q.question_options.sort((a: any, b: any) => a.option_order - b.option_order) })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-app flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (error) return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-md p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-ink mb-2">Error Loading Test</h2>
        <p className="text-ink-faint text-sm mb-4">{error}</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    </div>
  )

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const answered = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-app">
      <header className="page-header">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="w-4 h-4" />Back
              </Button>
              <div>
                <p className="text-sm font-semibold text-ink">{test?.title}</p>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3 h-3 text-[var(--brand-primary)]" />
                  <span className="text-xs text-[var(--brand-primary)] font-semibold">PREVIEW MODE</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {test?.duration_minutes && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] text-sm">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-semibold">{test.duration_minutes}:00</span>
                </div>
              )}
              <span className="text-xs text-ink-faint">{currentQuestion + 1}/{questions.length}</span>
            </div>
          </div>
        </div>
        <div className="h-1 bg-surface-2">
          <div className="h-1 bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {test?.description && (
          <div className="bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-soft)] rounded-xl p-4 mb-6 text-sm text-[var(--brand-primary-darker)]">
            {test.description}
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Nav */}
          <div className="hidden lg:block">
            <div className="bg-surface rounded-2xl border border-app shadow-sm p-4 sticky top-24">
              <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-3">Questions</p>
              <div className="grid grid-cols-4 gap-1.5">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestion(i)}
                    className={`w-full aspect-square rounded-lg text-xs font-semibold transition-colors ${
                      i === currentQuestion ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]' :
                      answers[questions[i].id] ? 'bg-emerald-100 text-emerald-700' :
                      'bg-surface-2 text-ink-faint hover:bg-surface-2'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-app space-y-2 text-xs text-ink-faint">
                <div className="flex justify-between"><span>Total Questions</span><span className="font-semibold text-ink">{questions.length}</span></div>
                <div className="flex justify-between"><span>Total Points</span><span className="font-semibold text-ink">{questions.reduce((s, q) => s + q.points, 0)}</span></div>
                <div className="flex justify-between"><span>Preview Answered</span><span className="font-semibold text-ink">{answered}</span></div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="lg:col-span-3">
            <div className="bg-surface rounded-2xl border border-app shadow-sm p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wide">Question {currentQuestion + 1}</span>
                  <h2 className="text-lg font-semibold text-ink mt-2 leading-relaxed">{currentQ.question_text}</h2>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] text-xs font-semibold rounded-lg">
                  {currentQ.points} {currentQ.points === 1 ? 'pt' : 'pts'}
                </span>
              </div>

              <div className="space-y-3">
                {currentQ.options.map((option, i) => {
                  const letters = ['A', 'B', 'C', 'D', 'E']
                  const isSelected = answers[currentQ.id] === option.id
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]' : 'border-app hover:border-[var(--brand-primary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQ.id}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => setAnswers(prev => ({ ...prev, [currentQ.id]: option.id }))}
                        className="sr-only"
                      />
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]' : 'bg-surface-2 text-ink-faint'}`}>
                        {letters[i] || i + 1}
                      </span>
                      <span className="text-sm text-ink-soft flex-1">{option.option_text}</span>
                      {option.is_correct && (
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" title="Correct answer" />
                      )}
                    </label>
                  )
                })}
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-app">
                <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>
                  <ChevronLeft className="w-4 h-4" />Prev
                </Button>
                <Button onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))} disabled={currentQuestion === questions.length - 1}>
                  Next<ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
