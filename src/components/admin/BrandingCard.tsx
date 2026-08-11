import { useState } from 'react'
import { Palette } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Organization } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

interface BrandingCardProps {
  org: Organization
}

export function BrandingCard({ org }: BrandingCardProps) {
  const { refetchOrg } = useTenant()
  const [logoUrl, setLogoUrl] = useState(org.logo_url || '')
  const [primary, setPrimary] = useState(org.primary_color)
  const [secondary, setSecondary] = useState(org.secondary_color)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty = logoUrl !== (org.logo_url || '') || primary !== org.primary_color || secondary !== org.secondary_color

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await supabase.from('organizations').update({
      logo_url: logoUrl.trim() || null, primary_color: primary, secondary_color: secondary,
    }).eq('id', org.id)
    await refetchOrg()
    setSaving(false)
    setSaved(true)
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"><Palette className="w-5 h-5" /></div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Branding</h3>
          <p className="text-xs text-ink-faint mt-0.5">Your logo and colors, shown across your dashboard, sign-in, and student pages.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain border border-app shrink-0 bg-app" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
          ) : (
            <div className="w-12 h-12 rounded-xl border border-app shrink-0 flex items-center justify-center text-[10px] text-ink-muted bg-app">none</div>
          )}
          <Input
            label="Logo URL"
            placeholder="https://…/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="flex-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-ink-soft">Primary color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-9 h-9 rounded-lg border border-app cursor-pointer shrink-0" />
              <span className="text-xs font-mono text-ink-faint">{primary}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-ink-soft">Secondary color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-9 h-9 rounded-lg border border-app cursor-pointer shrink-0" />
              <span className="text-xs font-mono text-ink-faint">{secondary}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} loading={saving} disabled={!dirty}>Save</Button>
          {saved && !dirty && <span className="text-xs text-emerald-600">Saved</span>}
        </div>

        <p className="text-xs text-ink-faint">No upload storage wired up yet — paste a URL to an already-hosted image. Colors update live everywhere as soon as you save.</p>
      </div>
    </Card>
  )
}
