import { useState, useEffect } from 'react'
import { BookOpen, Plus, BarChart3, Clock, Users, LogOut, GraduationCap, Layers, ListChecks, Play, Home, Settings as SettingsIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTenant } from '../../contexts/TenantContext'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { UsageMeter } from '../ui/UsageMeter'
import { OrgStatusBanner } from '../billing/OrgStatusBanner'
import { TestAuthoring } from './TestAuthoring'
import { TestDashboard } from './TestDashboard'
import { TestPreview } from './TestPreview'
import { TestReports } from './TestReports'
import { ClassGrid } from './ClassGrid'
import { ClassDetail } from './ClassDetail'
import { DashboardHome } from './DashboardHome'
import { AnalyticsOverview } from './AnalyticsOverview'
import { TeacherSettings } from './TeacherSettings'
import { useClasses } from '../../hooks/useClasses'
import type { Test, Teacher } from '../../lib/supabase'

type ViewMode = 'dashboard' | 'classes' | 'class-detail' | 'assessments' | 'analytics' | 'settings' | 'preview' | 'reports' | 'author'
type SidebarSection = 'dashboard' | 'classes' | 'assessments' | 'analytics' | 'settings'

export function TeacherDashboard() {
  const { user, signOut } = useAuth()
  const { org } = useTenant()
  const { plan } = usePlanLimits()
  const orgName = org?.name || 'EduPrime Global Academy'
  const orgLogo = org?.logo_url || '/eduprimelogo.jpg'
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedTestId, setSelectedTestId] = useState<string>('')
  const [authoringTestId, setAuthoringTestId] = useState<string | undefined>(undefined)
  const [authoringClassId, setAuthoringClassId] = useState<string | undefined>(undefined)
  const { classes, createClass, updateClass, deleteClass } = useClasses(teacher?.id)

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

  const sidebarSection: SidebarSection =
    viewMode === 'assessments' ? 'assessments' :
    viewMode === 'analytics' ? 'analytics' :
    viewMode === 'settings' ? 'settings' :
    viewMode === 'dashboard' ? 'dashboard' : 'classes'
  const goToDashboard = () => { setViewMode('dashboard'); setSelectedClassId('') }
  const goToClasses = () => { setViewMode('classes'); setSelectedClassId('') }
  const goToAssessments = () => { setViewMode('assessments'); setSelectedClassId('') }
  const goToAnalytics = () => { setViewMode('analytics'); setSelectedClassId('') }
  const goToSettings = () => { setViewMode('settings'); setSelectedClassId('') }
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

  return (
    <div className="min-h-screen bg-app flex flex-col">
      {/* Header */}
      <header className="page-header">
        <div className="px-4 sm:px-6 lg:px-8">
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
              <span className="text-sm text-ink-soft hidden md:block">Welcome, {user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — full height, true left edge, separated by a border */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col bg-app-outer border-r border-app-strong px-4 py-6">
          <nav className="space-y-1">
            <button
              onClick={goToDashboard}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                sidebarSection === 'dashboard'
                  ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm'
                  : 'text-ink-soft hover:bg-surface'
              }`}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={goToClasses}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                sidebarSection === 'classes'
                  ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm'
                  : 'text-ink-soft hover:bg-surface'
              }`}
            >
              <Layers className="w-4 h-4" />
              Classes
            </button>

            {/* Class list — real navigation, not just a link */}
            {classes.length > 0 && (
              <div className="pl-3 py-1 space-y-0.5">
                {classes.map(cls => {
                  const classTests = tests.filter(t => t.class_id === cls.id)
                  const live = classTests.filter(t => t.status === 'live').length
                  const active = viewMode === 'class-detail' && selectedClassId === cls.id
                  return (
                    <button
                      key={cls.id}
                      onClick={() => openClass(cls.id)}
                      className={`w-full flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg text-sm text-left transition-colors border-l-2 ${
                        active
                          ? 'border-[var(--brand-primary)] bg-surface text-ink font-medium'
                          : 'border-transparent text-ink-faint hover:text-ink-soft hover:bg-surface/60'
                      }`}
                    >
                      <span className="truncate flex-1">{cls.name}</span>
                      {live > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 shrink-0">
                          <Play className="w-2.5 h-2.5" />{live}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={goToAssessments}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors mt-2 ${
                sidebarSection === 'assessments'
                  ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm'
                  : 'text-ink-soft hover:bg-surface'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              All Assessments
            </button>

            <button
              onClick={goToAnalytics}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                sidebarSection === 'analytics'
                  ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm'
                  : 'text-ink-soft hover:bg-surface'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          </nav>

          <div className="mt-auto pt-4 space-y-4">
            <button
              onClick={goToSettings}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors border-t border-app-strong pt-4 ${
                sidebarSection === 'settings'
                  ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm'
                  : 'text-ink-soft hover:bg-surface'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
            {plan && (
              <div className="pt-4 border-t border-app-strong">
                <UsageMeter
                  label="Active assessments"
                  used={draftTests.length + liveTests.length}
                  limit={plan.max_active_tests}
                  unit="active"
                />
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
          {org && (org.status === 'trial' || org.status === 'past_due' || org.status === 'suspended') && (
            <div className="mb-8">
              <OrgStatusBanner org={org} />
            </div>
          )}

          {viewMode === 'dashboard' && (
            <DashboardHome tests={tests} onGoToClasses={goToClasses} onCreateAssessment={() => handleAuthorNew()} onReports={handleReports} />
          )}

          {viewMode === 'classes' && (
            <ClassGrid classes={classes} tests={tests} createClass={createClass} onOpenClass={openClass} />
          )}

          {viewMode === 'class-detail' && selectedClassId && (
            <ClassDetail
              classId={selectedClassId}
              classes={classes}
              tests={tests}
              updateClass={updateClass}
              deleteClass={deleteClass}
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

          {viewMode === 'analytics' && <AnalyticsOverview tests={tests} />}

          {viewMode === 'settings' && teacher && user && (
            <TeacherSettings teacher={teacher} email={user.email} onTeacherUpdated={fetchData} />
          )}
        </div>
      </div>
    </div>
  )
}
