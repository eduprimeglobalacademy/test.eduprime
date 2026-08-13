import { useState } from 'react'
import { Copy, ExternalLink, Calendar, Clock, Play, XCircle, RotateCcw, Layers, Hourglass, Files } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/utils'
import { classLabel } from '../../hooks/useClasses'
import { Button } from '../ui/Button'
import type { Test } from '../../lib/supabase'

interface TestListProps {
  tests: Test[]
  onTestUpdated: () => void
  onEdit: (test: Test) => void
}

export function TestList({ tests, onTestUpdated, onEdit }: TestListProps) {
  const [copying, setCopying] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState('')
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [duplicateError, setDuplicateError] = useState('')

  // Clones a test's settings, sections, and questions/options into a new
  // draft (or pending_approval, matching the same public-exam gate a fresh
  // "New Assessment" would hit) — never the original's code, timing window,
  // or approval state, since those are specific to that one run.
  const handleDuplicate = async (e: React.MouseEvent, test: Test) => {
    e.stopPropagation()
    setDuplicateError('')
    setDuplicating(test.id)
    try {
      const testCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { data: newTest, error: testError } = await supabase.from('tests').insert([{
        teacher_id: test.teacher_id,
        class_id: test.class_id || null,
        title: `${test.title} (Copy)`,
        description: test.description || null,
        test_code: testCode,
        status: test.is_public_exam ? 'pending_approval' : 'draft',
        duration_minutes: test.duration_minutes ?? null,
        show_results: test.show_results,
        allow_navigation_back: test.allow_navigation_back,
        per_question_timing: test.per_question_timing,
        require_google_auth: test.require_google_auth,
        is_public_exam: test.is_public_exam,
        student_detail_fields: test.student_detail_fields ?? [],
        grading_config: test.grading_config ?? null,
      }]).select().single()
      if (testError) throw testError

      const { data: sections } = await supabase.from('test_sections').select('*').eq('test_id', test.id).order('section_order')
      const sectionIdMap: Record<string, string> = {}
      if (sections && sections.length > 0) {
        const { data: newSections, error: secError } = await supabase.from('test_sections').insert(
          sections.map(s => ({
            test_id: newTest.id, title: s.title, section_order: s.section_order,
            timing_mode: s.timing_mode, duration_minutes: s.duration_minutes, allow_free_navigation: s.allow_free_navigation,
          }))
        ).select()
        if (secError) throw secError
        sections.forEach((s, i) => { sectionIdMap[s.id] = newSections![i].id })
      }

      const { data: questions, error: qFetchError } = await supabase
        .from('questions').select('*, question_options (*)').eq('test_id', test.id).order('question_order')
      if (qFetchError) throw qFetchError
      for (const q of questions || []) {
        const { data: newQ, error: qError } = await supabase.from('questions').insert([{
          test_id: newTest.id, question_text: q.question_text, question_order: q.question_order,
          points: q.points, time_limit_seconds: q.time_limit_seconds, question_type: q.question_type,
          section_id: q.section_id ? sectionIdMap[q.section_id] ?? null : null,
        }]).select().single()
        if (qError) throw qError
        const opts = q.question_options || []
        if (opts.length > 0) {
          const { error: optError } = await supabase.from('question_options').insert(
            opts.map((o: { option_text: string; is_correct: boolean; option_order: number }) => ({
              question_id: newQ.id, option_text: o.option_text, is_correct: o.is_correct, option_order: o.option_order,
            }))
          )
          if (optError) throw optError
        }
      }

      onTestUpdated()
      onEdit(newTest)
    } catch (err) {
      const code = (err && typeof err === 'object' && 'code' in err) ? (err as { code: string }).code : undefined
      setDuplicateError(code === '42501'
        ? "Can't duplicate — you're at your plan's active assessment limit. Close an existing assessment, buy more slots from Billing, or upgrade your plan."
        : err instanceof Error ? err.message : 'Could not duplicate this assessment.')
    } finally {
      setDuplicating(null)
    }
  }

  const handleToggleStatus = async (e: React.MouseEvent, test: Test) => {
    e.stopPropagation()
    setToggleError('')
    const newStatus = test.status === 'draft' ? 'live' : test.status === 'live' ? 'closed' : 'draft'
    const { error } = await supabase.from('tests').update({ status: newStatus }).eq('id', test.id)
    if (error) {
      const code = (error && typeof error === 'object' && 'code' in error) ? (error as { code: string }).code : undefined
      setToggleError(code === '42501'
        ? "Can't reactivate — you're at your plan's active test limit. Close another test, buy more slots from Billing, or upgrade your plan."
        : 'Could not update this test. Please try again.')
      return
    }
    onTestUpdated()
  }

  const copyToClipboard = async (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopying(key)
    setTimeout(() => setCopying(null), 1500)
  }

  const statusConfig = {
    draft: { label: 'Draft', cls: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
    live: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: Play },
    closed: { label: 'Completed', cls: 'bg-surface-2 text-ink-soft border border-app', icon: XCircle },
    pending_approval: { label: 'Pending Approval', cls: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Hourglass },
  }

  return (
    <div>
      {(toggleError || duplicateError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{toggleError || duplicateError}</div>
      )}
      <div className="grid lg:grid-cols-2 gap-4 items-start">
      {tests.map(test => {
        const { label, cls, icon: StatusIcon } = statusConfig[test.status as keyof typeof statusConfig] || statusConfig.draft
        return (
          <div
            key={test.id}
            role="button"
            tabIndex={0}
            onClick={() => onEdit(test)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onEdit(test)}
            className="text-left bg-surface rounded-2xl border border-app shadow-sm hover:shadow-md hover:border-app-strong transition-all overflow-hidden cursor-pointer"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-semibold text-ink">{test.title}</h3>
                    <span className={`badge text-xs ${cls} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {label}
                    </span>
                    {test.classes && (
                      <span className="badge text-xs bg-surface-2 text-ink-faint border border-app flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {classLabel(test.classes)}
                        {test.classes.grade_level ? ` · ${test.classes.grade_level}` : ''}
                      </span>
                    )}
                  </div>
                  {test.description && <p className="text-sm text-ink-faint line-clamp-2 mb-3">{test.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateTime(test.created_at)}
                    </span>
                    {test.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {test.duration_minutes} min
                      </span>
                    )}
                    {test.start_time && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Start: {formatDateTime(test.start_time)}</span>}
                    {test.end_time && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />End: {formatDateTime(test.end_time)}</span>}
                  </div>
                </div>
              </div>

              {test.status === 'live' && (
                <div className="bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-soft)] rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-[var(--brand-primary-darker)] mb-3">Share with Learners</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-surface rounded-lg border border-[var(--brand-primary-soft)] p-2">
                      <code className="text-sm font-mono text-[var(--brand-primary-dark)] flex-1 font-bold tracking-widest">{test.test_code}</code>
                      <button
                        onClick={(e) => copyToClipboard(e, test.test_code, `code-${test.id}`)}
                        className="p-1.5 hover:bg-[var(--brand-primary-soft)] rounded-lg transition-colors text-[var(--brand-primary)]"
                        title="Copy code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-[var(--brand-primary)] font-medium">Code</span>
                    </div>
                    <div className="flex items-center gap-2 bg-surface rounded-lg border border-[var(--brand-primary-soft)] p-2">
                      <span className="text-xs font-mono text-[var(--brand-primary)] flex-1 truncate">{window.location.origin}/assessment</span>
                      <button
                        onClick={(e) => copyToClipboard(e, `${window.location.origin}/assessment`, `link-${test.id}`)}
                        className="p-1.5 hover:bg-[var(--brand-primary-soft)] rounded-lg transition-colors text-[var(--brand-primary)]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(`${window.location.origin}/assessment`, '_blank') }}
                        className="p-1.5 hover:bg-[var(--brand-primary-soft)] rounded-lg transition-colors text-[var(--brand-primary)]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {copying && <p className="text-xs text-emerald-600 mt-2">Copied!</p>}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={duplicating === test.id}
                  onClick={(e) => handleDuplicate(e, test)}
                  title="Duplicate this assessment"
                >
                  <Files className="w-3.5 h-3.5" />Duplicate
                </Button>
                {test.status === 'pending_approval' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <Hourglass className="w-3.5 h-3.5" />Awaiting admin approval
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant={test.status === 'draft' ? 'primary' : test.status === 'live' ? 'danger' : 'secondary'}
                    onClick={(e) => handleToggleStatus(e, test)}
                  >
                    {test.status === 'draft' && <><Play className="w-3.5 h-3.5" />Activate</>}
                    {test.status === 'live' && <><XCircle className="w-3.5 h-3.5" />Close</>}
                    {test.status === 'closed' && <><RotateCcw className="w-3.5 h-3.5" />Reactivate</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
