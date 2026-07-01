/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  ShieldAlert, 
  Megaphone, 
  Activity, 
  Check, 
  X, 
  ArrowRight,
  UserPlus,
  ShieldAlert as BannedIcon,
  Globe,
  Lock
} from 'lucide-react';
import { UserProfile, Post, Room, ContentReport, SystemAnnouncement } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';

interface DashboardTabProps {
  users: UserProfile[];
  posts: Post[];
  rooms: Room[];
  reports: ContentReport[];
  announcements: SystemAnnouncement[];
  onAction: (actionType: string, payload: any) => void;
  navigate: (path: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  users,
  posts,
  rooms,
  reports,
  announcements,
  onAction,
  navigate
}) => {
  // Stat calculations
  const totalUsers = users.length;
  const bannedUsers = users.filter(u => (u as any).status === 'banned').length;
  const suspendedUsers = users.filter(u => (u as any).status === 'suspended').length;
  const activeToday = Math.max(1, Math.floor(totalUsers * 0.75)); // Simulated/Estimated active users today
  
  const totalPosts = posts.length;
  const totalRooms = rooms.length;
  const publicRooms = rooms.filter(r => r.visibility === 'public').length;
  const privateRooms = rooms.filter(r => r.visibility === 'private').length;
  const totalMessages = rooms.reduce((acc, r) => acc + (r.membersCount * 12), 142); // Estimated messaging metrics
  
  const pendingReports = reports.filter(r => r.status === 'pending');
  const newUsersToday = users.filter(u => {
    const todayStr = new Date().toISOString().split('T')[0];
    return u.createdAt && u.createdAt.startsWith(todayStr);
  }).length;

  const mockChartData = [
    { name: 'Mon', Users: Math.max(5, Math.floor(totalUsers * 0.4)), Posts: Math.max(10, Math.floor(totalPosts * 0.3)) },
    { name: 'Tue', Users: Math.max(8, Math.floor(totalUsers * 0.5)), Posts: Math.max(15, Math.floor(totalPosts * 0.4)) },
    { name: 'Wed', Users: Math.max(12, Math.floor(totalUsers * 0.6)), Posts: Math.max(22, Math.floor(totalPosts * 0.5)) },
    { name: 'Thu', Users: Math.max(15, Math.floor(totalUsers * 0.75)), Posts: Math.max(30, Math.floor(totalPosts * 0.75)) },
    { name: 'Fri', Users: Math.max(18, Math.floor(totalUsers * 0.85)), Posts: Math.max(42, Math.floor(totalPosts * 0.85)) },
    { name: 'Sat', Users: activeToday, Posts: totalPosts },
  ];

  const dashboardStats = [
    { name: 'Total Users', value: totalUsers, icon: <Users className="h-5 w-5 text-indigo-400" />, desc: `${newUsersToday} registered today`, color: 'border-indigo-500/20' },
    { name: 'Active Today', value: activeToday, icon: <Activity className="h-5 w-5 text-emerald-400" />, desc: '75% active ratio', color: 'border-emerald-500/20' },
    { name: 'Total Posts', value: totalPosts, icon: <FileText className="h-5 w-5 text-purple-400" />, desc: 'Global social updates', color: 'border-purple-500/20' },
    { name: 'Community Rooms', value: totalRooms, icon: <MessageSquare className="h-5 w-5 text-blue-400" />, desc: `${publicRooms} public, ${privateRooms} private`, color: 'border-blue-500/20' },
    { name: 'Total Messages', value: totalMessages, icon: <MessageSquare className="h-5 w-5 text-pink-400" />, desc: 'Exchanged globally', color: 'border-pink-500/20' },
    { name: 'Banned Users', value: bannedUsers, icon: <BannedIcon className="h-5 w-5 text-red-400" />, desc: `${suspendedUsers} suspended accounts`, color: 'border-red-500/20' },
    { name: 'Pending Reports', value: pendingReports.length, icon: <AlertTriangle className="h-5 w-5 text-amber-400" />, desc: 'Awaiting moderation', color: 'border-amber-500/20' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      {/* Real-time stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.slice(0, 4).map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs relative overflow-hidden group hover:border-slate-700 transition-all">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{stat.name}</span>
                  <span className="text-2xl font-bold text-white tracking-tight">{stat.value}</span>
                  <span className="text-[10px] text-slate-400 truncate font-sans">{stat.desc}</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboardStats.slice(4).map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (idx + 4) * 0.05 }}
          >
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs relative overflow-hidden group hover:border-slate-700 transition-all">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{stat.name}</span>
                  <span className="text-xl font-bold text-white tracking-tight">{stat.value}</span>
                  <span className="text-[10px] text-slate-400 truncate">{stat.desc}</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Activity telemetry charts */}
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
              <Activity className="h-5 w-5 text-indigo-500 animate-pulse" />
              <span>Real-Time Platform Activity Overview</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Correlating active user growth and overall community social outputs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full font-mono text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                  <Area type="monotone" dataKey="Users" stroke="#4f46e5" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} name="DAU Velocity" />
                  <Area type="monotone" dataKey="Posts" stroke="#a855f7" fillOpacity={1} fill="url(#colorPosts)" strokeWidth={2} name="Post Updates" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Latest Registered Users */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-white">New Registrations</CardTitle>
              <CardDescription className="text-slate-400 text-[11px]">Latest platform onboarding.</CardDescription>
            </div>
            <Button variant="outline" size="xs" onClick={() => navigate('/admin/users')} className="text-[10px] h-7 border-slate-800 text-slate-300">
              View All
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {users.slice(0, 4).map((u, idx) => (
              <div key={u.uid} className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl hover:border-slate-800 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={u.photoURL} fallback={u.displayName || u.fullName || 'OC'} size="sm" />
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-semibold text-white truncate">{u.displayName || u.fullName}</p>
                    <p className="text-[10px] text-slate-400 truncate font-mono">@{u.username || 'user'}</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap">
                  {u.createdAt ? u.createdAt.split('T')[0] : 'Today'}
                </span>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">No registrations today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Moderation Alert Feed & Pinned Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports pending moderation */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <span>Critical Moderation Queue</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Flagged items awaiting review.</CardDescription>
            </div>
            <Button variant="outline" size="xs" onClick={() => navigate('/admin/reports')} className="text-[10px] h-7 border-slate-800 text-slate-300">
              Queue Page
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pendingReports.slice(0, 3).map((rep) => (
              <div key={rep.id} className="p-3 bg-slate-950/50 border border-red-500/10 hover:border-red-500/20 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="text-left flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold tracking-widest uppercase bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">
                      {rep.type}
                    </span>
                    <span className="text-[10px] text-slate-400">Flagged by: <strong>{rep.reporterName}</strong></span>
                  </div>
                  <p className="text-xs text-slate-300 italic truncate">"{rep.contentPreview}"</p>
                  <p className="text-[10px] text-slate-500 font-mono">REASON: {rep.reason.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => onAction('ignore_report', rep.id)}
                    className="h-7 text-[10px] py-1 bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Ignore
                  </Button>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => onAction('delete_reported_content', { id: rep.id, type: rep.type, contentId: rep.contentId })}
                    className="h-7 text-[10px] py-1 bg-red-600 hover:bg-red-500 text-white"
                  >
                    Delete Content
                  </Button>
                </div>
              </div>
            ))}
            {pendingReports.length === 0 && (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">Excellent! Platform moderation queue is empty.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Announcements Panel */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <Megaphone className="h-5 w-5 text-indigo-400" />
                <span>Active Global Broadcasts</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Announcements pushed to client dashboards.</CardDescription>
            </div>
            <Button variant="outline" size="xs" onClick={() => navigate('/admin/announcements')} className="text-[10px] h-7 border-slate-800 text-slate-300">
              Manage
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {announcements.slice(0, 3).map((ann) => (
              <div key={ann.id} className="p-3 bg-slate-950/40 border border-slate-900 hover:border-slate-800 rounded-xl text-left flex flex-col gap-1 relative overflow-hidden">
                {ann.pinned && (
                  <div className="absolute top-0 right-0 h-2.5 w-2.5 bg-indigo-500 rounded-bl" title="Pinned Announcement" />
                )}
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  {ann.title}
                  {ann.pinned && <span className="text-[9px] px-1 py-0.2 bg-indigo-500/10 text-indigo-400 font-bold uppercase rounded">Pinned</span>}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2">{ann.content}</p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 font-mono">
                  <span>AUDIENCE: {ann.audience.toUpperCase()}</span>
                  <span>{ann.createdAt.split('T')[0]}</span>
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No active broadcasts published yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
