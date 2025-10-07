import React, { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LandingPage } from './components/LandingPage'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { TeacherDashboard } from './components/teacher/TeacherDashboard'
import { TestAccess } from './components/student/TestAccess'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

function AppContent() {
  const { user, loading } = useAuth()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
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

  // If not authenticated, show landing page or test access
  if (currentView === 'test-access') {
    return <TestAccess onJoinTest={handleJoinTest} />
  }

  return <LandingPage />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App