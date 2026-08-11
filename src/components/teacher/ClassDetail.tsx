import { ArrowLeft, Plus, Clock, Play, CheckCircle, Layers, Settings as SettingsIcon } from 'lucide-react'
import { Button } from '../ui/Button'
import { TestDashboard } from './TestDashboard'
import { classLabel } from '../../hooks/useClasses'
import type { Test, Class } from '../../lib/supabase'

interface ClassDetailProps {
  classId: string
  classes: Class[]
  tests: Test[]
  onBack: () => void
  onTestUpdated: () => void
  onCreateAssessment: (classId: string) => void
  onOpenSettings: (classId: string) => void
  onEdit: (test: Test) => void
}

export function ClassDetail({
  classId, classes, tests, onBack, onTestUpdated,
  onCreateAssessment, onOpenSettings, onEdit,
}: ClassDetailProps) {
  const cls = classes.find(c => c.id === classId)

  const classTests = tests.filter(t => t.class_id === classId)
  const draft = classTests.filter(t => t.status === 'draft')
  const live = classTests.filter(t => t.status === 'live')
  const closed = classTests.filter(t => t.status === 'closed')

  if (!cls) return null

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />Back to Classes
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-ink">{classLabel(cls)}</h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {cls.grade_level && <span className="badge text-xs bg-surface-2 text-ink-faint border border-app">{cls.grade_level}</span>}
            {cls.academic_term && <span className="badge text-xs bg-surface-2 text-ink-faint border border-app">{cls.academic_term}</span>}
            {!cls.grade_level && !cls.academic_term && <span className="text-xs text-ink-muted">No grade level or term set</span>}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onOpenSettings(classId)}>
          <SettingsIcon className="w-3.5 h-3.5" />Settings
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Draft', value: draft.length, icon: Clock, color: 'bg-amber-100 text-amber-600' },
          { label: 'Live now', value: live.length, icon: Play, color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Completed', value: closed.length, icon: CheckCircle, color: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]' },
          { label: 'Total', value: classTests.length, icon: Layers, color: 'bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary)]' },
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

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-ink">Assessments in {cls.name}</h3>
        <Button onClick={() => onCreateAssessment(classId)}>
          <Plus className="w-4 h-4" />Create Assessment
        </Button>
      </div>

      <TestDashboard
        tests={classTests}
        onTestUpdated={onTestUpdated}
        onEdit={onEdit}
      />
    </div>
  )
}
