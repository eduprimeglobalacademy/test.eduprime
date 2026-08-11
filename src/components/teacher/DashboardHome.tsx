import { useState, useEffect } from 'react'
import { Play, Clock, CheckCircle2, Copy, Calendar, BarChart3, Plus, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/utils'
import { classLabel } from '../../hooks/useClasses'
import { Button } from '../ui/Button'
import type { Test } from '../../lib/supabase'

interface DashboardHomeProps {
  tests: Test[]
  onGoToClasses: () => void
  onCreateAssessment: () => void
  onReports: (testId: string) => void
}

export function DashboardHome({ tests, onGoToClasses, onCreateAssessment, onReports }: DashboardHomeProps) {
  const draft = tests.filter(t => t.status === 'draft')
  const live = tests.filter(t => t.status === 'live')
  const closed = tests.filter(t => t.status === 'closed')

  const now = Date.now()
  const upcoming = tests
    .filter(t => t.status !== 'closed' && t.start_time && new Date(t.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())
    .slice(0, 5)
  const recentlyCompleted = [...closed]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4)

  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (live.length === 0) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(live.map(async (t) => {
        const { count } = await supabase.from('test_attempts').select('id', { count: 'exact', head: true }).eq('test_id', t.id)
        return [t.id, count || 0] as const
      }))
      if (!cancelled) setSubmissionCounts(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [live.map(t => t.id).join(',')])

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (tests.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
        <Layers className="w-10 h-10 text-ink-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-ink mb-2">Welcome — let's set up your first class</h3>
        <p className="text-ink-faint text-sm mb-4">Assessments are organized inside classes. Create one to get started.</p>
        <Button onClick={onGoToClasses}><Plus className="w-4 h-4" />Go to Classes</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Draft', value: draft.length, icon: Clock, color: 'bg-amber-100 text-amber-600' },
          { label: 'Live now', value: live.length, icon: Play, color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Completed', value: closed.length, icon: CheckCircle2, color: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]' },
          { label: 'Total', value: tests.length, icon: Layers, color: 'bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary)]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-ink-faint font-medium">{label}</p>
                <p className="text-2xl font-bold font-display text-ink">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live now */}
      <div>
        <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-600" />Live now
        </h3>
        {live.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-app shadow-sm p-8 text-center text-sm text-ink-faint">
            Nothing is live right now.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {live.map(t => (
              <div key={t.id} className="bg-surface rounded-2xl border border-app shadow-sm p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-ink truncate">{t.title}</h4>
                  <span className="badge text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">Live</span>
                </div>
                {t.classes && <p className="text-xs text-ink-faint mb-3">{classLabel(t.classes)}</p>}
                <div className="flex items-center justify-between gap-2 bg-[var(--brand-primary-soft)] rounded-lg px-3 py-2 mb-3">
                  <code className="text-sm font-mono font-bold text-[var(--brand-primary-dark)] tracking-widest">{t.test_code}</code>
                  <button onClick={() => copyCode(t.test_code, t.id)} className="text-[var(--brand-primary)]" title="Copy join code">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copiedId === t.id && <p className="text-xs text-emerald-600 -mt-2 mb-2">Copied!</p>}
                <p className="text-xs text-ink-muted">{submissionCounts[t.id] ?? '…'} submission{submissionCounts[t.id] === 1 ? '' : 's'} so far</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div>
          <h3 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />Upcoming
          </h3>
          {upcoming.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-app shadow-sm p-6 text-center text-sm text-ink-faint">
              Nothing scheduled. <button onClick={onCreateAssessment} className="text-[var(--brand-primary)] font-medium hover:underline">Create an assessment</button> with a start time to see it here.
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-app shadow-sm divide-y divide-app">
              {upcoming.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{t.title}</p>
                    <p className="text-xs text-ink-faint">{t.classes ? classLabel(t.classes) : 'One-off assessment'}</p>
                  </div>
                  <span className="text-xs text-ink-muted shrink-0">{formatDateTime(t.start_time!)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently completed */}
        <div>
          <h3 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--brand-primary)]" />Recently completed
          </h3>
          {recentlyCompleted.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-app shadow-sm p-6 text-center text-sm text-ink-faint">
              Nothing closed out yet.
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-app shadow-sm divide-y divide-app">
              {recentlyCompleted.map(t => (
                <button
                  key={t.id}
                  onClick={() => onReports(t.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-app transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{t.title}</p>
                    <p className="text-xs text-ink-faint">{t.classes ? classLabel(t.classes) : 'One-off assessment'}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-[var(--brand-primary)] font-medium shrink-0">
                    <BarChart3 className="w-3.5 h-3.5" />Reports
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
