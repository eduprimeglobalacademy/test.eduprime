import { useState } from 'react'
import { X, Building2, User, Mail, Lock, Link2, ArrowRight, Palette, Image } from 'lucide-react'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { buildSessionHandoffUrl } from '../../lib/auth'
import { slugify, isValidSlug, isReservedSlug, orgUrl, ROOT_DOMAIN } from '../../lib/tenant'

const DEFAULT_BRAND_COLOR = '#EA580C'

interface CreateOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOrganizationModal({ isOpen, onClose }: CreateOrganizationModalProps) {
  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRAND_COLOR)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleOrgNameChange = (value: string) => {
    setOrgName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isValidSlug(slug) || isReservedSlug(slug)) {
      setError('Choose a subdomain using lowercase letters, numbers, and hyphens.')
      return
    }

    setLoading(true)
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-organization`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgName: orgName.trim(),
          slug,
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword,
          primaryColor,
          logoUrl: logoUrl.trim() || undefined,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      const destination = `${orgUrl(result.org.slug)}?welcome=1`

      // Sign in now (root domain) so we have a session to hand off — the
      // org's own subdomain is a different origin and starts with none of
      // its own, no matter what we did here otherwise.
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(), password: adminPassword,
      })

      window.location.href = signInData.session
        ? buildSessionHandoffUrl(destination, signInData.session.access_token, signInData.session.refresh_token)
        : destination // Falls back to a logged-out landing — they can still sign in by hand.
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in overflow-y-auto">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-app my-8">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-ink">Start your organization</h2>
              <p className="text-sm text-ink-faint mt-1">14-day free trial, no card required</p>
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
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Organization name"
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                className="input-base pl-10"
                required
              />
            </div>

            <div>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="subdomain"
                  value={slug}
                  onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)) }}
                  className="input-base pl-10"
                  required
                />
              </div>
              {slug && (
                <p className="text-xs text-ink-muted mt-1.5 ml-1">
                  Your platform will live at <span className="font-medium text-ink-faint">{slug}.{ROOT_DOMAIN}</span>
                </p>
              )}
            </div>

            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Your name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="input-base pl-10"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
              <input
                type="email"
                placeholder="Email address"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="input-base pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
              <input
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="input-base pl-10"
                minLength={6}
                required
              />
            </div>

            <div className="border-t border-app pt-4">
              <p className="text-xs font-semibold text-ink-faint uppercase tracking-wide mb-3">Brand it as your own</p>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 input-base pl-3 pr-2 w-auto">
                  <Palette className="w-4 h-4 text-ink-muted shrink-0" />
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                    title="Brand color"
                  />
                </div>
                <div className="relative flex-1">
                  <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
                  <input
                    type="url"
                    placeholder="Logo URL (optional)"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="input-base pl-10"
                  />
                </div>
              </div>
              <p className="text-xs text-ink-muted mt-1.5">Sets the accent color and logo across your whole site.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
              Create organization
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
