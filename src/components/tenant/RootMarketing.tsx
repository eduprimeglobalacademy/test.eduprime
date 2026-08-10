import { useEffect, useState } from 'react'
import {
  ArrowRight, Building2, ClipboardList, GraduationCap,
  Upload, Timer, Link2, Palette, BarChart3, ShieldCheck, Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Plan } from '../../lib/supabase'
import { planFeatureBullets } from '../../lib/plans'
import { Button } from '../ui/Button'
import { CreateOrganizationModal } from './CreateOrganizationModal'
import { SignInModal } from '../auth/SignInModal'
import { ROOT_DOMAIN } from '../../lib/tenant'

// Only the roles a prospective customer actually has — platform admin is
// EduPrime's own internal staff role, not something a school evaluating
// the product needs to know exists.
const ROLE_CARDS = [
  { icon: Building2, bg: '#FDE7D8', title: 'You, running the school', desc: "Invite your teachers, pick a plan, and put it all under your school's own name and domain." },
  { icon: ClipboardList, bg: '#E7E2D8', title: 'Your teachers', desc: 'Build tests, set timing rules, and see results the moment students submit.' },
  { icon: GraduationCap, bg: '#FDE7D8', title: 'Your students', desc: 'Join with a code — no account, no password, no setup.' },
]

const FEATURE_CARDS = [
  { icon: Upload, tag: 'AUTHORING', title: 'Bulk question import', desc: 'Paste a plain-text list of questions and answers — the format handles the rest.' },
  { icon: Timer, tag: 'TIMING', title: 'Two timing modes', desc: 'One countdown for the whole test, or a per-question timer that auto-advances.' },
  { icon: Link2, tag: 'DISTRIBUTION', title: 'Short join codes', desc: 'Share a test in seconds. Students join, answer, and get scored automatically.' },
  { icon: Palette, tag: 'BRANDING', title: 'Your own subdomain', desc: `yourschool.${ROOT_DOMAIN} with your logo and colors — or a fully custom domain.` },
  { icon: BarChart3, tag: 'REPORTING', title: 'Instant analytics', desc: 'Score distributions, pass rates, and a full per-student table, exportable to CSV.' },
  { icon: ShieldCheck, tag: 'INTEGRITY', title: 'Duplicate-attempt protection', desc: 'Students are blocked from re-taking a test they already completed.' },
]

