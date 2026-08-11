import { useState, useEffect } from 'react'
import { Hash, ArrowRight, GraduationCap } from 'lucide-react'
import { TestInterface } from './TestInterface'
import { TestResults } from './TestResults'
import { Button } from '../ui/Button'
import { useTenant } from '../../contexts/TenantContext'

interface TestAccessProps {
  onJoinTest: (testCode: string) => void
  orgId?: string
}

type ViewMode = 'access' | 'test' | 'results'

export function TestAccess({ onJoinTest, orgId }: TestAccessProps) {
  const { org } = useTenant()
  const orgName = org?.name || 'EduPrime Global Academy'
  const orgLogo = org?.logo_url || '/eduprimelogo.jpg'
  const [testCode, setTestCode] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('access')
  const [currentTestCode, setCurrentTestCode] = useState('')
  const [testResults, setTestResults] = useState<any>(null)

  useEffect(() => {
    const codeFromUrl = new URLSearchParams(window.location.search).get('code')
    if (codeFromUrl) {
      setCurrentTestCode(codeFromUrl.toUpperCase())
      setViewMode('test')
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (testCode.trim()) {
      setCurrentTestCode(testCode.trim().toUpperCase())
      setViewMode('test')
    }
  }

  if (viewMode === 'test') return <TestInterface testCode={currentTestCode} orgId={orgId} onComplete={(r) => { setTestResults(r); setViewMode('results') }} />
  if (viewMode === 'results' && testResults) return <TestResults results={testResults} />

  return (
    <div className="theme-dark min-h-screen bg-app-outer flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={orgLogo} alt={orgName} className="w-16 h-16 object-contain rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-xl font-bold gradient-text mb-1">{orgName}</h1>
          <h2 className="text-2xl font-bold text-ink">Join Assessment</h2>
          <p className="text-ink-faint mt-2 text-sm">Enter the code provided by your educator</p>
        </div>

        <div className="bg-surface rounded-2xl border border-app shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Assessment Code</label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted w-5 h-5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                  className="input-base pl-11 text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={testCode.length < 4}>
              Join Assessment
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-6 p-4 bg-app rounded-xl border border-app">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-4 h-4 text-ink-muted" />
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide">How to access</p>
            </div>
            <ul className="text-xs text-ink-faint space-y-1.5">
              <li>• Enter the 6-character code provided by your educator</li>
              <li>• Assessments are only accessible during their scheduled window</li>
              <li>• Each student can only take a test once</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
