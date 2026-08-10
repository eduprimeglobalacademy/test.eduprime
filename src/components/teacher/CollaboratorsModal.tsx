import { useState } from 'react'
import { X, Users, Plus, Trash2 } from 'lucide-react'
import { useTestCollaborators } from '../../hooks/useTestCollaborators'
import { Button } from '../ui/Button'

interface CollaboratorsModalProps {
  testId: string
  testTitle: string
  onClose: () => void
}

export function CollaboratorsModal({ testId, testTitle, onClose }: CollaboratorsModalProps) {
  const { collaborators, loading, addByEmail, remove } = useTestCollaborators(testId)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!email.trim()) return
    setAdding(true)
    setError('')
    const err = await addByEmail(email)
    if (err) setError(err)
    else setEmail('')
    setAdding(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-app">
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--brand-primary)]" />Collaborators
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-ink-faint mb-5 truncate">{testTitle}</p>

          <div className="flex gap-2 mb-2">
            <input
              type="email"
              placeholder="colleague@yourschool.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="input-base flex-1"
            />
            <Button onClick={handleAdd} loading={adding} disabled={!email.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <p className="text-xs text-ink-muted mb-5">Must already be a registered educator in your organization.</p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading && <p className="text-sm text-ink-muted text-center py-4">Loading…</p>}
            {!loading && collaborators.length === 0 && (
              <p className="text-sm text-ink-muted text-center py-4">No collaborators yet — just you.</p>
            )}
            {collaborators.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-app rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{c.name}</p>
                  <p className="text-xs text-ink-faint truncate">{c.email}</p>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  className="p-1.5 text-ink-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
