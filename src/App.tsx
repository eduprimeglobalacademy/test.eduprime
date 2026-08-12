import React, { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import { LandingPage } from './components/LandingPage'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { TeacherDashboard } from './components/teacher/TeacherDashboard'
import { TestAccess } from './components/student/TestAccess'
import { ClassEnrollment } from './components/student/ClassEnrollment'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { OrgNotFound } from './components/tenant/OrgNotFound'
import { RootMarketing } from './components/tenant/RootMarketing'
import { ImpersonationBanner } from './components/superadmin/ImpersonationBanner'
import { ShieldCheck } from 'lucide-react'

const PLATFORM_CONSOLE_URL = 'https://admin.test.eduprimeglobalacademy.com'

function AppContent() {
  const { user, loading } = useAuth()
  const { org, loading: tenantLoading, notFound, isRootDomain } = useTenant()
  const [currentView, setCurrentView] = useState<'landing' | 'test-access' | 'enroll'>('landing')
  const [enrollClassId, setEnrollClassId] = useState<string | null>(null)

  useEffect(() => {
    // Check if URL is the test access page
    const path = window.location.pathname

    if (path === '/test' || path.startsWith('/test/') || path === '/assessment' || path.startsWith('/assessment/')) {
      // Always show test access page for /test routes
      setCurrentView('test-access')
    } else if (path === '/enroll') {
      const classId = new URLSearchParams(window.location.search).get('class')
      if (classId) { setEnrollClassId(classId); setCurrentView('enroll') }
    }
  }, [])

  const handleJoinTest = (testCode: string) => {
    // Keep URL as /assessment (no test code in URL)
    window.history.pushState({}, '', '/assessment')
    setCurrentView('test-access')
  }

  if (tenantLoading || loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Platform staff aren't scoped to any org, and the console they need
  // lives in a separate app now (own repo/deploy — see eduprime-admin) so
  // it doesn't ship platform-only code in every customer's bundle. This
  // check still comes before tenant resolution so it catches a platform
  // admin signing in from any host, including a mistyped one.
  if (user?.role === 'platform_admin') {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-md p-8 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 mx-auto bg-[var(--brand-primary-soft)]">
            <ShieldCheck className="w-6 h-6 text-[var(--brand-primary)]" />
          </div>
          <h1 className="text-lg font-bold text-ink mb-1.5">Wrong app for platform staff</h1>
          <p className="text-sm text-ink-faint mb-6">
            Platform admin accounts sign in at the dedicated admin console, not here.
          </p>
          <a href={PLATFORM_CONSOLE_URL} className="btn-primary w-full inline-flex items-center justify-center">
            Go to admin console
          </a>
        </div>
      </div>
    )
  }

  if (notFound) {
    return <OrgNotFound />
  }

  // Student test access works from any host, including the root domain,
  // so links shared before an org had its own subdomain keep working.
  if (currentView === 'test-access') {
    return <TestAccess onJoinTest={handleJoinTest} orgId={org?.id} />
  }

  if (currentView === 'enroll' && enrollClassId) {
    return <ClassEnrollment classId={enrollClassId} orgId={org?.id} />
  }

  // If user is authenticated, show appropriate dashboard
  if (user) {
    if (user.role === 'admin') {
      return <AdminDashboard />
    }
    if (user.role === 'teacher') {
      return <TeacherDashboard />
    }
  }

  if (isRootDomain) {
    return <RootMarketing />
  }

  return <LandingPage />
}

function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <ImpersonationBanner />
        <AppContent />
      </AuthProvider>
    </TenantProvider>
  )
}

export default App