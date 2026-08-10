import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useClasses, classLabel } from '../../hooks/useClasses'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface ClassPickerProps {
  teacherId: string
  value: string
  onChange: (classId: string) => void
}

export function ClassPicker({ teacherId, value, onChange }: ClassPickerProps) {
  const { classes, createClass } = useClasses(teacherId)
  const [showNewClass, setShowNewClass] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [newClass, setNewClass] = useState({ name: '', course_name: '', grade_level: '', academic_term: '' })

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
      onChange(created.id)
      setShowNewClass(false)
      setNewClass({ name: '', course_name: '', grade_level: '', academic_term: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink-soft mb-1.5">Class / Course (optional)</label>

      {!showNewClass ? (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-base flex-1"
          >
            <option value="">No class — one-off assessment</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {classLabel(cls)}{cls.grade_level ? ` (${cls.grade_level})` : ''}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={() => setShowNewClass(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
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
