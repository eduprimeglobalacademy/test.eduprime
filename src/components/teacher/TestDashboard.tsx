import { useState } from 'react'
import { Search, Filter, Clock, CheckCircle, Play } from 'lucide-react'
import { TestList } from './TestList'
import type { Test } from '../../lib/supabase'

interface TestDashboardProps {
  tests: Test[]
  onTestUpdated: () => void
  onPreview: (testId: string) => void
  onEdit: (test: Test) => void
  onReports: (testId: string) => void
  onEditQuestions: (testId: string) => void
}

type TestFilter = 'all' | 'draft' | 'live' | 'closed'

export function TestDashboard({ tests, onTestUpdated, onPreview, onEdit, onReports, onEditQuestions }: TestDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<TestFilter>('all')

  const counts = {
    all: tests.length,
    draft: tests.filter(t => t.status === 'draft').length,
    live: tests.filter(t => t.status === 'live').length,
    closed: tests.filter(t => t.status === 'closed').length,
  }

  const filteredTests = tests.filter(test => {
    const matchesFilter = activeFilter === 'all' || test.status === activeFilter
    const matchesSearch = !searchTerm.trim() ||
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.test_code.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filters: { key: TestFilter; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: 'All', icon: Filter },
    { key: 'draft', label: 'Draft', icon: Clock },
    { key: 'live', label: 'Active', icon: Play },
    { key: 'closed', label: 'Completed', icon: CheckCircle },
  ]

  return (
    <div className="space-y-5">
      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input
            placeholder="Search by title, description, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-10 w-full"
          />
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          {filters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                activeFilter === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === key ? 'bg-white/20 text-white' : 'bg-white text-gray-500'}`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredTests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          {searchTerm ? (
            <>
              <p className="text-gray-700 font-medium">No assessments found for "{searchTerm}"</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
            </>
          ) : (
            <>
              <p className="text-gray-700 font-medium">
                {activeFilter === 'all' ? 'No assessments yet' :
                 activeFilter === 'draft' ? 'No draft assessments' :
                 activeFilter === 'live' ? 'No active assessments' : 'No completed assessments'}
              </p>
              {activeFilter === 'all' && <p className="text-gray-400 text-sm mt-1">Create your first assessment to get started</p>}
            </>
          )}
        </div>
      ) : (
        <TestList
          tests={filteredTests}
          onTestUpdated={onTestUpdated}
          onPreview={onPreview}
          onEdit={onEdit}
          onReports={onReports}
          onEditQuestions={onEditQuestions}
        />
      )}
    </div>
  )
}
