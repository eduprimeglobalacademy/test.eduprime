import React, { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import { LandingPage } from './components/LandingPage'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { TeacherDashboard } from './components/teacher/TeacherDashboard'
import { TestAccess } from './components/student/TestAccess'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { OrgNotFound } from './components/tenant/OrgNotFound'
import { RootMarketing } from './components/tenant/RootMarketing'
import { SuperAdminConsole } from './components/superadmin/SuperAdminConsole'
import { ImpersonationBanner } from './components/superadmin/ImpersonationBanner'

function AppContent() {
  const { user, loading } = useAuth()
  const { org, loading: tenantLoading, notFound, isRootDomain } = useTenant()
  const [currentView, setCurrentView] = useState<'landing' | 'test-access'>('landing')

  useEffect(() => {
    // Check if URL is the test access page
    const path = window.location.pathname
    
    if (path === '/test' || path.startsWith('/test/') || path === '/assessment' || path.startsWith('/assessment/')) {
      // Always show test access page for /test routes
      setCurrentView('test-access')
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

  // Platform staff aren't scoped to any org — this check comes before
  // tenant resolution matters, so the console is reachable even from an
  // org's own subdomain or a mistyped one.
  if (user?.role === 'platform_admin') {
    return <SuperAdminConsole />
  }

  if (notFound) {
    return <OrgNotFound />
  }

  // Student test access works from any host, including the root domain,
  // so links shared before an org had its own subdomain keep working.
  if (currentView === 'test-access') {
    return <TestAccess onJoinTest={handleJoinTest} orgId={org?.id} />
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