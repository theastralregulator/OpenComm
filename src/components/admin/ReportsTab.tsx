/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  ShieldAlert, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Bell, 
  UserMinus, 
  UserX,
  Search,
  Sliders
} from 'lucide-react';
import { ContentReport } from '../../types';
import { Input } from '../ui/Input';

interface ReportsTabProps {
  reports: ContentReport[];
  onAction: (actionType: string, payload: any) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ reports, onAction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'ignored'>('all');

  // Filter computation
  const filteredReports = reports.filter((rep) => {
    const matchSearch = 
      rep.contentPreview.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.reportedUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'all' || rep.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <span>Ecosystem Moderation & Flagged Reports Queue</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Audit reported content including post text, audio room descriptions, messages, and spam profiles.
              </CardDescription>
            </div>
            <div className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
              PENDING: <span className="text-red-400 font-bold">{reports.filter(r => r.status === 'pending').length}</span> / {reports.length}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* SEARCH & FILTERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search reported keywords, reporter handles, author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white placeholder-slate-500 text-xs h-9.5 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-2 border border-slate-800 rounded-xl h-9.5">
              <Sliders className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
              >
                <option value="all">Moderation Status: All</option>
                <option value="pending">Awaiting Operator (Pending)</option>
                <option value="resolved">Resolved (Sanctioned)</option>
                <option value="ignored">Closed (Ignored)</option>
              </select>
            </div>
          </div>

          {/* REPORTS QUEUE */}
          <div className="flex flex-col gap-3.5">
            {filteredReports.map((rep) => (
              <div 
                key={rep.id} 
                className={`p-4 rounded-2xl border flex flex-col gap-4 bg-slate-950/40 transition-all ${
                  rep.status === 'pending' 
                    ? 'border-red-500/10 hover:border-red-500/20 shadow-lg shadow-red-950/2' 
                    : 'border-slate-900 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
                  <div className="flex flex-col gap-1 text-left">
                    {/* Header info */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        rep.type === 'post' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : rep.type === 'room'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {rep.type}
                      </span>
                      <span className="text-slate-400">Flagged by: <strong>{rep.reporterName}</strong></span>
                      <span className="h-1 w-1 rounded-full bg-slate-800" />
                      <span className="text-slate-500">Date: {rep.createdAt.split('T')[0]}</span>
                    </div>

                    {/* Previews */}
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-xs text-slate-200 mt-2 italic">
                      "{rep.contentPreview}"
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-red-400 font-mono">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>VIOLATION REASON: <strong className="uppercase">{rep.reason}</strong></span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1">
                      Content Creator: <strong className="text-indigo-400">@{rep.reportedUserName}</strong>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase inline-block shrink-0 ${
                    rep.status === 'pending'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                      : rep.status === 'resolved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {rep.status}
                  </span>
                </div>

                {/* MODERATION ACTION GRID */}
                {rep.status === 'pending' && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3.5 border-t border-slate-900">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onAction('ignore_report', rep.id)}
                      className="h-8.5 text-[10px] gap-1 border-slate-850 text-slate-400 hover:bg-slate-900"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Dismiss Report</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onAction('delete_reported_content', { id: rep.id, type: rep.type, contentId: rep.contentId })}
                      className="h-8.5 text-[10px] gap-1 border-slate-850 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Content</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onAction('warn_user', { id: rep.id, userId: rep.reportedUserId, username: rep.reportedUserName })}
                      className="h-8.5 text-[10px] gap-1 border-slate-850 text-indigo-400 hover:bg-indigo-500/10"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span>Warn Author</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onAction('suspend_user_report', { id: rep.id, userId: rep.reportedUserId })}
                      className="h-8.5 text-[10px] gap-1 border-slate-850 text-amber-500 hover:bg-amber-500/10"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      <span>Suspend Author</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onAction('ban_user_report', { id: rep.id, userId: rep.reportedUserId })}
                      className="h-8.5 text-[10px] gap-1 border-slate-850 text-red-400 hover:bg-red-500/10 col-span-2 sm:col-span-1"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      <span>Ban Author</span>
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {filteredReports.length === 0 && (
              <p className="text-center text-slate-500 py-10 text-xs">
                No reported items are located in the queue.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
