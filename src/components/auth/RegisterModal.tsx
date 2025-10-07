import React, { useState } from 'react'
import { X, User, Mail, Phone, Key } from 'lucide-react'
import { signUpTeacher } from '../../lib/auth'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RegisterModal({ isOpen, onClose }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    token: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { refreshUser } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      await signUpTeacher(
        formData.name,
        formData.email,
        formData.phoneNumber,
        formData.token,
        formData.password
      )
      await refreshUser()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Register as Educator</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                name="name"
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                name="email"
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                name="phoneNumber"
                type="tel"
                placeholder="Phone Number"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                name="token"
                type="text"
                placeholder="Access Token"
                value={formData.token}
                onChange={handleChange}
                className="pl-10"
                helper="Access token provided by institution administrator"
                required
              />
            </div>

            <div className="relative">
              <Input
                name="password"
                type="password"
                placeholder="Password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="relative">
              <Input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Register
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Educator Registration Process</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Contact your institution administrator for an access token</p>
              <p>• Access token must match your registered phone number</p>
              <p>• Account will be activated immediately after verification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}