/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  Megaphone, 
  BarChart2, 
  Settings, 
  List, 
  LogOut, 
  Menu, 
  X, 
  ArrowLeft,
  Home,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { showToast } from '../components/ui/Toast';
import { motion, AnimatePresence } from 'motion/react';

export const AdminLayout: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Permission Redirection Guard
  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        showToast.error("You don't have permission to access this page.");
        navigate('/feed');
      }
    }
  }, [user, loading, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-visual-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark text-gray-900 dark:text-slate-100">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
            <Shield className="h-5 w-5 animate-spin" />
          </div>
          <span className="text-xs text-gray-500 font-mono">Authenticating Operator Terminal...</span>
        </div>
      </div>
    );
  }

  // Guard safety fallback
  if (!user || user.role !== 'admin') {
    return null;
  }

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin', icon: <Shield className="h-4.5 w-4.5" />, desc: 'Real-time telemetry' },
    { name: 'User Management', path: '/admin/users', icon: <Users className="h-4.5 w-4.5" />, desc: 'Manage operators & users' },
    { name: 'Post Management', path: '/admin/posts', icon: <FileText className="h-4.5 w-4.5" />, desc: 'Moderate conversation feed' },
    { name: 'Room Management', path: '/admin/rooms', icon: <MessageSquare className="h-4.5 w-4.5" />, desc: 'Audit active discussion hubs' },
    { name: 'Report Management', path: '/admin/reports', icon: <AlertTriangle className="h-4.5 w-4.5" />, desc: 'Flagged content queues' },
    { name: 'Announcements', path: '/admin/announcements', icon: <Megaphone className="h-4.5 w-4.5" />, desc: 'Broadcast global alerts' },
    { name: 'Analytics', path: '/admin/analytics', icon: <BarChart2 className="h-4.5 w-4.5" />, desc: 'System growth metrics' },
    { name: 'System Settings', path: '/admin/settings', icon: <Settings className="h-4.5 w-4.5" />, desc: 'Configure threshold rules' },
    { name: 'Activity Logs', path: '/admin/activity-logs', icon: <List className="h-4.5 w-4.5" />, desc: 'Audit operator logging trail' },
  ];

  const handleAdminLogout = async () => {
    try {
      await logout();
      showToast.success('Session terminated successfully.');
      navigate('/login');
    } catch {
      showToast.error('An error occurred while terminating session.');
    }
  };

  const getActiveTitle = () => {
    const matched = adminNavItems.find(item => {
      if (item.path === '/admin') {
        return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
      }
      return location.pathname.startsWith(item.path);
    });
    return matched ? matched.name : 'Operator Console';
  };

  const isLinkActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-visual-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[5%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* MOBILE HEADER */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-slate-900/95 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-linear-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block uppercase">OpenComm Admin</span>
            <span className="text-[9px] text-indigo-400 font-mono block tracking-widest leading-none">SYS_OPERATIONS</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* MOBILE DRAWER SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black z-50 lg:hidden"
            />

            {/* Content */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-[280px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between z-50 lg:hidden"
            >
              <div className="flex flex-col gap-6">
                {/* Header inside Mobile Drawer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                      <Shield className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-black tracking-wider uppercase text-white">Console Terminal</span>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Operator Badge */}
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-2.5">
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
                    alt="admin avatar"
                    className="h-8 w-8 rounded-lg object-cover bg-slate-800 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{user.displayName || 'System Admin'}</p>
                    <p className="text-[9px] text-emerald-400 font-mono">ROLE: ROOT_ADMIN</p>
                  </div>
                </div>

                {/* Navigation List */}
                <nav className="flex flex-col gap-1">
                  {adminNavItems.map((item) => {
                    const active = isLinkActive(item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all ${
                          active
                            ? 'bg-indigo-600/90 text-white font-semibold shadow-lg shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Footer inside Drawer */}
              <div className="flex flex-col gap-3 pt-6 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    navigate('/feed');
                  }}
                  className="w-full text-xs gap-2 border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  <Home className="h-4 w-4" />
                  <span>Main Application</span>
                </Button>
                <button
                  onClick={handleAdminLogout}
                  className="flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2.5 rounded-xl border border-transparent hover:border-red-500/20 transition-all font-semibold"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Terminate Session</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col justify-between w-[290px] border-r border-slate-900 bg-slate-950 p-6 flex-shrink-0 h-visual-screen sticky top-0 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Brand logo */}
          <div className="flex items-center gap-3 pl-1">
            <div className="h-10 w-10 bg-linear-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/10">
              <Shield className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-white block uppercase leading-tight">OpenComm Admin</span>
              <span className="text-[9px] text-indigo-400 font-mono block tracking-widest">SYSTEM_OPERATIONS</span>
            </div>
          </div>

          {/* Connected User Profile */}
          <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-2xl flex items-center gap-3">
            <img
              src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
              alt="admin avatar"
              className="h-10 w-10 rounded-xl object-cover bg-slate-800 border border-indigo-500/20"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.displayName || 'System Admin'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase">SECURE_SHELL</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 px-1.5 uppercase">Command Console</span>
            {adminNavItems.map((item) => {
              const active = isLinkActive(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col px-3.5 py-2.5 rounded-xl transition-all relative overflow-hidden group ${
                    active
                      ? 'bg-linear-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-600/10 border-l-4 border-indigo-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={active ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'}>
                      {item.icon}
                    </span>
                    <span className="text-xs">{item.name}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Desktop Sidebar Footer */}
        <div className="flex flex-col gap-3 pt-6 border-t border-slate-900/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/feed')}
            className="w-full text-xs gap-2 border-slate-900 text-slate-300 hover:bg-slate-900 hover:text-white cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Main Application</span>
          </Button>

          <button
            onClick={handleAdminLogout}
            className="flex items-center justify-center gap-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 p-2.5 rounded-xl border border-transparent hover:border-red-500/10 transition-all font-mono font-semibold cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>TERMINATE_SESSION</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW CONTROLLER PANEL */}
      <main className="flex-1 flex flex-col min-w-0 h-visual-screen overflow-hidden">
        {/* Sticky Glassmorphic Top Header */}
        <header className="hidden lg:flex h-16 bg-slate-950/40 backdrop-blur-md border-b border-slate-900/60 px-8 items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
              {getActiveTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] text-slate-400">
              <Activity className="h-3 w-3 text-indigo-500 animate-pulse" />
              <span>SERVER_OK: v2.5.0</span>
            </div>
            <div className="text-slate-500">
              SYS_TIME: <span className="text-slate-300">UTC 2026-06-26</span>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 bg-bg-light dark:bg-bg-dark text-gray-900 dark:text-slate-100">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
