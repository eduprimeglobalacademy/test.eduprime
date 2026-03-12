import { useState } from 'react'
import { GraduationCap, Users, Shield, BookOpen, ArrowRight, CheckCircle } from 'lucide-react'
import { SignInModal } from './auth/SignInModal'
import { RegisterModal } from './auth/RegisterModal'
import { Button } from './ui/Button'

export function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/eduprimelogo.jpg" alt="EduPrime" className="w-8 h-8 object-contain rounded-lg" />
            <span className="font-bold text-gray-900 text-lg hidden sm:block">EduPrime Global Academy</span>
            <span className="font-bold text-gray-900 text-lg sm:hidden">EduPrime</span>
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
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
        <div className="absolute top-20 right-0 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-8">
            <GraduationCap className="w-4 h-4" />
            Premier Assessment Platform
          </div>

          <div className="flex justify-center mb-8">
            <img
              src="/eduprimelogo.jpg"
              alt="EduPrime Global Academy"
              className="w-20 h-20 sm:w-28 sm:h-28 object-contain rounded-2xl shadow-lg"
            />
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              EduPrime
            </span>
            <br />
            <span className="text-3xl sm:text-4xl md:text-5xl text-gray-700 font-semibold">
              Global Academy
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
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

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why choose EduPrime?
            </h2>
            <p className="text-lg text-gray-600">World-class features designed for educational excellence</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                color: 'bg-indigo-100 text-indigo-600',
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
                color: 'bg-violet-100 text-violet-600',
                title: 'Enterprise Security',
                desc: 'Built with enterprise-grade standards. Automatic submission, precise time controls, and comprehensive reporting for fair assessments.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="group p-8 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all duration-200 bg-white">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Streamlined workflow for educational institutions</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                num: '1',
                color: 'bg-indigo-600',
                title: 'Institutional Setup',
                desc: 'Administrators create educator tokens for secure institutional onboarding and account management.',
              },
              {
                num: '2',
                color: 'bg-violet-600',
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
              <div key={num} className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-6 mx-auto`}>
                  {num}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <img src="/eduprimelogo.jpg" alt="EduPrime" className="w-6 h-6 object-contain rounded" />
            <span className="text-sm font-medium">EduPrime Global Academy</span>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} EduPrime Global Academy. All rights reserved.</p>
        </div>
      </footer>

      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
      <RegisterModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
    </div>
  )
}
