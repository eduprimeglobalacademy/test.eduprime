import { Eye, Clock, ShieldCheck, Ban } from 'lucide-react'
import { Input } from '../ui/Input'
import { BlockedStudentsPanel } from './BlockedStudentsPanel'

export interface BehaviorValues {
  showResults: boolean
  allowNavigationBack: boolean
  perQuestionTiming: boolean
  timePerQuestion: string
  requireGoogleAuth: boolean
}

interface BehaviorFieldsProps {
  values: BehaviorValues
  onChange: (key: keyof BehaviorValues, value: any) => void
  classId?: string
  testId?: string
}

export function BehaviorFields({ values, onChange, classId, testId }: BehaviorFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Results & Navigation */}
      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft mb-1">
          <Eye className="w-4 h-4 text-[var(--brand-primary)]" />Results &amp; Navigation
        </div>
        {[
          { key: 'showResults' as const, label: 'Show results to students after submission', desc: 'Students will see their score, grade, and question review' },
          { key: 'allowNavigationBack' as const, label: 'Allow backward navigation', desc: 'Students can go back to previous questions during the test' },
        ].map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-app transition-colors">
            <input
              type="checkbox"
              checked={values[key]}
              onChange={(e) => onChange(key, e.target.checked)}
              className="w-4 h-4 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-ink-soft">{label}</p>
              <p className="text-xs text-ink-faint mt-0.5">{desc}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Timing */}
      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft mb-1">
          <Clock className="w-4 h-4 text-[var(--brand-primary)]" />Timing
        </div>
        <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-app transition-colors">
          <input
            type="checkbox"
            checked={values.perQuestionTiming}
            onChange={(e) => onChange('perQuestionTiming', e.target.checked)}
            className="w-4 h-4 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-ink-soft">Per-question timing</p>
            <p className="text-xs text-ink-faint mt-0.5">Each question has its own timer. Questions auto-advance when time expires. Otherwise, the overall duration set in Basic Info applies.</p>
          </div>
        </label>
        {values.perQuestionTiming && (
          <div className="ml-7">
            <Input
              label="Default time per question (seconds)"
              type="number"
              min="5"
              value={values.timePerQuestion}
              onChange={(e) => onChange('timePerQuestion', e.target.value)}
            />
            <p className="text-xs text-ink-faint mt-1.5">
              Applied to new questions as you add them from here on — not saved on its own, and it won't affect questions added in a later visit. Each question's own time limit can still be changed individually afterward.
            </p>
          </div>
        )}
      </div>

      {/* Access Control */}
      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft mb-1">
          <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />Access Control
        </div>
        <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-app transition-colors">
          <input
            type="checkbox"
            checked={values.requireGoogleAuth}
            onChange={(e) => onChange('requireGoogleAuth', e.target.checked)}
            className="w-4 h-4 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-ink-soft">Require Google sign-in before entry</p>
            <p className="text-xs text-ink-faint mt-0.5">
              Students must sign in with Google before entering the code.{' '}
              {classId
                ? "They'll also need to be enrolled in this class's roster (share the enrollment link from the class page)."
                : 'This assessment has no class, so only identity is checked — there\'s no roster to enroll in.'}
            </p>
          </div>
        </label>
      </div>

      {/* Blocked students — a per-test blocklist, independent of whether
          Google sign-in is required. Previously nested inside the "require
          Google sign-in" toggle above, which meant a teacher couldn't even
          see this panel (let alone use it) unless that toggle was on —
          misleading, since blocking works the same regardless. */}
      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft mb-1">
          <Ban className="w-4 h-4 text-[var(--brand-primary)]" />Blocked Students
        </div>
        {testId ? (
          <BlockedStudentsPanel testId={testId} classId={classId} />
        ) : (
          <p className="text-xs text-ink-muted">Save the assessment to block specific students.</p>
        )}
      </div>
    </div>
  )
}
