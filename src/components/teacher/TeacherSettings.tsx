import { useState } from 'react'
import { User, Lock, Link2, Save, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ConnectGoogleButton } from '../auth/ConnectGoogleButton'
import type { Teacher } from '../../lib/supabase'

interface TeacherSettingsProps {
  teacher: Teacher
  email: string
  onTeacherUpdated: () => void
}

export function TeacherSettings({ teacher, email, onTeacherUpdated }: TeacherSettingsProps) {
  const [name, setName] = useState(teacher.name)
  const [phone, setPhone] = useState(teacher.phone_number || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const saveProfile = async () => {
    if (!name.trim()) { setProfileError('Name is required'); return }
    setSavingProfile(true)
    setProfileError('')
    try {
      const { error } = await supabase.from('teachers').update({ name: name.trim(), phone_number: phone.trim() }).eq('id', teacher.id)
      if (error) throw error
      onTeacherUpdated()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async () => {
    setPasswordError('')
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 2000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Settings</h2>
        <p className="text-sm text-ink-faint">Manage your profile and account security</p>
      </div>

      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <User className="w-4 h-4 text-[var(--brand-primary)]" />Profile
        </div>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" value={email} disabled helper="Contact your org admin to change your email" />
        {profileError && <p className="text-sm text-red-600">{profileError}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={saveProfile} loading={savingProfile} size="sm"><Save className="w-4 h-4" />Save Profile</Button>
          {profileSaved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="w-4 h-4" />Saved</span>}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <Lock className="w-4 h-4 text-[var(--brand-primary)]" />Password
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
          <Input label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={savePassword} loading={savingPassword} size="sm" disabled={!newPassword}><Save className="w-4 h-4" />Update Password</Button>
          {passwordSaved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="w-4 h-4" />Updated</span>}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <Link2 className="w-4 h-4 text-[var(--brand-primary)]" />Connected accounts
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-soft font-medium">Google</p>
            <p className="text-xs text-ink-faint">Sign in faster next time</p>
          </div>
          <ConnectGoogleButton />
        </div>
      </div>
    </div>
  )
}
