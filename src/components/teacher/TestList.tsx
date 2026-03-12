import { useState } from 'react'
import { Eye, BarChart3, Copy, ExternalLink, Calendar, Clock, FileText, Trash2, Edit2, Play, XCircle, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/utils'
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; test: Test | null }>({ show: false, test: null })
  const [deleting, setDeleting] = useState(false)
  const [copying, setCopying] = useState<string | null>(null)

  const handleToggleStatus = async (test: Test) => {
    const newStatus = test.status === 'draft' ? 'live' : test.status === 'live' ? 'closed' : 'draft'
    const { error } = await supabase.from('tests').update({ status: newStatus }).eq('id', test.id)
    if (!error) onTestUpdated()
  }

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopying(key)
    setTimeout(() => setCopying(null), 1500)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.test) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('tests').delete().eq('id', deleteConfirm.test.id)
      if (error) throw error
      onTestUpdated()
      setDeleteConfirm({ show: false, test: null })
    } catch (error) {
      console.error('Error deleting test:', error)
    } finally {
      setDeleting(false)
    }
  }

  const statusConfig = {
    draft: { label: 'Draft', cls: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
    live: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: Play },
    closed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600 border border-gray-200', icon: XCircle },
  }

  return (
    <div className="space-y-4">
      {tests.map(test => {
        const { label, cls, icon: StatusIcon } = statusConfig[test.status as keyof typeof statusConfig] || statusConfig.draft
        return (
          <div key={test.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
                    <span className={`badge text-xs ${cls} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {label}
                    </span>
                  </div>
                  {test.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{test.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateTime(test.created_at)}
                    </span>
                    {test.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {test.duration_minutes} min
                      </span>
                    )}
                    {test.start_time && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Start: {formatDateTime(test.start_time)}</span>}
                    {test.end_time && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />End: {formatDateTime(test.end_time)}</span>}
                  </div>
                </div>
              </div>

              {test.status === 'live' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-indigo-800 mb-3">Share with Learners</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-indigo-100 p-2">
                      <code className="text-sm font-mono text-indigo-700 flex-1 font-bold tracking-widest">{test.test_code}</code>
                      <button
                        onClick={() => copyToClipboard(test.test_code, `code-${test.id}`)}
                        className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-500"
                        title="Copy code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-indigo-600 font-medium">Code</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-indigo-100 p-2">
                      <span className="text-xs font-mono text-indigo-600 flex-1 truncate">{window.location.origin}/assessment</span>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/assessment`, `link-${test.id}`)}
                        className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-500"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => window.open(`${window.location.origin}/assessment`, '_blank')}
                        className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-500"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {copying && <p className="text-xs text-emerald-600 mt-2">Copied!</p>}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  {test.status === 'live' && (
                    <Button variant="outline" size="sm" onClick={() => onPreview(test.id)}>
                      <Eye className="w-3.5 h-3.5" />Preview
                    </Button>
                  )}
                  {test.status === 'draft' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => onEdit(test)}>
                        <Edit2 className="w-3.5 h-3.5" />Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onEditQuestions(test.id)}>
                        <FileText className="w-3.5 h-3.5" />Questions
                      </Button>
                    </>
                  )}
                  {test.status === 'closed' && (
                    <Button variant="outline" size="sm" onClick={() => onReports(test.id)}>
                      <BarChart3 className="w-3.5 h-3.5" />Reports
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm({ show: true, test })}
                    className="text-red-500 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant={test.status === 'draft' ? 'primary' : test.status === 'live' ? 'danger' : 'secondary'}
                  onClick={() => handleToggleStatus(test)}
                >
                  {test.status === 'draft' && <><Play className="w-3.5 h-3.5" />Activate</>}
                  {test.status === 'live' && <><XCircle className="w-3.5 h-3.5" />Close</>}
                  {test.status === 'closed' && <><RotateCcw className="w-3.5 h-3.5" />Reactivate</>}
                </Button>
              </div>
            </div>
          </div>
        )
      })}

      {deleteConfirm.show && deleteConfirm.test && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 animate-in">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Assessment</h3>
              <p className="text-gray-500 text-center text-sm mb-4">
                Are you sure you want to delete "<strong className="text-gray-900">{deleteConfirm.test.title}</strong>"?
              </p>
              <div className="p-3 bg-red-50 rounded-xl border border-red-100 mb-5">
                <ul className="text-xs text-red-700 space-y-0.5">
                  <li>• All questions and answers</li>
                  <li>• Student submissions and results</li>
                  <li>• Analytics and reports</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setDeleteConfirm({ show: false, test: null })} className="flex-1" disabled={deleting}>Cancel</Button>
                <Button variant="danger" onClick={handleDeleteConfirm} loading={deleting} className="flex-1">Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
