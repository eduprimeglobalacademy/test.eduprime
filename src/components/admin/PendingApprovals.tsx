import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Hourglass, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/utils'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test } from '../../lib/supabase'

interface PendingTest extends Test {
  teacherName?: string
}

export function PendingApprovals({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['pending-approvals', orgId]
  const [actingOn, setActingOn] = useState<string | null>(null)

  const { data: tests, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<PendingTest[]> => {
      const { data: pending } = await supabase
        .from('tests').select('*').eq('org_id', orgId).eq('status', 'pending_approval')
        .order('created_at', { ascending: true })

      const teacherIds = [...new Set((pending || []).map(t => t.teacher_id))]
      const { data: teachers } = teacherIds.length
        ? await supabase.from('teachers').select('id, name').in('id', teacherIds)
        : { data: [] }
      const nameById = new Map((teachers || []).map(t => [t.id, t.name]))

      return (pending || []).map(t => ({ ...t, teacherName: nameById.get(t.teacher_id) }))
    },
    enabled: !!orgId,
  })

  const decideMutation = useMutation({
    mutationFn: async ({ testId, approve }: { testId: string; approve: boolean }) => {
      await supabase.rpc('admin_decide_pending_test', { p_test_id: testId, p_approve: approve })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const decide = async (test: PendingTest, approve: boolean) => {
    setActingOn(test.id)
    await decideMutation.mutateAsync({ testId: test.id, approve })
    setActingOn(null)
  }

  if (isLoading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" /></div>

  const testsList = tests ?? []

  if (testsList.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-app shadow-sm p-12 text-center">
        <Hourglass className="w-14 h-14 text-ink-muted mx-auto mb-4" />
        <h3 className="text-lg font-bold text-ink mb-2">Nothing Pending</h3>
        <p className="text-ink-faint text-sm">Public exams your educators create will show up here for approval before they can go live.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {testsList.map((test) => (
        <div key={test.id} className="bg-surface rounded-2xl border border-app shadow-sm p-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-ink">{test.title}</h3>
            <p className="text-sm text-ink-faint mt-0.5">{test.teacherName || 'Unknown educator'}</p>
            <p className="text-xs text-ink-muted mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />Submitted {formatDateTime(test.created_at)}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" loading={actingOn === test.id} onClick={() => decide(test, false)} className="text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="w-3.5 h-3.5" />Reject
            </Button>
            <Button size="sm" loading={actingOn === test.id} onClick={() => decide(test, true)}>
              <CheckCircle className="w-3.5 h-3.5" />Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
