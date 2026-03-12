import { useState, useEffect } from 'react'
import { BookOpen, Plus, BarChart3, Clock, Users, LogOut, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { CreateTestWizard } from './CreateTestWizard'
import { TestDashboard } from './TestDashboard'
import { TestPreview } from './TestPreview'
import { TestReports } from './TestReports'
import { EditTestModal } from './EditTestModal'
import { CreateQuestionPage } from './CreateQuestionPage'
import type { Test, Teacher } from '../../lib/supabase'

type ViewMode = 'dashboard' | 'preview' | 'reports' | 'edit' | 'edit-questions'

export function TeacherDashboard() {
  const { user, signOut } = useAuth()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTest, setShowCreateTest] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [selectedTestId, setSelectedTestId] = useState<string>('')
  const [selectedTest, setSelectedTest] = useState<Test | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => { fetchData() }, [user])

  const fetchData = async () => {
    if (!user) return
    try {
      const { data: teacherData } = await supabase.from('teachers').select('*').eq('user_id', user.id).single()
      setTeacher(teacherData)
      if (teacherData) {
        const { data: testsData } = await supabase.from('tests').select('*').eq('teacher_id', teacherData.id).order('created_at', { ascending: false })
        setTests(testsData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (testId: string) => { setSelectedTestId(testId); setViewMode('preview') }
  const handleReports = (testId: string) => { setSelectedTestId(testId); setViewMode('reports') }
  const handleEditQuestions = (testId: string) => { setSelectedTestId(testId); setViewMode('edit-questions') }
  const handleEdit = (test: Test) => { setSelectedTest(test); setShowEditModal(true) }
  const handleBack = () => { setViewMode('dashboard'); setSelectedTestId(''); setSelectedTest(null); fetchData() }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (viewMode === 'preview' && selectedTestId) return <TestPreview testId={selectedTestId} onBack={handleBack} />
  if (viewMode === 'reports' && selectedTestId) return <TestReports testId={selectedTestId} onBack={handleBack} />
  if (viewMode === 'edit-questions' && selectedTestId) return <CreateQuestionPage testId={selectedTestId} onBack={handleBack} onQuestionsUpdated={handleBack} />

  const draftTests = tests.filter(t => t.status === 'draft')
  const liveTests = tests.filter(t => t.status === 'live')
  const closedTests = tests.filter(t => t.status === 'closed')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/eduprimelogo.jpg" alt="EduPrime" className="w-8 h-8 object-contain rounded-lg shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold gradient-text truncate">EduPrime Global Academy</h1>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />Educator Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-sm text-gray-600 hidden md:block">Welcome, {user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Draft', value: draftTests.length, icon: Clock, color: 'bg-amber-100 text-amber-600' },
            { label: 'Active', value: liveTests.length, icon: BookOpen, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Completed', value: closedTests.length, icon: BarChart3, color: 'bg-indigo-100 text-indigo-600' },
            { label: 'Total', value: tests.length, icon: Users, color: 'bg-violet-100 text-violet-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Assessments header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Assessments</h2>
            <p className="text-sm text-gray-500">{tests.length} assessment{tests.length !== 1 ? 's' : ''} total</p>
          </div>
          <Button onClick={() => setShowCreateTest(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Assessment</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>

        <TestDashboard
          tests={tests}
          onTestUpdated={fetchData}
          onPreview={handlePreview}
          onEdit={handleEdit}
          onReports={handleReports}
          onEditQuestions={handleEditQuestions}
        />
      </div>

      {showCreateTest && teacher && (
        <CreateTestWizard
          isOpen={showCreateTest}
          onClose={() => setShowCreateTest(false)}
          teacherId={teacher.id}
          onTestCreated={fetchData}
        />
      )}
      {showEditModal && selectedTest && (
        <EditTestModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedTest(null) }}
          test={selectedTest}
          onTestUpdated={fetchData}
        />
      )}
    </div>
  )
}
