import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { connectGoogleAccount, isGoogleConnected } from '../../lib/auth'

export function ConnectGoogleButton() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { isGoogleConnected().then(setConnected) }, [])

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    try {
      await connectGoogleAccount()
      // Redirects away — no further code runs here on success.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Google.')
      setConnecting(false)
    }
  }

  if (connected === null) return null

  if (connected) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title="You can sign in with Google">
        <Check className="w-3.5 h-3.5" />Google connected
      </span>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className="text-xs text-ink-muted hover:text-ink-soft underline underline-offset-2 disabled:opacity-60"
      title="Link your Google account so you can sign in with it next time"
    >
      {connecting ? 'Connecting…' : (error || 'Connect Google')}
    </button>
  )
}
