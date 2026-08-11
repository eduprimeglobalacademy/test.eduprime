import { useState, useEffect } from 'react'
import { Users, TrendingUp, Target, Award, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { classLabel } from '../../hooks/useClasses'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test } from '../../lib/supabase'

interface AnalyticsOverviewProps {
  tests: Test[]
}

interface Row {
  test_id: string
  total_score: number
  max_score: number
}

export function AnalyticsOverview({ tests }: AnalyticsOverviewProps) {
  const [attempts, setAttempts] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const gradedTestIds = tests.filter(t => t.status !== 'draft').map(t => t.id)

  useEffect(() => {
    if (gradedTestIds.length === 0) { setLoading(false); return }
    setLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('test_attempts')
        .select('test_id, total_score, max_score')
        .in('test_id', gradedTestIds)
        .eq('is_submitted', true)
        .not('max_score', 'is', null)
        .gt('max_score', 0)
      setAttempts((data as Row[]) || [])
      setLoading(false)
    })()
  }, [gradedTestIds.join(',')])

  if (loading) return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>

  const testById = new Map(tests.map(t => [t.id, t]))
  const pct = (r: Row) => (r.total_score / r.max_score) * 100

  const stats = attempts.length > 0 ? (() => {
    const percentages = attempts.map(pct)
    const avg = percentages.reduce((s, p) => s + p, 0) / percentages.length
    return {
      submissions: attempts.length,
      averageScore: Math.round(avg),
      passRate: Math.round(percentages.filter(p => p >= 60).length / percentages.length * 100),
      testsGraded: new Set(attempts.map(a => a.test_id)).size,
    }
  })() : null

  const byClass = (() => {
    const groups = new Map<string, { label: string; total: number; count: number }>()
    for (const a of attempts) {
      const test = testById.get(a.test_id)
      const key = test?.classes?.id || 'none'
      const label = test?.classes ? classLabel(test.classes) : 'No class'
      const g = groups.get(key) || { label, total: 0, count: 0 }
      g.total += pct(a)
      g.count += 1
      groups.set(key, g)
    }
    return Array.from(groups.values()).map(g => ({ name: g.label, average: Math.round(g.total / g.count) }))
  })()

  const testAverages = (() => {
    const groups = new Map<string, { title: string; total: number; count: number }>()
    for (const a of attempts) {
      const test = testById.get(a.test_id)
      if (!test) continue
      const g = groups.get(a.test_id) || { title: test.title, total: 0, count: 0 }
      g.total += pct(a)
      g.count += 1
      groups.set(a.test_id, g)
    }
    return Array.from(groups.values()).map(g => ({ title: g.title, average: Math.round(g.total / g.count), count: g.count }))
      .sort((a, b) => a.average - b.average)
  })()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-ink">Analytics</h2>
        <p className="text-sm text-ink-faint">Performance across every graded assessment</p>
      </div>

      {!stats ? (
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
          <BarChart3 className="w-10 h-10 text-ink-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink mb-2">No submissions yet</h3>
          <p className="text-ink-faint text-sm">Analytics will appear once students start submitting assessments.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Users, color: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]', value: stats.submissions, label: 'Total Submissions' },
              { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600', value: `${stats.averageScore}%`, label: 'Average Score' },
              { icon: Target, color: 'bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary)]', value: `${stats.passRate}%`, label: 'Pass Rate (≥60%)' },
              { icon: Award, color: 'bg-amber-100 text-amber-600', value: stats.testsGraded, label: 'Assessments Graded' },
            ].map(({ icon: Icon, color, value, label }) => (
              <div key={label} className="stat-card text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold font-display text-ink">{value}</div>
                <div className="text-xs text-ink-faint mt-1">{label}</div>
              </div>
            ))}
          </div>

          {byClass.length > 1 && (
            <div className="bg-surface rounded-2xl border border-app shadow-sm p-6">
              <h3 className="text-base font-semibold text-ink mb-5">Average score by class</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byClass}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} name="Avg %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {testAverages.length > 0 && (
            <div className="bg-surface rounded-2xl border border-app shadow-sm overflow-hidden">
              <div className="p-5 border-b border-app">
                <h3 className="text-base font-semibold text-ink">Lowest performing assessments</h3>
                <p className="text-xs text-ink-faint mt-0.5">Worth a second look — sorted lowest average first</p>
              </div>
              <div className="divide-y divide-app">
                {testAverages.slice(0, 5).map(t => (
                  <div key={t.title} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{t.title}</p>
                      <p className="text-xs text-ink-faint">{t.count} submission{t.count !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`text-sm font-semibold ${t.average < 60 ? 'text-red-600' : 'text-ink'}`}>{t.average}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
