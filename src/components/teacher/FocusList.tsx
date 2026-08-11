import { useState, useEffect } from 'react'
import { Star, Plus, X, Trash2, User, Layers, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { classLabel } from '../../hooks/useClasses'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { Test, TeacherFocusItem } from '../../lib/supabase'

interface FocusListProps {
  tests: Test[]
  classes: { id: string; name: string; course_name?: string; grade_level?: string }[]
  items: TeacherFocusItem[]
  addStudentFocus: (input: { email: string; name?: string; note?: string }) => Promise<void>
  addClassFocus: (input: { classId: string; note?: string }) => Promise<void>
  removeFocus: (id: string) => Promise<void>
  onOpenClass: (classId: string) => void
}

interface StudentPerf {
  average: number | null
  recent: { title: string; percent: number; submitted_at?: string }[]
}

export function FocusList({ tests, classes, items, addStudentFocus, addClassFocus, removeFocus, onOpenClass }: FocusListProps) {
  const studentItems = items.filter(i => i.kind === 'student')
  const classItems = items.filter(i => i.kind === 'class')
  const testById = new Map(tests.map(t => [t.id, t]))

  const [showAdd, setShowAdd] = useState(false)
  const [addKind, setAddKind] = useState<'student' | 'class'>('student')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [perf, setPerf] = useState<Record<string, StudentPerf>>({})

  useEffect(() => {
    if (studentItems.length === 0 || tests.length === 0) return
    let cancelled = false
    ;(async () => {
      const testIds = tests.map(t => t.id)
      const entries = await Promise.all(studentItems.map(async (item) => {
        const { data } = await supabase
          .from('test_attempts')
          .select('test_id, total_score, max_score, submitted_at')
          .eq('student_email', item.student_email)
          .in('test_id', testIds)
          .eq('is_submitted', true)
          .not('max_score', 'is', null)
          .gt('max_score', 0)
          .order('submitted_at', { ascending: false })
          .limit(5)
        const rows = data || []
        if (rows.length === 0) return [item.id, { average: null, recent: [] }] as const
        const percentages = rows.map(r => (r.total_score / r.max_score) * 100)
        const average = Math.round(percentages.reduce((s, p) => s + p, 0) / percentages.length)
        const recent = rows.map(r => ({
          title: testById.get(r.test_id)?.title || 'Assessment',
          percent: Math.round((r.total_score / r.max_score) * 100),
          submitted_at: r.submitted_at,
        }))
        return [item.id, { average, recent }] as const
      }))
      if (!cancelled) setPerf(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [studentItems.map(i => i.id).join(','), tests.length])

  const classStats = (clsId: string) => {
    const classTests = tests.filter(t => t.class_id === clsId)
    return {
      total: classTests.length,
      live: classTests.filter(t => t.status === 'live').length,
    }
  }

  const resetAddForm = () => { setEmail(''); setName(''); setClassId(''); setNote(''); setError('') }

  const handleAdd = async () => {
    setError('')
    setSaving(true)
    try {
      if (addKind === 'student') {
        if (!email.trim()) { setError('Email is required'); setSaving(false); return }
        await addStudentFocus({ email, name: name || undefined, note: note || undefined })
      } else {
        if (!classId) { setError('Choose a class'); setSaving(false); return }
        await addClassFocus({ classId, note: note || undefined })
      }
      resetAddForm()
      setShowAdd(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <Star className="w-5 h-5 text-[var(--brand-primary)]" />Focus
          </h2>
          <p className="text-sm text-ink-faint">Students and classes you're keeping an eye on</p>
        </div>
        <Button onClick={() => setShowAdd(v => !v)}>
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Cancel' : 'Add to Focus'}
        </Button>
      </div>

      {showAdd && (
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex gap-2">
            {(['student', 'class'] as const).map(k => (
              <button
                key={k}
                onClick={() => setAddKind(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  addKind === k ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)]' : 'bg-surface-2 text-ink-faint'
                }`}
              >
                {k === 'student' ? 'Student' : 'Class'}
              </button>
            ))}
          </div>

          {addKind === 'student' ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Student email *" type="email" placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Name (optional)" placeholder="e.g. Ava Thompson" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-ink-soft mb-1.5">Class *</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-base">
                <option value="">Choose a class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
              </select>
            </div>
          )}

          <Input label="Note (optional)" placeholder="Why are you watching this?" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleAdd} loading={saving}>Add</Button>
        </div>
      )}

      {items.length === 0 && !showAdd ? (
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
          <Star className="w-10 h-10 text-ink-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink mb-2">Nothing flagged yet</h3>
          <p className="text-ink-faint text-sm mb-4">Flag a student or class to watch their results over time.</p>
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Add to Focus</Button>
        </div>
      ) : (
        <>
          {studentItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-faint uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />Students
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {studentItems.map(item => {
                  const p = perf[item.id]
                  return (
                    <div key={item.id} className="bg-surface rounded-2xl border border-app shadow-sm p-5">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{item.student_name || item.student_email}</p>
                          {item.student_name && <p className="text-xs text-ink-faint truncate">{item.student_email}</p>}
                        </div>
                        <button onClick={() => removeFocus(item.id)} className="text-ink-muted hover:text-red-500 shrink-0" title="Remove">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {item.note && <p className="text-xs text-ink-faint italic mb-3">"{item.note}"</p>}
                      {!p ? (
                        <p className="text-xs text-ink-muted mt-2">Loading…</p>
                      ) : p.average === null ? (
                        <p className="text-xs text-ink-muted mt-2">No submissions yet from this email.</p>
                      ) : (
                        <div className="mt-2 pt-3 border-t border-app">
                          <p className="text-xs text-ink-faint mb-2">Average: <span className={`font-semibold ${p.average < 60 ? 'text-red-600' : 'text-ink'}`}>{p.average}%</span></p>
                          <div className="space-y-1">
                            {p.recent.map((r, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-ink-soft truncate">{r.title}</span>
                                <span className={r.percent < 60 ? 'text-red-600 font-medium' : 'text-ink-muted'}>{r.percent}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {classItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-faint uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />Classes
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {classItems.map(item => {
                  const cls = item.classes
                  const stats = item.class_id ? classStats(item.class_id) : { total: 0, live: 0 }
                  return (
                    <button
                      key={item.id}
                      onClick={() => item.class_id && onOpenClass(item.class_id)}
                      className="text-left bg-surface rounded-2xl border border-app shadow-sm hover:shadow-md transition-all p-5 group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-ink truncate">{cls ? classLabel(cls) : 'Class'}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); removeFocus(item.id) }}
                            className="text-ink-muted hover:text-red-500"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                          <ChevronRight className="w-4 h-4 text-ink-muted group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                      {item.note && <p className="text-xs text-ink-faint italic mb-2">"{item.note}"</p>}
                      <p className="text-xs text-ink-muted">{stats.total} assessment{stats.total !== 1 ? 's' : ''}{stats.live > 0 ? ` · ${stats.live} live` : ''}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
