import { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test, Question, QuestionOption } from '../../lib/supabase'

interface TestInterfaceProps {
  testCode: string
  onComplete: (results: any) => void
}

interface TestQuestion extends Question {
  options: QuestionOption[]
}

type TestPhase = 'details' | 'instructions' | 'test' | 'submitting'

export function TestInterface({ testCode, onComplete }: TestInterfaceProps) {
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [phase, setPhase] = useState<TestPhase>('details')
  const [duplicateError, setDuplicateError] = useState('')
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null)

  useEffect(() => { fetchTest() }, [testCode])

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && phase === 'test') {
      const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(t)
    } else if (timeLeft === 0 && phase === 'test') handleSubmit()
  }, [timeLeft, phase])

  useEffect(() => {
    if (questionTimeLeft !== null && questionTimeLeft > 0 && phase === 'test') {
      const t = setTimeout(() => setQuestionTimeLeft(questionTimeLeft - 1), 1000)
      return () => clearTimeout(t)
    } else if (questionTimeLeft === 0 && phase === 'test') {
      if (currentQuestion < questions.length - 1) setCurrentQuestion(prev => prev + 1)
      else handleSubmit()
    }
  }, [questionTimeLeft, questions.length, phase])

  useEffect(() => {
    if (test?.per_question_timing && questions.length > 0 && phase === 'test') {
      const q = questions[currentQuestion]
      if (q?.time_limit_seconds) setQuestionTimeLeft(q.time_limit_seconds)
    }
  }, [currentQuestion, test?.per_question_timing, questions, phase])

  const fetchTest = async () => {
    try {
      const { data: testData, error: testError } = await supabase.from('tests').select('*').eq('test_code', testCode.toUpperCase()).single()
      if (testError || !testData) { setError('Test not found or not available'); setLoading(false); return }
      if (testData.status !== 'live') { setError('Test is not currently active'); setLoading(false); return }
      const now = new Date()
      if (testData.start_time && new Date(testData.start_time) > now) { setError('Test has not started yet'); setLoading(false); return }
      if (testData.end_time && new Date(testData.end_time) < now) { setError('Test has ended'); setLoading(false); return }
      setTest(testData)
      const { data: qData, error: qError } = await supabase.from('questions').select('*, question_options (*)').eq('test_id', testData.id).order('question_order')
      if (qError) throw qError
      setQuestions(qData.map(q => ({ ...q, options: q.question_options.sort((a: any, b: any) => a.option_order - b.option_order) })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test')
    } finally {
      setLoading(false)
    }
  }

  const handleDetailsSubmit = () => {
    if (!studentName.trim()) { setError('Please enter your name'); return }
    if (!studentEmail.trim()) { setError('Please enter your email'); return }
    if (!studentPhone.trim()) { setError('Please enter your phone number'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) { setError('Please enter a valid email'); return }
    if (!/^[\d\s\-+()]{10,}$/.test(studentPhone.replace(/\s/g, ''))) { setError('Please enter a valid phone number'); return }
    setError('')
    checkDuplicate()
  }

  const checkDuplicate = async () => {
    try {
      const { data } = await supabase.from('test_attempts').select('id').eq('test_id', test!.id).eq('student_email', studentEmail.trim()).eq('phone_number', studentPhone.trim()).eq('is_submitted', true).maybeSingle()
      if (data) { setDuplicateError('You have already taken this test. Each student can only take a test once.'); return }
      setDuplicateError('')
      setPhase('instructions')
    } catch {
      setDuplicateError('')
      setPhase('instructions')
    }
  }

  const handleStartTest = () => {
    setPhase('test')
    if (test?.per_question_timing && questions.length > 0 && questions[0]?.time_limit_seconds) {
      setQuestionTimeLeft(questions[0].time_limit_seconds)
      setTimeLeft(null)
    } else if (test?.duration_minutes) {
      setTimeLeft(test.duration_minutes * 60)
      setQuestionTimeLeft(null)
    }
  }

  const handleSubmit = async () => {
    setPhase('submitting')
    try {
      let totalScore = 0, maxScore = 0
      for (const q of questions) {
        maxScore += q.points
        const sel = answers[q.id]
        if (sel && q.options.find(o => o.id === sel)?.is_correct) totalScore += q.points
      }
      const { data: attemptData, error: attemptError } = await supabase.from('test_attempts').insert([{
        test_id: test!.id, student_name: studentName, student_email: studentEmail, phone_number: studentPhone,
        total_score: totalScore, max_score: maxScore,
        time_taken_seconds: test!.duration_minutes ? Math.max(0, test!.duration_minutes * 60 - (timeLeft || 0)) : null,
        is_submitted: true, submitted_at: new Date().toISOString()
      }]).select().single()
      if (attemptError) throw attemptError
      for (const q of questions) {
        const sel = answers[q.id]
        if (sel) {
          const opt = q.options.find(o => o.id === sel)
          await supabase.from('student_answers').insert([{
            attempt_id: attemptData.id, question_id: q.id, selected_option_id: sel,
            is_correct: opt?.is_correct || false, points_earned: opt?.is_correct ? q.points : 0
          }])
        }
      }
      onComplete({
        score: totalScore, maxScore, showResults: test!.show_results, testTitle: test!.title,
        studentName, studentEmail, submittedAt: new Date().toISOString(),
        gradingConfig: test!.grading_config,
        questions: questions.map(q => ({ ...q, selectedAnswer: answers[q.id], correctAnswer: q.options.find(o => o.is_correct)?.id }))
      })
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit test')
      setPhase('test')
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><LoadingSpinner size="lg" /></div>

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-md p-8 text-center">
        <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Assessment Unavailable</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  )

  if (phase === 'details') return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-md">
        <div className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">{test?.title}</h2>
            {test?.description && <p className="text-gray-500 text-sm mt-1">{test.description}</p>}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} className="input-base" placeholder="Enter your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
              <input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} className="input-base" placeholder="Enter your email address" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
              <input type="tel" value={studentPhone} onChange={e => setStudentPhone(e.target.value)} className="input-base" placeholder="Enter your phone number" />
            </div>
            {(error || duplicateError) && <div className="p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-sm text-red-600">{error || duplicateError}</p></div>}
            <Button onClick={handleDetailsSubmit} className="w-full" size="lg">Continue</Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (phase === 'instructions') return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-2xl">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{test?.title}</h2>
            <p className="text-gray-500 mt-1">Assessment Instructions</p>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-indigo-50 rounded-xl mb-6">
            {[
              { label: 'Questions', value: questions.length },
              { label: 'Total Points', value: questions.reduce((s, q) => s + q.points, 0) },
              { label: 'Time Limit', value: test?.per_question_timing && questions[0]?.time_limit_seconds ? `${questions[0].time_limit_seconds}s/Q` : test?.duration_minutes ? `${test.duration_minutes}m` : 'None' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-indigo-700">{value}</div>
                <div className="text-xs text-indigo-600 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-6">
            {[
              'Read each question carefully before selecting your answer.',
              test?.per_question_timing ? 'Questions auto-advance when time expires. You cannot go back.' : test?.allow_navigation_back ? 'You can navigate between questions freely.' : 'You can only move forward — no going back.',
              'Your progress is automatically saved as you answer.',
              test?.per_question_timing && questions[0]?.time_limit_seconds
                ? `Each question has ${questions[0].time_limit_seconds} seconds.`
                : test?.duration_minutes ? `You have ${test.duration_minutes} minutes. Test auto-submits when time runs out.`
                : 'Click "Submit" when finished with all questions.',
            ].map((instruction, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-sm text-gray-700">{instruction}</p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 mb-6">
            <p className="text-xs font-semibold text-gray-600 mb-2">Your Details</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><span className="text-gray-400 text-xs">Name</span><p className="font-medium text-gray-900 truncate">{studentName}</p></div>
              <div><span className="text-gray-400 text-xs">Email</span><p className="font-medium text-gray-900 truncate">{studentEmail}</p></div>
              <div><span className="text-gray-400 text-xs">Phone</span><p className="font-medium text-gray-900 truncate">{studentPhone}</p></div>
            </div>
            <button onClick={() => setPhase('details')} className="text-indigo-600 text-xs hover:underline mt-2">Change details</button>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPhase('details')} className="flex-1">Back</Button>
            <Button onClick={handleStartTest} className="flex-1" size="lg">Start Assessment</Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (phase === 'submitting') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-md p-10 text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-5" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Submitting Assessment</h2>
        <p className="text-gray-500">Please wait while we process your answers...</p>
      </div>
    </div>
  )

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const answered = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/eduprimelogo.jpg" alt="EduPrime" className="w-7 h-7 object-contain rounded-lg shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 hidden sm:block">EduPrime Global Academy</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{test?.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {test?.per_question_timing && questionTimeLeft !== null ? (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold ${questionTimeLeft < 10 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  <Clock className="w-4 h-4" />
                  {fmt(questionTimeLeft)}
                </div>
              ) : timeLeft !== null ? (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold ${timeLeft < 60 ? 'bg-red-100 text-red-700' : timeLeft < 300 ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                  <Clock className="w-4 h-4" />
                  {fmt(timeLeft)}
                </div>
              ) : null}
              <Button
                onClick={handleSubmit}
                disabled={answered === 0}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
              >
                <CheckCircle className="w-4 h-4" />
                Submit
              </Button>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question nav (desktop) */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-24">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Questions</p>
              <div className="grid grid-cols-4 gap-1.5">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (test?.per_question_timing) return
                      if (test?.allow_navigation_back || i > currentQuestion) setCurrentQuestion(i)
                    }}
                    className={`w-full aspect-square rounded-lg text-xs font-semibold transition-colors ${
                      i === currentQuestion ? 'bg-indigo-600 text-white' :
                      answers[questions[i].id] ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Answered</span>
                  <span className="font-semibold text-gray-900">{answered}/{questions.length}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                  <div className="h-1.5 bg-emerald-500 rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Question {currentQuestion + 1} of {questions.length}</span>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mt-2 leading-relaxed">{currentQ.question_text}</h2>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100">
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
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-100 hover:border-indigo-200 hover:bg-slate-50'
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
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{letters[i] || i + 1}</span>
                      <span className={`text-sm sm:text-base leading-relaxed ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>
                        {option.option_text}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0 || !!test?.per_question_timing || !test?.allow_navigation_back}
                >
                  <ChevronLeft className="w-4 h-4" />Prev
                </Button>

                {/* Mobile question dots */}
                <div className="flex gap-1 lg:hidden">
                  {questions.slice(Math.max(0, currentQuestion - 3), currentQuestion + 4).map((_, idx) => {
                    const qi = Math.max(0, currentQuestion - 3) + idx
                    return (
                      <div
                        key={qi}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          qi === currentQuestion ? 'bg-indigo-600' :
                          answers[questions[qi]?.id] ? 'bg-emerald-400' : 'bg-gray-200'
                        }`}
                      />
                    )
                  })}
                </div>

                {currentQuestion < questions.length - 1 ? (
                  <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>
                    Next<ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={answered === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
                  >
                    <CheckCircle className="w-4 h-4" />Submit Assessment
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
