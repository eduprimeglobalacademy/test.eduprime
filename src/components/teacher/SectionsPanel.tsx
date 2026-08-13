import { useState } from 'react'
import { Layers, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Input } from '../ui/Input'
import type { TestSection, SectionTimingMode } from '../../lib/supabase'

const TIMING_LABEL: Record<SectionTimingMode, string> = {
  untimed: 'Untimed',
  fixed: 'Fixed time',
  per_question_summed: "Sum of questions' time",
}

interface SectionsPanelProps {
  sections: TestSection[]
  onAdd: (title: string) => Promise<void>
  onUpdate: (id: string, fields: Partial<Pick<TestSection, 'title' | 'timing_mode' | 'duration_minutes' | 'allow_free_navigation'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (id: string, direction: 'up' | 'down') => Promise<void>
}

export function SectionsPanel({ sections, onAdd, onUpdate, onDelete, onReorder }: SectionsPanelProps) {
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!newTitle.trim()) { setError('Section title is required'); return }
    setAdding(true)
    setError('')
    try {
      await onAdd(newTitle.trim())
      setNewTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add section')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-4 mb-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <Layers className="w-4 h-4 text-[var(--brand-primary)]" />Sections
        <span className="text-xs font-normal text-ink-faint">(optional — leave empty for a single flat test)</span>
      </div>

      {sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section, i) => (
            <div key={section.id} className="border border-app rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-0.5 shrink-0 pt-1.5">
                  <button type="button" disabled={i === 0} onClick={() => onReorder(section.id, 'up')} className="p-0.5 text-ink-muted hover:text-ink-soft disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" disabled={i === sections.length - 1} onClick={() => onReorder(section.id, 'down')} className="p-0.5 text-ink-muted hover:text-ink-soft disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => onUpdate(section.id, { title: e.target.value })}
                      className="flex-1 text-sm font-medium border-0 bg-transparent focus:outline-none text-ink"
                      placeholder="Section title"
                    />
                    <button type="button" onClick={() => onDelete(section.id)} className="p-1 text-ink-muted hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-medium text-ink-faint mb-1">Timing</label>
                      <select
                        value={section.timing_mode}
                        onChange={(e) => onUpdate(section.id, { timing_mode: e.target.value as SectionTimingMode })}
                        className="input-base w-full"
                      >
                        {(Object.keys(TIMING_LABEL) as SectionTimingMode[]).map(t => (
                          <option key={t} value={t}>{TIMING_LABEL[t]}</option>
                        ))}
                      </select>
                    </div>
                    {section.timing_mode === 'fixed' && (
                      <Input
                        label="Duration (minutes)"
                        type="number"
                        min="1"
                        value={section.duration_minutes ?? ''}
                        onChange={(e) => onUpdate(section.id, { duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
                      />
                    )}
                    {section.timing_mode === 'per_question_summed' && (
                      <p className="text-xs text-ink-faint sm:col-span-1">Section time = sum of this section's question time limits.</p>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={section.allow_free_navigation}
                        onChange={(e) => onUpdate(section.id, { allow_free_navigation: e.target.checked })}
                        className="w-4 h-4 rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                      />
                      <span className="text-xs text-ink-soft">Students can jump to other sections freely</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="e.g. Section A — Reading"
          className="input-base flex-1"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-app text-sm text-ink-soft hover:bg-app transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />Add Section
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
