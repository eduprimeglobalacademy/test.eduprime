import { useState } from 'react'
import { Copy, ExternalLink, Calendar, Clock, Play, XCircle, RotateCcw, Layers } from 'lucide-react'
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

  const handleToggleStatus = async (e: React.MouseEvent, test: Test) => {
    e.stopPropagation()
    const newStatus = test.status === 'draft' ? 'live' : test.status === 'live' ? 'closed' : 'draft'
    const { error } = await supabase.from('tests').update({ status: newStatus }).eq('id', test.id)
    if (!error) onTestUpdated()
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
  }

  return (
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

              <div className="flex items-center justify-end">
                <Button
                  size="sm"
                  variant={test.status === 'draft' ? 'primary' : test.status === 'live' ? 'danger' : 'secondary'}
                  onClick={(e) => handleToggleStatus(e, test)}
                >
                  {test.status === 'draft' && <><Play className="w-3.5 h-3.5" />Activate</>}
                  {test.status === 'live' && <><XCircle className="w-3.5 h-3.5" />Close</>}
                  {test.status === 'closed' && <><RotateCcw className="w-3.5 h-3.5" />Reactivate</>}
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
