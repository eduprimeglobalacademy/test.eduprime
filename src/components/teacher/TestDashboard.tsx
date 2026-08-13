import { useMemo, useState } from 'react'
import { Search, Filter, Clock, CheckCircle, Play } from 'lucide-react'
import { TestList } from './TestList'
import { classLabel, testBelongsToClass } from '../../hooks/useClasses'
import type { Test } from '../../lib/supabase'

interface TestDashboardProps {
  tests: Test[]
  onTestUpdated: () => void
  onEdit: (test: Test) => void
}

type TestFilter = 'all' | 'draft' | 'live' | 'closed'

export function TestDashboard({ tests, onTestUpdated, onEdit }: TestDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<TestFilter>('all')
  const [classFilter, setClassFilter] = useState('')

  const counts = {
    all: tests.length,
    draft: tests.filter(t => t.status === 'draft').length,
    live: tests.filter(t => t.status === 'live').length,
    closed: tests.filter(t => t.status === 'closed').length,
  }

  const classOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of tests) {
      if (t.classes) seen.set(t.classes.id, classLabel(t.classes) + (t.classes.grade_level ? ` (${t.classes.grade_level})` : ''))
    }
    return Array.from(seen.entries())
  }, [tests])

  const filteredTests = tests.filter(test => {
    const matchesFilter = activeFilter === 'all' || test.status === activeFilter
    const matchesClass = !classFilter || testBelongsToClass(test, classFilter)
    const matchesSearch = !searchTerm.trim() ||
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.test_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.classes?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.classes?.course_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesClass && matchesSearch
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
      <div className="bg-surface rounded-2xl border border-app shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-4 h-4 pointer-events-none" />
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
                    ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm'
                    : 'bg-surface-2 text-ink-soft hover:bg-surface-2'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === key ? 'bg-surface/20 text-white' : 'bg-surface text-ink-faint'}`}>
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {classOptions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-app">
            <span className="text-xs font-medium text-ink-faint mr-1 shrink-0">Class</span>
            <button
              onClick={() => setClassFilter('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                !classFilter ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary-darker)]' : 'bg-surface-2 text-ink-faint hover:bg-surface-2'
              }`}
            >
              All
            </button>
            {classOptions.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setClassFilter(id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  classFilter === id ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary-darker)]' : 'bg-surface-2 text-ink-faint hover:bg-surface-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {filteredTests.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
          {searchTerm ? (
            <>
              <p className="text-ink-soft font-medium">No assessments found for "{searchTerm}"</p>
              <p className="text-ink-muted text-sm mt-1">Try adjusting your search or filter</p>
            </>
          ) : (
            <>
              <p className="text-ink-soft font-medium">
                {activeFilter === 'all' ? 'No assessments yet' :
                 activeFilter === 'draft' ? 'No draft assessments' :
                 activeFilter === 'live' ? 'No active assessments' : 'No completed assessments'}
              </p>
              {activeFilter === 'all' && <p className="text-ink-muted text-sm mt-1">Create your first assessment to get started</p>}
            </>
          )}
        </div>
      ) : (
        <TestList
          tests={filteredTests}
          onTestUpdated={onTestUpdated}
          onEdit={onEdit}
        />
      )}
    </div>
  )
}
