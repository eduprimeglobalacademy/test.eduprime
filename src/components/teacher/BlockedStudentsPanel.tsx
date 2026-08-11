import { useState } from 'react'
import { Ban, X } from 'lucide-react'
import { useTestBlockedStudents } from '../../hooks/useTestBlockedStudents'

interface BlockedStudentsPanelProps {
  testId: string
}

export function BlockedStudentsPanel({ testId }: BlockedStudentsPanelProps) {
  const { blocked, blockStudent, unblockStudent } = useTestBlockedStudents(testId)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleBlock = async () => {
    if (!email.trim()) return
    setSaving(true)
    setError('')
    try {
      await blockStudent(email)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-ink-soft flex items-center gap-1.5">
        <Ban className="w-3.5 h-3.5 text-red-500" />Blocked for this assessment {blocked.length > 0 && `(${blocked.length})`}
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="student@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleBlock())}
          className="input-base py-1.5 text-sm flex-1"
        />
        <button
          onClick={handleBlock}
          disabled={saving || !email.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 shrink-0"
        >
          Block
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {blocked.length > 0 && (
        <div className="space-y-1 pt-1">
          {blocked.map(b => (
            <div key={b.id} className="flex items-center justify-between gap-2 text-xs bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
              <span className="text-red-700 truncate">{b.student_email}</span>
              <button onClick={() => unblockStudent(b.id)} className="text-red-400 hover:text-red-600 shrink-0" title="Unblock">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
