import { useState, useEffect } from 'react'
import { ArrowLeft, Download, Users, BarChart3, Clock, Award, TrendingUp, Target } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDateTime, exportToCSV } from '../../lib/utils'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test, TestAttempt, StudentAnswer } from '../../lib/supabase'

interface TestReportsProps {
  testId: string
  onBack: () => void
}

interface AttemptWithAnswers extends TestAttempt {
  answers: StudentAnswer[]
}

const GRADE_COLORS = ['#10B981', '#06B6D4', '#F59E0B', '#F97316', '#EF4444']

export function TestReports({ testId, onBack }: TestReportsProps) {
  const [test, setTest] = useState<Test | null>(null)
  const [attempts, setAttempts] = useState<AttemptWithAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [testId])

  const fetchData = async () => {
    try {
      const { data: testData, error: te } = await supabase.from('tests').select('*').eq('id', testId).single()
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

  const exportResults = () => {
    const data = attempts.map(a => ({
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
      passRate: Math.round(scores.filter(s => s >= 60).length / scores.length * 100),
      averageTime: times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length / 60) : 0,
    }
  })()

  const gradeDistribution = (() => {
    const valid = attempts.filter(a => a.max_score > 0)
    if (!valid.length) return []
    const g: Record<string, number> = { 'A (90-100%)': 0, 'B (80-89%)': 0, 'C (70-79%)': 0, 'D (60-69%)': 0, 'F (0-59%)': 0 }
    valid.forEach(a => {
      const p = ((a.total_score || 0) / a.max_score) * 100
      if (p >= 90) g['A (90-100%)']++
      else if (p >= 80) g['B (80-89%)']++
      else if (p >= 70) g['C (70-79%)']++
      else if (p >= 60) g['D (60-69%)']++
      else g['F (0-59%)']++
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

  const getGrade = (pct: number, cfg: any) => {
    const c = cfg || { aGrade: 90, bGrade: 80, cGrade: 70, dGrade: 60 }
    if (pct >= c.aGrade) return { grade: 'A', cls: 'bg-emerald-100 text-emerald-700' }
    if (pct >= c.bGrade) return { grade: 'B', cls: 'bg-blue-100 text-blue-700' }
    if (pct >= c.cGrade) return { grade: 'C', cls: 'bg-amber-100 text-amber-700' }
    if (pct >= c.dGrade) return { grade: 'D', cls: 'bg-orange-100 text-orange-700' }
    return { grade: 'F', cls: 'bg-red-100 text-red-700' }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-md p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onBack} size="sm">
                <ArrowLeft className="w-4 h-4" />Back
              </Button>
              <div>
                <p className="text-base font-bold text-gray-900">{test?.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><BarChart3 className="w-3 h-3" />Analytics & Reports</p>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Users className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Submissions Yet</h3>
            <p className="text-gray-500 text-sm">Students haven't submitted this assessment yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { icon: Users, color: 'bg-indigo-100 text-indigo-600', value: stats.totalAttempts, label: 'Total Attempts' },
                  { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600', value: `${stats.averageScore}%`, label: 'Average Score' },
                  { icon: Award, color: 'bg-amber-100 text-amber-600', value: `${stats.highestScore}%`, label: 'Highest Score' },
                  { icon: Target, color: 'bg-red-100 text-red-600', value: `${stats.lowestScore}%`, label: 'Lowest Score' },
                  { icon: BarChart3, color: 'bg-violet-100 text-violet-600', value: `${stats.passRate}%`, label: 'Pass Rate (≥60%)' },
                  { icon: Clock, color: 'bg-blue-100 text-blue-600', value: `${stats.averageTime}m`, label: 'Avg Time' },
                ].map(({ icon: Icon, color, value, label }) => (
                  <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Charts */}
            {(gradeDistribution.length > 0 || scoreDistribution.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-6">
                {gradeDistribution.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-5">Grade Distribution</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={gradeDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}>
                          {gradeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {scoreDistribution.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-5">Score Distribution</h3>
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">Individual Results</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                      {['Learner', 'Score', 'Percentage', 'Grade', 'Time Taken', 'Submitted'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attempts.map(a => {
                      const pct = a.max_score > 0 ? Math.round(((a.total_score || 0) / a.max_score) * 100) : 0
                      const { grade, cls } = getGrade(pct, test?.grading_config)
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0">
                                {a.student_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{a.student_name || 'Anonymous'}</p>
                                {a.student_email && <p className="text-xs text-gray-400">{a.student_email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-900 font-medium">{a.total_score || 0}/{a.max_score || 0}</td>
                          <td className="px-5 py-4 font-semibold text-gray-900">{pct}%</td>
                          <td className="px-5 py-4">
                            <span className={`badge ${cls} font-semibold`}>{grade}</span>
                          </td>
                          <td className="px-5 py-4 text-gray-600">
                            {a.time_taken_seconds ? `${Math.floor(a.time_taken_seconds / 60)}:${(a.time_taken_seconds % 60).toString().padStart(2, '0')}` : '—'}
                          </td>
                          <td className="px-5 py-4 text-gray-600">{a.submitted_at ? formatDateTime(a.submitted_at) : '—'}</td>
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
