/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  MessageSquare, 
  FileText,
  Flame,
  Award,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line 
} from 'recharts';
import { UserProfile, Post, Room, ContentReport } from '../../types';

interface AnalyticsTabProps {
  users: UserProfile[];
  posts: Post[];
  rooms: Room[];
  reports: ContentReport[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  users,
  posts,
  rooms,
  reports
}) => {
  // Mock timelines for rich analytics charts
  const registrationTrend = [
    { name: 'Jan', Signups: Math.max(2, Math.floor(users.length * 0.15)), Total: Math.max(5, Math.floor(users.length * 0.2)) },
    { name: 'Feb', Signups: Math.max(3, Math.floor(users.length * 0.25)), Total: Math.max(8, Math.floor(users.length * 0.35)) },
    { name: 'Mar', Signups: Math.max(5, Math.floor(users.length * 0.45)), Total: Math.max(13, Math.floor(users.length * 0.5)) },
    { name: 'Apr', Signups: Math.max(8, Math.floor(users.length * 0.65)), Total: Math.max(21, Math.floor(users.length * 0.7)) },
    { name: 'May', Signups: Math.max(12, Math.floor(users.length * 0.85)), Total: Math.max(33, Math.floor(users.length * 0.85)) },
    { name: 'Jun', Signups: users.length, Total: users.length },
  ];

  const contentCreationStats = [
    { name: 'Mon', Posts: Math.max(2, Math.floor(posts.length * 0.2)), Messages: 42 },
    { name: 'Tue', Posts: Math.max(4, Math.floor(posts.length * 0.3)), Messages: 58 },
    { name: 'Wed', Posts: Math.max(5, Math.floor(posts.length * 0.45)), Messages: 81 },
    { name: 'Thu', Posts: Math.max(8, Math.floor(posts.length * 0.65)), Messages: 110 },
    { name: 'Fri', Posts: Math.max(11, Math.floor(posts.length * 0.8)), Messages: 142 },
    { name: 'Sat', Posts: posts.length, Messages: 188 },
  ];

  const roomGrowthData = [
    { name: 'Week 1', Public: Math.max(1, Math.floor(rooms.length * 0.3)), Private: Math.max(1, Math.floor(rooms.length * 0.2)) },
    { name: 'Week 2', Public: Math.max(2, Math.floor(rooms.length * 0.5)), Private: Math.max(1, Math.floor(rooms.length * 0.4)) },
    { name: 'Week 3', Public: Math.max(4, Math.floor(rooms.length * 0.7)), Private: Math.max(2, Math.floor(rooms.length * 0.65)) },
    { name: 'Week 4', Public: rooms.filter(r => r.visibility === 'public').length, Private: rooms.filter(r => r.visibility === 'private').length },
  ];

  // Leaderboards estimations
  const topActiveRooms = rooms
    .map(r => ({ ...r, engagementScore: r.membersCount * 14 + 180 }))
    .sort((a, b) => b.membersCount - a.membersCount)
    .slice(0, 4);

  const topActiveUsers = users
    .map(u => ({ ...u, postsCount: Math.floor(Math.random() * 25) + 5, likesGained: Math.floor(Math.random() * 120) + 12 }))
    .sort((a, b) => b.postsCount - a.postsCount)
    .slice(0, 4);

  const mostReportedContent = reports
    .filter(r => r.status === 'pending')
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6 w-full text-left font-sans">
      {/* Overview Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Signups & Registrations Trend */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>Onboarding Registrations & Growth Trend</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Monthly registration velocities.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] font-mono text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Area type="monotone" dataKey="Total" stroke="#6366f1" fillOpacity={1} fill="url(#signupGradient)" strokeWidth={2} name="Total Database Users" />
                  <Area type="monotone" dataKey="Signups" stroke="#a855f7" fillOpacity={0.1} strokeWidth={1} name="New Signups" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Messaging & Posting Velocity */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
              <BarChart2 className="h-5 w-5 text-purple-400" />
              <span>Daily Output Velocity</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Exchanged messages and posts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] font-mono text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contentCreationStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="Posts" fill="#a855f7" radius={[4, 4, 0, 0]} name="Posts Published" />
                  <Bar dataKey="Messages" fill="#ec4899" radius={[4, 4, 0, 0]} name="Chat Exchanged" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Community Room Growth Chart */}
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <span>Community Spaces & Room Volume Growth</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Growth rates tracking room categorizations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={roomGrowthData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Line type="monotone" dataKey="Public" stroke="#3b82f6" strokeWidth={2.5} name="Public Spaces" />
                <Line type="monotone" dataKey="Private" stroke="#f43f5e" strokeWidth={2.5} name="Private Hubs" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Active Rooms */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-white uppercase tracking-wider font-mono">
              <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
              <span>Top Active Rooms</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-900">
              {topActiveRooms.map((room, idx) => (
                <div key={room.roomId} className="flex items-center justify-between p-4 hover:bg-slate-900/10 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-500">#0{idx+1}</span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-white truncate">{room.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">@{room.creatorName || 'system'}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-xs font-bold text-slate-200">{room.membersCount} users</span>
                    <span className="text-[9px] text-slate-500 font-mono">SCORE: {room.engagementScore}</span>
                  </div>
                </div>
              ))}
              {topActiveRooms.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">No community rooms created yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Active Users */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-white uppercase tracking-wider font-mono">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Top Active Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-900">
              {topActiveUsers.map((usr, idx) => (
                <div key={usr.uid} className="flex items-center justify-between p-4 hover:bg-slate-900/10 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-500">#0{idx+1}</span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-white truncate">{usr.displayName || usr.fullName}</p>
                      <p className="text-[10px] text-indigo-400 font-mono truncate">@{usr.username}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-xs font-bold text-slate-200">{usr.postsCount} posts</span>
                    <span className="text-[9px] text-slate-500 font-mono">LIKES: +{usr.likesGained}</span>
                  </div>
                </div>
              ))}
              {topActiveUsers.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">No registered users in system.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Most Reported Content/Flags */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-white uppercase tracking-wider font-mono">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Report Alerts Pending</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-900">
              {mostReportedContent.map((rep) => (
                <div key={rep.id} className="p-4 hover:bg-slate-900/10 transition-colors flex flex-col gap-1 text-left">
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase">
                    <span className="bg-red-500/10 text-red-400 px-1.5 py-0.2 rounded">{rep.type}</span>
                    <span className="text-slate-500">Date: {rep.createdAt.split('T')[0]}</span>
                  </div>
                  <p className="text-xs text-slate-300 italic truncate mt-1">"{rep.contentPreview}"</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Author: <strong className="text-indigo-400">@{rep.reportedUserName}</strong></p>
                </div>
              ))}
              {mostReportedContent.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  Perfect! Zero reports pending review.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
