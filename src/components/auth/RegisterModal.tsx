import { useState } from 'react'
import { X, User, Mail, Phone, Key, UserPlus } from 'lucide-react'
import { signUpTeacher } from '../../lib/auth'
import { useAuth } from '../../contexts/AuthContext'
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
  const { refreshUser } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return }
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

  if (!isOpen) return null

  const field = (icon: React.ReactNode, name: string, type: string, placeholder: string) => (
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
        {icon}
      </div>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={(formData as any)[name]}
        onChange={handleChange}
        className="input-base pl-10"
        required
      />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Register as Educator</h2>
              <p className="text-sm text-gray-500 mt-1">Create your educator account</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {field(<User className="w-4 h-4" />, 'name', 'text', 'Full Name')}
            {field(<Mail className="w-4 h-4" />, 'email', 'email', 'Email Address')}
            {field(<Phone className="w-4 h-4" />, 'phoneNumber', 'tel', 'Phone Number')}

            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
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
            <p className="text-xs text-gray-500 -mt-2 ml-1">Access token provided by your institution administrator</p>

            <input
              name="password"
              type="password"
              placeholder="Password (min 6 characters)"
              value={formData.password}
              onChange={handleChange}
              className="input-base"
              required
            />
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-base"
              required
            />

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

          <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <h3 className="text-sm font-semibold text-indigo-900 mb-2">Registration Process</h3>
            <ul className="text-xs text-indigo-700 space-y-1">
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
