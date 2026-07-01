/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Home,
  Compass,
  Users,
  Mail,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { Avatar } from '../components/ui/Avatar';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { showToast } from '../components/ui/Toast';
import { onNotificationsSnapshot } from '../services/notificationService';
import { OpenCommLogo } from '../components/common/OpenCommLogo';

export const AuthLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;
    const unsubscribe = onNotificationsSnapshot(
      user.uid,
      (list) => {
        const unread = list.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      },
      (error) => {
        console.error('Error in AuthLayout notifications listener:', error);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    showToast.success('Logged out successfully.');
  };

  const username = user?.username || 'me';

  const navItems = [
    { name: 'Feed', path: '/feed', icon: <Home className="h-5 w-5" /> },
    { name: 'Explore', path: '/explore', icon: <Compass className="h-5 w-5" /> },
    { name: 'Rooms', path: '/rooms', icon: <Users className="h-5 w-5" /> },
    { name: 'Messages', path: '/messages', icon: <Mail className="h-5 w-5" /> },
    { name: 'Notifications', path: '/notifications', icon: <Bell className="h-5 w-5" />, badge: unreadCount > 0 ? unreadCount : undefined },
    { name: 'Profile', path: `/profile/${username}`, icon: <User className="h-5 w-5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex bg-bg-light dark:bg-bg-dark text-gray-900 dark:text-slate-100 transition-colors duration-200">
      {/* Off-canvas mobile menu overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden cursor-pointer backdrop-blur-xs"
        />
      )}

      {/* Sidebar - Desktop and Mobile Drawer */}
      <aside
        id="desktop-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800/80 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-50 dark:border-slate-800/50 flex-shrink-0">
          <NavLink to="/feed" className="hover:opacity-90 transition-opacity">
            <OpenCommLogo iconSize={42} showIcon={false} className="pl-1" />
          </NavLink>
          <button
            id="close-sidebar-btn"
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-slate-300 lg:hidden rounded-lg cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-slate-800/60 dark:text-indigo-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800/30 dark:hover:text-slate-100'
                }`
              }
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-indigo-600 dark:bg-indigo-500 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Conditional Admin Portal link */}
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-dashed ${
                  isActive
                    ? 'border-indigo-500/30 bg-indigo-50/50 text-indigo-700 dark:bg-slate-850/60 dark:text-indigo-400'
                    : 'border-transparent text-amber-600 hover:bg-amber-50/40 dark:text-amber-400 dark:hover:bg-amber-950/20'
                }`
              }
            >
              <Shield className="h-5 w-5" />
              <span>Admin Center</span>
            </NavLink>
          )}
        </nav>

        {/* User Card & Settings */}
        <div className="p-4 border-t border-gray-50 dark:border-slate-800/50 flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100/50 dark:border-slate-800/50">
            <NavLink to={`/profile/${username}`} className="hover:opacity-90 transition-opacity">
              <Avatar
                userId={user?.uid}
                src={user?.photoURL}
                fallback={user?.displayName || user?.email || 'OC'}
                size="sm"
              />
            </NavLink>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user?.displayName || 'OpenComm User'}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                @{user?.username || 'user'}
              </p>
            </div>
          </div>
          
          {/* Theme & Logout Toolbar */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Appearance</span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                id="sidebar-logout-btn"
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Glassmorphic Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <button
              id="hamburger-menu-btn"
              onClick={toggleSidebar}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 lg:hidden rounded-lg cursor-pointer"
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Desktop Path Header / Mobile Logo */}
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200 select-none">
                {location.pathname === '/feed'
                  ? 'Conversation Feed'
                  : location.pathname.startsWith('/profile')
                  ? 'Profile Hub'
                  : location.pathname === '/rooms'
                  ? 'Community Rooms'
                  : location.pathname.startsWith('/room/')
                  ? 'Active Community Room'
                  : location.pathname === '/messages'
                  ? 'Direct Messages'
                  : location.pathname === '/explore'
                  ? 'Explore Channels'
                  : location.pathname === '/notifications'
                  ? 'My Notifications'
                  : location.pathname === '/settings'
                  ? 'Preferences'
                  : location.pathname === '/admin'
                  ? 'Platform Admin panel'
                  : 'Dashboard'}
              </h2>
            </div>
            
            {/* Mobile-Only Logo */}
            <NavLink to="/feed" className="flex lg:hidden hover:opacity-95 transition-opacity">
              <OpenCommLogo iconSize={36} />
            </NavLink>
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Button (navigates to /explore) */}
            <button
              id="header-search-btn"
              onClick={() => navigate('/explore')}
              className="p-2 text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg cursor-pointer transition-colors"
              title="Search and Explore"
            >
              <Search className="h-4.5 w-4.5" />
            </button>

            {/* Notification button navigating to /notifications */}
            <button
              id="header-notification-btn"
              onClick={() => navigate('/notifications')}
              className="p-2 text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg relative cursor-pointer transition-colors"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              )}
            </button>

            {/* User Avatar linking to Profile */}
            <NavLink to={`/profile/${username}`} className="hover:scale-105 transition-transform">
              <Avatar
                userId={user?.uid}
                src={user?.photoURL}
                fallback={user?.displayName || user?.email || 'OC'}
                size="xs"
                className="border border-indigo-100 dark:border-slate-800"
              />
            </NavLink>
          </div>
        </header>

        {/* Scrollable View Panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-bg-light dark:bg-bg-dark pb-24 lg:pb-8">
          <div className="max-w-5xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Glassmorphic Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
        <nav className="flex items-center justify-around px-4 py-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border border-gray-100/60 dark:border-slate-800/60 rounded-2xl shadow-xl shadow-gray-200/40 dark:shadow-black/40">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center p-2 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 scale-110 font-semibold'
                    : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                }`
              }
            >
              {item.icon}
              <span className="text-[9px] mt-0.5 tracking-tight">{item.name}</span>
              {item.badge !== undefined && (
                <span className="absolute top-2.5 right-4 flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-500 animate-pulse" />
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default AuthLayout;
