import { useState, useEffect } from 'react'
import { ArrowLeft, Download, Users, BarChart3, Clock, Award, TrendingUp, Target, Star, Lock, Sparkles } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDateTime, exportToCSV } from '../../lib/utils'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { useAddonCapacity } from '../../hooks/useAddonCapacity'
import { useTenant } from '../../contexts/TenantContext'
import { classLabel } from '../../hooks/useClasses'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { UsageMeter } from '../ui/UsageMeter'
import type { Test, TestAttempt, StudentAnswer } from '../../lib/supabase'

interface TestReportsProps {
  testId: string
  onBack: () => void
  onFlagStudent?: (email: string, name?: string) => void
  isFlagged?: (email: string) => boolean
}

interface AttemptWithAnswers extends TestAttempt {
  answers: StudentAnswer[]
}

const GRADE_COLORS = ['#10B981', '#06B6D4', '#F59E0B', '#F97316', '#EF4444']

export function TestReports({ testId, onBack, onFlagStudent, isFlagged }: TestReportsProps) {
  const { plan } = usePlanLimits()
  const { org } = useTenant()
  const { extraStudents: extraStudentCapacity } = useAddonCapacity()
  const [test, setTest] = useState<Test | null>(null)
  const [attempts, setAttempts] = useState<AttemptWithAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [testId])

  const fetchData = async () => {
    try {
      const { data: testData, error: te } = await supabase.from('tests').select('*, classes(id, name, course_name, grade_level)').eq('id', testId).single()
      if (te) throw te
      setTest(testData)
      const { data: attData, error: ae } = await supabase.from('test_attempts').select('*, student_answers (*)').eq('test_id', testId).eq('is_submitted', true).not('total_score', 'is', null).not('max_score', 'is', null).gt('max_score', 0).order('submitted_at', { ascending: false })
      if (ae) throw ae
      setAttempts(attData.map(a => ({ ...a, answers: a.student_answers || [] })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  // Capacity gates VIEWING results past the included limit, never
  // submitting one — every student who takes the test is fully recorded
  // regardless of plan. Metered-billing orgs pay for actual usage, and
  // public exams (hiring/onboarding — unknown, unbounded participants)
  // are exempt entirely, so neither is ever capped here.
  // First-submitted-first-unlocked.
  const effectiveStudentLimit = org?.student_billing_mode === 'metered' || test?.is_public_exam
    ? null
    : plan?.max_students_per_test != null ? plan.max_students_per_test + extraStudentCapacity : null
  const unlockedIds = effectiveStudentLimit == null
    ? null
    : new Set(
        [...attempts]
          .sort((a, b) => (a.submitted_at || '').localeCompare(b.submitted_at || ''))
          .slice(0, effectiveStudentLimit)
          .map(a => a.id)
      )
  const lockedCount = unlockedIds ? attempts.length - unlockedIds.size : 0
  const isUnlocked = (id: string) => !unlockedIds || unlockedIds.has(id)

  const exportResults = () => {
    const data = attempts.filter(a => isUnlocked(a.id)).map(a => ({
      'Student Name': a.student_name || 'N/A',
      'Email': a.student_email || 'N/A',
      'Score': a.total_score || 0,
      'Max Score': a.max_score || 0,
      'Percentage': a.max_score > 0 ? Math.round(((a.total_score || 0) / a.max_score) * 100) : 0,
      'Time Taken (minutes)': a.time_taken_seconds ? Math.round(a.time_taken_seconds / 60) : 'N/A',
      'Submitted At': a.submitted_at ? formatDateTime(a.submitted_at) : 'N/A'
    }))
    exportToCSV(data, `${test?.title}_results`)
  }

  // Every grade-derived stat on this screen (pass rate, the grade
  // distribution chart, and the per-student Grade column below) reads
  // from the same config now, falling back to the same 90/80/70/60/60
  // defaults GradingFields itself defaults to — previously the pie chart
  // and pass-rate stat silently ignored a test's configured boundaries
  // while the per-student column respected them, so they could disagree
  // about a borderline student's grade on the same screen.
  const gradingCfg = test?.grading_config || { aGrade: 90, bGrade: 80, cGrade: 70, dGrade: 60, passingGrade: 60 }
  const passingGrade = gradingCfg.passingGrade ?? 60

  const stats = (() => {
    const valid = attempts.filter(a => a.max_score > 0)
    if (!valid.length) return null
    const scores = valid.map(a => ((a.total_score || 0) / a.max_score) * 100)
    const avg = scores.reduce((s, x) => s + x, 0) / scores.length
    const times = attempts.filter(a => a.time_taken_seconds).map(a => a.time_taken_seconds!)
    return {
      totalAttempts: attempts.length,
      averageScore: Math.round(avg),
      highestScore: Math.round(Math.max(...scores)),
      lowestScore: Math.round(Math.min(...scores)),
      passRate: Math.round(scores.filter(s => s >= passingGrade).length / scores.length * 100),
      averageTime: times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length / 60) : 0,
    }
  })()

  const gradeDistribution = (() => {
    const valid = attempts.filter(a => a.max_score > 0)
    if (!valid.length) return []
    const c = gradingCfg
    const labels = [
      `A (${c.aGrade}-100%)`,
      `B (${c.bGrade}-${c.aGrade - 1}%)`,
      `C (${c.cGrade}-${c.bGrade - 1}%)`,
      `D (${c.dGrade}-${c.cGrade - 1}%)`,
      `F (0-${c.dGrade - 1}%)`,
    ]
    const g: Record<string, number> = Object.fromEntries(labels.map(l => [l, 0]))
    valid.forEach(a => {
      const p = ((a.total_score || 0) / a.max_score) * 100
      if (p >= c.aGrade) g[labels[0]]++
      else if (p >= c.bGrade) g[labels[1]]++
      else if (p >= c.cGrade) g[labels[2]]++
      else if (p >= c.dGrade) g[labels[3]]++
      else g[labels[4]]++
    })
    return Object.entries(g).filter(([, v]) => v > 0).map(([name, value], i) => ({ name, value, color: GRADE_COLORS[i] }))
  })()

  const scoreDistribution = (() => {
    const valid = attempts.filter(a => a.max_score > 0)
    if (!valid.length) return []
    const r: Record<string, number> = { '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 }
    valid.forEach(a => {
      const p = ((a.total_score || 0) / a.max_score) * 100
      if (p <= 20) r['0-20%']++
      else if (p <= 40) r['21-40%']++
      else if (p <= 60) r['41-60%']++
      else if (p <= 80) r['61-80%']++
      else r['81-100%']++
    })
    return Object.entries(r).map(([range, count]) => ({ range, count }))
  })()

  const getGrade = (pct: number) => {
    const c = gradingCfg
    if (pct >= c.aGrade) return { grade: 'A', cls: 'bg-emerald-100 text-emerald-700' }
    if (pct >= c.bGrade) return { grade: 'B', cls: 'bg-blue-100 text-blue-700' }
    if (pct >= c.cGrade) return { grade: 'C', cls: 'bg-amber-100 text-amber-700' }
    if (pct >= c.dGrade) return { grade: 'D', cls: 'bg-orange-100 text-orange-700' }
    return { grade: 'F', cls: 'bg-red-100 text-red-700' }
  }

  if (loading) return <div className="min-h-screen bg-app flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (error) return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-app shadow-sm w-full max-w-md p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-app">
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="w-4 h-4" />Back
              </Button>
              <div>
                <p className="text-base font-bold text-ink">{test?.title}</p>
                <p className="text-xs text-ink-faint flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />Analytics & Reports
                  {test?.classes && <>· {classLabel(test.classes)}{test.classes.grade_level ? ` (${test.classes.grade_level})` : ''}</>}
                </p>
              </div>
            </div>
            <Button onClick={exportResults} disabled={!attempts.length} variant="outline" size="sm">
              <Download className="w-4 h-4" />Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!attempts.length ? (
          <div className="bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
            <Users className="w-14 h-14 text-ink-muted mx-auto mb-4" />
            <h3 className="text-lg font-bold text-ink mb-2">No Submissions Yet</h3>
            <p className="text-ink-faint text-sm">Students haven't submitted this assessment yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {plan && (
              <div className="bg-surface rounded-2xl border border-app shadow-sm p-5 max-w-sm">
                <UsageMeter
                  label="Students on this assessment"
                  used={attempts.length}
                  limit={plan.max_students_per_test}
                  unit="submitted"
                />
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { icon: Users, color: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]', value: stats.totalAttempts, label: 'Total Attempts' },
                  { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600', value: `${stats.averageScore}%`, label: 'Average Score' },
                  { icon: Award, color: 'bg-amber-100 text-amber-600', value: `${stats.highestScore}%`, label: 'Highest Score' },
                  { icon: Target, color: 'bg-red-100 text-red-600', value: `${stats.lowestScore}%`, label: 'Lowest Score' },
                  { icon: BarChart3, color: 'bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary)]', value: `${stats.passRate}%`, label: `Pass Rate (≥${passingGrade}%)` },
                  { icon: Clock, color: 'bg-blue-100 text-blue-600', value: `${stats.averageTime}m`, label: 'Avg Time' },
                ].map(({ icon: Icon, color, value, label }) => (
                  <div key={label} className="bg-surface rounded-2xl border border-app shadow-sm p-5 text-center">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold font-display text-ink">{value}</div>
                    <div className="text-xs text-ink-faint mt-1">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Charts */}
            {(gradeDistribution.length > 0 || scoreDistribution.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-6">
                {gradeDistribution.length > 0 && (
                  <div className="bg-surface rounded-2xl border border-app shadow-sm p-6">
                    <h3 className="text-base font-semibold text-ink mb-5">Grade Distribution</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        {/* This recharts version's Pie grow-in animation intermittently never resolves to a
                            rendered path — sectors stay permanently empty <g>s. Skip the animation entirely. */}
                        <Pie data={gradeDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" isAnimationActive={false} label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}>
                          {gradeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {scoreDistribution.length > 0 && (
                  <div className="bg-surface rounded-2xl border border-app shadow-sm p-6">
                    <h3 className="text-base font-semibold text-ink mb-5">Score Distribution</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            <div className="bg-surface rounded-2xl border border-app shadow-sm overflow-hidden">
              <div className="p-6 border-b border-app">
                <h3 className="text-base font-semibold text-ink">Individual Results</h3>
                {lockedCount > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>{lockedCount} result{lockedCount !== 1 ? 's' : ''} locked — you're over your plan's student limit for this test.</span>
                    <span className="inline-flex items-center gap-1 font-medium ml-auto shrink-0"><Sparkles className="w-3.5 h-3.5" />Buy more capacity from Billing</span>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-app border-b border-app">
                      {['Learner', 'Score', 'Percentage', 'Grade', 'Time Taken', 'Submitted', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-ink-faint uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app">
                    {attempts.map(a => {
                      const pct = a.max_score > 0 ? Math.round(((a.total_score || 0) / a.max_score) * 100) : 0
                      const { grade, cls } = getGrade(pct)
                      const unlocked = isUnlocked(a.id)
                      if (!unlocked) {
                        return (
                          <tr key={a.id} className="opacity-60">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                                  <Lock className="w-3.5 h-3.5 text-ink-muted" />
                                </div>
                                <div>
                                  <p className="font-medium text-ink">{a.student_name || 'Anonymous'}</p>
                                  <p className="text-xs text-ink-muted">Locked</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-ink-muted" colSpan={5}>Buy more student capacity to view this result</td>
                          </tr>
                        )
                      }
                      return (
                        <tr key={a.id} className="hover:bg-app transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[var(--brand-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--brand-primary-dark)] shrink-0">
                                {a.student_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-medium text-ink">{a.student_name || 'Anonymous'}</p>
                                {a.student_email && <p className="text-xs text-ink-muted">{a.student_email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-ink font-medium">{a.total_score || 0}/{a.max_score || 0}</td>
                          <td className="px-5 py-4 font-semibold text-ink">{pct}%</td>
                          <td className="px-5 py-4">
                            <span className={`badge ${cls} font-semibold`}>{grade}</span>
                          </td>
                          <td className="px-5 py-4 text-ink-soft">
                            {a.time_taken_seconds ? `${Math.floor(a.time_taken_seconds / 60)}:${(a.time_taken_seconds % 60).toString().padStart(2, '0')}` : '—'}
                          </td>
                          <td className="px-5 py-4 text-ink-soft">{a.submitted_at ? formatDateTime(a.submitted_at) : '—'}</td>
                          <td className="px-5 py-4">
                            {onFlagStudent && a.student_email && (
                              <button
                                onClick={() => onFlagStudent(a.student_email, a.student_name)}
                                disabled={isFlagged?.(a.student_email)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isFlagged?.(a.student_email)
                                    ? 'text-[var(--brand-primary)]'
                                    : 'text-ink-muted hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)]'
                                }`}
                                title={isFlagged?.(a.student_email) ? 'Already in Focus' : 'Add to Focus'}
                              >
                                <Star className="w-4 h-4" fill={isFlagged?.(a.student_email) ? 'currentColor' : 'none'} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