export function RootMarketing() {
  const [showCreate, setShowCreate] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])

  useEffect(() => {
    supabase.from('plans').select('*').order('sort_order').then(({ data }) => setPlans(data || []))
  }, [])

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="bg-app text-ink">
      {/* Nav */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 sm:px-14 py-4 border-b border-app backdrop-blur-sm" style={{ background: 'color-mix(in srgb, var(--bg) 90%, transparent)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-lg bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center font-bold font-display text-sm">E</div>
          <span className="font-display font-bold text-lg tracking-tight">EduPrime</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-ink-soft">
          <button onClick={() => scrollTo('product')} className="hover:text-ink transition-colors">Product</button>
          <button onClick={() => scrollTo('pricing')} className="hover:text-ink transition-colors">Pricing</button>
          <button onClick={() => setShowSignIn(true)} className="text-ink hover:text-[var(--brand-primary)] transition-colors">Log in</button>
          <Button onClick={() => setShowCreate(true)}>Start free trial</Button>
        </div>
        <Button size="sm" className="md:hidden" onClick={() => setShowCreate(true)}>Start trial</Button>
      </div>

      {/* Hero */}
      <div className="max-w-[1080px] mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold mb-6" style={{ background: '#FDE7D8', color: '#B4400F' }}>
          14-day free trial · no card required
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[58px] leading-[1.06] tracking-tight max-w-3xl mx-auto text-balance">
          Assessment software your whole school can run under its own name
        </h1>
        <p className="text-lg text-ink-soft max-w-xl mx-auto mt-5 mb-8 leading-relaxed">
          Give every teacher a fast way to build tests, share a join code, and grade automatically — on a site that carries your brand, not ours.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => setShowCreate(true)}>
            Create your organization <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => scrollTo('product')}>
            See how it works
          </Button>
        </div>
      </div>

      {/* Illustrative product preview */}
      <div className="max-w-[1120px] mx-auto px-6 mb-24">
        <div className="rounded-[20px] p-7" style={{ background: '#16191D', boxShadow: '0 30px 70px -20px rgba(28,25,23,.35)' }}>
          <div className="flex gap-2 mb-4">
            {[0, 1, 2].map(i => <div key={i} className="w-[11px] h-[11px] rounded-full" style={{ background: '#3A4048' }} />)}
          </div>
          <div className="bg-app rounded-xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[
              { label: 'ACTIVE STUDENTS', value: '18' },
              { label: 'AVG SCORE', value: '78%' },
              { label: 'PASS RATE', value: '83%', accent: true },
              { label: 'TIME LEFT', value: '12:40' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface border border-app rounded-xl p-4">
                <div className="text-[11px] font-semibold text-ink-faint">{stat.label}</div>
                <div className="font-display text-2xl font-bold mt-1.5" style={stat.accent ? { color: 'var(--brand-primary)' } : undefined}>{stat.value}</div>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-4 bg-surface border border-app rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-bold text-sm">Unit 4 Checkpoint — Genetics</div>
                <div className="text-xs text-ink-faint mt-0.5">
                  Join code <strong className="font-mono" style={{ color: 'var(--brand-primary)' }}>AB4K-92</strong> · Live now
                </div>
              </div>
              <div className="h-1.5 w-full sm:w-[200px] rounded-full overflow-hidden bg-surface-2">
                <div className="h-full" style={{ width: '64%', background: 'var(--brand-primary)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roles */}
      <div id="product" className="max-w-[1080px] mx-auto px-6 mb-24 scroll-mt-20">
        <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-center mb-11">Built for every role in your school</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {ROLE_CARDS.map(({ icon: Icon, bg, title, desc }) => (
            <div key={title} className="bg-surface border border-app rounded-2xl p-6">
              <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mb-4" style={{ background: bg }}>
                <Icon className="w-[18px] h-[18px] text-ink" />
              </div>
              <div className="font-bold text-[15px] mb-2">{title}</div>
              <p className="text-[13px] text-ink-faint leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features — dark band, not a theme switch: this page is EduPrime's own
          site (no org context ever applies here), so the lime tag color is a
          fixed decorative accent, same reasoning the mockup used it for. */}
      <div className="py-24 px-6" style={{ background: '#16191D', color: '#F2F3F0' }}>
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Everything a testing workflow needs</h2>
            <p className="text-[15px] mt-2.5" style={{ color: '#8A919B' }}>No plug-ins, no separate grading step, no manual roster wrangling.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_CARDS.map(({ icon: Icon, tag, title, desc }) => (
              <div key={title} className="rounded-2xl p-5" style={{ background: '#1D2126', border: '1px solid #262A30' }}>
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide mb-2.5" style={{ color: '#C6FF3D' }}>
                  <Icon className="w-3.5 h-3.5" />{tag}
                </div>
                <div className="font-bold text-base mb-2">{title}</div>
                <p className="text-[13px] leading-relaxed" style={{ color: '#8A919B' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing — real plan data, not mockup copy */}
      <div id="pricing" className="max-w-[1080px] mx-auto px-6 my-24 scroll-mt-20">
        <div className="text-center mb-11">
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Simple, per-organization pricing</h2>
          <p className="text-[15px] text-ink-faint mt-2.5">Every plan gets your own subdomain and branding. Upgrade any time.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 items-stretch">
          {plans.map((plan) => {
            const highlighted = plan.id === 'growth'
            const selfServe = plan.razorpay_plan_id && plan.price_inr != null
            return (
              <div
                key={plan.id}
                className="rounded-2xl p-7 flex flex-col"
                style={highlighted
                  ? { background: 'var(--ink)', border: '1px solid var(--ink)', color: 'var(--bg)' }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
              >
                <div
                  className="inline-block text-[11px] font-bold tracking-wide rounded-md px-2.5 py-1 w-fit"
                  style={highlighted ? { color: '#C6FF3D', background: '#2A2E22' } : { color: 'var(--brand-primary)', background: 'var(--brand-primary-soft)' }}
                >
                  {highlighted ? 'MOST POPULAR' : plan.name.toUpperCase()}
                </div>
                <div className="font-display font-bold text-xl mt-3.5 mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="font-display text-[34px] font-bold">
                    {plan.price_inr != null ? `₹${plan.price_inr.toLocaleString('en-IN')}` : 'Custom'}
                  </span>
                  <span className="text-[13px]" style={{ opacity: 0.7 }}>
                    {plan.price_inr != null ? `/month · up to ${plan.max_teachers} educators` : 'pricing · unlimited everything'}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  {planFeatureBullets(plan).map((feature) => (
                    <div key={feature} className="flex gap-2 text-[13.5px] py-1.5" style={{ opacity: highlighted ? 0.85 : 1 }}>
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: highlighted ? '#C6FF3D' : 'var(--brand-primary)' }} />
                      {feature}
                    </div>
                  ))}
                </div>
                {selfServe ? (
                  <Button className="w-full mt-5" onClick={() => setShowCreate(true)}>Start free trial</Button>
                ) : (
                  <Button
                    variant="outline" className="w-full mt-5"
                    onClick={() => window.location.assign('mailto:sales@eduprime.app?subject=Institution plan')}
                  >
                    Contact sales
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-[900px] mx-auto px-6 mb-24 text-center">
        <div className="rounded-[22px] px-8 py-14" style={{ background: 'linear-gradient(135deg,#1C1917,#292420)', color: '#fff' }}>
          <h2 className="font-display font-bold text-2xl sm:text-3xl mb-3.5">Your school, your subdomain, live in minutes</h2>
          <p className="text-[15px] mb-7" style={{ color: '#D6D3D1' }}>
            yourschool.{ROOT_DOMAIN} — or bring your own domain on Growth and up.
          </p>
          <Button size="lg" onClick={() => setShowCreate(true)}>
            Create your organization <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-app px-6 sm:px-14 py-9 flex flex-col sm:flex-row gap-3 justify-between items-center text-sm text-ink-faint">
        <span>© {new Date().getFullYear()} EduPrime. All rights reserved.</span>
        <div className="flex gap-5">
          <a href="mailto:hello@eduprime.app" className="hover:text-ink transition-colors">Contact</a>
        </div>
      </div>

      <CreateOrganizationModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  )
}
