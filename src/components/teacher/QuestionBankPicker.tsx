import { useState } from 'react'
import { X, Search, Trash2, Check } from 'lucide-react'
import type { QuestionBankItem } from '../../lib/supabase'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Button } from '../ui/Button'

interface QuestionBankPickerProps {
  isOpen: boolean
  items: QuestionBankItem[]
  onClose: () => void
  onImport: (bankItemIds: string[]) => void
  onDelete: (bankItemId: string) => void
}

export function QuestionBankPicker({ isOpen, items, onClose, onImport, onDelete }: QuestionBankPickerProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  useEscapeKey(onClose, isOpen)

  if (!isOpen) return null

  const filtered = items.filter(i => i.question_text.toLowerCase().includes(search.toLowerCase()))

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleClose = () => {
    setSelected([])
    setSearch('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-app">
        <div className="p-6 border-b border-app">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Question bank</h2>
              <p className="text-xs text-ink-faint mt-0.5">Shared across your organization's teachers</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
            <input
              placeholder="Search saved questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-ink-muted py-12">
              {items.length === 0 ? 'No saved questions yet — save one from a test to see it here.' : 'No matches.'}
            </p>
          )}
          {filtered.map((item) => {
            const isSelected = selected.includes(item.id)
            return (
              <div
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]/50' : 'border-app hover:border-app'}`}
              >
                <div className={`w-5 h-5 rounded-md border shrink-0 mt-0.5 flex items-center justify-center ${isSelected ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-app-strong'}`}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink line-clamp-2">{item.question_text}</p>
                  <p className="text-xs text-ink-muted mt-1">{item.options?.length || 0} options · {item.points} pt{item.points !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                  className="p-1.5 text-ink-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Delete from bank"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-app flex items-center justify-between">
          <p className="text-xs text-ink-faint">{selected.length} selected</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button disabled={selected.length === 0} onClick={() => { onImport(selected); setSelected([]) }}>
              Add {selected.length || ''} to test
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
