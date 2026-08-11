import { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, ShieldCheck, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test, Question, QuestionOption } from '../../lib/supabase'

interface TestInterfaceProps {
  testCode: string
  orgId?: string
  onComplete: (results: any) => void
}

interface TestQuestion extends Question {
  options: QuestionOption[]
}

type TestPhase = 'auth-check' | 'blocked' | 'details' | 'instructions' | 'test' | 'submitting'

export function TestInterface({ testCode, orgId, onComplete }: TestInterfaceProps) {
  const { org } = useTenant()
  const orgName = org?.name || 'EduPrime Global Academy'
  const orgLogo = org?.logo_url || '/eduprimelogo.jpg'
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
  const [googleEmailLocked, setGoogleEmailLocked] = useState(false)
  const [blockReason, setBlockReason] = useState<'not-enrolled' | 'blocked' | null>(null)
  const [authError, setAuthError] = useState('')

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
      let testQuery = supabase.from('tests').select('*').eq('test_code', testCode.toUpperCase())
      if (orgId) testQuery = testQuery.eq('org_id', orgId)
      const { data: testData, error: testError } = await testQuery.single()
      if (testError || !testData) { setError('Test not found or not available'); setLoading(false); return }
      if (testData.status !== 'live') { setError('Test is not currently active'); setLoading(false); return }
      const now = new Date()
      if (testData.start_time && new Date(testData.start_time) > now) { setError('Test has not started yet'); setLoading(false); return }
      if (testData.end_time && new Date(testData.end_time) < now) { setError('Test has ended'); setLoading(false); return }
      setTest(testData)
      const { data: qData, error: qError } = await supabase.from('questions').select('*, question_options (*)').eq('test_id', testData.id).order('question_order')
      if (qError) throw qError
      setQuestions(qData.map(q => ({ ...q, options: q.question_options.sort((a: any, b: any) => a.option_order - b.option_order) })))
      await resolveGate(testData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test')
    } finally {
      setLoading(false)
    }
  }

  const resolveGate = async (testData: Test) => {
    if (!testData.require_google_auth) { setPhase('details'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPhase('auth-check'); return }
    setStudentEmail(user.email)
    setGoogleEmailLocked(true)
    setStudentName(user.user_metadata?.full_name || user.user_metadata?.name || '')
    if (testData.class_id) {
      const { data: enrollment } = await supabase
        .from('class_students')
        .select('blocked')
        .eq('class_id', testData.class_id)
        .eq('student_email', user.email)
        .maybeSingle()
      if (!enrollment) { setBlockReason('not-enrolled'); setPhase('blocked'); return }
      if (enrollment.blocked) { setBlockReason('blocked'); setPhase('blocked'); return }
    }
    setPhase('details')
  }

  const handleGoogleSignIn = async (selectAccount = false) => {
    setAuthError('')
    const url = new URL(window.location.href)
    url.searchParams.set('code', testCode)
    window.history.replaceState(null, '', url.pathname + url.search)
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: url.toString(),
        ...(selectAccount ? { queryParams: { prompt: 'select_account' } } : {}),
      },
    })
    if (signInError) setAuthError(signInError.message)
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
      const { data: alreadyAttempted } = await supabase.rpc('has_attempted', {
        p_test_id: test!.id,
        p_student_email: studentEmail.trim(),
        p_phone_number: studentPhone.trim(),
      })
      if (alreadyAttempted) { setDuplicateError('You have already taken this test. Each student can only take a test once.'); return }
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

  if (loading) return <div className="theme-dark min-h-screen bg-app flex items-center justify-center"><LoadingSpinner size="lg" /></div>

  if (error) return (
    <div className="theme-dark min-h-screen bg-app flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-md p-8 text-center">
        <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-ink mb-2">Assessment Unavailable</h2>
        <p className="text-ink-faint">{error}</p>
      </div>
    </div>
  )

  if (phase === 'auth-check') return (
    <div className="theme-dark min-h-screen bg-app-outer flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-md p-6 sm:p-8 text-center">
        <ShieldCheck className="w-12 h-12 text-[var(--brand-primary)] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-ink mb-2">{test?.title}</h2>
        <p className="text-ink-faint text-sm mb-6">This assessment requires you to sign in with Google before entering the code.</p>
        {authError && <p className="text-sm text-red-500 mb-4">{authError}</p>}
        <Button onClick={() => handleGoogleSignIn(false)} className="w-full" size="lg">Continue with Google</Button>
      </div>
    </div>
  )

  if (phase === 'blocked') return (
    <div className="theme-dark min-h-screen bg-app-outer flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-md p-6 sm:p-8 text-center">
        <UserX className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-ink mb-2">
          {blockReason === 'blocked' ? "You've been blocked from this class" : "You're not enrolled in this class"}
        </h2>
        <p className="text-ink-faint text-sm mb-6">
          {blockReason === 'blocked'
            ? 'Your teacher has blocked this account from taking assessments in this class.'
            : "Ask your teacher to add you to the class roster, then try again."}
        </p>
        {blockReason === 'not-enrolled' && (
          <Button variant="outline" onClick={() => handleGoogleSignIn(true)} className="w-full">Try a different account</Button>
        )}
      </div>
    </div>
  )

  if (phase === 'details') return (
    <div className="theme-dark min-h-screen bg-app-outer flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-md">
        <div className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-ink">{test?.title}</h2>
            {test?.description && <p className="text-ink-faint text-sm mt-1">{test.description}</p>}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Full Name *</label>
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} className="input-base" placeholder="Enter your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Email Address *</label>
              <input
                type="email"
                value={studentEmail}
                onChange={e => !googleEmailLocked && setStudentEmail(e.target.value)}
                readOnly={googleEmailLocked}
                className={`input-base ${googleEmailLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                placeholder="Enter your email address"
              />
              {googleEmailLocked && <p className="text-xs text-ink-muted mt-1">Verified via Google sign-in</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1.5">Phone Number *</label>
              <input type="tel" value={studentPhone} onChange={e => setStudentPhone(e.target.value)} className="input-base" placeholder="Enter your phone number" />
            </div>
            {(error || duplicateError) && (
              <div className="p-3 rounded-xl" style={{ background: 'var(--tone-danger-bg)' }}>
                <p className="text-sm" style={{ color: 'var(--tone-danger-ink)' }}>{error || duplicateError}</p>
              </div>
            )}
            <Button onClick={handleDetailsSubmit} className="w-full" size="lg">Continue</Button>
          </div>
        </div>
      </div>
    </div>
  )

  if (phase === 'instructions') return (
    <div className="theme-dark min-h-screen bg-app-outer flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-2xl">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-ink">{test?.title}</h2>
            <p className="text-ink-faint mt-1">Assessment Instructions</p>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--brand-primary-soft)] rounded-xl mb-6">
            {[
              { label: 'Questions', value: questions.length },
              { label: 'Total Points', value: questions.reduce((s, q) => s + q.points, 0) },
              { label: 'Time Limit', value: test?.per_question_timing && questions[0]?.time_limit_seconds ? `${questions[0].time_limit_seconds}s/Q` : test?.duration_minutes ? `${test.duration_minutes}m` : 'None' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-[var(--brand-primary-dark)]">{value}</div>
                <div className="text-xs text-[var(--brand-primary)] mt-0.5">{label}</div>
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
                <div className="w-6 h-6 rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-sm text-ink-soft">{instruction}</p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-app rounded-xl border border-app mb-6">
            <p className="text-xs font-semibold text-ink-soft mb-2">Your Details</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><span className="text-ink-muted text-xs">Name</span><p className="font-medium text-ink truncate">{studentName}</p></div>
              <div><span className="text-ink-muted text-xs">Email</span><p className="font-medium text-ink truncate">{studentEmail}</p></div>
              <div><span className="text-ink-muted text-xs">Phone</span><p className="font-medium text-ink truncate">{studentPhone}</p></div>
            </div>
            <button onClick={() => setPhase('details')} className="text-[var(--brand-primary)] text-xs hover:underline mt-2">Change details</button>
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
    <div className="theme-dark min-h-screen bg-app flex items-center justify-center">
      <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-md p-10 text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-5" />
        <h2 className="text-xl font-bold text-ink mb-2">Submitting Assessment</h2>
        <p className="text-ink-faint">Please wait while we process your answers...</p>
      </div>
    </div>
  )

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const answered = Object.keys(answers).length

  return (
    <div className="theme-dark min-h-screen bg-app">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img src={orgLogo} alt={orgName} className="w-7 h-7 object-contain rounded-lg shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-ink-faint hidden sm:block">{orgName}</p>
                <p className="text-sm font-semibold text-ink truncate">{test?.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {test?.per_question_timing && questionTimeLeft !== null ? (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold"
                  style={questionTimeLeft < 10
                    ? { background: 'var(--tone-danger-bg)', color: 'var(--tone-danger-ink)' }
                    : { background: 'var(--tone-warning-bg)', color: 'var(--tone-warning-ink)' }}
                >
                  <Clock className="w-4 h-4" />
                  {fmt(questionTimeLeft)}
                </div>
              ) : timeLeft !== null ? (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold"
                  style={timeLeft < 60
                    ? { background: 'var(--tone-danger-bg)', color: 'var(--tone-danger-ink)' }
                    : timeLeft < 300
                      ? { background: 'var(--tone-warning-bg)', color: 'var(--tone-warning-ink)' }
                      : { background: 'var(--brand-primary-soft)', color: 'var(--brand-primary-dark)' }}
                >
                  <Clock className="w-4 h-4" />
                  {fmt(timeLeft)}
                </div>
              ) : null}
              <Button onClick={handleSubmit} disabled={answered === 0} size="sm">
                <CheckCircle className="w-4 h-4" />
                Submit
              </Button>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-surface-2">
          <div className="h-1 bg-[var(--brand-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question nav (desktop) */}
          <div className="hidden lg:block">
            <div className="bg-surface rounded-2xl border border-app shadow-sm p-4 sticky top-24">
              <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-3">Questions</p>
              <div className="grid grid-cols-4 gap-1.5">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (test?.per_question_timing) return
                      if (test?.allow_navigation_back || i > currentQuestion) setCurrentQuestion(i)
                    }}
                    className={`w-full aspect-square rounded-lg text-xs font-semibold transition-colors ${
                      i === currentQuestion ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]' :
                      answers[questions[i].id] ? '' :
                      'bg-surface-2 text-ink-faint hover:bg-surface-2'
                    }`}
                    style={answers[questions[i].id] && i !== currentQuestion ? { background: 'var(--tone-success-bg)', color: 'var(--tone-success-ink)' } : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-app">
                <div className="flex items-center justify-between text-xs text-ink-faint">
                  <span>Answered</span>
                  <span className="font-semibold text-ink">{answered}/{questions.length}</span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full mt-2">
                  <div className="h-1.5 bg-emerald-500 rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="lg:col-span-3">
            <div className="bg-surface rounded-2xl border border-app shadow-sm p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wide">Question {currentQuestion + 1} of {questions.length}</span>
                  <h2 className="text-lg sm:text-xl font-semibold text-ink mt-2 leading-relaxed">{currentQ.question_text}</h2>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] text-xs font-semibold rounded-lg border border-[var(--brand-primary-soft)]">
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
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]'
                          : 'border-app hover:border-[var(--brand-primary)] hover:bg-app'
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
                        isSelected ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]' : 'bg-surface-2 text-ink-faint'
                      }`}>{letters[i] || i + 1}</span>
                      <span className={`text-sm sm:text-base leading-relaxed ${isSelected ? 'text-[var(--brand-primary-darker)] font-medium' : 'text-ink-soft'}`}>
                        {option.option_text}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-app">
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
                          qi === currentQuestion ? 'bg-[var(--brand-primary)]' :
                          answers[questions[qi]?.id] ? 'bg-emerald-400' : 'bg-surface-2'
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
                  <Button onClick={handleSubmit} disabled={answered === 0}>
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
