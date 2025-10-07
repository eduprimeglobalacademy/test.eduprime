import React from 'react'
import { Eye, CreditCard as Edit, BarChart3, Copy, ExternalLink, Calendar, Clock, FileText, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTime, isTestActive } from '../../lib/utils'
import { Button } from '../ui/Button'
import type { Test } from '../../lib/supabase'

interface TestListProps {
  tests: Test[]
  onTestUpdated: () => void
  onPreview: (testId: string) => void
  onEdit: (test: Test) => void
  onReports: (testId: string) => void
  onEditQuestions: (testId: string) => void
}

export function TestList({ tests, onTestUpdated, onPreview, onEdit, onReports, onEditQuestions }: TestListProps) {
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ show: boolean; test: Test | null }>({
    show: false,
    test: null
  })
  const [deleting, setDeleting] = React.useState(false)

  const handleToggleStatus = async (test: Test) => {
    const newStatus = test.status === 'draft' ? 'live' : test.status === 'live' ? 'closed' : 'draft'
    
    const { error } = await supabase
      .from('tests')
      .update({ status: newStatus })
      .eq('id', test.id)

    if (error) {
      console.error('Error updating test status:', error)
      return
    }

    onTestUpdated()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleDeleteClick = (test: Test) => {
    setDeleteConfirm({ show: true, test })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.test) return
    
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', deleteConfirm.test.id)

      if (error) throw error

      onTestUpdated()
      setDeleteConfirm({ show: false, test: null })
    } catch (error) {
      console.error('Error deleting test:', error)
      alert('Failed to delete test. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, test: null })
  }

  if (tests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No assessments created yet</p>
        <p className="text-gray-400 mt-2">Create your first assessment to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tests.map((test) => (
        <div key={test.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{test.title}</h3>
              {test.description && (
                <p className="text-gray-600 mb-3">{test.description}</p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Created: {formatDateTime(test.created_at)}
                </div>
                {test.duration_minutes && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Duration: {test.duration_minutes} min
                  </div>
                )}
              </div>

              {(test.start_time || test.end_time) && (
                <div className="mt-2 text-sm text-gray-600">
                  {test.start_time && (
                    <div>Start: {formatDateTime(test.start_time)}</div>
                  )}
                  {test.end_time && (
                    <div>End: {formatDateTime(test.end_time)}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                test.status === 'draft' 
                  ? 'bg-gray-100 text-gray-800'
                  : test.status === 'live'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
              </span>
            </div>
          </div>

          {test.status === 'live' && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-indigo-900 mb-2">Share with Learners</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <code className="bg-indigo-100 px-2 py-1 rounded text-sm text-indigo-800 font-mono">
                    {test.test_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(test.test_code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-indigo-700">Assessment Code</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="bg-indigo-100 px-2 py-1 rounded text-sm text-indigo-800 font-mono">
                    {window.location.origin}/assessment
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`${window.location.origin}/assessment`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`${window.location.origin}/assessment`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-indigo-700">Learner Access Link</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {/* Show different buttons based on test status */}
              {test.status === 'live' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onPreview(test.id)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              )}
              
              {test.status === 'draft' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit(test)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              
              {test.status === 'draft' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEditQuestions(test.id)}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Edit Questions
                </Button>
              )}
              
              {test.status === 'closed' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onReports(test.id)}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Reports
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteClick(test)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>

            <Button
              variant={test.status === 'draft' ? 'primary' : test.status === 'live' ? 'danger' : 'secondary'}
              size="sm"
              onClick={() => handleToggleStatus(test)}
            >
              {test.status === 'draft' ? 'Activate' : test.status === 'live' ? 'Close Assessment' : 'Reactivate'}
            </Button>
          </div>
        </div>
      ))}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.test && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Assessment
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete "<strong>{deleteConfirm.test.title}</strong>"? 
                This action cannot be undone and will permanently remove:
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• All questions and answers</li>
                  <li>• Student submissions and results</li>
                  <li>• Assessment analytics and reports</li>
                  <li>• Assessment access codes</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleDeleteCancel}
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  loading={deleting}
                  className="flex-1"
                >
                  Delete Assessment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}