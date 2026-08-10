import { useState } from 'react'
import { Globe, Check, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Organization } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

const ELIGIBLE_PLANS = ['growth', 'institution']

interface CustomDomainCardProps {
  org: Organization
}

export function CustomDomainCard({ org }: CustomDomainCardProps) {
  const { refetchOrg } = useTenant()
  const [domain, setDomain] = useState(org.custom_domain || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const eligible = ELIGIBLE_PLANS.includes(org.plan_id) || !!org.custom_domain

  if (!eligible) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-surface-2 text-ink-muted"><Globe className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Custom domain</h3>
            <p className="text-xs text-ink-faint mt-0.5">Available on Growth and Institution plans.</p>
          </div>
        </div>
      </Card>
    )
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const { error: updateError } = await supabase
      .from('organizations').update({ custom_domain: cleaned || null }).eq('id', org.id)
    if (updateError) {
      setError(updateError.message.includes('duplicate') ? 'That domain is already in use by another organization.' : 'Failed to save domain.')
    } else {
      setDomain(cleaned)
      await refetchOrg()
    }
    setSaving(false)
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"><Globe className="w-5 h-5" /></div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Custom domain</h3>
          <p className="text-xs text-ink-faint mt-0.5">Serve the platform from your own domain instead of {org.slug}.eduprime.app</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="tests.yourschool.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSave} loading={saving} disabled={domain.trim() === (org.custom_domain || '')}>
          Save
        </Button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {org.custom_domain && (
        <div className="mt-4 p-4 bg-app rounded-xl border border-app space-y-3">
          <div className="flex items-center gap-2">
            {org.custom_domain_status === 'active' ? (
              <span className="badge text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />Live
              </span>
            ) : (
              <span className="badge text-xs bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Clock className="w-3 h-3" />Pending setup
              </span>
            )}
            <span className="text-xs font-mono text-ink-soft">{org.custom_domain}</span>
          </div>
          {org.custom_domain_status !== 'active' && (
            <div className="text-xs text-ink-faint space-y-1.5">
              <p>To finish setup:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Add a CNAME record for <span className="font-mono text-ink-soft">{org.custom_domain}</span> pointing to <span className="font-mono text-ink-soft">cname.vercel-dns.com</span></li>
                <li>Let us know once it's added — we'll add the domain on our side and it goes live once DNS propagates.</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
