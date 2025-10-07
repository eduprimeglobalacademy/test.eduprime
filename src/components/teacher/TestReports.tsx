import React, { useState, useEffect } from 'react'
import { ArrowLeft, Download, Users, BarChart3, Clock, Award, TrendingUp, Target } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDateTime, exportToCSV } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test, TestAttempt, StudentAnswer } from '../../lib/supabase'

interface TestReportsProps {
  testId: string
  onBack: () => void
}

interface AttemptWithAnswers extends TestAttempt {
  answers: StudentAnswer[]
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export function TestReports({ testId, onBack }: TestReportsProps) {
  const [test, setTest] = useState<Test | null>(null)
  const [attempts, setAttempts] = useState<AttemptWithAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReportData()
  }, [testId])

  const fetchReportData = async () => {
    try {
      console.log('Fetching report data for test ID:', testId)
      
      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single()

      if (testError) throw testError
      setTest(testData)
      console.log('Test data:', testData)

      // Fetch attempts with answers
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          student_answers (*)
        `)
        .eq('test_id', testId)
        .eq('is_submitted', true)
        .not('total_score', 'is', null)
        .not('max_score', 'is', null)
        .gt('max_score', 0)
        .order('submitted_at', { ascending: false })

      if (attemptsError) throw attemptsError
      console.log('Raw attempts data:', attemptsData)

      const formattedAttempts = attemptsData.map(attempt => ({
        ...attempt,
        answers: attempt.student_answers || []
      }))

      setAttempts(formattedAttempts)
      console.log('Formatted attempts:', formattedAttempts)
    } catch (err) {
      console.error('Error fetching report data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const exportResults = () => {
    const exportData = attempts.map(attempt => ({
      'Student Name': attempt.student_name || 'N/A',
      'Email': attempt.student_email || 'N/A',
      'Score': attempt.total_score || 0,
      'Max Score': attempt.max_score || 0,
      'Percentage': attempt.max_score > 0 ? Math.round(((attempt.total_score || 0) / attempt.max_score) * 100) : 0,
      'Time Taken (minutes)': attempt.time_taken_seconds ? Math.round(attempt.time_taken_seconds / 60) : 'N/A',
      'Started At': attempt.started_at ? formatDateTime(attempt.started_at) : 'N/A',
      'Submitted At': attempt.submitted_at ? formatDateTime(attempt.submitted_at) : 'N/A'
    }))

    exportToCSV(exportData, `${test?.title}_results`)
  }

  const getStatistics = () => {
    if (attempts.length === 0) return null

    const validAttempts = attempts.filter(a => a.max_score > 0)
    if (validAttempts.length === 0) return null

    const scores = validAttempts.map(a => ((a.total_score || 0) / a.max_score) * 100)
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    const passRate = scores.filter(score => score >= 60).length / scores.length * 100

    // Time statistics
    const timeTaken = attempts.filter(a => a.time_taken_seconds).map(a => a.time_taken_seconds!)
    const avgTime = timeTaken.length > 0 ? timeTaken.reduce((sum, time) => sum + time, 0) / timeTaken.length : 0

    return {
      totalAttempts: attempts.length,
      averageScore: Math.round(avgScore),
      highestScore: Math.round(maxScore),
      lowestScore: Math.round(minScore),
      passRate: Math.round(passRate),
      averageTime: Math.round(avgTime / 60) // Convert to minutes
    }
  }

  const getGradeDistribution = () => {
    if (attempts.length === 0) return []

    const validAttempts = attempts.filter(a => a.max_score > 0)
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 }

    validAttempts.forEach(attempt => {
      const percentage = ((attempt.total_score || 0) / attempt.max_score) * 100
      if (percentage >= 90) grades.A++
      else if (percentage >= 80) grades.B++
      else if (percentage >= 70) grades.C++
      else if (percentage >= 60) grades.D++
      else grades.F++
    })

    return [
      { name: 'A (90-100%)', value: grades.A, color: '#10B981' },
      { name: 'B (80-89%)', value: grades.B, color: '#06B6D4' },
      { name: 'C (70-79%)', value: grades.C, color: '#F59E0B' },
      { name: 'D (60-69%)', value: grades.D, color: '#F97316' },
      { name: 'F (0-59%)', value: grades.F, color: '#EF4444' }
    ].filter(grade => grade.value > 0)
  }

  const getScoreDistribution = () => {
    if (attempts.length === 0) return []

    const validAttempts = attempts.filter(a => a.max_score > 0)
    const ranges = {
      '0-20%': 0,
      '21-40%': 0,
      '41-60%': 0,
      '61-80%': 0,
      '81-100%': 0
    }

    validAttempts.forEach(attempt => {
      const percentage = ((attempt.total_score || 0) / attempt.max_score) * 100
      if (percentage <= 20) ranges['0-20%']++
      else if (percentage <= 40) ranges['21-40%']++
      else if (percentage <= 60) ranges['41-60%']++
      else if (percentage <= 80) ranges['61-80%']++
      else ranges['81-100%']++
    })

    return Object.entries(ranges).map(([range, count]) => ({
      range,
      count
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <div className="p-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={onBack}>Go Back</Button>
          </div>
        </Card>
      </div>
    )
  }

  const stats = getStatistics()
  const gradeDistribution = getGradeDistribution()
  const scoreDistribution = getScoreDistribution()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={onBack} className="mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{test?.title}</h1>
                <span className="text-sm text-gray-500">Test Analytics & Reports</span>
              </div>
            </div>
            <Button onClick={exportResults} disabled={attempts.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {attempts.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Submissions Yet</h3>
              <p className="text-gray-600">Students haven't submitted this test yet. Check back once students start taking the test.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Statistics Overview */}
            {stats && (
              <div className="grid md:grid-cols-6 gap-6">
                <Card>
                  <div className="p-6 text-center">
                    <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-gray-900">{stats.totalAttempts}</div>
                    <div className="text-sm text-gray-600">Total Attempts</div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 text-center">
                    <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-gray-900">{stats.averageScore}%</div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 text-center">
                    <Award className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-gray-900">{stats.highestScore}%</div>
                    <div className="text-sm text-gray-600">Highest Score</div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 text-center">
                    <Target className="w-8 h-8 text-red-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-gray-900">{stats.lowestScore}%</div>
                    <div className="text-sm text-gray-600">Lowest Score</div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 text-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-purple-600 font-bold text-lg">%</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.passRate}%</div>
                    <div className="text-sm text-gray-600">Pass Rate (≥60%)</div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6 text-center">
                    <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-gray-900">{stats.averageTime}</div>
                    <div className="text-sm text-gray-600">Avg Time (min)</div>
                  </div>
                </Card>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Grade Distribution Pie Chart */}
              {gradeDistribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Grade Distribution</CardTitle>
                  </CardHeader>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={gradeDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {gradeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Score Distribution Bar Chart */}
              {scoreDistribution.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                  </CardHeader>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#3B82F6" name="Number of Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </div>

            {/* Detailed Results Table */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Student Results</CardTitle>
              </CardHeader>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Learner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Taken
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attempts.map((attempt) => {
                      const score = attempt.total_score || 0
                      const maxScore = attempt.max_score || 0
                      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
                      
                      // Use test's grading config if available, otherwise use defaults
                      const gradingConfig = test?.grading_config || {
                        aGrade: 90,
                        bGrade: 80,
                        cGrade: 70,
                        dGrade: 60,
                        passingGrade: 60
                      }
                      
                      const getGrade = (pct: number) => {
                        if (pct >= gradingConfig.aGrade) return { grade: 'A', color: 'text-green-600 bg-green-100' }
                        if (pct >= gradingConfig.bGrade) return { grade: 'B', color: 'text-blue-600 bg-blue-100' }
                        if (pct >= gradingConfig.cGrade) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100' }
                        if (pct >= gradingConfig.dGrade) return { grade: 'D', color: 'text-orange-600 bg-orange-100' }
                        return { grade: 'F', color: 'text-red-600 bg-red-100' }
                      }

                      const gradeInfo = getGrade(percentage)

                      return (
                        <tr key={attempt.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {attempt.student_name || 'Anonymous'}
                              </div>
                              {attempt.student_email && (
                                <div className="text-sm text-gray-500">
                                  {attempt.student_email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {score} / {maxScore}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {percentage}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gradeInfo.color}`}>
                              {gradeInfo.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attempt.time_taken_seconds 
                              ? `${Math.floor(attempt.time_taken_seconds / 60)}:${(attempt.time_taken_seconds % 60).toString().padStart(2, '0')}`
                              : 'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attempt.submitted_at ? formatDateTime(attempt.submitted_at) : 'N/A'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}