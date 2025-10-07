import React, { useState } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import { TestInterface } from './TestInterface'
import { TestResults } from './TestResults'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'

interface TestAccessProps {
  onJoinTest: (testCode: string) => void
}

type ViewMode = 'access' | 'test' | 'results'
export function TestAccess({ onJoinTest }: TestAccessProps) {
  const [testCode, setTestCode] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('access')
  const [currentTestCode, setCurrentTestCode] = useState('')
  const [testResults, setTestResults] = useState<any>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (testCode.trim()) {
      setCurrentTestCode(testCode.trim().toUpperCase())
      setViewMode('test')
    }
  }

  const handleTestComplete = (results: any) => {
    setTestResults(results)
    setViewMode('results')
  }


  if (viewMode === 'test') {
    return (
      <TestInterface
        testCode={currentTestCode}
        onComplete={handleTestComplete}
      />
    )
  }

  if (viewMode === 'results' && testResults) {
    return (
      <TestResults
        results={testResults}
      />
    )
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-md mx-2">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img 
              src="/eduprimelogo.jpg" 
              alt="EduPrime Global Academy" 
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain mb-4"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
              EduPrime Global Academy
            </h1>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Join Assessment</h2>
          </div>
          <p className="text-sm sm:text-base text-gray-600 px-2">Enter the assessment code provided by your educator</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Enter assessment code (e.g., ABC123)"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              className="pl-10 text-center text-base sm:text-lg font-mono"
              maxLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Join Assessment
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </form>

        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">How to access an assessment:</h3>
          <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
            <li>• Enter the 6-character assessment code provided by your educator</li>
            <li>• Or click on the secure link shared by your educator</li>
            <li>• Assessments are only accessible during their scheduled time</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}