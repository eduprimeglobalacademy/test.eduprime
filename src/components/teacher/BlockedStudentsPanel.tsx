import { useState, useMemo } from 'react'
import { Ban, RotateCcw, Search, UserPlus } from 'lucide-react'
import { useTestBlockedStudents } from '../../hooks/useTestBlockedStudents'
import { useClassRoster } from '../../hooks/useClassRoster'

interface BlockedStudentsPanelProps {
  testId: string
  classId?: string
}

export function BlockedStudentsPanel({ testId, classId }: BlockedStudentsPanelProps) {
  const { blocked, blockStudent, unblockStudent } = useTestBlockedStudents(testId)
  const { roster } = useClassRoster(classId)
  const [search, setSearch] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [error, setError] = useState('')

  const isBlocked = (email: string) => blocked.find(b => b.student_email === email)

  const toggleBlock = async (email: string) => {
    setError('')
    try {
      const existing = isBlocked(email)
      if (existing) await unblockStudent(existing.id)
      else await blockStudent(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roster
    return roster.filter(s => s.student_email.toLowerCase().includes(q) || s.student_name?.toLowerCase().includes(q))
  }, [roster, search])

  const manualBlocked = blocked.filter(b => !roster.some(s => s.student_email === b.student_email))

  const handleManualBlock = async () => {
    if (!manualEmail.trim()) return
    setError('')
    try {
      await blockStudent(manualEmail)
      setManualEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-ink-soft flex items-center gap-1.5">
        <Ban className="w-3.5 h-3.5 text-red-500" />Blocked for this assessment {blocked.length > 0 && `(${blocked.length})`}
      </p>

      {classId && roster.length > 0 && (
        <>
          {roster.length > 6 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted w-3 h-3 pointer-events-none" />
              <input
                placeholder="Search class roster…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-base pl-7 py-1.5 text-xs"
              />
            </div>
          )}
          <div className="rounded-lg border border-app divide-y divide-app max-h-64 overflow-y-auto scrollbar-thin">
            {filteredRoster.map(s => {
              const b = isBlocked(s.student_email)
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-surface">
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${b ? 'text-red-600 line-through' : 'text-ink'}`}>{s.student_name || s.student_email}</p>
                    {s.student_name && <p className="text-[10px] text-ink-faint truncate">{s.student_email}</p>}
                  </div>
                  <button
                    onClick={() => toggleBlock(s.student_email)}
                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      b ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {b ? <><RotateCcw className="w-3 h-3" />Unblock</> : <><Ban className="w-3 h-3" />Block</>}
                  </button>
                </div>
              )
            })}
            {filteredRoster.length === 0 && (
              <p className="text-xs text-ink-muted px-3 py-2">No students match "{search}".</p>
            )}
          </div>
        </>
      )}

      {classId && roster.length === 0 && (
        <p className="text-xs text-ink-muted">No students enrolled in this class yet — share the class's enrollment link to build the roster.</p>
      )}

      {/* Manual block by email — for classless tests, or blocking someone not (yet) on the roster */}
      <div className="pt-1">
        <div className="flex gap-2">
          <input
            type="email"
            placeholder={classId ? 'Block by email (not on roster)' : 'student@example.com'}
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleManualBlock())}
            className="input-base py-1.5 text-xs flex-1"
          />
          <button
            onClick={handleManualBlock}
            disabled={!manualEmail.trim()}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 shrink-0 flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" />Block
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {manualBlocked.length > 0 && (
        <div className="space-y-1">
          {manualBlocked.map(b => (
            <div key={b.id} className="flex items-center justify-between gap-2 text-xs bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
              <span className="text-red-700 truncate">{b.student_email}</span>
              <button onClick={() => unblockStudent(b.id)} className="text-red-400 hover:text-red-600 shrink-0" title="Unblock">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
