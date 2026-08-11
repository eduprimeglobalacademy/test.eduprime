import { useState, useEffect } from 'react'
import { BookOpen, Plus, BarChart3, Clock, Users, LogOut, GraduationCap, Layers, ListChecks } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTenant } from '../../contexts/TenantContext'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { UsageMeter } from '../ui/UsageMeter'
import { OrgStatusBanner } from '../billing/OrgStatusBanner'
import { ConnectGoogleButton } from '../auth/ConnectGoogleButton'
import { TestAuthoring } from './TestAuthoring'
import { TestDashboard } from './TestDashboard'
import { TestPreview } from './TestPreview'
import { TestReports } from './TestReports'
import { ClassGrid } from './ClassGrid'
import { ClassDetail } from './ClassDetail'
import type { Test, Teacher } from '../../lib/supabase'

type ViewMode = 'classes' | 'class-detail' | 'assessments' | 'preview' | 'reports' | 'author'
type SidebarSection = 'classes' | 'assessments'

export function TeacherDashboard() {
  const { user, signOut } = useAuth()
  const { org } = useTenant()
  const { plan } = usePlanLimits()
  const orgName = org?.name || 'EduPrime Global Academy'
  const orgLogo = org?.logo_url || '/eduprimelogo.jpg'
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('classes')
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedTestId, setSelectedTestId] = useState<string>('')
  const [authoringTestId, setAuthoringTestId] = useState<string | undefined>(undefined)
  const [authoringClassId, setAuthoringClassId] = useState<string | undefined>(undefined)

  useEffect(() => { fetchData() }, [user])

  const fetchData = async () => {
    if (!user) return
    try {
      const { data: teacherData } = await supabase.from('teachers').select('*').eq('user_id', user.id).single()
      setTeacher(teacherData)
      if (teacherData) {
        const { data: testsData } = await supabase.from('tests').select('*, classes(id, name, course_name, grade_level)').eq('teacher_id', teacherData.id).order('created_at', { ascending: false })
        setTests(testsData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sidebarSection: SidebarSection = viewMode === 'class-detail' ? 'classes' : viewMode === 'assessments' ? 'assessments' : 'classes'
  const goToClasses = () => { setViewMode('classes'); setSelectedClassId('') }
  const goToAssessments = () => { setViewMode('assessments'); setSelectedClassId('') }
  const openClass = (classId: string) => { setSelectedClassId(classId); setViewMode('class-detail') }

  const handlePreview = (testId: string) => { setSelectedTestId(testId); setViewMode('preview') }
  const handleReports = (testId: string) => { setSelectedTestId(testId); setViewMode('reports') }
  const handleAuthorNew = (classId?: string) => { setAuthoringTestId(undefined); setAuthoringClassId(classId); setViewMode('author') }
  const handleAuthorExisting = (testId: string) => { setAuthoringTestId(testId); setAuthoringClassId(undefined); setViewMode('author') }
  const handleBackFromDetail = () => {
    setSelectedTestId('')
    setAuthoringTestId(undefined)
    setAuthoringClassId(undefined)
    setViewMode(selectedClassId ? 'class-detail' : 'assessments')
    fetchData()
  }

  if (loading) return <div className="min-h-screen bg-app flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (viewMode === 'preview' && selectedTestId) return <TestPreview testId={selectedTestId} onBack={handleBackFromDetail} />
  if (viewMode === 'reports' && selectedTestId) return <TestReports testId={selectedTestId} onBack={handleBackFromDetail} />
  if (viewMode === 'author' && teacher) return <TestAuthoring testId={authoringTestId} teacherId={teacher.id} initialClassId={authoringClassId} onBack={handleBackFromDetail} onTestSaved={fetchData} />

  const draftTests = tests.filter(t => t.status === 'draft')
  const liveTests = tests.filter(t => t.status === 'live')
  const closedTests = tests.filter(t => t.status === 'closed')

  const navItems: { key: SidebarSection; label: string; icon: React.ElementType; onClick: () => void }[] = [
    { key: 'classes', label: 'Classes', icon: Layers, onClick: goToClasses },
    { key: 'assessments', label: 'All Assessments', icon: ListChecks, onClick: goToAssessments },
  ]

  return (
    <div className="min-h-screen bg-app">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 min-w-0">
              <img src={orgLogo} alt={orgName} className="w-8 h-8 object-contain rounded-lg shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold gradient-text truncate">{orgName}</h1>
                <p className="text-xs text-ink-faint flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />Educator Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ConnectGoogleButton />
              <span className="text-sm text-ink-soft hidden md:block">Welcome, {user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden md:block sticky top-24">
          <nav className="space-y-1">
            {navItems.map(({ key, label, icon: Icon, onClick }) => (
              <button
                key={key}
                onClick={onClick}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  sidebarSection === key
                    ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm'
                    : 'text-ink-soft hover:bg-surface-2'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {org && (org.status === 'trial' || org.status === 'past_due' || org.status === 'suspended') && (
            <div className="mb-8">
              <OrgStatusBanner org={org} />
            </div>
          )}

          {viewMode === 'classes' && teacher && (
            <ClassGrid teacherId={teacher.id} tests={tests} onOpenClass={openClass} />
          )}

          {viewMode === 'class-detail' && teacher && selectedClassId && (
            <ClassDetail
              teacherId={teacher.id}
              classId={selectedClassId}
              tests={tests}
              onBack={goToClasses}
              onTestUpdated={fetchData}
              onCreateAssessment={handleAuthorNew}
              onPreview={handlePreview}
              onEdit={(test) => handleAuthorExisting(test.id)}
              onReports={handleReports}
              onEditQuestions={handleAuthorExisting}
            />
          )}

          {viewMode === 'assessments' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Draft', value: draftTests.length, icon: Clock, color: 'bg-amber-100 text-amber-600' },
                  { label: 'Active', value: liveTests.length, icon: BookOpen, color: 'bg-emerald-100 text-emerald-600' },
                  { label: 'Completed', value: closedTests.length, icon: BarChart3, color: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]' },
                  { label: 'Total', value: tests.length, icon: Users, color: 'bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary)]' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="stat-card">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-5 h-5" /></div>
                      <div>
                        <p className="text-xs text-ink-faint font-medium">{label}</p>
                        <p className="text-2xl font-bold font-display text-ink">{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-6 gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-ink">All Assessments</h2>
                  <p className="text-sm text-ink-faint">{tests.length} assessment{tests.length !== 1 ? 's' : ''} across every class</p>
                </div>
                <Button onClick={() => handleAuthorNew()}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Assessment</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </div>

              {plan && (
                <div className="mb-6 max-w-xs">
                  <UsageMeter
                    label="Active assessments"
                    used={draftTests.length + liveTests.length}
                    limit={plan.max_active_tests}
                    unit="active"
                  />
                </div>
              )}

              <TestDashboard
                tests={tests}
                onTestUpdated={fetchData}
                onPreview={handlePreview}
                onEdit={(test) => handleAuthorExisting(test.id)}
                onReports={handleReports}
                onEditQuestions={handleAuthorExisting}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
