import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Settings, GraduationCap, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { BlockedStudentsPanel } from './BlockedStudentsPanel'
import type { Test } from '../../lib/supabase'

interface TestSettingsProps {
  testId: string
  onBack: () => void
  onSaved: () => void
}

interface Form {
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

export function TestSettings({ testId, onBack, onSaved }: TestSettingsProps) {
  const [test, setTest] = useState<Test | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await supabase.from('tests').select('*').eq('id', testId).single<Test>()
      if (data) {
        setTest(data)
        setForm({
          showResults: data.show_results,
          allowNavigationBack: data.allow_navigation_back,
          perQuestionTiming: data.per_question_timing,
          timePerQuestion: '60',
          requireGoogleAuth: data.require_google_auth,
          aGrade: data.grading_config?.aGrade?.toString() || '90',
          bGrade: data.grading_config?.bGrade?.toString() || '80',
          cGrade: data.grading_config?.cGrade?.toString() || '70',
          dGrade: data.grading_config?.dGrade?.toString() || '60',
          passingGrade: data.grading_config?.passingGrade?.toString() || '60',
        })
      }
      setLoading(false)
    })()
  }, [testId])

  const update = (key: keyof Form, value: any) => setForm(prev => prev ? { ...prev, [key]: value } : prev)

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const { error: updateError } = await supabase.from('tests').update({
        show_results: form.showResults,
        allow_navigation_back: form.allowNavigationBack,
        per_question_timing: form.perQuestionTiming,
        require_google_auth: form.requireGoogleAuth,
        grading_config: {
          aGrade: parseFloat(form.aGrade),
          bGrade: parseFloat(form.bGrade),
          cGrade: parseFloat(form.cGrade),
          dGrade: parseFloat(form.dGrade),
          passingGrade: parseFloat(form.passingGrade),
        },
        updated_at: new Date().toISOString(),
      }).eq('id', testId)
      if (updateError) throw updateError
      onSaved()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4" />Back
        </Button>
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{test?.title}</p>
          <p className="text-xs text-ink-faint">Test Settings</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <Settings className="w-4 h-4 text-[var(--brand-primary)]" />Assessment Behavior
        </div>
        {[
          { key: 'showResults' as const, label: 'Show results to students after submission', desc: 'Students will see their score, grade, and question review' },
          { key: 'allowNavigationBack' as const, label: 'Allow backward navigation', desc: 'Students can go back to previous questions during the test' },
        ].map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-app transition-colors">
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => update(key, e.target.checked)}
              className="w-4 h-4 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-ink-soft">{label}</p>
              <p className="text-xs text-ink-faint mt-0.5">{desc}</p>
            </div>
          </label>
        ))}
        <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-app transition-colors">
          <input
            type="checkbox"
            checked={form.perQuestionTiming}
            onChange={(e) => update('perQuestionTiming', e.target.checked)}
            className="w-4 h-4 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-ink-soft">Per-question timing</p>
            <p className="text-xs text-ink-faint mt-0.5">Each question has its own timer. Questions auto-advance when time expires.</p>
          </div>
        </label>
        {form.perQuestionTiming && (
          <div className="ml-7">
            <Input
              label="Default time per question (seconds)"
              type="number"
              min="5"
              value={form.timePerQuestion}
              onChange={(e) => update('timePerQuestion', e.target.value)}
            />
          </div>
        )}
        <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-app transition-colors">
          <input
            type="checkbox"
            checked={form.requireGoogleAuth}
            onChange={(e) => update('requireGoogleAuth', e.target.checked)}
            className="w-4 h-4 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-ink-soft">Require Google sign-in before entry</p>
            <p className="text-xs text-ink-faint mt-0.5">
              Students must sign in with Google before entering the code.{' '}
              {test?.class_id
                ? "They'll also need to be enrolled in this class's roster (share the enrollment link from the class page)."
                : 'This assessment has no class, so only identity is checked — there\'s no roster to enroll in.'}
              {' '}You can block specific students below, for this assessment only.
            </p>
          </div>
        </label>
        {form.requireGoogleAuth && (
          <div className="ml-7 pt-1">
            <BlockedStudentsPanel testId={testId} classId={test?.class_id || undefined} />
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <GraduationCap className="w-4 h-4 text-[var(--brand-primary)]" />Grade Boundaries (%)
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'aGrade' as const, label: 'A minimum' },
            { key: 'bGrade' as const, label: 'B minimum' },
            { key: 'cGrade' as const, label: 'C minimum' },
            { key: 'dGrade' as const, label: 'D minimum' },
          ].map(({ key, label }) => (
            <Input
              key={key}
              label={label}
              type="number"
              min="0"
              max="100"
              value={form[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          ))}
        </div>
        <Input
          label="Passing grade minimum (%)"
          type="number"
          min="0"
          max="100"
          value={form.passingGrade}
          onChange={(e) => update('passingGrade', e.target.value)}
          helper="Scores below this are considered failing (F)"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={saving}><Save className="w-4 h-4" />Save Settings</Button>
        {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="w-4 h-4" />Saved</span>}
      </div>
    </div>
  )
}
