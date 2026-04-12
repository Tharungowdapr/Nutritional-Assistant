'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { Users, MessageSquare, TrendingUp, Settings, LogOut } from 'lucide-react';

interface Stats {
  total_users: number;
  active_users_24h: number;
  total_chats: number;
  chats_24h: number;
  users_with_chats: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface UsageStats {
  total_chats: number;
  avg_chats_per_user: number;
  top_active_users: Array<{ name: string; chats: number }>;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, usageRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.listUsers(page, 20),
        adminApi.getUsageStats(),
      ]);

      setStats(statsRes);
      setUsers(usersRes.users);
      setTotalPages(usersRes.pages);
      setUsageStats(usageRes);
    } catch (error) {
      toast.error('Failed to load admin data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: number) => {
    try {
      await adminApi.toggleUserAdmin(userId);
      toast.success('Admin status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update admin status');
    }
  };

  const handleViewUserDetail = async (user: User) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400">System statistics and user management</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white mt-2">{stats?.total_users || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active (24h)</p>
                <p className="text-3xl font-bold text-white mt-2">{stats?.active_users_24h || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Chats</p>
                <p className="text-3xl font-bold text-white mt-2">{stats?.total_chats || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Chats (24h)</p>
                <p className="text-3xl font-bold text-white mt-2">{stats?.chats_24h || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-amber-400 opacity-50" />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Chats/User</p>
                <p className="text-3xl font-bold text-white mt-2">{usageStats?.avg_chats_per_user.toFixed(1) || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-cyan-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Top Active Users */}
        {usageStats && usageStats.top_active_users.length > 0 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Top Active Users</h2>
            <div className="space-y-3">
              {usageStats.top_active_users.map((user, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <span className="text-white font-medium">{user.name}</span>
                  <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                    {user.chats} chats
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Users Management</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-300">Name</th>
                  <th className="px-4 py-3 text-left text-slate-300">Email</th>
                  <th className="px-4 py-3 text-center text-slate-300">Admin</th>
                  <th className="px-4 py-3 text-center text-slate-300">Verified</th>
                  <th className="px-4 py-3 text-left text-slate-300">Last Login</th>
                  <th className="px-4 py-3 text-center text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3 text-center">
                      {user.is_admin ? (
                        <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs">Admin</span>
                      ) : (
                        <span className="bg-slate-500/20 text-slate-300 px-2 py-1 rounded text-xs">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.email_verified ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          onClick={() => handleViewUserDetail(user)}
                          size="sm"
                          variant="outline"
                        >
                          View
                        </Button>
                        <Button
                          onClick={() => handleToggleAdmin(user.id)}
                          size="sm"
                          variant={user.is_admin ? "destructive" : "default"}
                        >
                          {user.is_admin ? 'Remove' : 'Make'} Admin
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-slate-300">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">User Details</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">Name</p>
                <p className="text-lg font-bold text-white">{selectedUser.name}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">Email</p>
                <p className="text-lg font-bold text-white">{selectedUser.email}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">Admin Status</p>
                <p className="text-lg font-bold text-white">{selectedUser.is_admin ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">Email Verified</p>
                <p className="text-lg font-bold text-white">{selectedUser.email_verified ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 col-span-2">
                <p className="text-xs text-slate-400 mb-1">Created</p>
                <p className="text-lg font-bold text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowUserDetail(false)} className="flex-1">
                Close
              </Button>
              <Button
                onClick={() => {
                  handleToggleAdmin(selectedUser.id);
                  setShowUserDetail(false);
                }}
                variant={selectedUser.is_admin ? 'destructive' : 'default'}
              >
                {selectedUser.is_admin ? 'Remove Admin' : 'Make Admin'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
