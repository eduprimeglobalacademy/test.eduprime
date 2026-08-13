import { useState } from 'react'
import { X, User, Mail, Phone, Key, UserPlus, Eye, EyeOff } from 'lucide-react'
import { signUpTeacher } from '../../lib/auth'
import { useAuth } from '../../contexts/AuthContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { validatePassword, PASSWORD_REQUIREMENTS } from '../../lib/password'
import { Button } from '../ui/Button'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    name: '', email: '', phoneNumber: '', token: '', password: '', confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const { refreshUser } = useAuth()

  const passwordFieldError = passwordTouched ? validatePassword(formData.password) : null
  const confirmFieldError = confirmTouched && formData.confirmPassword !== formData.password ? 'Passwords do not match' : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordTouched(true)
    setConfirmTouched(true)
    const validationError = validatePassword(formData.password)
    if (validationError) { setError(validationError); return }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      await signUpTeacher(formData.name, formData.email, formData.phoneNumber, formData.token, formData.password)
      await refreshUser()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  useEscapeKey(onClose, isOpen)

  if (!isOpen) return null

  const field = (icon: React.ReactNode, name: string, type: string, placeholder: string) => (
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
        {icon}
      </div>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={formData[name as keyof typeof formData]}
        onChange={handleChange}
        className="input-base pl-10"
        required
      />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-app">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-ink">Register as Educator</h2>
              <p className="text-sm text-ink-faint mt-1">Create your educator account</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-ink-muted hover:text-ink-soft">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {field(<User className="w-4 h-4" />, 'name', 'text', 'Full Name')}
            {field(<Mail className="w-4 h-4" />, 'email', 'email', 'Email Address')}
            {field(<Phone className="w-4 h-4" />, 'phoneNumber', 'tel', 'Phone Number')}

            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
              <input
                name="token"
                type="text"
                placeholder="Institutional Access Token"
                value={formData.token}
                onChange={handleChange}
                className="input-base pl-10"
                required
              />
            </div>
            <p className="text-xs text-ink-faint -mt-2 ml-1">Access token provided by your institution administrator</p>

            <div>
              <div className="relative">
                <input
                  name="password"
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => setPasswordTouched(true)}
                  className="input-base pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-soft transition-colors"
                  tabIndex={-1}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                >
                  {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordFieldError ? (
                <p className="text-xs text-red-600 mt-1 ml-1">{passwordFieldError}</p>
              ) : (
                <p className="text-xs text-ink-faint mt-1 ml-1">{PASSWORD_REQUIREMENTS.join(' · ')}</p>
              )}
            </div>
            <div>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={confirmVisible ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => setConfirmTouched(true)}
                  className="input-base pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setConfirmVisible(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-soft transition-colors"
                  tabIndex={-1}
                  aria-label={confirmVisible ? 'Hide password' : 'Show password'}
                >
                  {confirmVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmFieldError && <p className="text-xs text-red-600 mt-1 ml-1">{confirmFieldError}</p>}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              <UserPlus className="w-4 h-4" />
              Create Account
            </Button>
          </form>

          <div className="mt-6 p-4 bg-[var(--brand-primary-soft)] rounded-xl border border-[var(--brand-primary-soft)]">
            <h3 className="text-sm font-semibold text-[var(--brand-primary-darker)] mb-2">Registration Process</h3>
            <ul className="text-xs text-[var(--brand-primary-dark)] space-y-1">
              <li>• Contact your institution administrator for an access token</li>
              <li>• Access token must match your registered phone number</li>
              <li>• Account will be activated immediately after verification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
