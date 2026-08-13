import { useState, useEffect } from 'react'
import {
  ArrowLeft, ArrowRight, Save, Plus, Trash2, Upload, Download,
  AlertCircle, GripVertical, BookMarked, Library, FileText, Settings as SettingsIcon, Eye, BarChart3,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { useQuestionBank } from '../../hooks/useQuestionBank'
import { useTestSections } from '../../hooks/useTestSections'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ClassPicker } from './ClassPicker'
import { QuestionBankPicker } from './QuestionBankPicker'
import { BehaviorFields } from './BehaviorFields'
import { GradingFields } from './GradingFields'
import { SectionsPanel } from './SectionsPanel'
import { STUDENT_DETAIL_FIELDS, ALL_STUDENT_DETAIL_FIELD_KEYS } from '../../lib/studentDetailFields'
import type { StudentDetailField } from '../../lib/studentDetailFields'
import type { Test } from '../../lib/supabase'

const CREATION_STEPS: { key: 'basic' | 'behavior' | 'grading'; label: string }[] = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'behavior', label: 'Behavior' },
  { key: 'grading', label: 'Grading' },
]

interface TestAuthoringProps {
  testId?: string
  teacherId: string
  initialClassId?: string
  onBack: () => void
  onTestSaved: () => void
  onOpenSettings?: (testId: string) => void
  onPreview?: (testId: string) => void
  onReports?: (testId: string) => void
}

interface QuestionOption {
  id: string
  option_text: string
  is_correct: boolean
  option_order: number
}

type QuestionType = 'single_select' | 'multi_select' | 'true_false' | 'short_answer'

interface QuestionRow {
  id: string
  question_text: string
  question_order: number
  points: number
  time_limit_seconds: number | null
  question_type: QuestionType
  section_id: string | null
  options: QuestionOption[]
  isNew?: boolean
}

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single_select: 'Single Select',
  multi_select: 'Multi Select',
  true_false: 'True / False',
  short_answer: 'Short Answer',
}

interface SettingsForm {
  title: string
  description: string
  durationMinutes: string
  startTime: string
  endTime: string
  showResults: boolean
  allowNavigationBack: boolean
  perQuestionTiming: boolean
  timePerQuestion: string
  requireGoogleAuth: boolean
  aGrade: string
  bGrade: string
  cGrade: string
  dGrade: string
  passingGrade: string
}

const EMPTY_SETTINGS: SettingsForm = {
  title: '', description: '', durationMinutes: '', startTime: '', endTime: '',
  showResults: true, allowNavigationBack: true, perQuestionTiming: false, timePerQuestion: '60',
  requireGoogleAuth: false,
  aGrade: '90', bGrade: '80', cGrade: '70', dGrade: '60', passingGrade: '60',
}

