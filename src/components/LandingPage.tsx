import { useState } from 'react'
import { ShieldCheck, GraduationCap, KeyRound, ArrowRight } from 'lucide-react'
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
    <div className="min-h-screen bg-surface overflow-x-hidden flex flex-col">
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

      {/* Hero — portal, not pitch: this is the org's own entry point for people who already belong here */}
      <section className="relative flex-1 flex items-center pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-app-outer" />
        <div className="absolute top-20 right-0 w-72 h-72 bg-[var(--brand-primary-soft)] rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--brand-secondary-soft)] rounded-full blur-3xl opacity-30" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-8">
            <img
              src={orgLogo}
              alt={orgName}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl shadow-lg"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-ink mb-4 leading-tight">
            <span className="gradient-text">{orgName}</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-soft max-w-xl mx-auto mb-12">
            Assessment portal — sign in to manage or take your tests.
          </p>

          {/* Three entry points: admin/teacher sign-in, educator registration, student test access */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <button
              onClick={() => setShowSignIn(true)}
              className="group p-6 rounded-2xl border border-app bg-surface hover:border-[var(--brand-primary-soft)] hover:shadow-md transition-all duration-200"
            >
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-ink mb-1">Sign In</h3>
              <p className="text-sm text-ink-faint">Administrators &amp; educators</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium mt-3 text-[var(--brand-primary)] group-hover:gap-1.5 transition-all">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            <button
              onClick={() => setShowRegister(true)}
              className="group p-6 rounded-2xl border border-app bg-surface hover:border-[var(--brand-primary-soft)] hover:shadow-md transition-all duration-200"
            >
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary)]">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-ink mb-1">Register</h3>
              <p className="text-sm text-ink-faint">Have an educator token?</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium mt-3 text-[var(--brand-primary)] group-hover:gap-1.5 transition-all">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            <a
              href="/test"
              className="group p-6 rounded-2xl border border-app bg-surface hover:border-[var(--brand-primary-soft)] hover:shadow-md transition-all duration-200"
            >
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-emerald-100 text-emerald-600">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-ink mb-1">Take a Test</h3>
              <p className="text-sm text-ink-faint">Enter your test code</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium mt-3 text-[var(--brand-primary)] group-hover:gap-1.5 transition-all">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-app bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
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
