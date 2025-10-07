import React, { useState, useEffect } from 'react'
import { BookOpen, Plus, BarChart3, Clock, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle } from '../ui/Card'
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

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return

    try {
      // Get teacher profile
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setTeacher(teacherData)

      if (teacherData) {
        // Get tests
        const { data: testsData } = await supabase
          .from('tests')
          .select('*')
          .eq('teacher_id', teacherData.id)
          .order('created_at', { ascending: false })

        setTests(testsData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (testId: string) => {
    setSelectedTestId(testId)
    setViewMode('preview')
  }

  const handleReports = (testId: string) => {
    setSelectedTestId(testId)
    setViewMode('reports')
  }

  const handleEditQuestions = (testId: string) => {
    setSelectedTestId(testId)
    setViewMode('edit-questions')
  }

  const handleEdit = (test: Test) => {
    setSelectedTest(test)
    setShowEditModal(true)
  }

  const handleBackToDashboard = () => {
    setViewMode('dashboard')
    setSelectedTestId('')
    setSelectedTest(null)
    fetchData() // Refresh data when returning
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (viewMode === 'preview' && selectedTestId) {
    return (
      <TestPreview
        testId={selectedTestId}
        onBack={handleBackToDashboard}
      />
    )
  }

  if (viewMode === 'reports' && selectedTestId) {
    return (
      <TestReports
        testId={selectedTestId}
        onBack={handleBackToDashboard}
      />
    )
  }

  if (viewMode === 'edit-questions' && selectedTestId) {
    return (
      <CreateQuestionPage
        testId={selectedTestId}
        onBack={handleBackToDashboard}
        onQuestionsUpdated={handleBackToDashboard}
      />
    )
  }

  const draftTests = tests.filter(t => t.status === 'draft')
  const liveTests = tests.filter(t => t.status === 'live')
  const closedTests = tests.filter(t => t.status === 'closed')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1">
              <img 
                src="/eduprimelogo.jpg" 
                alt="EduPrime Global Academy" 
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain mr-2 sm:mr-3 flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                  EduPrime Global Academy
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">Educator Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-sm sm:text-base text-gray-700 hidden sm:inline">Welcome, {user?.name}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    await signOut()
                  } catch (error) {
                    console.error('Error signing out:', error)
                  }
                }}
              >
                <span className="sm:hidden">Out</span>
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <div className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-amber-100 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Draft</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{draftTests.length}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg">
                  <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Active</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{liveTests.length}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{closedTests.length}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-violet-100 rounded-lg">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-violet-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{tests.length}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Assessments</h2>
          <Button onClick={() => setShowCreateTest(true)} size="sm" className="sm:size-md">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create New Assessment</span>
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

      {/* Create Test Modal */}
      {showCreateTest && teacher && (
        <CreateTestWizard
          isOpen={showCreateTest}
          onClose={() => setShowCreateTest(false)}
          teacherId={teacher.id}
          onTestCreated={fetchData}
        />
      )}

      {/* Edit Test Modal */}
      {showEditModal && selectedTest && (
        <EditTestModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedTest(null)
          }}
          test={selectedTest}
          onTestUpdated={fetchData}
        />
      )}
    </div>
  )
}