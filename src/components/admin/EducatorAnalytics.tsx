import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, FileText, ClipboardCheck, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/utils'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface TeacherAnalytics {
  teacher_id: string
  teacher_name: string
  teacher_email: string
  total_tests: number
  draft_count: number
  live_count: number
  closed_count: number
  total_attempts: number
  avg_score_pct: number | null
  last_activity_at: string | null
}

type SortKey = 'teacher_name' | 'total_tests' | 'total_attempts' | 'avg_score_pct' | 'last_activity_at'

export function EducatorAnalytics({ orgId }: { orgId: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('total_tests')
  const [sortDesc, setSortDesc] = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['org-teacher-analytics', orgId],
    queryFn: async (): Promise<TeacherAnalytics[]> => {
      const { data } = await supabase.rpc('org_teacher_analytics', { p_org_id: orgId })
      return data ?? []
    },
    enabled: !!orgId,
  })
  const rows = data ?? []

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) { setSortDesc(d => !d); return }
    setSortKey(key)
    setSortDesc(true)
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey]
    const cmp = av == null ? -1 : bv == null ? 1 : av > bv ? 1 : av < bv ? -1 : 0
    return sortDesc ? -cmp : cmp
  })

  const totals = rows.reduce((acc, r) => ({
    tests: acc.tests + r.total_tests,
    attempts: acc.attempts + r.total_attempts,
    scoreSum: acc.scoreSum + (r.avg_score_pct != null ? r.avg_score_pct * r.total_attempts : 0),
    scoreWeight: acc.scoreWeight + (r.avg_score_pct != null ? r.total_attempts : 0),
  }), { tests: 0, attempts: 0, scoreSum: 0, scoreWeight: 0 })
  const orgAvgScore = totals.scoreWeight > 0 ? Math.round(totals.scoreSum / totals.scoreWeight) : null

  const chartData = sorted
    .filter(r => r.total_tests > 0)
    .map(r => ({ name: r.teacher_name.split(' ')[0], tests: r.total_tests }))

  const sortHeader = (key: SortKey, label: string) => (
    <th
      className="px-5 py-3 text-left text-xs font-semibold text-ink-faint uppercase tracking-wide cursor-pointer select-none hover:text-ink-soft"
      onClick={() => toggleSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === key && (sortDesc ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
      </span>
    </th>
  )

  if (isLoading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>

  if (rows.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
        <Users className="w-14 h-14 text-ink-muted mx-auto mb-4" />
        <h3 className="text-lg font-bold text-ink mb-2">No Educators Yet</h3>
        <p className="text-ink-faint text-sm">Invite an educator from the Dashboard to see their activity here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, color: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]', value: rows.length, label: 'Educators' },
          { icon: FileText, color: 'bg-[var(--brand-secondary-soft)] text-[var(--brand-secondary)]', value: totals.tests, label: 'Tests Created' },
          { icon: ClipboardCheck, color: 'bg-emerald-100 text-emerald-600', value: totals.attempts, label: 'Total Attempts' },
          { icon: TrendingUp, color: 'bg-amber-100 text-amber-600', value: orgAvgScore != null ? `${orgAvgScore}%` : '—', label: 'Org Average Score' },
        ].map(({ icon: Icon, color, value, label }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-ink-faint font-medium">{label}</p>
                <p className="text-2xl font-bold font-display text-ink">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-6">
          <h3 className="text-base font-semibold text-ink mb-5">Tests per Educator</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="tests" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} name="Tests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-app shadow-sm overflow-hidden">
        <div className="p-6 border-b border-app">
          <h3 className="text-base font-semibold text-ink">Educator Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app border-b border-app">
                {sortHeader('teacher_name', 'Educator')}
                {sortHeader('total_tests', 'Tests (draft / live / closed)')}
                {sortHeader('total_attempts', 'Attempts')}
                {sortHeader('avg_score_pct', 'Avg Score')}
                {sortHeader('last_activity_at', 'Last Activity')}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {sorted.map(r => (
                <tr key={r.teacher_id} className="hover:bg-app transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--brand-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--brand-primary-dark)] shrink-0">
                        {r.teacher_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-ink">{r.teacher_name}</p>
                        <p className="text-xs text-ink-muted">{r.teacher_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink">
                    <span className="font-semibold">{r.total_tests}</span>
                    <span className="text-ink-faint text-xs ml-2">{r.draft_count} / {r.live_count} / {r.closed_count}</span>
                  </td>
                  <td className="px-5 py-4 text-ink font-medium">{r.total_attempts}</td>
                  <td className="px-5 py-4 text-ink-soft">{r.avg_score_pct != null ? `${r.avg_score_pct}%` : '—'}</td>
                  <td className="px-5 py-4 text-ink-soft">{r.last_activity_at ? formatDateTime(r.last_activity_at) : 'No activity yet'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
