import { useState, useMemo, useEffect, useRef } from 'react'
import { ArrowLeft, Pencil, Check, X, Trash2, Copy, Users, Search, QrCode, Star, Maximize2, Settings as SettingsIcon, UserPlus } from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { formatDateTime } from '../../lib/utils'
import { classLabel } from '../../hooks/useClasses'
import { useClassRoster } from '../../hooks/useClassRoster'
import type { Test, Class } from '../../lib/supabase'

interface ClassSettingsProps {
  classId: string
  classes: Class[]
  tests: Test[]
  updateClass: (id: string, patch: { name?: string; course_name?: string; grade_level?: string; academic_term?: string }) => Promise<Class>
  deleteClass: (id: string) => Promise<void>
  onBack: () => void
  onDeleted: () => void
  onFlagStudent?: (email: string, name?: string) => void
}

export function ClassSettings({ classId, classes, tests, updateClass, deleteClass, onBack, onDeleted, onFlagStudent }: ClassSettingsProps) {
  const cls = classes.find(c => c.id === classId)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', course_name: '', grade_level: '', academic_term: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [rosterSearch, setRosterSearch] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [qrFullscreen, setQrFullscreen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrDataUrlLarge, setQrDataUrlLarge] = useState('')
  const qrFullscreenRef = useRef<HTMLDivElement>(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const { roster, removeStudent, addStudent } = useClassRoster(classId)

  const classTests = tests.filter(t => t.class_id === classId)
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

  useEffect(() => {
    if (!qrFullscreen) return
    QRCode.toDataURL(enrollmentLink, { width: 480, margin: 1 }).then(setQrDataUrlLarge).catch(() => setQrDataUrlLarge(''))
  }, [qrFullscreen, enrollmentLink])

  // Enter/exit real browser fullscreen (not just a full-viewport overlay) so
  // the browser chrome disappears too — important when projecting this for
  // a class to scan. Listen for fullscreenchange so pressing Esc (which
  // exits native fullscreen without going through our close button) keeps
  // React state in sync instead of leaving a dialog open with no chrome.
  useEffect(() => {
    if (qrFullscreen && qrFullscreenRef.current) {
      qrFullscreenRef.current.requestFullscreen?.().catch(() => {})
    } else if (!qrFullscreen && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [qrFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setQrFullscreen(false)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase()
    if (!q) return roster
    return roster.filter(s => s.student_email.toLowerCase().includes(q) || s.student_name?.toLowerCase().includes(q))
  }, [roster, rosterSearch])

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
    onDeleted()
  }

  const handleAddStudent = async () => {
    if (!addEmail.trim()) { setAddError('Email is required'); return }
    setAddSaving(true)
    setAddError('')
    try {
      await addStudent(addEmail, addName)
      setAddEmail('')
      setAddName('')
      setShowAddStudent(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add student')
    } finally {
      setAddSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />Back to {cls.name}
      </button>

      <div>
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[var(--brand-primary)]" />Class Settings
        </h2>
        <p className="text-sm text-ink-faint mt-1">{classLabel(cls)}</p>
      </div>

      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-4 max-w-3xl">
        <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Properties</p>
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
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={startEdit}><Pencil className="w-3.5 h-3.5" />Edit</Button>
            {classTests.length === 0 ? (
              <Button size="sm" variant="outline" onClick={handleDelete} className="text-red-500 border-red-200 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />Delete class
              </Button>
            ) : (
              <p className="text-xs text-ink-muted">Delete this class's {classTests.length} assessment{classTests.length !== 1 ? 's' : ''} first to delete it.</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />Roster <span className="font-normal normal-case">({roster.length} enrolled)</span>
          </p>
          <Button size="sm" variant="outline" onClick={() => setShowAddStudent(v => !v)}>
            {showAddStudent ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {showAddStudent ? 'Cancel' : 'Add Student'}
          </Button>
        </div>

        <div className="flex items-start gap-3 max-w-3xl">
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
          <div className="flex flex-col items-center gap-2">
            {qrDataUrl ? (
              <button onClick={() => setQrFullscreen(true)} className="group relative" title="Show fullscreen">
                <img src={qrDataUrl} alt="QR code for enrollment link" className="rounded-lg border border-app p-2 bg-white" width={160} height={160} />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-lg transition-colors">
                  <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </button>
            ) : (
              <div className="w-40 h-40 rounded-lg border border-app bg-app animate-pulse" />
            )}
            {qrDataUrl && (
              <button onClick={() => setQrFullscreen(true)} className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1">
                <Maximize2 className="w-3 h-3" />Show fullscreen
              </button>
            )}
          </div>
        )}

        {showAddStudent && (
          <div className="bg-app rounded-xl border border-app p-4 space-y-3 max-w-3xl">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Email *" type="email" placeholder="student@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              <Input label="Name (optional)" placeholder="e.g. Ava Thompson" value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <p className="text-xs text-ink-faint">Added directly to the roster. If this email isn't Google-verified yet, they'll need to sign in with Google (this exact address) the first time they join a gated test.</p>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <Button size="sm" onClick={handleAddStudent} loading={addSaving}>Add to Roster</Button>
          </div>
        )}

        {roster.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted w-3.5 h-3.5 pointer-events-none" />
            <input
              placeholder="Search students…"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              className="input-base pl-8 py-1.5 text-sm"
            />
          </div>
        )}

        {roster.length === 0 ? (
          <p className="text-sm text-ink-muted">No students enrolled yet.</p>
        ) : filteredRoster.length === 0 ? (
          <p className="text-sm text-ink-muted">No students match "{rosterSearch}".</p>
        ) : (
          <div className="border border-app rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-app z-10">
                  <tr className="border-b border-app">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-faint uppercase tracking-wide">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-faint uppercase tracking-wide">Email</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-faint uppercase tracking-wide">Joined</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-ink-faint uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {filteredRoster.map(s => (
                    <tr key={s.id} className="hover:bg-app transition-colors">
                      <td className="px-4 py-2.5 text-ink font-medium">{s.student_name || '—'}</td>
                      <td className="px-4 py-2.5 text-ink-soft">{s.student_email}</td>
                      <td className="px-4 py-2.5 text-ink-faint whitespace-nowrap">{formatDateTime(s.joined_at)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-3">
                          {onFlagStudent && (
                            <button onClick={() => onFlagStudent(s.student_email, s.student_name)} className="text-ink-muted hover:text-[var(--brand-primary)]" title="Add to Focus">
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => removeStudent(s.id)} className="text-ink-muted hover:text-red-500" title="Remove from roster">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {qrFullscreen && (
        <div
          ref={qrFullscreenRef}
          className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8 z-50 animate-in cursor-pointer"
          onClick={() => setQrFullscreen(false)}
        >
          <button onClick={() => setQrFullscreen(false)} className="absolute top-6 right-6 text-white/70 hover:text-white" title="Close">
            <X className="w-8 h-8" />
          </button>
          <p className="text-white text-2xl font-bold font-display mb-2">{classLabel(cls)}</p>
          <p className="text-white/60 text-sm mb-8">Scan to join this class</p>
          {qrDataUrlLarge ? (
            <img src={qrDataUrlLarge} alt="QR code for enrollment link" className="rounded-2xl bg-white p-6" width={480} height={480} />
          ) : (
            <div className="w-[480px] h-[480px] rounded-2xl bg-white/10 animate-pulse" />
          )}
          <code className="text-white/50 text-sm mt-6">{enrollmentLink}</code>
        </div>
      )}
    </div>
  )
}