const fmtLocal = (s: string) => {
  const d = new Date(s)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const letters = ['A', 'B', 'C', 'D', 'E', 'F']

export function TestAuthoring({ testId: initialTestId, teacherId, initialClassId, onBack, onTestSaved, onOpenSettings, onPreview, onReports }: TestAuthoringProps) {
  const { org } = useTenant()
  const { plan } = usePlanLimits()
  const [testId, setTestId] = useState<string | undefined>(initialTestId)
  const [loading, setLoading] = useState(!!initialTestId)
  const [classId, setClassId] = useState(initialClassId || '')
  const [isPublicExam, setIsPublicExam] = useState(false)
  const [studentDetailFields, setStudentDetailFields] = useState<StudentDetailField[]>(ALL_STUDENT_DETAIL_FIELD_KEYS)
  const [testStatus, setTestStatus] = useState<string | undefined>(undefined)
  const [settings, setSettings] = useState<SettingsForm>(EMPTY_SETTINGS)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(!!initialTestId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [showBankPicker, setShowBankPicker] = useState(false)
  const [savingToBank, setSavingToBank] = useState<string | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [basicInfoOpen, setBasicInfoOpen] = useState(!initialTestId)
  const [creationStep, setCreationStep] = useState(0)
  const canAdvanceStep = () => CREATION_STEPS[creationStep].key !== 'basic' || settings.title.trim().length > 0
  const { items: bankItems, saveToBank, deleteFromBank } = useQuestionBank(teacherId)
  const { sections, addSection, updateSection, removeSection, reorderSection } = useTestSections(testId)

  const update = (key: keyof SettingsForm, value: any) => setSettings(prev => ({ ...prev, [key]: value }))

  const toggleStudentDetailField = (key: StudentDetailField) => {
    setStudentDetailFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  useEffect(() => {
    if (!initialTestId) return
    ;(async () => {
      setLoading(true)
      const { data: test } = await supabase.from('tests').select('*').eq('id', initialTestId).single<Test>()
      if (test) {
        setSettings({
          title: test.title,
          description: test.description || '',
          durationMinutes: test.duration_minutes?.toString() || '',
          startTime: test.start_time ? fmtLocal(test.start_time) : '',
          endTime: test.end_time ? fmtLocal(test.end_time) : '',
          showResults: test.show_results,
          allowNavigationBack: test.allow_navigation_back,
          perQuestionTiming: test.per_question_timing,
          timePerQuestion: '60',
          requireGoogleAuth: test.require_google_auth,
          aGrade: test.grading_config?.aGrade?.toString() || '90',
          bGrade: test.grading_config?.bGrade?.toString() || '80',
          cGrade: test.grading_config?.cGrade?.toString() || '70',
          dGrade: test.grading_config?.dGrade?.toString() || '60',
          passingGrade: test.grading_config?.passingGrade?.toString() || '60',
        })
        setClassId(test.class_id || '')
        setIsPublicExam(test.is_public_exam)
        // Pre-existing public exams from before this feature had no
        // stored selection at all (column defaults to '{}') — default
        // those to every field rather than showing "nothing collected."
        // A test that explicitly had all fields unchecked also reads as
        // an empty array; that's an acceptable, rare edge case, not worth
        // a separate "was this ever set" column just to disambiguate.
        setStudentDetailFields(
          test.is_public_exam && (!test.student_detail_fields || test.student_detail_fields.length === 0)
            ? ALL_STUDENT_DETAIL_FIELD_KEYS
            : (test.student_detail_fields || [])
        )
        setTestStatus(test.status)
      }
      setLoading(false)
      fetchQuestions(initialTestId)
    })()
  }, [initialTestId])

  const fetchQuestions = async (id: string) => {
    setQuestionsLoading(true)
    try {
      const { data: qData, error: qError } = await supabase.from('questions').select('*, question_options (*)').eq('test_id', id).order('question_order')
      if (qError) throw qError
      setQuestions((qData || []).map((q: any) => ({
        ...q,
        options: (q.question_options || []).sort((a: { option_order: number }, b: { option_order: number }) => a.option_order - b.option_order)
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setQuestionsLoading(false)
    }
  }

  const buildPayload = () => ({
    class_id: isPublicExam ? null : (classId || null),
    is_public_exam: isPublicExam,
    student_detail_fields: isPublicExam ? studentDetailFields : [],
    title: settings.title,
    description: settings.description || null,
    duration_minutes: settings.durationMinutes ? parseInt(settings.durationMinutes) : null,
    start_time: settings.startTime ? new Date(settings.startTime).toISOString() : null,
    end_time: settings.endTime ? new Date(settings.endTime).toISOString() : null,
    show_results: settings.showResults,
    allow_navigation_back: settings.allowNavigationBack,
    per_question_timing: settings.perQuestionTiming,
    require_google_auth: settings.requireGoogleAuth,
    grading_config: {
      aGrade: parseFloat(settings.aGrade),
      bGrade: parseFloat(settings.bGrade),
      cGrade: parseFloat(settings.cGrade),
      dGrade: parseFloat(settings.dGrade),
      passingGrade: parseFloat(settings.passingGrade),
    },
  })

  const handleSaveSettings = async () => {
    setSettingsError('')
    if (!settings.title.trim()) { setSettingsError('Assessment title is required'); return }
    if (settings.startTime && settings.endTime && new Date(settings.startTime) >= new Date(settings.endTime)) {
      setSettingsError('Start time must be before end time'); return
    }
    // Checked client-side first for an accurate message — the DB also
    // hard-enforces this (org_within_active_test_limit), but its rejection
    // is a generic 42501 indistinguishable from a billing-status block.
    if (!testId && plan?.max_active_tests != null && org?.id) {
      const [{ data: activeCount }, { data: addons }] = await Promise.all([
        supabase.rpc('org_active_test_count', { p_org_id: org.id }),
        supabase.from('org_capacity_addons').select('quantity, expires_at').eq('org_id', org.id).eq('status', 'active').eq('kind', 'extra_active_tests'),
      ])
      const now = Date.now()
      const extra = (addons || []).filter(a => !a.expires_at || new Date(a.expires_at).getTime() > now).reduce((s, a) => s + a.quantity, 0)
      const effectiveLimit = plan.max_active_tests + extra
      if ((activeCount ?? 0) >= effectiveLimit) {
        setSettingsError(`Your active assessment limit (${effectiveLimit}) is reached. Close an existing assessment, buy more slots from Billing, or upgrade your plan.`)
        return
      }
    }

    setSavingSettings(true)
    try {
      if (!testId) {
        const testCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        const { data, error: createError } = await supabase.from('tests').insert([{
          teacher_id: teacherId,
          test_code: testCode,
          status: isPublicExam ? 'pending_approval' : 'draft',
          ...buildPayload(),
        }]).select().single()
        if (createError) throw createError
        setTestId(data.id)
        setTestStatus(data.status)
        setBasicInfoOpen(false)
      } else {
        const { error: updateError } = await supabase.from('tests').update({
          ...buildPayload(),
          updated_at: new Date().toISOString(),
        }).eq('id', testId)
        if (updateError) throw updateError
      }
      onTestSaved()
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    } catch (err) {
      const code = (err && typeof err === 'object' && 'code' in err) ? (err as { code: string }).code : undefined
      setSettingsError(code === '42501'
        ? "New assessments are paused — either this organization's billing needs attention, or your plan's active-assessment limit has been reached. Contact your administrator."
        : err instanceof Error ? err.message : 'Failed to save assessment')
    } finally {
      setSavingSettings(false)
    }
  }

  const addQuestion = () => {
    const newQ: QuestionRow = {
      id: `new-${Date.now()}`,
      question_text: '',
      question_order: questions.length + 1,
      points: 1,
      // "Default time per question" (Behavior settings) only means something
      // once per-question timing is actually on — otherwise a new question
      // starts with no time limit, same as before.
      time_limit_seconds: settings.perQuestionTiming && settings.timePerQuestion ? parseInt(settings.timePerQuestion) : null,
      question_type: 'single_select',
      section_id: null,
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

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || swapIdx < 0 || swapIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next.map((q, i) => ({ ...q, question_order: i + 1 }))
    })
  }

  const minOptionsFor = (type: QuestionType) => type === 'short_answer' ? 1 : 2

  const updateOption = (qId: string, optId: string, field: string, value: any) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const opts = q.options.map(o => {
        if (field === 'is_correct' && value === true && q.question_type !== 'multi_select') return { ...o, is_correct: o.id === optId }
        if (o.id === optId) return { ...o, [field]: value }
        return o
      })
      return { ...q, options: opts }
    }))
  }

  const addOption = (qId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      const newOpt: QuestionOption = { id: `opt-${Date.now()}`, option_text: '', is_correct: q.question_type === 'short_answer', option_order: q.options.length + 1 }
      return { ...q, options: [...q.options, newOpt] }
    }))
  }

  const removeOption = (qId: string, optId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId || q.options.length <= minOptionsFor(q.question_type)) return q
      const filtered = q.options.filter(o => o.id !== optId)
      if (q.question_type !== 'short_answer' && filtered.every(o => !o.is_correct) && filtered.length > 0) filtered[0].is_correct = true
      return { ...q, options: filtered.map((o, i) => ({ ...o, option_order: i + 1 })) }
    }))
  }

  const changeQuestionType = (qId: string, newType: QuestionType) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q
      let options = q.options
      if (newType === 'true_false') {
        options = [
          { id: `opt-${Date.now()}-0`, option_text: 'True', is_correct: true, option_order: 1 },
          { id: `opt-${Date.now()}-1`, option_text: 'False', is_correct: false, option_order: 2 },
        ]
      } else if (newType === 'short_answer') {
        options = q.options.filter(o => o.option_text.trim()).map((o, i) => ({ ...o, is_correct: true, option_order: i + 1 }))
        if (options.length === 0) options = [{ id: `opt-${Date.now()}`, option_text: '', is_correct: true, option_order: 1 }]
      } else if (q.question_type === 'true_false' || q.question_type === 'short_answer') {
        options = [
          { id: `opt-${Date.now()}-0`, option_text: '', is_correct: true, option_order: 1 },
          { id: `opt-${Date.now()}-1`, option_text: '', is_correct: false, option_order: 2 },
          { id: `opt-${Date.now()}-2`, option_text: '', is_correct: false, option_order: 3 },
          { id: `opt-${Date.now()}-3`, option_text: '', is_correct: false, option_order: 4 },
        ]
      }
      return { ...q, question_type: newType, options }
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
    const newQuestions: QuestionRow[] = []
    let currentQ: QuestionRow | null = null
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (/^(\d+)[.)]\s+/.test(trimmed)) {
        if (currentQ) newQuestions.push(currentQ)
        const qText = trimmed.replace(/^(\d+)[.)]\s+/, '')
        currentQ = { id: `new-${Date.now()}-${newQuestions.length}`, question_text: qText, question_order: questions.length + newQuestions.length + 1, points: 1, time_limit_seconds: settings.perQuestionTiming && settings.timePerQuestion ? parseInt(settings.timePerQuestion) : null, question_type: 'single_select', section_id: null, isNew: true, options: [] }
      } else if (/^Type:\s*/i.test(trimmed) && currentQ) {
        const t = trimmed.replace(/^Type:\s*/i, '').trim().toLowerCase().replace(/[^a-z_]/g, '')
        if ((['single_select', 'multi_select', 'true_false', 'short_answer'] as string[]).includes(t)) currentQ.question_type = t as QuestionType
      } else if (/^=\s*/.test(trimmed) && currentQ) {
        const ansText = trimmed.replace(/^=\s*/, '').trim()
        currentQ.options.push({ id: `opt-${Date.now()}-${currentQ.options.length}`, option_text: ansText, is_correct: true, option_order: currentQ.options.length + 1 })
      } else if (/^[A-E][.)]\s+/.test(trimmed) && currentQ) {
        const isCorrect = trimmed.includes('*') || trimmed.startsWith('A.')
        const optText = trimmed.replace(/^[A-E][.)]\s+/, '').replace('*', '').trim()
        currentQ.options.push({ id: `opt-${Date.now()}-${currentQ.options.length}`, option_text: optText, is_correct: isCorrect, option_order: currentQ.options.length + 1 })
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

  const saveQuestionToBank = async (question: QuestionRow) => {
    if (!question.question_text.trim() || question.options.length < 2) {
      setError('Add question text and at least 2 options before saving to the bank')
      return
    }
    setSavingToBank(question.id)
    try {
      await saveToBank({
        teacherId,
        questionText: question.question_text,
        points: question.points,
        questionType: question.question_type,
        options: question.options.map((o, i) => ({ option_text: o.option_text, is_correct: o.is_correct, option_order: i + 1 })),
      })
      setSuccess('Saved to question bank')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to bank')
    } finally {
      setSavingToBank(null)
    }
  }

  const importFromBank = (bankItemIds: string[]) => {
    const toImport = bankItems.filter(b => bankItemIds.includes(b.id))
    const newQuestions: QuestionRow[] = toImport.map((b, i) => ({
      id: `new-${Date.now()}-${i}`,
      question_text: b.question_text,
      question_order: questions.length + i + 1,
      points: b.points,
      time_limit_seconds: settings.perQuestionTiming && settings.timePerQuestion ? parseInt(settings.timePerQuestion) : null,
      question_type: b.question_type || 'single_select',
      section_id: null,
      isNew: true,
      options: (b.options || []).map((o, oi) => ({ id: `opt-${Date.now()}-${i}-${oi}`, option_text: o.option_text, is_correct: o.is_correct, option_order: oi + 1 })),
    }))
    setQuestions(prev => [...prev, ...newQuestions])
    setShowBankPicker(false)
    setSuccess(`${newQuestions.length} question(s) added from bank`)
    setTimeout(() => setSuccess(''), 3000)
  }

  const downloadTemplate = () => {
    const tmpl = `1. What is 2 + 2?
A. 3
B. 4*
C. 5
D. 6

2. Which planet is closest to the Sun?
Type: multi_select
A. Mercury*
B. Venus
C. Earth
D. Mars

3. The Earth is flat.
Type: true_false
A. True
B. False*

4. What is the capital of France?
Type: short_answer
= Paris
= paris

Note: Mark correct answers with * or put correct answer first (A.). Optional
"Type:" line sets the question type (single_select, multi_select, true_false,
short_answer) — omit it for single_select. short_answer questions use "="
lines instead of "A./B." lines, one per acceptable answer.
`
    const blob = new Blob([tmpl], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'question_template.txt'
    a.click()
  }

  const saveAll = async () => {
    if (!testId) return
    setError('')
    setSuccess('')
    for (const q of questions) {
      if (!q.question_text.trim()) { setError('All questions must have text'); return }
      const minOpts = minOptionsFor(q.question_type)
      if (q.options.length < minOpts) {
        setError(q.question_type === 'short_answer' ? 'Each short-answer question needs at least 1 acceptable answer' : 'Each question needs at least 2 options')
        return
      }
      if (q.options.some(o => !o.option_text.trim())) { setError('All options must have text'); return }
      if (!q.options.some(o => o.is_correct)) { setError('Each question must have at least one correct answer'); return }
    }
    setSaving(true)
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const qData = { test_id: testId, question_text: q.question_text, question_order: i + 1, points: q.points, time_limit_seconds: q.time_limit_seconds, question_type: q.question_type, section_id: q.section_id }
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
      onTestSaved()
      setTimeout(() => setSuccess(''), 2000)
      if (testId) fetchQuestions(testId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save questions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink truncate">{settings.title || 'New assessment'}</p>
            <p className="text-xs text-ink-faint">{testId ? `${questions.length} question${questions.length !== 1 ? 's' : ''}` : 'Not saved yet'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {testId && testStatus === 'live' && onPreview && (
            <Button variant="outline" size="sm" onClick={() => onPreview(testId)}>
              <Eye className="w-4 h-4" /><span className="hidden sm:inline">Preview</span>
            </Button>
          )}
          {testId && onReports && (
            <Button variant="outline" size="sm" onClick={() => onReports(testId)}>
              <BarChart3 className="w-4 h-4" /><span className="hidden sm:inline">Reports</span>
            </Button>
          )}
          {testId && onOpenSettings && (
            <Button variant="outline" size="sm" onClick={() => onOpenSettings(testId)}>
              <SettingsIcon className="w-4 h-4" /><span className="hidden sm:inline">Settings</span>
            </Button>
          )}
        </div>
      </div>

      {!testId ? (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center">
            {CREATION_STEPS.map(({ key, label }, i) => (
              <div key={key} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0 ${
                    i < creationStep ? 'bg-emerald-500 text-white' :
                    i === creationStep ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]' :
                    'bg-surface-2 text-ink-muted'
                  }`}>
                    {i < creationStep ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm font-medium ${i === creationStep ? 'text-[var(--brand-primary)]' : 'text-ink-muted'}`}>{label}</span>
                </div>
                {i < CREATION_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 rounded ${i < creationStep ? 'bg-emerald-400' : 'bg-surface-2'}`} />}
              </div>
            ))}
          </div>

          {creationStep === 0 && (
            <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft mb-1">
                <FileText className="w-4 h-4 text-[var(--brand-primary)]" />Basic Info
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-app bg-app cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublicExam}
                  onChange={(e) => setIsPublicExam(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">Public exam (hiring, onboarding — no enrolled class)</span>
                  <span className="block text-xs text-ink-faint mt-0.5">Open to an unknown number of outside participants. Requires your org admin's approval before it can go live.</span>
                </span>
              </label>
              {isPublicExam && (
                <div className="p-3 rounded-xl border border-app bg-app">
                  <p className="text-sm font-medium text-ink mb-0.5">Student details to collect</p>
                  <p className="text-xs text-ink-faint mb-3">Every student already gives name, email and phone. Choose any extra fields this exam needs.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STUDENT_DETAIL_FIELDS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studentDetailFields.includes(key)}
                          onChange={() => toggleStudentDetailField(key)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {!isPublicExam && <ClassPicker teacherId={teacherId} value={classId} onChange={setClassId} />}
              <Input
                label="Assessment Title *"
                placeholder="e.g. Midterm Mathematics Exam"
                value={settings.title}
                onChange={(e) => update('title', e.target.value)}
                required
              />
              <Input
                label="Description"
                placeholder="Brief description (optional)"
                value={settings.description}
                onChange={(e) => update('description', e.target.value)}
              />
              <Input
                label="Duration (minutes)"
                type="number"
                placeholder="Leave empty for no time limit"
                value={settings.durationMinutes}
                onChange={(e) => update('durationMinutes', e.target.value)}
                min="1"
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Start Time"
                  type="datetime-local"
                  value={settings.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                />
                <Input
                  label="End Time"
                  type="datetime-local"
                  value={settings.endTime}
                  onChange={(e) => update('endTime', e.target.value)}
                />
              </div>
            </div>
          )}

          {creationStep === 1 && (
            <BehaviorFields values={settings} onChange={update} classId={classId || undefined} />
          )}

          {creationStep === 2 && (
            <GradingFields values={settings} onChange={update} />
          )}

          {settingsError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{settingsError}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setCreationStep(s => Math.max(0, s - 1))} disabled={creationStep === 0}>
              Back
            </Button>
            {creationStep < CREATION_STEPS.length - 1 ? (
              <Button onClick={() => canAdvanceStep() && setCreationStep(s => s + 1)} disabled={!canAdvanceStep()}>
                Continue<ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSaveSettings} loading={savingSettings}>
                <Save className="w-4 h-4" />Create Assessment
              </Button>
            )}
          </div>
        </div>
      ) : (
      <div className={!basicInfoOpen ? 'space-y-6' : 'grid lg:grid-cols-[380px_1fr] gap-6 items-start'}>
        {/* Basic info */}
        <div className={!basicInfoOpen ? 'grid sm:grid-cols-2 gap-4 items-start' : 'lg:sticky lg:top-24 space-y-4'}>
          <div className="bg-surface rounded-2xl border border-app shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setBasicInfoOpen(v => !v)}
              className={`w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 text-left ${!basicInfoOpen ? '' : 'border-b border-app'}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-ink-soft min-w-0">
                <FileText className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                {!basicInfoOpen ? (
                  <span className="truncate">Basic Info — {settings.title}</span>
                ) : 'Basic Info'}
              </span>
              <ArrowRight className={`w-4 h-4 text-ink-muted shrink-0 transition-transform duration-200 ${basicInfoOpen ? 'rotate-90' : ''}`} />
            </button>
            {basicInfoOpen && (
              <div className="px-5 sm:px-6 py-5 space-y-4">
                <ClassPicker teacherId={teacherId} value={classId} onChange={setClassId} />
                <Input
                  label="Assessment Title *"
                  placeholder="e.g. Midterm Mathematics Exam"
                  value={settings.title}
                  onChange={(e) => update('title', e.target.value)}
                  required
                />
                <Input
                  label="Description"
                  placeholder="Brief description (optional)"
                  value={settings.description}
                  onChange={(e) => update('description', e.target.value)}
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  placeholder="Leave empty for no time limit"
                  value={settings.durationMinutes}
                  onChange={(e) => update('durationMinutes', e.target.value)}
                  min="1"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Start Time"
                    type="datetime-local"
                    value={settings.startTime}
                    onChange={(e) => update('startTime', e.target.value)}
                  />
                  <Input
                    label="End Time"
                    type="datetime-local"
                    value={settings.endTime}
                    onChange={(e) => update('endTime', e.target.value)}
                  />
                </div>
                {settingsError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm text-red-600">{settingsError}</p>
                  </div>
                )}
                {settingsSaved && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-sm text-emerald-700 font-medium">Saved</p>
                  </div>
                )}
                <Button onClick={handleSaveSettings} loading={savingSettings} className="w-full">
                  <Save className="w-4 h-4" />Save Details
                </Button>
              </div>
            )}
          </div>

          {onOpenSettings && (
            <button
              onClick={() => onOpenSettings(testId)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--brand-primary-soft)] bg-[var(--brand-primary-soft)] hover:brightness-95 transition-all text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
                  <SettingsIcon className="w-4 h-4 text-[var(--brand-primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--brand-primary-darker)]">Test Settings</p>
                  <p className="text-xs text-[var(--brand-primary-dark)]">Results, timing, Google sign-in gate, grading</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
            </button>
          )}
        </div>

        {/* Questions — only exists once the assessment is saved */}
        {testId && (
          <div>
            {questionsLoading ? (
            <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
          ) : (
            <>
              <SectionsPanel
                sections={sections}
                onAdd={addSection}
                onUpdate={updateSection}
                onDelete={removeSection}
                onReorder={reorderSection}
              />

              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="text-sm font-semibold text-ink-soft">Questions ({questions.length})</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setShowBankPicker(true)}>
                    <Library className="w-4 h-4" /><span className="hidden sm:inline">From Bank</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowBulkInput(!showBulkInput)}>
                    <Upload className="w-4 h-4" /><span className="hidden sm:inline">Bulk Import</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4" /><span className="hidden sm:inline">Template</span>
                  </Button>
                </div>
              </div>

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

              {showBulkInput && (
                <div className="mb-6 bg-surface rounded-2xl border border-app shadow-sm p-6">
                  <h3 className="text-base font-semibold text-ink mb-2">Bulk Import Questions</h3>
                  <p className="text-xs text-ink-faint mb-4">
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

              <div className="space-y-4">
                {questions.map((question, qi) => {
                  const isExpanded = expandedQuestion === question.id
                  const questionSection = sections.find(s => s.id === question.section_id)
                  return (
                    <div key={question.id} id={`q-${question.id}`} className="bg-surface rounded-2xl border border-app shadow-sm overflow-hidden">
                      <div className="w-full flex items-center gap-2 px-5 sm:px-6 py-4 hover:bg-surface-2 transition-colors">
                        <div className="flex flex-col gap-0 shrink-0">
                          <button type="button" disabled={qi === 0} onClick={(e) => { e.stopPropagation(); moveQuestion(question.id, 'up') }} className="p-0.5 text-ink-muted hover:text-ink-soft disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" disabled={qi === questions.length - 1} onClick={(e) => { e.stopPropagation(); moveQuestion(question.id, 'down') }} className="p-0.5 text-ink-muted hover:text-ink-soft disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                          className="flex-1 flex items-center gap-4 min-w-0 text-left"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <GripVertical className="w-4 h-4 text-ink-muted shrink-0" />
                            <div className="w-7 h-7 rounded-lg bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] flex items-center justify-center text-xs font-bold shrink-0">
                              {qi + 1}
                            </div>
                            <p className={`text-sm font-medium truncate ${question.question_text ? 'text-ink' : 'text-ink-muted italic'}`}>
                              {question.question_text || 'New Question'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {questionSection && (
                              <span className="badge bg-surface-2 text-ink-soft text-xs hidden sm:inline-flex">
                                {questionSection.title}
                              </span>
                            )}
                            {question.question_type !== 'single_select' && (
                              <span className="badge bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] text-xs hidden sm:inline-flex">
                                {QUESTION_TYPE_LABEL[question.question_type]}
                              </span>
                            )}
                            <span className="text-xs text-ink-faint hidden sm:block">{question.points} pt{question.points !== 1 ? 's' : ''}</span>
                            <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                          </div>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-app px-5 sm:px-6 py-6 space-y-5">
                          <div className="grid sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-medium text-ink-soft mb-1.5">Question Text *</label>
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

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-ink-soft mb-1.5">Question Type</label>
                              <select
                                value={question.question_type}
                                onChange={(e) => changeQuestionType(question.id, e.target.value as QuestionType)}
                                className="input-base w-full"
                              >
                                {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map(t => (
                                  <option key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</option>
                                ))}
                              </select>
                            </div>
                            {sections.length > 0 && (
                              <div>
                                <label className="block text-sm font-medium text-ink-soft mb-1.5">Section</label>
                                <select
                                  value={question.section_id || ''}
                                  onChange={(e) => updateQuestion(question.id, 'section_id', e.target.value || null)}
                                  className="input-base w-full"
                                >
                                  <option value="">No section</option>
                                  {sections.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-ink-soft mb-3">
                              {question.question_type === 'short_answer' ? 'Acceptable Answers *' : 'Answer Options *'}
                            </p>
                            <div className="space-y-2.5">
                              {question.options.map((opt, oi) => {
                                const isShortAnswer = question.question_type === 'short_answer'
                                const isTrueFalse = question.question_type === 'true_false'
                                const isMultiSelect = question.question_type === 'multi_select'
                                return (
                                <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${opt.is_correct && !isShortAnswer ? 'border-emerald-300 bg-emerald-50' : 'border-app'}`}>
                                  {!isShortAnswer && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${opt.is_correct ? 'bg-emerald-500 text-white' : 'bg-surface-2 text-ink-faint'}`}>
                                        {letters[oi]}
                                      </span>
                                      <input
                                        type={isMultiSelect ? 'checkbox' : 'radio'}
                                        name={isMultiSelect ? undefined : `correct-${question.id}`}
                                        checked={opt.is_correct}
                                        disabled={isTrueFalse}
                                        onChange={() => updateOption(question.id, opt.id, 'is_correct', isMultiSelect ? !opt.is_correct : true)}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                        title="Mark as correct"
                                      />
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    value={opt.option_text}
                                    onChange={(e) => updateOption(question.id, opt.id, 'option_text', e.target.value)}
                                    placeholder={isShortAnswer ? `Acceptable answer ${oi + 1}` : `Option ${letters[oi]}`}
                                    readOnly={isTrueFalse}
                                    className={`flex-1 text-sm border-0 bg-transparent focus:outline-none text-ink placeholder-[var(--ink-muted)] ${isTrueFalse ? 'opacity-70' : ''}`}
                                  />
                                  {!isTrueFalse && question.options.length > minOptionsFor(question.question_type) && (
                                    <button onClick={() => removeOption(question.id, opt.id)} className="p-1 text-ink-muted hover:text-red-500 transition-colors shrink-0">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )})}
                            </div>

                            {question.question_type !== 'true_false' && (
                              <div className="flex items-center justify-between mt-3">
                                <button
                                  onClick={() => addOption(question.id)}
                                  disabled={question.options.length >= 6}
                                  className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Plus className="w-4 h-4" />{question.question_type === 'short_answer' ? 'Add Acceptable Answer' : 'Add Option'}
                                </button>
                                <p className="text-xs text-ink-muted">
                                  {question.question_type === 'multi_select' ? 'Check all correct answers' :
                                   question.question_type === 'short_answer' ? "Matches if the student's answer equals any of these (case-insensitive)" :
                                   'Select radio button to mark correct answer'}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-app">
                            <Button variant="outline" size="sm" onClick={() => saveQuestionToBank(question)} loading={savingToBank === question.id}>
                              <BookMarked className="w-3.5 h-3.5" />Save to Bank
                            </Button>
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

              <button
                onClick={addQuestion}
                className="mt-4 w-full p-5 rounded-2xl border-2 border-dashed border-app hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] transition-all text-ink-muted hover:text-[var(--brand-primary)] flex items-center justify-center gap-2"
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
                <div className="mt-4 bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-ink-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-ink mb-2">No Questions Yet</h3>
                  <p className="text-ink-faint text-sm mb-4">Add questions manually or use bulk import</p>
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
            </>
            )}
          </div>
        )}
      </div>
      )}

      <QuestionBankPicker
        isOpen={showBankPicker}
        items={bankItems}
        onClose={() => setShowBankPicker(false)}
        onImport={importFromBank}
        onDelete={deleteFromBank}
      />
    </div>
  )
}
