import { useState } from 'react'
import { GraduationCap, Users, Shield, BookOpen, ArrowRight, CheckCircle } from 'lucide-react'
import { SignInModal } from './auth/SignInModal'
import { RegisterModal } from './auth/RegisterModal'
import { Button } from './ui/Button'
import { useTenant } from '../contexts/TenantContext'

const DEFAULT_NAME = 'EduPrime Global Academy'
const DEFAULT_LOGO = '/eduprimelogo.jpg'

export function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const { org } = useTenant()
  const orgName = org?.name || DEFAULT_NAME
  const orgLogo = org?.logo_url || DEFAULT_LOGO

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-app bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={orgLogo} alt={orgName} className="w-8 h-8 object-contain rounded-lg" />
            <span className="font-bold text-ink text-lg">{orgName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowSignIn(true)}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => setShowRegister(true)}>
              Register
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 pb-24 sm:pt-24 sm:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-app-outer" />
        <div className="absolute top-20 right-0 w-72 h-72 bg-[var(--brand-primary-soft)] rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--brand-secondary-soft)] rounded-full blur-3xl opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--brand-primary-soft)] border border-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] text-sm font-medium mb-8">
            <GraduationCap className="w-4 h-4" />
            Premier Assessment Platform
          </div>

          <div className="flex justify-center mb-8">
            <img
              src={orgLogo}
              alt={orgName}
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain rounded-2xl shadow-lg"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-ink mb-6 leading-tight">
            <span className="gradient-text">{orgName}</span>
          </h1>

          <p className="text-lg sm:text-xl text-ink-soft max-w-2xl mx-auto mb-10 leading-relaxed">
            Create, distribute, and evaluate assessments with enterprise-grade security.
            Built for modern educational institutions worldwide.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => setShowSignIn(true)} className="px-8">
              Sign In
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => setShowRegister(true)} className="px-8">
              Register as Educator
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-ink-faint">
            {['Token-based access control', 'Instant results & analytics', 'Secure timed assessments'].map(f => (
              <div key={f} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink mb-4">
              Why choose {orgName}?
            </h2>
            <p className="text-lg text-ink-soft">World-class features designed for educational excellence</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                color: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]',
                title: 'Role-Based Access',
                desc: 'Enterprise-grade authentication with distinct roles for administrators, educators, and learners. Token-based educator registration ensures institutional security.',
              },
              {
                icon: BookOpen,
                color: 'bg-emerald-100 text-emerald-600',
                title: 'Advanced Assessments',
                desc: 'Create sophisticated assessments with flexible scheduling, automatic submission, per-question timing, and comprehensive analytics.',
              },
              {
                icon: Shield,
                color: 'bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary)]',
                title: 'Enterprise Security',
                desc: 'Built with enterprise-grade standards. Automatic submission, precise time controls, and comprehensive reporting for fair assessments.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="group p-8 rounded-2xl border border-app hover:border-[var(--brand-primary-soft)] hover:shadow-md transition-all duration-200 bg-surface">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-3">{title}</h3>
                <p className="text-ink-soft leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-app">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink mb-4">How It Works</h2>
            <p className="text-lg text-ink-soft">Streamlined workflow for educational institutions</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                num: '1',
                color: 'bg-[var(--brand-primary)]',
                title: 'Institutional Setup',
                desc: 'Administrators create educator tokens for secure institutional onboarding and account management.',
              },
              {
                num: '2',
                color: 'bg-[var(--brand-secondary)]',
                title: 'Educator Creates',
                desc: 'Educators register with tokens, create comprehensive assessments, and schedule them with flexible timing options.',
              },
              {
                num: '3',
                color: 'bg-emerald-600',
                title: 'Learners Take Assessments',
                desc: 'Learners access assessments via secure codes, complete timed evaluations, and receive instant feedback.',
              },
            ].map(({ num, color, title, desc }) => (
              <div key={num} className="bg-surface rounded-2xl border border-app p-8 text-center shadow-sm">
                <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 mx-auto`}>
                  {num}
                </div>
                <h3 className="text-lg font-semibold text-ink mb-3">{title}</h3>
                <p className="text-ink-soft leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-app bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-ink-soft">
            <img src={orgLogo} alt={orgName} className="w-6 h-6 object-contain rounded" />
            <span className="text-sm font-medium">{orgName}</span>
          </div>
          <p className="text-sm text-ink-muted">© {new Date().getFullYear()} {orgName}. All rights reserved.</p>
        </div>
      </footer>

      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      <RegisterModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
    </div>
  )
}
