import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Plus, Users, Key, Clock, CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface TeacherToken {
  id: string;
  token: string;
  teacher_name: string;
  phone_number: string;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  status: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  created_at: string;
  token_used: string;
}

export function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [tokens, setTokens] = useState<TeacherToken[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<{ show: boolean; teacher: Teacher | null }>({
    show: false,
    teacher: null
  });
  const [educatorSearch, setEducatorSearch] = useState('');
  const [tokenSearch, setTokenSearch] = useState('');
  const [tokenFilter, setTokenFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [newToken, setNewToken] = useState({
    teacher_name: '',
    phone_number: ''
  });
  const [deletingTokens, setDeletingTokens] = useState<string[]>([]);
  const [showDeleteExpiredModal, setShowDeleteExpiredModal] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      console.log('Admin user:', user)
      
      // Fetch tokens
      const { data: tokensData, error: tokensError } = await supabase
        .from('teacher_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (tokensError) {
        console.error('Tokens fetch error:', tokensError)
        throw tokensError;
      }
      
      console.log('Fetched tokens:', tokensData)
      setTokens(tokensData || []);

      // Fetch teachers
      console.log('Fetching teachers...')
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (teachersError) {
        console.error('Error fetching teachers:', teachersError);
        console.error('Teachers error details:', {
          message: teachersError.message,
          details: teachersError.details,
          hint: teachersError.hint,
          code: teachersError.code
        })
        throw teachersError;
      }
      
      setTeachers(teachersData || []);
      console.log('Fetched teachers:', teachersData);
      
      // Also try a direct count query to see if teachers exist
      const { count, error: countError } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
      
      console.log('Teacher count:', count, 'Count error:', countError)
      
      // Check if we can see any teachers with service role (if available)
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        console.log('Checking with service role...')
        const { createClient } = await import('@supabase/supabase-js')
        const serviceClient = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          serviceRoleKey
        )
        
        const { data: serviceTeachers, error: serviceError } = await serviceClient
          .from('teachers')
          .select('*')
        
        console.log('Service role teachers:', serviceTeachers, 'Service error:', serviceError)
      }
      
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createToken = async () => {
    if (!newToken.teacher_name.trim() || !newToken.phone_number.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setCreating(true);
    try {
      const token = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);

      const { error } = await supabase
        .from('teacher_tokens')
        .insert([{
          token,
          teacher_name: newToken.teacher_name.trim(),
          phone_number: newToken.phone_number.trim(),
          created_by: user?.id
        }]);

      if (error) throw error;

      setNewToken({ teacher_name: '', phone_number: '' });
      await fetchData();
    } catch (error) {
      console.error('Error creating token:', error);
      alert('Failed to create token');
    } finally {
      setCreating(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleRevokeClick = (teacher: Teacher) => {
    setShowRevokeModal({ show: true, teacher });
  };

  const revokeTeacherAccount = async () => {
    if (!showRevokeModal.teacher) return;

    setRevoking(showRevokeModal.teacher.id);
    try {
      console.log('Attempting to revoke teacher:', showRevokeModal.teacher);
      
      // First, try to delete the auth user (this should cascade to teacher record)
      if (showRevokeModal.teacher.user_id) {
        console.log('Deleting auth user:', showRevokeModal.teacher.user_id);
        
        // Use admin client to delete the auth user
        const { data: deleteUserData, error: deleteUserError } = await supabase.auth.admin.deleteUser(
          showRevokeModal.teacher.user_id
        );
        
        if (deleteUserError) {
          console.error('Error deleting auth user:', deleteUserError);
          // If auth deletion fails, try direct teacher deletion
          console.log('Falling back to direct teacher deletion');
        } else {
          console.log('Auth user deleted successfully:', deleteUserData);
        }
      }
      
      // Also delete teacher record directly (in case auth deletion didn't cascade)
      console.log('Deleting teacher record:', showRevokeModal.teacher.id);
      const { error: teacherError } = await supabase
        .from('teachers')
        .delete()
        .eq('id', showRevokeModal.teacher.id);

      if (teacherError) {
        console.error('Error deleting teacher record:', teacherError);
        throw teacherError;
      }
      
      console.log('Teacher revoked successfully');

      await fetchData();
      setShowRevokeModal({ show: false, teacher: null });
    } catch (error) {
      console.error('Error revoking teacher account:', error);
      alert(`Failed to revoke teacher account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRevoking(null);
    }
  };

  const getTokenStats = () => {
    const activeTokens = tokens.filter(t => t.status === 'active' && new Date(t.expires_at) > new Date()).length;
    const usedTokens = tokens.filter(t => t.status === 'used').length;
    const expiredTokens = tokens.filter(t => t.status === 'active' && new Date(t.expires_at) <= new Date()).length;
    
    return { activeTokens, usedTokens, expiredTokens };
  };

  const deleteExpiredTokens = async () => {
    const expiredTokenIds = tokens
      .filter(t => t.status === 'active' && new Date(t.expires_at) <= new Date())
      .map(t => t.id);

    if (expiredTokenIds.length === 0) {
      alert('No expired tokens to delete');
      return;
    }

    setDeletingTokens(expiredTokenIds);
    try {
      const { error } = await supabase
        .from('teacher_tokens')
        .delete()
        .in('id', expiredTokenIds);

      if (error) throw error;

      await fetchData();
      setShowDeleteExpiredModal(false);
    } catch (error) {
      console.error('Error deleting expired tokens:', error);
      alert('Failed to delete expired tokens');
    } finally {
      setDeletingTokens([]);
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token?')) return;

    setDeletingTokens([tokenId]);
    try {
      const { error } = await supabase
        .from('teacher_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error('Error deleting token:', error);
      alert('Failed to delete token');
    } finally {
      setDeletingTokens([]);
    }
  };
  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(educatorSearch.toLowerCase()) ||
    teacher.email.toLowerCase().includes(educatorSearch.toLowerCase()) ||
    teacher.phone_number.includes(educatorSearch)
  );

  const filteredTokens = tokens.filter(token => {
    const matchesSearch = tokenSearch === '' || 
      token.teacher_name.toLowerCase().includes(tokenSearch.toLowerCase()) ||
      token.phone_number.includes(tokenSearch) ||
      token.token.toLowerCase().includes(tokenSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (tokenFilter === 'active') {
      return token.status === 'active' && new Date(token.expires_at) > new Date();
    }
    if (tokenFilter === 'used') {
      return token.status === 'used';
    }
    if (tokenFilter === 'expired') {
      return token.status === 'active' && new Date(token.expires_at) <= new Date();
    }
    return true;
  });
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTokenStatus = (token: TeacherToken) => {
    if (token.status === 'used') {
      return { label: 'Used', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
    if (new Date(token.expires_at) <= new Date()) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800', icon: XCircle };
    }
    return { label: 'Active', color: 'bg-blue-100 text-blue-800', icon: Clock };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = getTokenStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0 flex-1">
              <img 
                src="/eduprimelogo.jpg" 
                alt="EduPrime Global Academy" 
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain mr-2 sm:mr-3 flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                  EduPrime Global Academy
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">Administrator Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                variant="outline" 
                onClick={refreshData}
                disabled={refreshing}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <span className="text-sm sm:text-base text-gray-700 hidden sm:inline">Welcome, {user?.name}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    await signOut();
                  } catch (error) {
                    console.error('Error signing out:', error);
                  }
                }}
              >
                <span className="sm:hidden">Out</span>
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Educator Management</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Manage educator access tokens and registered accounts</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <div className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <Key className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Active</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{stats.activeTokens}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Used</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{stats.usedTokens}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Expired</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{stats.expiredTokens}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-3 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Educators</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">{teachers.length}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Create Token Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Create New Educator Access Token
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Educator Name"
                placeholder="Enter educator's full name"
                value={newToken.teacher_name}
                onChange={(e) => setNewToken(prev => ({ ...prev, teacher_name: e.target.value }))}
              />
              <Input
                label="Phone Number"
                placeholder="Enter phone number"
                value={newToken.phone_number}
                onChange={(e) => setNewToken(prev => ({ ...prev, phone_number: e.target.value }))}
              />
              <div className="flex items-end">
                <Button 
                  onClick={createToken} 
                  loading={creating}
                  className="w-full"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Token
                </Button>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Tokens are valid for 7 days and can only be used once. 
                Share the token securely with the educator along with the registration link.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Access Tokens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Access Tokens ({filteredTokens.length})
                </div>
                {tokenFilter === 'expired' && stats.expiredTokens > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteExpiredModal(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete All Expired
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <div className="p-6 pt-0">
              {tokens.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search tokens by name, phone, or token..."
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              
              {tokens.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={tokenFilter === 'all' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTokenFilter('all')}
                      className="flex items-center"
                    >
                      All ({tokens.length})
                    </Button>
                    <Button
                      variant={tokenFilter === 'active' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTokenFilter('active')}
                      className="flex items-center"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Active ({stats.activeTokens})
                    </Button>
                    <Button
                      variant={tokenFilter === 'used' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTokenFilter('used')}
                      className="flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Used ({stats.usedTokens})
                    </Button>
                    <Button
                      variant={tokenFilter === 'expired' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setTokenFilter('expired')}
                      className="flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Expired ({stats.expiredTokens})
                    </Button>
                  </div>
                </div>
              )}
              
              {tokens.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No tokens created yet</p>
                  <p className="text-gray-400">Create your first educator access token above</p>
                </div>
              ) : filteredTokens.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    {tokenSearch ? 'No tokens found matching your search' : `No ${tokenFilter} tokens found`}
                  </p>
                  <p className="text-gray-400">
                    {tokenSearch ? 'Try adjusting your search terms' :
                     tokenFilter === 'active' ? 'No active tokens available' : 
                     tokenFilter === 'used' ? 'No used tokens yet' : 
                     tokenFilter === 'expired' ? 'No expired tokens found' : 'No tokens found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredTokens.map((token) => {
                    const status = getTokenStatus(token);
                    const StatusIcon = status.icon;
                    const isExpired = token.status === 'active' && new Date(token.expires_at) <= new Date();
                    const isDeleting = deletingTokens.includes(token.id);
                    
                    return (
                      <div key={token.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{token.teacher_name}</h4>
                            <p className="text-sm text-gray-600">{token.phone_number}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </div>
                            {isExpired && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteToken(token.id)}
                                disabled={isDeleting}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-gray-100 rounded p-2 mb-3">
                          <code className="text-sm font-mono text-gray-800">{token.token}</code>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Created: {formatDate(token.created_at)}</span>
                          <span>Expires: {formatDate(token.expires_at)}</span>
                        </div>
                        
                        {token.used_at && (
                          <div className="mt-2 text-xs text-green-600">
                            Used: {formatDate(token.used_at)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Registered Educators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Registered Educators ({filteredTeachers.length})
              </CardTitle>
            </CardHeader>
            <div className="p-6 pt-0">
              {teachers.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search educators by name, email, or phone..."
                      value={educatorSearch}
                      onChange={(e) => setEducatorSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              
              {teachers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No educators registered yet</p>
                  <p className="text-gray-400">Educators will appear here after using access tokens</p>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No educators found</p>
                  <p className="text-gray-400">Try adjusting your search terms</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredTeachers.map((teacher) => (
                    <div key={teacher.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{teacher.name}</h4>
                          <p className="text-sm text-gray-600">{teacher.email}</p>
                          <p className="text-sm text-gray-500">{teacher.phone_number}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeClick(teacher)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          disabled={revoking === teacher.id}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {revoking === teacher.id ? 'Revoking...' : 'Revoke'}
                        </Button>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Registered: {formatDate(teacher.created_at)}</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Revoke Confirmation Modal */}
        {showRevokeModal.show && showRevokeModal.teacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Revoke Educator Account
                </h3>
                
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to revoke access for <strong>{showRevokeModal.teacher.name}</strong>? 
                  This action cannot be undone and will permanently remove:
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Educator account and login access</li>
                    <li>• All assessments created by this educator</li>
                    <li>• All questions and answer options</li>
                    <li>• All student submissions and results</li>
                    <li>• All assessment analytics and reports</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowRevokeModal({ show: false, teacher: null })}
                    className="flex-1"
                    disabled={revoking !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={revokeTeacherAccount}
                    loading={revoking !== null}
                    className="flex-1"
                  >
                    Revoke Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Expired Tokens Confirmation Modal */}
        {showDeleteExpiredModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Delete Expired Tokens
                </h3>
                
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to delete all <strong>{stats.expiredTokens}</strong> expired tokens? 
                  This action cannot be undone.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-700">
                    This will permanently remove all expired access tokens from the system.
                    Educators with expired tokens will need new tokens to register.
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteExpiredModal(false)}
                    className="flex-1"
                    disabled={deletingTokens.length > 0}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={deleteExpiredTokens}
                    loading={deletingTokens.length > 0}
                    className="flex-1"
                  >
                    Delete All Expired
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}