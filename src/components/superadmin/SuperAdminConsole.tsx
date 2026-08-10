import { useEffect, useMemo, useState } from 'react'
import { Building2, LogOut, Users, TrendingUp, AlertTriangle, Ban, RotateCcw, Shield, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Organization, Plan, Subscription, OrgStatus } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { startImpersonation } from '../../lib/auth'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { StatusBadge } from '../ui/StatusBadge'
import type { BadgeTone } from '../ui/StatusBadge'
import { formatDateTime } from '../../lib/utils'

const STATUS_TONE: Record<OrgStatus, BadgeTone> = {
  trial: 'info',
  active: 'success',
  past_due: 'warning',
  suspended: 'danger',
  cancelled: 'neutral',
}

interface OrgRow extends Organization {
  teacherCount: number
  testCount: number
}

export function SuperAdminConsole() {
  const { user, signOut, refreshUser } = useAuth()
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | OrgStatus>('all')
  const [savingOrgId, setSavingOrgId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ org: OrgRow; nextStatus: OrgStatus; label: string } | null>(null)
  const [impersonateTarget, setImpersonateTarget] = useState<OrgRow | null>(null)
  const [impersonating, setImpersonating] = useState(false)
  const [impersonateError, setImpersonateError] = useState('')
  const [impersonateAsTeacherId, setImpersonateAsTeacherId] = useState('')
  const [orgTeachers, setOrgTeachers] = useState<{ id: string; name: string; email: string }[]>([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [orgsRes, plansRes, subsRes, teachersRes, testsRes] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at', { ascending: false }),
      supabase.from('plans').select('*').order('sort_order'),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('teachers').select('org_id'),
      supabase.from('tests').select('org_id'),
    ])

    const teacherCounts = new Map<string, number>()
    for (const t of teachersRes.data || []) teacherCounts.set(t.org_id, (teacherCounts.get(t.org_id) || 0) + 1)
    const testCounts = new Map<string, number>()
    for (const t of testsRes.data || []) testCounts.set(t.org_id, (testCounts.get(t.org_id) || 0) + 1)

    const rows: OrgRow[] = (orgsRes.data || []).map((org) => ({
      ...org,
      teacherCount: teacherCounts.get(org.id) || 0,
      testCount: testCounts.get(org.id) || 0,
    }))

    setOrgs(rows)
    setPlans(plansRes.data || [])
    setSubscriptions(subsRes.data || [])
    setLoading(false)
  }

  const plansById = useMemo(() => new Map(plans.map(p => [p.id, p])), [plans])
  const latestSubByOrg = useMemo(() => {
    const map = new Map<string, Subscription>()
    for (const sub of subscriptions) if (!map.has(sub.org_id)) map.set(sub.org_id, sub)
    return map
  }, [subscriptions])

  const stats = useMemo(() => {
    const mrr = orgs
      .filter(o => o.status === 'active')
      .reduce((sum, o) => sum + (plansById.get(o.plan_id)?.price_inr || 0), 0)
    return {
      total: orgs.length,
      active: orgs.filter(o => o.status === 'active').length,
      trial: orgs.filter(o => o.status === 'trial').length,
      atRisk: orgs.filter(o => o.status === 'past_due' || o.status === 'suspended').length,
      mrr,
    }
  }, [orgs, plansById])

  const filteredOrgs = statusFilter === 'all' ? orgs : orgs.filter(o => o.status === statusFilter)

  const handlePlanChange = async (org: OrgRow, planId: string) => {
    setSavingOrgId(org.id)
    await supabase.from('organizations').update({ plan_id: planId }).eq('id', org.id)
    await fetchData()
    setSavingOrgId(null)
  }

  const handleDomainStatusToggle = async (org: OrgRow) => {
    setSavingOrgId(org.id)
    const next = org.custom_domain_status === 'active' ? 'pending' : 'active'
    await supabase.from('organizations').update({ custom_domain_status: next }).eq('id', org.id)
    await fetchData()
    setSavingOrgId(null)
  }

  const handleStatusChange = async () => {
    if (!confirmAction) return
    setSavingOrgId(confirmAction.org.id)
    await supabase.from('organizations').update({
      status: confirmAction.nextStatus,
      ...(confirmAction.nextStatus === 'active' ? { grace_ends_at: null } : {}),
    }).eq('id', confirmAction.org.id)
    setConfirmAction(null)
    await fetchData()
    setSavingOrgId(null)
  }

  const openImpersonate = async (org: OrgRow) => {
    setImpersonateTarget(org)
    setImpersonateAsTeacherId('')
    const { data } = await supabase.from('teachers').select('id, name, email').eq('org_id', org.id).order('name')
    setOrgTeachers(data || [])
  }

  const handleImpersonate = async () => {
    if (!impersonateTarget) return
    setImpersonating(true)
    setImpersonateError('')
    try {
      await startImpersonation(impersonateTarget.id, impersonateAsTeacherId || undefined)
      await refreshUser()
      setImpersonateTarget(null)
    } catch (err) {
      setImpersonateError(err instanceof Error ? err.message : 'Failed to start impersonation.')
    } finally {
      setImpersonating(false)
    }
  }

  if (loading) return (
    <div className="theme-dark min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <LoadingSpinner size="lg" />
    </div>
  )

  return (
    <div className="theme-dark min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'var(--brand-primary)' }}>
                <Shield className="w-5 h-5" style={{ color: 'var(--brand-on-primary)' }} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold">Platform Console</h1>
                <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>EduPrime staff only</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm hidden md:block" style={{ color: 'var(--ink-soft)' }}>{user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Organizations', value: stats.total, icon: Building2 },
            { label: 'Active', value: stats.active, icon: TrendingUp },
            { label: 'On trial', value: stats.trial, icon: Users },
            { label: 'Needs attention', value: stats.atRisk, icon: AlertTriangle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>{label}</p>
              <div className="flex items-center gap-2 mt-2">
                <Icon className="w-4 h-4" style={{ color: 'var(--ink-faint)' }} />
                <p className="stat-value text-2xl font-bold">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="stat-card mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-faint)' }}>Monthly recurring revenue</p>
            <p className="stat-value text-3xl font-bold mt-1">₹{stats.mrr.toLocaleString('en-IN')}</p>
          </div>
          <p className="text-xs max-w-xs text-right" style={{ color: 'var(--ink-faint)' }}>Sum of active orgs' plan price. Trial orgs (full-featured, unpaid) aren't counted.</p>
        </div>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold">Organizations</h2>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'trial', 'active', 'past_due', 'suspended', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize"
                style={statusFilter === s
                  ? { background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }
                  : { background: 'var(--surface)', color: 'var(--ink-soft)', border: '1px solid var(--border)' }}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide" style={{ borderBottom: '1px solid var(--border)', color: 'var(--ink-faint)' }}>
                  <th className="px-5 py-3 font-bold">Organization</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Plan</th>
                  <th className="px-5 py-3 font-bold">Domain</th>
                  <th className="px-5 py-3 font-bold">Teachers</th>
                  <th className="px-5 py-3 font-bold">Tests</th>
                  <th className="px-5 py-3 font-bold">Next renewal</th>
                  <th className="px-5 py-3 font-bold">Created</th>
                  <th className="px-5 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => {
                  const sub = latestSubByOrg.get(org.id)
                  return (
                    <tr key={org.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{org.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>{org.slug}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={STATUS_TONE[org.status]}>{org.status.replace('_', ' ')}</StatusBadge>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={org.plan_id}
                          disabled={savingOrgId === org.id}
                          onChange={(e) => handlePlanChange(org, e.target.value)}
                          className="text-xs rounded-lg px-2 py-1.5"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                        >
                          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        {org.custom_domain ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono" style={{ color: 'var(--ink-soft)' }}>{org.custom_domain}</span>
                            <button disabled={savingOrgId === org.id} onClick={() => handleDomainStatusToggle(org)} title="Click to toggle">
                              <StatusBadge tone={org.custom_domain_status === 'active' ? 'success' : 'warning'} className="cursor-pointer">
                                {org.custom_domain_status === 'active' ? 'live' : 'pending'}
                              </StatusBadge>
                            </button>
                          </div>
                        ) : <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>—</span>}
                      </td>
                      <td className="px-5 py-4" style={{ color: 'var(--ink-soft)' }}>{org.teacherCount}</td>
                      <td className="px-5 py-4" style={{ color: 'var(--ink-soft)' }}>{org.testCount}</td>
                      <td className="px-5 py-4 text-xs" style={{ color: 'var(--ink-faint)' }}>{sub?.current_period_end ? formatDateTime(sub.current_period_end) : '—'}</td>
                      <td className="px-5 py-4 text-xs" style={{ color: 'var(--ink-faint)' }}>{formatDateTime(org.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline" size="sm"
                            onClick={() => openImpersonate(org)}
                            title="View as this org's admin or an educator"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {org.status !== 'suspended' && org.status !== 'cancelled' && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => setConfirmAction({ org, nextStatus: 'suspended', label: 'Suspend' })}
                              className="text-red-400 hover:!bg-red-950"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {(org.status === 'suspended' || org.status === 'past_due' || org.status === 'cancelled') && (
                            <Button
                              variant="outline" size="sm"
                              onClick={() => setConfirmAction({ org, nextStatus: 'active', label: 'Reactivate' })}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredOrgs.length === 0 && (
            <p className="text-center text-sm py-12" style={{ color: 'var(--ink-muted)' }}>No organizations match this filter.</p>
          )}
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-2xl w-full max-w-md animate-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">{confirmAction.label} {confirmAction.org.name}?</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--ink-faint)' }}>
                {confirmAction.nextStatus === 'suspended'
                  ? 'This pauses new assessments and new educator tokens for this org. Existing tests, results, and students in progress are unaffected.'
                  : 'This restores full access immediately, bypassing any pending payment.'}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1">Cancel</Button>
                <Button
                  variant={confirmAction.nextStatus === 'suspended' ? 'danger' : 'primary'}
                  onClick={handleStatusChange}
                  loading={savingOrgId === confirmAction.org.id}
                  className="flex-1"
                >
                  {confirmAction.label}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {impersonateTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-2xl w-full max-w-md animate-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">View as — {impersonateTarget.name}</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--ink-faint)' }}>
                This switches your session to the selected account, without their password. It's logged — org id, account email, and timestamp. You can exit back to your own account from the banner at any point.
              </p>

              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-soft)' }}>Account</label>
              <select
                value={impersonateAsTeacherId}
                onChange={(e) => setImpersonateAsTeacherId(e.target.value)}
                className="input-base mb-4"
              >
                <option value="">Org Admin</option>
                {orgTeachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
              {orgTeachers.length === 0 && (
                <p className="text-xs -mt-3 mb-4" style={{ color: 'var(--ink-muted)' }}>No educators in this org yet — only the admin account is available.</p>
              )}

              {impersonateError && (
                <p className="text-sm text-red-400 mb-4">{impersonateError}</p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setImpersonateTarget(null); setImpersonateError('') }} className="flex-1">Cancel</Button>
                <Button onClick={handleImpersonate} loading={impersonating} className="flex-1">
                  View as
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
