/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { 
  Users, 
  Search, 
  UserMinus, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  RefreshCw, 
  Trash2, 
  Edit, 
  ShieldCheck, 
  Sliders, 
  Check, 
  X,
  Mail
} from 'lucide-react';
import { UserProfile } from '../../types';
import { motion } from 'motion/react';

interface UsersTabProps {
  users: UserProfile[];
  onAction: (actionType: string, payload: any) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({ users, onAction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayName: '', username: '', email: '', role: 'member' as any });

  // Filter and sort computation
  const filteredUsers = users
    .filter((u) => {
      const matchSearch = 
        (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const userStatus = (u as any).status || 'active';
      const matchStatus = statusFilter === 'all' || userStatus === statusFilter;
      const matchRole = roleFilter === 'all' || u.role === roleFilter;

      return matchSearch && matchStatus && matchRole;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const handleStartEdit = (user: UserProfile) => {
    setEditingUserId(user.uid);
    setEditForm({
      displayName: user.displayName || user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role,
    });
  };

  const handleSaveEdit = (uid: string) => {
    onAction('edit_user', { uid, ...editForm });
    setEditingUserId(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-indigo-400" />
                <span>User Record System Database</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Audit, suspend, elevate, and terminate registrations across OpenComm.
              </CardDescription>
            </div>
            <div className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
              ROWS: <span className="text-white">{filteredUsers.length}</span> / {users.length}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* SEARCH & FILTERS CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search username, email, full name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white placeholder-slate-500 text-xs h-9.5 rounded-xl"
              />
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 border border-slate-800 rounded-xl h-9.5">
              <Sliders className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer font-semibold py-1"
              >
                <option value="all" className="bg-slate-950 text-white">Status: All</option>
                <option value="active" className="bg-slate-950 text-white">Active Only</option>
                <option value="suspended" className="bg-slate-950 text-slate-300">Suspended</option>
                <option value="banned" className="bg-slate-950 text-red-400">Banned</option>
              </select>
            </div>

            {/* Role & Sort combined filters */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center bg-slate-950 px-2 border border-slate-800 rounded-xl h-9.5">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
                >
                  <option value="all" className="bg-slate-950">Role: All</option>
                  <option value="admin" className="bg-slate-950">Admins</option>
                  <option value="member" className="bg-slate-950">Members</option>
                </select>
              </div>

              <div className="flex items-center bg-slate-950 px-2 border border-slate-800 rounded-xl h-9.5">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
                >
                  <option value="newest" className="bg-slate-950">Newest</option>
                  <option value="oldest" className="bg-slate-950">Oldest</option>
                </select>
              </div>
            </div>
          </div>

          {/* USERS DATA TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Credentials & ID</th>
                  <th className="p-4">Role / Status</th>
                  <th className="p-4">Registration</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredUsers.map((u) => {
                  const isEditing = editingUserId === u.uid;
                  const currentStatus = (u as any).status || 'active';
                  
                  return (
                    <tr key={u.uid} className="hover:bg-slate-900/10 text-xs text-slate-300 transition-colors">
                      {/* USER INFO */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.photoURL} fallback={u.displayName || u.fullName || 'OC'} size="md" className="border border-slate-800" />
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5">
                              <Input
                                value={editForm.displayName}
                                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                className="h-7 text-xs bg-slate-950 border-slate-800 px-2 text-white"
                                placeholder="Display Name"
                              />
                              <Input
                                value={editForm.username}
                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                className="h-7 text-xs bg-slate-950 border-slate-800 px-2 text-white font-mono"
                                placeholder="username"
                              />
                            </div>
                          ) : (
                            <div className="text-left">
                              <p className="font-semibold text-white">{u.displayName || u.fullName || 'Anonymous'}</p>
                              <p className="text-[10px] text-indigo-400 font-mono">@{u.username || 'username'}</p>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* CREDENTIALS */}
                      <td className="p-4 font-mono text-[11px]">
                        {isEditing ? (
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="h-7 text-xs bg-slate-950 border-slate-800 px-2 text-white w-full"
                            placeholder="Email address"
                          />
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-200">{u.email}</span>
                            <span className="text-[9px] text-slate-500">ID: {u.openCommId || 'OC-UNKNOWN'}</span>
                          </div>
                        )}
                      </td>

                      {/* STATUS / ROLE */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                              className="bg-slate-950 text-white text-xs border border-slate-800 rounded p-1"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              u.role === 'admin'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {u.role}
                            </span>
                          )}

                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            currentStatus === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : currentStatus === 'suspended'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {currentStatus}
                          </span>
                        </div>
                      </td>

                      {/* REGISTRATION DATE */}
                      <td className="p-4 font-mono text-[10px] text-slate-500">
                        {u.createdAt ? u.createdAt.split('T')[0] : 'N/A'}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditing ? (
                            <>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleSaveEdit(u.uid)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white border-transparent px-2 py-1 h-7 text-[10px]"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setEditingUserId(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent px-2 py-1 h-7 text-[10px]"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleStartEdit(u)}
                                className="text-slate-400 hover:text-white border-slate-800 h-7 text-[10px]"
                                title="Edit Record"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => onAction('reset_password', u.email)}
                                className="text-indigo-400 hover:bg-indigo-500/10 border-slate-800 h-7 text-[10px]"
                                title="Trigger Password Reset"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </Button>

                              {currentStatus !== 'active' ? (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => onAction('unban_user', u.uid)}
                                  className="text-emerald-400 hover:bg-emerald-500/10 border-slate-800 h-7 text-[10px]"
                                  title="Unban User"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => onAction('suspend_user', u.uid)}
                                    className="text-amber-400 hover:bg-amber-500/10 border-slate-800 h-7 text-[10px]"
                                    title="Suspend User (Temporary)"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => onAction('ban_user', u.uid)}
                                    className="text-red-400 hover:bg-red-500/10 border-slate-800 h-7 text-[10px]"
                                    title="Ban User (Permanent)"
                                  >
                                    <UserX className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}

                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => {
                                  if (confirm('Permanently delete this user record from OpenComm? This action is irreversible.')) {
                                    onAction('delete_user', u.uid);
                                  }
                                }}
                                className="text-red-500 hover:bg-red-600 hover:text-white border-slate-800 h-7 text-[10px]"
                                title="Delete Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No matching registered users located.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
