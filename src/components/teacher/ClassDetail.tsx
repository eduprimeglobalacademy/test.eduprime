import { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Plus, Clock, Play, CheckCircle, Layers, Pencil, Check, X, Trash2, Copy, Users, Ban, RotateCcw, Search, ChevronDown, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { TestDashboard } from './TestDashboard'
import { classLabel } from '../../hooks/useClasses'
import { useClassRoster } from '../../hooks/useClassRoster'
import type { Test, Class } from '../../lib/supabase'

interface ClassDetailProps {
  classId: string
  classes: Class[]
  tests: Test[]
  updateClass: (id: string, patch: { name?: string; course_name?: string; grade_level?: string; academic_term?: string }) => Promise<Class>
  deleteClass: (id: string) => Promise<void>
  onBack: () => void
  onTestUpdated: () => void
  onCreateAssessment: (classId: string) => void
  onPreview: (testId: string) => void
  onEdit: (test: Test) => void
  onReports: (testId: string) => void
  onEditQuestions: (testId: string) => void
}

export function ClassDetail({
  classId, classes, tests, updateClass, deleteClass, onBack, onTestUpdated,
  onCreateAssessment, onPreview, onEdit, onReports, onEditQuestions,
}: ClassDetailProps) {
  const cls = classes.find(c => c.id === classId)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', course_name: '', grade_level: '', academic_term: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterOpen, setRosterOpen] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const { roster, setBlocked, removeStudent } = useClassRoster(classId)

  const enrollmentLink = `${window.location.origin}/enroll?class=${classId}`
  const copyLink = () => {
    navigator.clipboard.writeText(enrollmentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => {
    if (!showQr) return
    QRCode.toDataURL(enrollmentLink, { width: 160, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [showQr, enrollmentLink])

  const blockedCount = roster.filter(s => s.blocked).length
  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase()
    if (!q) return roster
    return roster.filter(s => s.student_email.toLowerCase().includes(q) || s.student_name?.toLowerCase().includes(q))
  }, [roster, rosterSearch])

  const classTests = tests.filter(t => t.class_id === classId)
  const draft = classTests.filter(t => t.status === 'draft')
  const live = classTests.filter(t => t.status === 'live')
  const closed = classTests.filter(t => t.status === 'closed')

  if (!cls) return null

  const startEdit = () => {
    setForm({ name: cls.name, course_name: cls.course_name || '', grade_level: cls.grade_level || '', academic_term: cls.academic_term || '' })
    setEditing(true)
    setError('')
  }

  const saveEdit = async () => {
    if (!form.name.trim()) { setError('Section name is required'); return }
    setSaving(true)
    setError('')
    try {
      await updateClass(classId, {
        name: form.name.trim(),
        course_name: form.course_name.trim() || undefined,
        grade_level: form.grade_level.trim() || undefined,
        academic_term: form.academic_term.trim() || undefined,
      })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update class')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (classTests.length > 0) return
    if (!confirm(`Delete "${cls.name}"? This cannot be undone.`)) return
    await deleteClass(classId)
    onBack()
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />Back to Classes
      </button>

      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Section name *" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Course" value={form.course_name} onChange={(e) => setForm(f => ({ ...f, course_name: e.target.value }))} />
              <Input label="Grade level" value={form.grade_level} onChange={(e) => setForm(f => ({ ...f, grade_level: e.target.value }))} />
              <Input label="Term" value={form.academic_term} onChange={(e) => setForm(f => ({ ...f, academic_term: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} loading={saving}><Check className="w-4 h-4" />Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4" />Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-ink">{classLabel(cls)}</h2>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cls.grade_level && <span className="badge text-xs bg-surface-2 text-ink-faint border border-app">{cls.grade_level}</span>}
                {cls.academic_term && <span className="badge text-xs bg-surface-2 text-ink-faint border border-app">{cls.academic_term}</span>}
                {!cls.grade_level && !cls.academic_term && <span className="text-xs text-ink-muted">No grade level or term set</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={startEdit}><Pencil className="w-3.5 h-3.5" />Edit</Button>
              {classTests.length === 0 && (
                <Button size="sm" variant="outline" onClick={handleDelete} className="text-red-500 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />Delete
                </Button>
              )}
            </div>
          </div>
        )}
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

      <div className="bg-surface rounded-2xl border border-app shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setRosterOpen(v => !v)}
          className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left"
        >
          <h3 className="text-base font-semibold text-ink flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4 text-[var(--brand-primary)]" />Roster
            <span className="text-xs font-normal text-ink-faint">{roster.length} enrolled</span>
            {blockedCount > 0 && (
              <span className="badge text-xs bg-red-50 text-red-600 border border-red-200">{blockedCount} blocked</span>
            )}
          </h3>
          <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform duration-200 shrink-0 ${rosterOpen ? 'rotate-180' : ''}`} />
        </button>

        {rosterOpen && (
          <div className="border-t border-app px-5 sm:px-6 py-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 bg-app rounded-lg border border-app px-3 py-2">
                  <code className="text-xs text-ink-soft flex-1 truncate font-mono">{enrollmentLink}</code>
                  <button onClick={copyLink} className="text-[var(--brand-primary)] shrink-0" title="Copy enrollment link">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copied && <p className="text-xs text-emerald-600 mt-1.5">Copied!</p>}
                <p className="text-xs text-ink-faint mt-2">Share this link with students — they sign in with Google to join this class's roster.</p>
              </div>
              <button
                onClick={() => setShowQr(v => !v)}
                className={`shrink-0 p-2.5 rounded-lg border transition-colors ${showQr ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]' : 'border-app text-ink-muted hover:text-ink-soft'}`}
                title="Show QR code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>

            {showQr && (
              <div className="flex justify-center mb-5">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR code for enrollment link" className="rounded-lg border border-app p-2 bg-white" width={160} height={160} />
                ) : (
                  <div className="w-40 h-40 rounded-lg border border-app bg-app animate-pulse" />
                )}
              </div>
            )}

            {roster.length === 0 ? (
              <p className="text-sm text-ink-muted">No students enrolled yet.</p>
            ) : (
              <>
                {roster.length > 6 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5 pointer-events-none" />
                    <input
                      placeholder="Search students…"
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="input-base pl-8 py-1.5 text-sm"
                    />
                  </div>
                )}
                {filteredRoster.length === 0 ? (
                  <p className="text-sm text-ink-muted">No students match "{rosterSearch}".</p>
                ) : (
                  <div className="divide-y divide-app max-h-80 overflow-y-auto scrollbar-thin">
                    {filteredRoster.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${s.blocked ? 'text-ink-muted line-through' : 'text-ink'}`}>{s.student_name || s.student_email}</p>
                          {s.student_name && <p className="text-xs text-ink-faint truncate">{s.student_email}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.blocked ? (
                            <Button size="sm" variant="outline" onClick={() => setBlocked(s.id, false)}>
                              <RotateCcw className="w-3.5 h-3.5" />Unblock
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setBlocked(s.id, true)} className="text-red-500 border-red-200 hover:bg-red-50">
                              <Ban className="w-3.5 h-3.5" />Block
                            </Button>
                          )}
                          <button onClick={() => removeStudent(s.id)} className="text-ink-muted hover:text-red-500" title="Remove">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
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
        onPreview={onPreview}
        onEdit={onEdit}
        onReports={onReports}
        onEditQuestions={onEditQuestions}
      />
    </div>
  )
}
