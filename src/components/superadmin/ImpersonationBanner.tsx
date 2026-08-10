import { useEffect, useState } from 'react'
import { Eye, LogOut } from 'lucide-react'
import { getImpersonationState, exitImpersonation } from '../../lib/auth'
import type { ImpersonationState } from '../../lib/auth'
import { useAuth } from '../../contexts/AuthContext'

export function ImpersonationBanner() {
  const { user, refreshUser } = useAuth()
  const [state, setState] = useState<ImpersonationState | null>(null)
  const [exiting, setExiting] = useState(false)

  // Re-check after every auth change (impersonation start/exit both call
  // refreshUser right after touching the session) rather than trying to
  // make sessionStorage itself reactive.
  useEffect(() => { setState(getImpersonationState()) }, [user?.id])

  if (!state) return null

  const handleExit = async () => {
    setExiting(true)
    await exitImpersonation()
    await refreshUser()
    setExiting(false)
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap text-sm relative z-50">
      <Eye className="w-4 h-4 shrink-0" />
      <span>
        Viewing as <strong>{state.orgName}</strong> ({state.adminEmail}) — support session
      </span>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 font-medium transition-colors disabled:opacity-60"
      >
        <LogOut className="w-3.5 h-3.5" />
        {exiting ? 'Exiting…' : 'Exit'}
      </button>
    </div>
  )
}
