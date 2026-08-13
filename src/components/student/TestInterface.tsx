import { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, ShieldCheck, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { TestWatermark } from './TestWatermark'
import type { Test, Question, QuestionOption, TestSection } from '../../lib/supabase'

interface TestInterfaceProps {
  testCode: string
  orgId?: string
  onComplete: (results: any) => void
}

interface TestQuestion extends Question {
  options: QuestionOption[]
}

interface EffectiveSection {
  id: string | null
  title: string
  timing_mode: TestSection['timing_mode']
  duration_minutes: number | null
  allow_free_navigation: boolean
  questionIndices: number[]
}

type TestPhase = 'auth-check' | 'blocked' | 'details' | 'instructions' | 'test' | 'submitting'

export function TestInterface({ testCode, orgId, onComplete }: TestInterfaceProps) {
  const { org } = useTenant()
  const orgName = org?.name || 'EduPrime Global Academy'
  const orgLogo = org?.logo_url || '/eduprimelogo.jpg'
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [sections, setSections] = useState<TestSection[]>([])
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
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
  const [blockReason, setBlockReason] = useState<'not-enrolled' | 'test-blocked' | null>(null)
  const [authError, setAuthError] = useState('')

  // hasSections is true only when at least one REAL section (from the DB)
  // actually has a question assigned to it. This is the load-bearing
  // backward-compat guardrail: a test with zero test_sections rows, or one
  // whose sections exist in authoring but have no questions assigned yet,
  // must render and behave identically to today's flat exam-taking flow —
  // it must never synthesize a section just because every question's
  // section_id happens to be null.
  const namedSectionsWithQuestions = sections
    .map(s => ({
      id: s.id, title: s.title, timing_mode: s.timing_mode, duration_minutes: s.duration_minutes, allow_free_navigation: s.allow_free_navigation,
      questionIndices: questions.map((_, i) => i).filter(i => questions[i].section_id === s.id),
    }))
    .filter(s => s.questionIndices.length > 0)
  const hasSections = namedSectionsWithQuestions.length > 0
  const effectiveSections: EffectiveSection[] = !hasSections ? [] : [
    ...namedSectionsWithQuestions,
    ...(questions.some(q => !q.section_id) ? [{
      id: null, title: 'General', timing_mode: 'untimed' as const, duration_minutes: null, allow_free_navigation: true,
      questionIndices: questions.map((_, i) => i).filter(i => !questions[i].section_id),
    }] : []),
  ]
  const currentSection = hasSections ? effectiveSections[currentSectionIdx] : null
  const sectionQuestionIndices = currentSection?.questionIndices || []
  const localQuestionIdx = sectionQuestionIndices.indexOf(currentQuestion)

  useEffect(() => { fetchTest() }, [testCode])

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && phase === 'test') {
      const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(t)
    } else if (timeLeft === 0 && phase === 'test') handleSubmit()
  }, [timeLeft, phase])

  useEffect(() => {
    if (hasSections) return
    if (questionTimeLeft !== null && questionTimeLeft > 0 && phase === 'test') {
      const t = setTimeout(() => setQuestionTimeLeft(questionTimeLeft - 1), 1000)
      return () => clearTimeout(t)
    } else if (questionTimeLeft === 0 && phase === 'test') {
      if (currentQuestion < questions.length - 1) setCurrentQuestion(prev => prev + 1)
      else handleSubmit()
    }
  }, [questionTimeLeft, questions.length, phase, hasSections])

  useEffect(() => {
    if (hasSections) return
    if (test?.per_question_timing && questions.length > 0 && phase === 'test') {
      const q = questions[currentQuestion]
      if (q?.time_limit_seconds) setQuestionTimeLeft(q.time_limit_seconds)
    }
  }, [currentQuestion, test?.per_question_timing, questions, phase, hasSections])

  // Section-level timer — one countdown for the whole section, covering
  // both 'fixed' (a flat duration) and 'per_question_summed' (the sum of
  // its questions' individual time limits) modes.
  useEffect(() => {
    if (!hasSections || phase !== 'test') return
    const sec = effectiveSections[currentSectionIdx]
    if (!sec) return
    if (sec.timing_mode === 'fixed' && sec.duration_minutes) {
      setSectionTimeLeft(sec.duration_minutes * 60)
    } else if (sec.timing_mode === 'per_question_summed') {
      const total = sec.questionIndices.reduce((sum, i) => sum + (questions[i]?.time_limit_seconds || 0), 0)
      setSectionTimeLeft(total > 0 ? total : null)
    } else {
      setSectionTimeLeft(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionIdx, phase, hasSections])

  useEffect(() => {
    if (!hasSections) return
    if (sectionTimeLeft !== null && sectionTimeLeft > 0 && phase === 'test') {
      const t = setTimeout(() => setSectionTimeLeft(sectionTimeLeft - 1), 1000)
      return () => clearTimeout(t)
    } else if (sectionTimeLeft === 0 && phase === 'test') {
      advanceSection()
    }
  }, [sectionTimeLeft, phase, hasSections])

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
      const [{ data: qData, error: qError }, { data: secData }] = await Promise.all([
        supabase.from('questions').select('*, question_options (*)').eq('test_id', testData.id).order('question_order'),
        supabase.from('test_sections').select('*').eq('test_id', testData.id).order('section_order'),
      ])
      if (qError) throw qError
      setQuestions(qData.map(q => ({ ...q, options: q.question_options.sort((a: { option_order: number }, b: { option_order: number }) => a.option_order - b.option_order) })))
      setSections(secData || [])
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

    const { data: testBlock } = await supabase
      .from('test_blocked_students')
      .select('id')
      .eq('test_id', testData.id)
      .eq('student_email', user.email)
      .maybeSingle()
    if (testBlock) { setBlockReason('test-blocked'); setPhase('blocked'); return }

    if (testData.class_id) {
      const { data: enrollment } = await supabase
        .from('class_students')
        .select('id')
        .eq('class_id', testData.class_id)
        .eq('student_email', user.email)
        .maybeSingle()
      if (!enrollment) { setBlockReason('not-enrolled'); setPhase('blocked'); return }
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
      // The per-test blocklist previously only got checked inside the
      // Google-sign-in gate (resolveGate) — a test that doesn't require
      // Google sign-in (the common case; it's opt-in) never queried
      // test_blocked_students at all, so a teacher-blocked student could
      // just type a different name/email and join anyway. Checking here
      // too, right after details are entered, covers every test
      // regardless of whether it's Google-gated (resolveGate's check
      // still runs first for those, giving an earlier "you're blocked"
      // before the details form even shows — this is a deliberate,
      // harmless double-check for that case, not just for the gap).
      const { data: blockedRow } = await supabase
        .from('test_blocked_students')
        .select('id')
        .eq('test_id', test!.id)
        .eq('student_email', studentEmail.trim())
        .maybeSingle()
      if (blockedRow) { setBlockReason('test-blocked'); setPhase('blocked'); return }

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
    if (hasSections) {
      setCurrentSectionIdx(0)
      setCurrentQuestion(effectiveSections[0]?.questionIndices[0] ?? 0)
      // The outer test-level duration (if set) still bounds the whole
      // attempt regardless of per-section timing — a hard ceiling on top
      // of whichever section timers run underneath it.
      setTimeLeft(test?.duration_minutes ? test.duration_minutes * 60 : null)
    } else if (test?.per_question_timing && questions.length > 0 && questions[0]?.time_limit_seconds) {
      setQuestionTimeLeft(questions[0].time_limit_seconds)
      setTimeLeft(null)
    } else if (test?.duration_minutes) {
      setTimeLeft(test.duration_minutes * 60)
      setQuestionTimeLeft(null)
    }
  }

  const advanceSection = () => {
    const nextIdx = currentSectionIdx + 1
    if (nextIdx < effectiveSections.length) {
      setCurrentSectionIdx(nextIdx)
      setCurrentQuestion(effectiveSections[nextIdx].questionIndices[0] ?? currentQuestion)
    } else {
      handleSubmit()
    }
  }

  const gradeAnswer = (q: TestQuestion, sel: string | string[] | undefined): boolean => {
    if (q.question_type === 'multi_select') {
      const selectedIds = Array.isArray(sel) ? sel : []
      const correctIds = q.options.filter(o => o.is_correct).map(o => o.id)
      return selectedIds.length > 0 && selectedIds.length === correctIds.length && correctIds.every(id => selectedIds.includes(id))
    }
    if (q.question_type === 'short_answer') {
      const text = typeof sel === 'string' ? sel.trim().toLowerCase() : ''
      return !!text && q.options.some(o => o.option_text.trim().toLowerCase() === text)
    }
    return typeof sel === 'string' && !!sel && q.options.find(o => o.id === sel)?.is_correct === true
  }

  // Multi-select gets proportional partial credit — (correct picks - wrong picks) / total
  // correct options, floored at 0, of the question's points, rounded to a whole point since
  // student_answers.points_earned is an integer column. Every other type stays all-or-nothing.
  const pointsEarnedFor = (q: TestQuestion, sel: string | string[] | undefined): number => {
    if (q.question_type !== 'multi_select') return gradeAnswer(q, sel) ? q.points : 0
    const selectedIds = Array.isArray(sel) ? sel : []
    const correctIds = q.options.filter(o => o.is_correct).map(o => o.id)
    if (selectedIds.length === 0 || correctIds.length === 0) return 0
    const correctPicked = selectedIds.filter(id => correctIds.includes(id)).length
    const wrongPicked = selectedIds.length - correctPicked
    const fraction = Math.max(0, (correctPicked - wrongPicked) / correctIds.length)
    return Math.round(q.points * fraction)
  }

  const handleSubmit = async () => {
    setPhase('submitting')
    try {
      let totalScore = 0, maxScore = 0
      for (const q of questions) {
        maxScore += q.points
        totalScore += pointsEarnedFor(q, answers[q.id])
      }
      // Generated client-side rather than read back via .select() — there's
      // no anon SELECT policy on test_attempts (anon key holders must not
      // be able to read other students' names/emails/scores), so an
      // insert().select() chain fails RLS on the implicit RETURNING clause.
      // Knowing the id up front avoids needing to read it back at all.
      const attemptId = crypto.randomUUID()
      const { error: attemptError } = await supabase.from('test_attempts').insert([{
        id: attemptId,
        test_id: test!.id, student_name: studentName, student_email: studentEmail, phone_number: studentPhone,
        total_score: totalScore, max_score: maxScore,
        time_taken_seconds: test!.duration_minutes ? Math.max(0, test!.duration_minutes * 60 - (timeLeft || 0)) : null,
        is_submitted: true, submitted_at: new Date().toISOString()
      }])
      if (attemptError) throw attemptError
      for (const q of questions) {
        const sel = answers[q.id]
        const hasAnswer = Array.isArray(sel) ? sel.length > 0 : typeof sel === 'string' && sel.trim().length > 0
        if (!hasAnswer) continue
        const isCorrect = gradeAnswer(q, sel)
        const row: Record<string, unknown> = {
          attempt_id: attemptId, question_id: q.id,
          is_correct: isCorrect, points_earned: pointsEarnedFor(q, sel),
        }
        if (q.question_type === 'multi_select') row.selected_option_ids = sel as string[]
        else if (q.question_type === 'short_answer') row.answer_text = sel as string
        else row.selected_option_id = sel as string
        await supabase.from('student_answers').insert([row])
      }
      onComplete({
        score: totalScore, maxScore, showResults: test!.show_results, testTitle: test!.title,
        studentName, studentEmail, submittedAt: new Date().toISOString(),
        gradingConfig: test!.grading_config,
        questions: questions.map(q => ({
          ...q,
          selectedAnswer: answers[q.id],
          correctAnswer: q.options.find(o => o.is_correct)?.id,
          isCorrect: gradeAnswer(q, answers[q.id]),
          pointsEarned: pointsEarnedFor(q, answers[q.id]),
        }))
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
          {blockReason === 'test-blocked' ? "You've been blocked from this assessment" : "You're not enrolled in this class"}
        </h2>
        <p className="text-ink-faint text-sm mb-6">
          {blockReason === 'test-blocked'
            ? 'Your teacher has blocked this account from taking this specific assessment.'
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
              { label: 'Time Limit', value: hasSections
                  ? `${effectiveSections.length} section${effectiveSections.length !== 1 ? 's' : ''}`
                  : test?.per_question_timing && questions[0]?.time_limit_seconds ? `${questions[0].time_limit_seconds}s/Q` : test?.duration_minutes ? `${test.duration_minutes}m` : 'None' },
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
              hasSections
                ? 'This assessment is organized into sections, each with its own timing and navigation rules.'
                : test?.per_question_timing ? 'Questions auto-advance when time expires. You cannot go back.' : test?.allow_navigation_back ? 'You can navigate between questions freely.' : 'You can only move forward — no going back.',
              'Your progress is automatically saved as you answer.',
              hasSections
                ? 'Some sections may be timed and may not allow moving to other sections once left.'
                : test?.per_question_timing && questions[0]?.time_limit_seconds
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

  const isAnswered = (q: TestQuestion) => {
    const sel = answers[q.id]
    return Array.isArray(sel) ? sel.length > 0 : typeof sel === 'string' && sel.trim().length > 0
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const answered = questions.filter(isAnswered).length

  return (
    <div className="theme-dark min-h-screen bg-app flex flex-col">
      <TestWatermark text={`${studentName} · ${studentEmail}`} />
      {/* Header */}
      <header className="page-header">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img src={orgLogo} alt={orgName} className="w-7 h-7 object-contain rounded-lg shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-ink-faint hidden sm:block">{orgName}</p>
                <p className="text-sm font-semibold text-ink truncate">{test?.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {hasSections ? (
                <>
                  {sectionTimeLeft !== null && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold"
                      title={`${currentSection?.title} time remaining`}
                      style={sectionTimeLeft < 10
                        ? { background: 'var(--tone-danger-bg)', color: 'var(--tone-danger-ink)' }
                        : { background: 'var(--tone-warning-bg)', color: 'var(--tone-warning-ink)' }}
                    >
                      <Clock className="w-4 h-4" />
                      {fmt(sectionTimeLeft)}
                    </div>
                  )}
                  {timeLeft !== null && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold"
                      title="Overall time remaining"
                      style={timeLeft < 60
                        ? { background: 'var(--tone-danger-bg)', color: 'var(--tone-danger-ink)' }
                        : { background: 'var(--brand-primary-soft)', color: 'var(--brand-primary-dark)' }}
                    >
                      <Clock className="w-4 h-4" />
                      {fmt(timeLeft)}
                    </div>
                  )}
                </>
              ) : test?.per_question_timing && questionTimeLeft !== null ? (
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

      <div className="flex flex-1 min-h-0">
        {/* Section/question nav — full-height sidebar, true left edge, same pattern as the teacher/admin dashboards' aside */}
        <aside className="w-72 shrink-0 hidden lg:flex flex-col bg-app-outer border-r border-app-strong px-4 py-6 space-y-4 overflow-y-auto">
              {hasSections ? (
                effectiveSections.map((sec, secIdx) => {
                  const isCurrentSection = secIdx === currentSectionIdx
                  const canJumpHere = isCurrentSection || (currentSection?.allow_free_navigation && secIdx !== currentSectionIdx)
                  return (
                    <div key={sec.id ?? 'general'}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isCurrentSection ? 'text-[var(--brand-primary)]' : 'text-ink-faint'}`}>
                        {sec.title}{!canJumpHere ? ' (locked)' : ''}
                      </p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {sec.questionIndices.map(i => (
                          <button
                            key={i}
                            disabled={!canJumpHere}
                            onClick={() => {
                              if (!canJumpHere) return
                              if (isCurrentSection) {
                                const targetLocalIdx = sec.questionIndices.indexOf(i)
                                if (test?.allow_navigation_back || targetLocalIdx > localQuestionIdx) setCurrentQuestion(i)
                              } else {
                                setCurrentSectionIdx(secIdx)
                                setCurrentQuestion(i)
                              }
                            }}
                            className={`w-full aspect-square rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              i === currentQuestion ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]' :
                              isAnswered(questions[i]) ? '' :
                              'bg-surface-2 text-ink-faint hover:bg-surface-2'
                            }`}
                            style={isAnswered(questions[i]) && i !== currentQuestion ? { background: 'var(--tone-success-bg)', color: 'var(--tone-success-ink)' } : undefined}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div>
                  <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-3">Questions</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {questions.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (test?.per_question_timing) return
                          if (test?.allow_navigation_back || i > currentQuestion) setCurrentQuestion(i)
                        }}
                        className={`w-full aspect-square rounded-lg text-xs font-semibold transition-colors ${
                          i === currentQuestion ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]' :
                          isAnswered(questions[i]) ? '' :
                          'bg-surface-2 text-ink-faint hover:bg-surface-2'
                        }`}
                        style={isAnswered(questions[i]) && i !== currentQuestion ? { background: 'var(--tone-success-bg)', color: 'var(--tone-success-ink)' } : undefined}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-4 border-t border-app">
                <div className="flex items-center justify-between text-xs text-ink-faint">
                  <span>Answered</span>
                  <span className="font-semibold text-ink">{answered}/{questions.length}</span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full mt-2">
                  <div className="h-1.5 bg-emerald-500 rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
                </div>
              </div>
        </aside>

        {/* Question */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
          <div className="bg-surface rounded-2xl border border-app shadow-sm p-6 sm:p-8">
            <div className="max-w-2xl">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-wide">
                    {hasSections && currentSection
                      ? `${currentSection.title} · Question ${localQuestionIdx + 1} of ${sectionQuestionIndices.length}`
                      : `Question ${currentQuestion + 1} of ${questions.length}`}
                  </span>
                  <h2 className="text-lg sm:text-xl font-semibold text-ink mt-2 leading-relaxed">{currentQ.question_text}</h2>
                </div>
                <span className="shrink-0 px-2.5 py-1 bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] text-xs font-semibold rounded-lg border border-[var(--brand-primary-soft)]">
                  {currentQ.points} {currentQ.points === 1 ? 'pt' : 'pts'}
                </span>
              </div>

              {currentQ.question_type === 'short_answer' ? (
                <textarea
                  value={typeof answers[currentQ.id] === 'string' ? (answers[currentQ.id] as string) : ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                  placeholder="Type your answer"
                  className="input-base resize-y min-h-[100px] w-full"
                  rows={3}
                />
              ) : (
                <div className="space-y-3">
                  {currentQ.options.map((option, i) => {
                    const letters = ['A', 'B', 'C', 'D', 'E']
                    const isMultiSelect = currentQ.question_type === 'multi_select'
                    const selected = answers[currentQ.id]
                    const isSelected = isMultiSelect
                      ? Array.isArray(selected) && selected.includes(option.id)
                      : selected === option.id
                    const toggle = () => {
                      if (isMultiSelect) {
                        setAnswers(prev => {
                          const current = Array.isArray(prev[currentQ.id]) ? (prev[currentQ.id] as string[]) : []
                          const next = current.includes(option.id) ? current.filter(id => id !== option.id) : [...current, option.id]
                          return { ...prev, [currentQ.id]: next }
                        })
                      } else {
                        setAnswers(prev => ({ ...prev, [currentQ.id]: option.id }))
                      }
                    }
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
                          type={isMultiSelect ? 'checkbox' : 'radio'}
                          name={isMultiSelect ? undefined : `q-${currentQ.id}`}
                          value={option.id}
                          checked={isSelected}
                          onChange={toggle}
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
              )}
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-app">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (hasSections) {
                      if (localQuestionIdx > 0) setCurrentQuestion(sectionQuestionIndices[localQuestionIdx - 1])
                    } else {
                      setCurrentQuestion(Math.max(0, currentQuestion - 1))
                    }
                  }}
                  disabled={hasSections
                    ? (localQuestionIdx <= 0 || !test?.allow_navigation_back)
                    : (currentQuestion === 0 || !!test?.per_question_timing || !test?.allow_navigation_back)}
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
                          questions[qi] && isAnswered(questions[qi]) ? 'bg-emerald-400' : 'bg-surface-2'
                        }`}
                      />
                    )
                  })}
                </div>

                {hasSections ? (
                  localQuestionIdx < sectionQuestionIndices.length - 1 ? (
                    <Button onClick={() => setCurrentQuestion(sectionQuestionIndices[localQuestionIdx + 1])}>
                      Next<ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : currentSectionIdx < effectiveSections.length - 1 ? (
                    <Button onClick={advanceSection}>
                      Next Section<ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={answered === 0}>
                      <CheckCircle className="w-4 h-4" />Submit Assessment
                    </Button>
                  )
                ) : currentQuestion < questions.length - 1 ? (
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
        </main>
      </div>
    </div>
  )
}
