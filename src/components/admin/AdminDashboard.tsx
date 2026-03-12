import { useState, useEffect } from 'react'
import { Trash2, Plus, Users, Key, Clock, CheckCircle, XCircle, RefreshCw, Search, LogOut, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle } from '../ui/Card'
import { Input } from '../ui/Input'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface TeacherToken {
  id: string; token: string; teacher_name: string; phone_number: string;
  used_at: string | null; expires_at: string; created_at: string; status: string;
}
interface Teacher {
  id: string; name: string; email: string; phone_number: string; created_at: string; token_used: string; user_id?: string;
}

export function AdminDashboard() {
  const { user, signOut } = useAuth()
  const [tokens, setTokens] = useState<TeacherToken[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState<{ show: boolean; teacher: Teacher | null }>({ show: false, teacher: null })
  const [educatorSearch, setEducatorSearch] = useState('')
  const [tokenSearch, setTokenSearch] = useState('')
  const [tokenFilter, setTokenFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all')
  const [newToken, setNewToken] = useState({ teacher_name: '', phone_number: '' })
  const [deletingTokens, setDeletingTokens] = useState<string[]>([])
  const [showDeleteExpiredModal, setShowDeleteExpiredModal] = useState(false)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const { data: tokensData, error: tokensError } = await supabase.from('teacher_tokens').select('*').order('created_at', { ascending: false })
      if (tokensError) throw tokensError
      setTokens(tokensData || [])

      const { data: teachersData, error: teachersError } = await supabase.from('teachers').select('*').order('created_at', { ascending: false })
      if (teachersError) {
        const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient } = await import('@supabase/supabase-js')
          const sc = createClient(import.meta.env.VITE_SUPABASE_URL!, serviceRoleKey)
          const { data: sd } = await sc.from('teachers').select('*')
          setTeachers(sd || [])
        }
      } else {
        setTeachers(teachersData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const createToken = async () => {
    if (!newToken.teacher_name.trim() || !newToken.phone_number.trim()) return
    setCreating(true)
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const { error } = await supabase.from('teacher_tokens').insert([{ token, teacher_name: newToken.teacher_name.trim(), phone_number: newToken.phone_number.trim(), created_by: user?.id }])
      if (error) throw error
      setNewToken({ teacher_name: '', phone_number: '' })
      await fetchData()
    } catch (error) {
      console.error('Error creating token:', error)
    } finally {
      setCreating(false)
    }
  }

  const revokeTeacherAccount = async () => {
    if (!showRevokeModal.teacher) return
    setRevoking(showRevokeModal.teacher.id)
    try {
      if (showRevokeModal.teacher.user_id) {
        await supabase.auth.admin.deleteUser(showRevokeModal.teacher.user_id)
      }
      const { error } = await supabase.from('teachers').delete().eq('id', showRevokeModal.teacher.id)
      if (error) throw error
      await fetchData()
      setShowRevokeModal({ show: false, teacher: null })
    } catch (error) {
      console.error('Error revoking teacher:', error)
    } finally {
      setRevoking(null)
    }
  }

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Delete this token?')) return
    setDeletingTokens([tokenId])
    try {
      const { error } = await supabase.from('teacher_tokens').delete().eq('id', tokenId)
      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting token:', error)
    } finally {
      setDeletingTokens([])
    }
  }

  const deleteExpiredTokens = async () => {
    const ids = tokens.filter(t => t.status === 'active' && new Date(t.expires_at) <= new Date()).map(t => t.id)
    if (!ids.length) return
    setDeletingTokens(ids)
    try {
      const { error } = await supabase.from('teacher_tokens').delete().in('id', ids)
      if (error) throw error
      await fetchData()
      setShowDeleteExpiredModal(false)
    } catch (error) {
      console.error('Error deleting expired tokens:', error)
    } finally {
      setDeletingTokens([])
    }
  }

  const getTokenStats = () => ({
    activeTokens: tokens.filter(t => t.status === 'active' && new Date(t.expires_at) > new Date()).length,
    usedTokens: tokens.filter(t => t.status === 'used').length,
    expiredTokens: tokens.filter(t => t.status === 'active' && new Date(t.expires_at) <= new Date()).length,
  })

  const getTokenStatus = (token: TeacherToken) => {
    if (token.status === 'used') return { label: 'Used', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (new Date(token.expires_at) <= new Date()) return { label: 'Expired', cls: 'bg-red-50 text-red-700 border-red-200' }
    return { label: 'Active', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(educatorSearch.toLowerCase()) ||
    t.email.toLowerCase().includes(educatorSearch.toLowerCase()) ||
    t.phone_number.includes(educatorSearch)
  )

  const filteredTokens = tokens.filter(token => {
    const match = tokenSearch === '' || token.teacher_name.toLowerCase().includes(tokenSearch.toLowerCase()) || token.phone_number.includes(tokenSearch) || token.token.toLowerCase().includes(tokenSearch.toLowerCase())
    if (!match) return false
    if (tokenFilter === 'active') return token.status === 'active' && new Date(token.expires_at) > new Date()
    if (tokenFilter === 'used') return token.status === 'used'
    if (tokenFilter === 'expired') return token.status === 'active' && new Date(token.expires_at) <= new Date()
    return true
  })

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><LoadingSpinner size="lg" /></div>

  const stats = getTokenStats()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/eduprimelogo.jpg" alt="EduPrime" className="w-8 h-8 object-contain rounded-lg shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold gradient-text truncate">EduPrime Global Academy</h1>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />Administrator
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => { setRefreshing(true); fetchData() }} disabled={refreshing} size="sm">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <span className="text-sm text-gray-600 hidden md:block">Welcome, {user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Educator Management</h2>
          <p className="text-gray-500 mt-1">Manage educator access tokens and registered accounts</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Tokens', value: stats.activeTokens, icon: Key, color: 'bg-indigo-100 text-indigo-600' },
            { label: 'Used Tokens', value: stats.usedTokens, icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Expired', value: stats.expiredTokens, icon: XCircle, color: 'bg-red-100 text-red-600' },
            { label: 'Educators', value: teachers.length, icon: Users, color: 'bg-violet-100 text-violet-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Token */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Create New Educator Token
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Educator Name"
              placeholder="Full name"
              value={newToken.teacher_name}
              onChange={(e) => setNewToken(prev => ({ ...prev, teacher_name: e.target.value }))}
            />
            <Input
              label="Phone Number"
              placeholder="Phone number"
              value={newToken.phone_number}
              onChange={(e) => setNewToken(prev => ({ ...prev, phone_number: e.target.value }))}
            />
            <div className="flex items-end">
              <Button onClick={createToken} loading={creating} className="w-full">
                <Plus className="w-4 h-4" />
                Generate Token
              </Button>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500 p-3 bg-indigo-50 rounded-xl">
            Tokens are valid for 7 days and can only be used once. Share securely with the educator.
          </p>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Tokens */}
          <Card padding="none">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  Access Tokens ({filteredTokens.length})
                </CardTitle>
                {tokenFilter === 'expired' && stats.expiredTokens > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteExpiredModal(true)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />Delete Expired
                  </Button>
                )}
              </div>

              {tokens.length > 0 && (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <input
                      placeholder="Search tokens..."
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      className="input-base pl-10"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(['all', 'active', 'used', 'expired'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setTokenFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${tokenFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {f === 'all' ? `All (${tokens.length})` :
                         f === 'active' ? `Active (${stats.activeTokens})` :
                         f === 'used' ? `Used (${stats.usedTokens})` : `Expired (${stats.expiredTokens})`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {filteredTokens.length === 0 ? (
              <div className="text-center py-12 px-6">
                <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No tokens found</p>
                <p className="text-gray-400 text-sm mt-1">{tokens.length === 0 ? 'Create your first token above' : 'Try adjusting your filters'}</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-gray-50">
                {filteredTokens.map(token => {
                  const status = getTokenStatus(token)
                  const isDeleting = deletingTokens.includes(token.id)
                  return (
                    <div key={token.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{token.teacher_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{token.phone_number}</p>
                          <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {token.token}
                          </code>
                          <p className="text-xs text-gray-400 mt-1">Created {formatDate(token.created_at)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`badge border ${status.cls} text-xs`}>{status.label}</span>
                          {token.status !== 'used' && (
                            <button
                              onClick={() => deleteToken(token.id)}
                              disabled={isDeleting}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Educators */}
          <Card padding="none">
            <div className="p-6">
              <CardTitle className="flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-violet-600" />
                Registered Educators ({filteredTeachers.length})
              </CardTitle>

              {teachers.length > 0 && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input
                    placeholder="Search educators..."
                    value={educatorSearch}
                    onChange={(e) => setEducatorSearch(e.target.value)}
                    className="input-base pl-10"
                  />
                </div>
              )}
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="text-center py-12 px-6">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {teachers.length === 0 ? 'No educators registered yet' : 'No educators found'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {teachers.length === 0 ? 'Create tokens and share with educators' : 'Try adjusting your search'}
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-gray-50">
                {filteredTeachers.map(teacher => (
                  <div key={teacher.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <span className="text-violet-700 text-sm font-semibold">{teacher.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{teacher.name}</p>
                            <p className="text-xs text-gray-500 truncate">{teacher.email}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 ml-10">{teacher.phone_number} · Joined {formatDate(teacher.created_at)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRevokeModal({ show: true, teacher })}
                        className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                        disabled={revoking === teacher.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Revoke Modal */}
      {showRevokeModal.show && showRevokeModal.teacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 animate-in">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Revoke Educator Account</h3>
              <p className="text-gray-500 text-center text-sm mb-6">
                Are you sure you want to revoke access for <strong className="text-gray-900">{showRevokeModal.teacher.name}</strong>? This will permanently delete their account.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowRevokeModal({ show: false, teacher: null })} className="flex-1" disabled={!!revoking}>Cancel</Button>
                <Button variant="danger" onClick={revokeTeacherAccount} loading={!!revoking} className="flex-1">Revoke Access</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expired Modal */}
      {showDeleteExpiredModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 animate-in">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete All Expired Tokens</h3>
              <p className="text-gray-500 text-center text-sm mb-6">
                This will permanently delete {stats.expiredTokens} expired token{stats.expiredTokens !== 1 ? 's' : ''}. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDeleteExpiredModal(false)} className="flex-1">Cancel</Button>
                <Button variant="danger" onClick={deleteExpiredTokens} loading={deletingTokens.length > 0} className="flex-1">Delete All Expired</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
