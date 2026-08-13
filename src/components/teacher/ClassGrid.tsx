import { useState } from 'react'
import { Plus, BookOpen, Play, Clock, ChevronRight, X, Copy } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { testBelongsToClass } from '../../hooks/useClasses'
import type { Class, Test } from '../../lib/supabase'

interface ClassGridProps {
  classes: Class[]
  tests: Test[]
  createClass: (input: { name: string; course_name?: string; grade_level?: string; academic_term?: string }) => Promise<Class>
  onOpenClass: (classId: string) => void
}

export function ClassGrid({ classes, tests, createClass, onOpenClass }: ClassGridProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', course_name: '', grade_level: '', academic_term: '' })

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Section name is required'); return }
    setCreating(true)
    setError('')
    try {
      const created = await createClass({
        name: form.name.trim(),
        course_name: form.course_name.trim() || undefined,
        grade_level: form.grade_level.trim() || undefined,
        academic_term: form.academic_term.trim() || undefined,
      })
      setForm({ name: '', course_name: '', grade_level: '', academic_term: '' })
      setShowCreate(false)
      onOpenClass(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class')
    } finally {
      setCreating(false)
    }
  }

  const statsFor = (cls: Class) => {
    const classTests = tests.filter(t => testBelongsToClass(t, cls.id))
    const live = classTests.filter(t => t.status === 'live')
    return {
      total: classTests.length,
      live: live.length,
      draft: classTests.filter(t => t.status === 'draft').length,
      liveTest: live[0],
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">My Classes</h2>
          <p className="text-sm text-ink-faint">{classes.length} class{classes.length !== 1 ? 'es' : ''} · organize assessments by section</p>
        </div>
        <Button onClick={() => setShowCreate(v => !v)}>
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? 'Cancel' : 'New Class'}
        </Button>
      </div>

      {showCreate && (
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Section name *" placeholder="e.g. Section A" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Course" placeholder="e.g. Biology 101" value={form.course_name} onChange={(e) => setForm(f => ({ ...f, course_name: e.target.value }))} />
            <Input label="Grade level" placeholder="e.g. Grade 10" value={form.grade_level} onChange={(e) => setForm(f => ({ ...f, grade_level: e.target.value }))} />
            <Input label="Term" placeholder="e.g. Fall 2026" value={form.academic_term} onChange={(e) => setForm(f => ({ ...f, academic_term: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="flex justify-end mt-4">
            <Button onClick={handleCreate} loading={creating}>Create Class</Button>
          </div>
        </div>
      )}

      {classes.length === 0 && !showCreate ? (
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
          <BookOpen className="w-10 h-10 text-ink-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink mb-2">No classes yet</h3>
          <p className="text-ink-faint text-sm mb-4">Create a class to start organizing assessments by section</p>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Create your first class</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {classes.map(cls => {
            const stats = statsFor(cls)
            return (
              <button
                key={cls.id}
                onClick={() => onOpenClass(cls.id)}
                className="text-left bg-surface rounded-2xl border border-app shadow-sm hover:shadow-md hover:border-app-strong transition-all p-5 group"
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-base font-semibold text-ink truncate">{cls.name}</h3>
                  <ChevronRight className="w-4 h-4 text-ink-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
                {cls.course_name && <p className="text-sm text-ink-faint truncate mb-2">{cls.course_name}</p>}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {cls.grade_level && <span className="badge text-xs bg-surface-2 text-ink-faint border border-app">{cls.grade_level}</span>}
                  {cls.academic_term && <span className="badge text-xs bg-surface-2 text-ink-faint border border-app">{cls.academic_term}</span>}
                </div>

                <div className="flex items-center gap-4 text-xs text-ink-muted pt-3 border-t border-app">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{stats.total} assessment{stats.total !== 1 ? 's' : ''}</span>
                  {stats.draft > 0 && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{stats.draft} draft</span>}
                  {stats.live > 0 && (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Play className="w-3.5 h-3.5" />{stats.live} live
                    </span>
                  )}
                </div>

                {stats.liveTest && (
                  <div
                    className="mt-3 flex items-center gap-2 bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-soft)] rounded-lg px-3 py-2"
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(stats.liveTest!.test_code) }}
                    title="Copy join code"
                  >
                    <span className="text-xs text-[var(--brand-primary-darker)] truncate flex-1">{stats.liveTest.title}</span>
                    <code className="text-xs font-mono font-bold text-[var(--brand-primary-dark)] tracking-wide">{stats.liveTest.test_code}</code>
                    <Copy className="w-3 h-3 text-[var(--brand-primary)] shrink-0" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
