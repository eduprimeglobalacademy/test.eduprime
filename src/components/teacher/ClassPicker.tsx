import { useState, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { useClasses, classLabel } from '../../hooks/useClasses'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface ClassPickerProps {
  teacherId: string
  value: string[]
  onChange: (classIds: string[]) => void
}

// Chip + searchable dropdown rather than a checkbox list — a checkbox per
// class stops scaling once a teacher has more than a handful of sections.
export function ClassPicker({ teacherId, value, onChange }: ClassPickerProps) {
  const { classes, createClass } = useClasses(teacherId)
  const [showNewClass, setShowNewClass] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [newClass, setNewClass] = useState({ name: '', course_name: '', grade_level: '', academic_term: '' })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = classes.filter(c => value.includes(c.id))
  const available = classes.filter(c => !value.includes(c.id) && classLabel(c).toLowerCase().includes(search.toLowerCase()))

  const addClass = (id: string) => { onChange([...value, id]); setSearch('') }
  const removeClass = (id: string) => onChange(value.filter(v => v !== id))

  const handleCreate = async () => {
    if (!newClass.name.trim()) { setError('Section name is required'); return }
    setCreating(true)
    setError('')
    try {
      const created = await createClass({
        name: newClass.name.trim(),
        course_name: newClass.course_name.trim() || undefined,
        grade_level: newClass.grade_level.trim() || undefined,
        academic_term: newClass.academic_term.trim() || undefined,
      })
      onChange([...value, created.id])
      setShowNewClass(false)
      setNewClass({ name: '', course_name: '', grade_level: '', academic_term: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef}>
      <label className="block text-sm font-medium text-ink-soft mb-1.5">Classes / Courses (optional — leave empty for a one-off assessment)</label>

      {!showNewClass ? (
        <div className="relative">
          <div className="input-base flex flex-wrap items-center gap-1.5 min-h-[42px] cursor-text" onClick={() => setDropdownOpen(true)}>
            {selected.map(cls => (
              <span key={cls.id} className="inline-flex items-center gap-1 bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] text-xs font-medium rounded-lg px-2 py-1">
                {classLabel(cls)}
                <button type="button" onClick={(e) => { e.stopPropagation(); removeClass(cls.id) }} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true) }}
              onFocus={() => setDropdownOpen(true)}
              placeholder={selected.length === 0 ? 'Search classes…' : ''}
              className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-ink"
            />
          </div>

          {dropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-surface border border-app rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {available.length > 0 ? available.map(cls => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => addClass(cls.id)}
                  className="w-full text-left px-3 py-2 text-sm text-ink-soft hover:bg-app transition-colors"
                >
                  {classLabel(cls)}{cls.grade_level ? ` (${cls.grade_level})` : ''}
                </button>
              )) : (
                <p className="px-3 py-2 text-sm text-ink-faint">{classes.length === 0 ? 'No classes yet' : 'No matches'}</p>
              )}
              <button
                type="button"
                onClick={() => { setShowNewClass(true); setDropdownOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--brand-primary)] font-medium hover:bg-app transition-colors border-t border-app flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />New class
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-app rounded-xl p-4 bg-app space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide">New class / section</p>
            <button type="button" onClick={() => setShowNewClass(false)} className="text-ink-muted hover:text-ink-soft">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              placeholder="Section name — e.g. Section A *"
              value={newClass.name}
              onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Course / subject — e.g. Biology 101"
              value={newClass.course_name}
              onChange={(e) => setNewClass(prev => ({ ...prev, course_name: e.target.value }))}
            />
            <Input
              placeholder="Grade / year level — e.g. Grade 10"
              value={newClass.grade_level}
              onChange={(e) => setNewClass(prev => ({ ...prev, grade_level: e.target.value }))}
            />
            <Input
              placeholder="Term — e.g. 2026 Spring"
              value={newClass.academic_term}
              onChange={(e) => setNewClass(prev => ({ ...prev, academic_term: e.target.value }))}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button type="button" size="sm" loading={creating} onClick={handleCreate}>
            <Plus className="w-3.5 h-3.5" />
            Add class
          </Button>
        </div>
      )}
    </div>
  )
}
