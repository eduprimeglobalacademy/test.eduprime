import { useEffect, useState } from 'react'
import { Check, ArrowRight, Sparkles, Palette, Key, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Plan, Organization } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { planFeatureBullets } from '../../lib/plans'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ROOT_DOMAIN } from '../../lib/tenant'

type Step = 'plan' | 'branding' | 'invite' | 'done'
const STEPS: { key: Step; label: string }[] = [
  { key: 'plan', label: 'Plan' },
  { key: 'branding', label: 'Branding' },
  { key: 'invite', label: 'First educator' },
]

interface OnboardingFlowProps {
  org: Organization
  onViewBilling: () => void
  onFinish: () => void
}

export function OnboardingFlow({ org, onViewBilling, onFinish }: OnboardingFlowProps) {
  const { refetchOrg } = useTenant()
  const [step, setStep] = useState<Step>('plan')
  const [plans, setPlans] = useState<Plan[]>([])

  const [logoUrl, setLogoUrl] = useState(org.logo_url || '')
  const [primary, setPrimary] = useState(org.primary_color)
  const [secondary, setSecondary] = useState(org.secondary_color)
  const [savingBranding, setSavingBranding] = useState(false)

  const [teacherName, setTeacherName] = useState('')
  const [teacherPhone, setTeacherPhone] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('plans').select('*').eq('is_public', true).order('sort_order')
      .then(({ data }) => setPlans(data || []))
  }, [])

  const saveBranding = async () => {
    setSavingBranding(true)
    await supabase.from('organizations').update({
      logo_url: logoUrl.trim() || null, primary_color: primary, secondary_color: secondary,
    }).eq('id', org.id)
    await refetchOrg()
    setSavingBranding(false)
    setStep('invite')
  }

  const generateFirstToken = async () => {
    if (!teacherName.trim() || !teacherPhone.trim()) { setStep('done'); return }
    setInviting(true)
    setInviteError('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: adminRow } = await supabase.from('admin_users').select('id').eq('user_id', user?.id).maybeSingle()
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const { error } = await supabase.from('teacher_tokens').insert([{
      token, teacher_name: teacherName.trim(), phone_number: teacherPhone.trim(), created_by: adminRow?.id,
    }])
    setInviting(false)
    if (error) { setInviteError('Could not create the invite — you can try again from Educator Management.'); return }
    setGeneratedToken(token)
    setStep('done')
  }

  const stepIndex = STEPS.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen bg-app flex flex-col items-center px-4 py-12">
      {step !== 'done' && (
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={i <= stepIndex
                  ? { background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }
                  : { background: 'var(--surface-2)', color: 'var(--ink-faint)' }}
              >
                {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold ${i <= stepIndex ? 'text-ink' : 'text-ink-faint'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-app-strong mx-1" />}
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-xl bg-surface rounded-2xl border border-app shadow-sm p-8">
        {step === 'plan' && (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--brand-primary-soft)' }}>
              <Sparkles className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-1.5">Welcome to {org.name}</h1>
            <p className="text-sm text-ink-faint mb-6">
              You're on a 14-day free trial with full Growth-tier access, no card needed. Pick a plan now if you already know what you need, or skip it — nothing is limited during your trial.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-app p-4">
                  <h3 className="text-sm font-bold text-ink">{plan.name}</h3>
                  <p className="text-lg font-bold text-ink mt-1">
                    {plan.price_inr != null ? <>₹{plan.price_inr.toLocaleString('en-IN')}<span className="text-xs font-normal text-ink-faint">/mo</span></> : 'Custom'}
                  </p>
                  <ul className="space-y-1.5 mt-3">
                    {planFeatureBullets(plan).slice(0, 3).map((feature) => (
                      <li key={feature} className="flex items-start gap-1.5 text-xs text-ink-soft">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1" onClick={() => setStep('branding')}>
                Continue with free trial <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="flex-1" onClick={onViewBilling}>
                View plans & subscribe
              </Button>
            </div>
          </>
        )}

        {step === 'branding' && (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--brand-primary-soft)' }}>
              <Palette className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-1.5">Make it yours</h1>
            <p className="text-sm text-ink-faint mb-6">
              Your logo and colors show up across your dashboard, sign-in page, and everywhere your students see this platform. You can change this any time from Branding.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain border border-app shrink-0 bg-app" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                ) : (
                  <div className="w-12 h-12 rounded-xl border border-app shrink-0 flex items-center justify-center text-[10px] text-ink-muted bg-app">none</div>
                )}
                <Input label="Logo URL" placeholder="https://…/logo.png" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="flex-1" />
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
            </div>

            <div className="flex gap-3">
              <Button size="lg" variant="outline" onClick={() => setStep('invite')}>Skip for now</Button>
              <Button size="lg" className="flex-1" loading={savingBranding} onClick={saveBranding}>
                Save & continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {step === 'invite' && (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--brand-primary-soft)' }}>
              <Key className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-1.5">Invite your first educator</h1>
            <p className="text-sm text-ink-faint mb-6">
              Generate a one-time token and share it with a teacher — they use it to register and can start building assessments right away. You can always do this later from Educator Management.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <Input label="Educator name" placeholder="Full name" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
              <Input label="Phone number" placeholder="Phone number" value={teacherPhone} onChange={(e) => setTeacherPhone(e.target.value)} />
            </div>
            {inviteError && <p className="text-sm text-red-600 mb-4">{inviteError}</p>}

            <div className="flex gap-3">
              <Button size="lg" variant="outline" onClick={() => setStep('done')}>Skip for now</Button>
              <Button size="lg" className="flex-1" loading={inviting} onClick={generateFirstToken}>
                Generate & finish <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--brand-primary-soft)' }}>
              <ShieldCheck className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            </div>
            <h1 className="text-2xl font-bold text-ink mb-1.5">You're all set</h1>
            <p className="text-sm text-ink-faint mb-6">
              Your organization is live at <span className="font-mono">{org.slug}.{ROOT_DOMAIN}</span>.
            </p>

            {generatedToken ? (
              <div className="rounded-xl border border-app p-4 mb-6">
                <p className="text-xs font-semibold text-ink-soft mb-1.5">Share this token with {teacherName}</p>
                <code className="text-sm font-mono text-[var(--brand-primary)] bg-[var(--brand-primary-soft)] px-2 py-1 rounded-lg inline-block">{generatedToken}</code>
                <p className="text-xs text-ink-faint mt-2">Valid for 7 days, one-time use. You can find it again under Educator Management.</p>
              </div>
            ) : (
              <p className="text-sm text-ink-soft mb-6">Generate an educator token any time from Educator Management to get your first teacher in.</p>
            )}

            <Button size="lg" className="w-full" onClick={onFinish}>
              Go to dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
