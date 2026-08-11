import { GraduationCap } from 'lucide-react'
import { Input } from '../ui/Input'

export interface GradingValues {
  aGrade: string
  bGrade: string
  cGrade: string
  dGrade: string
  passingGrade: string
}

interface GradingFieldsProps {
  values: GradingValues
  onChange: (key: keyof GradingValues, value: any) => void
}

export function GradingFields({ values, onChange }: GradingFieldsProps) {
  return (
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
            value={values[key]}
            onChange={(e) => onChange(key, e.target.value)}
          />
        ))}
      </div>
      <Input
        label="Passing grade minimum (%)"
        type="number"
        min="0"
        max="100"
        value={values.passingGrade}
        onChange={(e) => onChange('passingGrade', e.target.value)}
        helper="Scores below this are considered failing (F)"
      />
    </div>
  )
}
