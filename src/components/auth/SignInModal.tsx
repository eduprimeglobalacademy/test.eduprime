import { useState } from 'react'
import { X, Mail, Lock, LogIn } from 'lucide-react'
import { signInWithEmail, signInWithGoogle } from '../../lib/auth'
import { useAuth } from '../../contexts/AuthContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const { refreshUser } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await signInWithEmail(email, password)
      if (result.error) {
        setError(result.error)
      } else if (result.user) {
        await refreshUser()
        onClose()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      // Redirects away — no further code runs here on success.
    } catch {
      setError('Google sign-in failed. If you haven\'t connected Google to your account yet, sign in with your password and connect it from your dashboard.')
      setGoogleLoading(false)
    }
  }

  useEscapeKey(onClose, isOpen)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-app">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-ink">Welcome back</h2>
              <p className="text-sm text-ink-faint mt-1">Sign in to your account</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-ink-muted hover:text-ink-soft"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base pl-10"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-surface-2" />
            <span className="text-xs text-ink-muted">or</span>
            <div className="flex-1 h-px bg-surface-2" />
          </div>

          <Button variant="outline" className="w-full" size="lg" loading={googleLoading} onClick={handleGoogleSignIn}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"/>
              <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1Z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1c.95-2.85 3.6-4.97 6.73-4.97Z"/>
            </svg>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  )
}
