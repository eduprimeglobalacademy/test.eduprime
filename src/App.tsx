import React, { useEffect, useState, Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ImpersonationBanner } from './components/superadmin/ImpersonationBanner'
import { ShieldCheck } from 'lucide-react'

// Route-level code splitting — a root-marketing visitor was previously downloading
// AdminDashboard/TeacherDashboard (recharts, jspdf, the whole authoring wizard) in
// the same bundle as the page they actually landed on. Each of these is only ever
// needed once App.tsx has already decided which single one to render.
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })))
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })))
const TestAccess = lazy(() => import('./components/student/TestAccess').then(m => ({ default: m.TestAccess })))
const ClassEnrollment = lazy(() => import('./components/student/ClassEnrollment').then(m => ({ default: m.ClassEnrollment })))
const OrgNotFound = lazy(() => import('./components/tenant/OrgNotFound').then(m => ({ default: m.OrgNotFound })))
const RootMarketing = lazy(() => import('./components/tenant/RootMarketing').then(m => ({ default: m.RootMarketing })))

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

const routeFallback = (
  <div className="min-h-screen bg-app flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
)

function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <ImpersonationBanner />
        <Suspense fallback={routeFallback}>
          <AppContent />
        </Suspense>
      </AuthProvider>
    </TenantProvider>
  )
}

export default App