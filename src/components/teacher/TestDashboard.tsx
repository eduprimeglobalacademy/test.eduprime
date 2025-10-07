import React, { useState } from 'react'
import { Search, Filter, Clock, CheckCircle, Play } from 'lucide-react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle } from '../ui/Card'
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

  const filterTests = (tests: Test[], filter: TestFilter, search: string) => {
    let filtered = tests

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(test => test.status === filter)
    }

    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(test => 
        test.title.toLowerCase().includes(searchLower) ||
        test.description?.toLowerCase().includes(searchLower) ||
        test.test_code.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }

  const filteredTests = filterTests(tests, activeFilter, searchTerm)

  const getFilterCounts = () => {
    return {
      all: tests.length,
      draft: tests.filter(t => t.status === 'draft').length,
      live: tests.filter(t => t.status === 'live').length,
      closed: tests.filter(t => t.status === 'closed').length
    }
  }

  const counts = getFilterCounts()

  const filterButtons = [
    { key: 'all' as TestFilter, label: 'All Assessments', count: counts.all, icon: Filter },
    { key: 'draft' as TestFilter, label: 'Draft', count: counts.draft, icon: Clock },
    { key: 'live' as TestFilter, label: 'Active', count: counts.live, icon: Play },
    { key: 'closed' as TestFilter, label: 'Completed', count: counts.closed, icon: CheckCircle }
  ]

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search assessments by title, description, or assessment code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {filterButtons.map(({ key, label, count, icon: Icon }) => (
              <Button
                key={key}
                variant={activeFilter === key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(key)}
                className="flex items-center"
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeFilter === key 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {activeFilter === 'all' ? 'All Assessments' : 
               activeFilter === 'draft' ? 'Draft Assessments' :
               activeFilter === 'live' ? 'Active Assessments' : 'Completed Assessments'}
              {searchTerm && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  - Search: "{searchTerm}"
                </span>
              )}
            </CardTitle>
            <div className="text-sm text-gray-500">
              {filteredTests.length} of {tests.length} assessments
            </div>
          </div>
        </CardHeader>

        {filteredTests.length === 0 ? (
          <div className="text-center py-12">
            {searchTerm ? (
              <div>
                <p className="text-gray-500 text-lg">No assessments found</p>
                <p className="text-gray-400 mt-2">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 text-lg">
                  {activeFilter === 'all' ? 'No assessments created yet' :
                   activeFilter === 'draft' ? 'No draft assessments' :
                   activeFilter === 'live' ? 'No active assessments' : 'No completed assessments'}
                </p>
                <p className="text-gray-400 mt-2">
                  {activeFilter === 'all' ? 'Create your first assessment to get started' : ''}
                </p>
              </div>
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
      </Card>
    </div>
  )
}