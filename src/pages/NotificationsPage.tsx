/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Heart,
  MessageCircle,
  MessageSquare,
  UserPlus,
  UserCheck,
  UserMinus,
  AtSign,
  Mail,
  Compass,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  Share2,
  Tag,
  Users,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  onNotificationsSnapshot,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} from '../services/notificationService';
import { Notification, NotificationType } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { showToast } from '../components/ui/Toast';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = onNotificationsSnapshot(
      user.uid,
      (list) => {
        setNotifications(list);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to stream notifications:', error);
        showToast.error('Failed to load notifications. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (notifId: string) => {
    if (!user) return;
    try {
      await markNotificationAsRead(notifId, user.uid);
      showToast.success('Notification marked as read.');
    } catch (err) {
      console.error(err);
      showToast.error('Failed to update notification.');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const unreadCount = notifications.filter(n => !n.isRead).length;
    if (unreadCount === 0) {
      showToast.info('All notifications are already read.');
      return;
    }
    try {
      await markAllNotificationsAsRead(user.uid);
      showToast.success('All notifications marked as read.');
    } catch (err) {
      console.error(err);
      showToast.error('Failed to update notifications.');
    }
  };

  const handleDelete = async (notifId: string) => {
    if (!user) return;
    try {
      await deleteNotification(notifId, user.uid);
      showToast.success('Notification deleted.');
    } catch (err) {
      console.error(err);
      showToast.error('Failed to delete notification.');
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    if (notifications.length === 0) {
      showToast.info('Your notifications inbox is already empty.');
      return;
    }
    
    // Simple verification
    if (!window.confirm('Are you sure you want to permanently clear all notifications? This cannot be undone.')) {
      return;
    }

    try {
      await clearAllNotifications(user.uid);
      showToast.success('All notifications permanently cleared.');
    } catch (err) {
      console.error(err);
      showToast.error('Failed to clear notifications.');
    }
  };

  // Helper: Get Icon & Color for Notification Type
  const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return {
          icon: <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />,
          bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50',
          label: 'Like'
        };
      case 'comment':
        return {
          icon: <MessageCircle className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50',
          label: 'Comment'
        };
      case 'reply':
        return {
          icon: <MessageSquare className="h-4 w-4 text-indigo-500 fill-indigo-500/20" />,
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50',
          label: 'Reply'
        };
      case 'follow':
        return {
          icon: <UserCheck className="h-4 w-4 text-sky-500" />,
          bgColor: 'bg-sky-50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/50',
          label: 'New Follower'
        };
      case 'follow_request':
        return {
          icon: <Clock className="h-4 w-4 text-amber-500" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50',
          label: 'Follow Request'
        };
      case 'follow_accept':
        return {
          icon: <UserPlus className="h-4 w-4 text-teal-500" />,
          bgColor: 'bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/50',
          label: 'Request Accepted'
        };
      case 'mention':
        return {
          icon: <AtSign className="h-4 w-4 text-purple-500" />,
          bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/50',
          label: 'Mention'
        };
      case 'message':
        return {
          icon: <Mail className="h-4 w-4 text-violet-500" />,
          bgColor: 'bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/50',
          label: 'Direct Message'
        };
      case 'room_invite':
        return {
          icon: <Compass className="h-4 w-4 text-amber-500" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50',
          label: 'Room Invitation'
        };
      case 'room_invite_accept':
        return {
          icon: <Users className="h-4 w-4 text-emerald-500" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50',
          label: 'Invite Accepted'
        };
      case 'share':
        return {
          icon: <Share2 className="h-4 w-4 text-cyan-500" />,
          bgColor: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900/50',
          label: 'Shared Post'
        };
      case 'tag':
        return {
          icon: <Tag className="h-4 w-4 text-orange-500" />,
          bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900/50',
          label: 'Tagged Post'
        };
      case 'system_update':
        return {
          icon: <Sparkles className="h-4 w-4 text-pink-500" />,
          bgColor: 'bg-pink-50 dark:bg-pink-950/30 border-pink-100 dark:border-pink-900/50',
          label: 'System Update'
        };
      case 'announcement':
      default:
        return {
          icon: <Info className="h-4 w-4 text-blue-500" />,
          bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50',
          label: 'Announcement'
        };
    }
  };

  // Helper: Format Time Relative
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  // Sort and filter: Unread first, then chronological descending
  const sortedNotifications = [...notifications]
    .filter(n => (filter === 'unread' ? !n.isRead : true))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group notifications into Today, Yesterday, This Week, Earlier
  const groupNotificationsByTime = (notifs: Notification[]) => {
    const groups: { title: string; items: Notification[] }[] = [
      { title: 'Today', items: [] },
      { title: 'Yesterday', items: [] },
      { title: 'This Week', items: [] },
      { title: 'Earlier', items: [] }
    ];

    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    notifs.forEach((notif) => {
      try {
        const date = new Date(notif.createdAt);
        const dateStr = date.toDateString();

        if (dateStr === todayStr) {
          groups[0].items.push(notif);
        } else if (dateStr === yesterdayStr) {
          groups[1].items.push(notif);
        } else if (date > oneWeekAgo) {
          groups[2].items.push(notif);
        } else {
          groups[3].items.push(notif);
        }
      } catch {
        groups[3].items.push(notif);
      }
    });

    return groups.filter(g => g.items.length > 0);
  };

  const groupedNotifications = groupNotificationsByTime(sortedNotifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div id="notifications-container" className="max-w-4xl mx-auto space-y-6 px-4 py-4 md:py-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Stay up to date with your conversations, community activities, and updates.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              id="mark-all-read-btn"
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 cursor-pointer text-xs font-bold"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              id="clear-all-notif-btn"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-rose-600 border-rose-100 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-950/40 dark:hover:bg-rose-950/20"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex gap-4">
          <button
            id="tab-all-notifications"
            onClick={() => setFilter('all')}
            className={`py-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              filter === 'all'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            All Notifications ({notifications.length})
          </button>
          <button
            id="tab-unread-notifications"
            onClick={() => setFilter('unread')}
            className={`py-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              filter === 'unread'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 animate-pulse bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-800 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : sortedNotifications.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
            <div className="h-12 w-12 rounded-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-gray-400 mb-4 border border-gray-100 dark:border-slate-850">
              <Bell className="h-6 w-6 text-indigo-500/80" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {filter === 'unread' ? 'No unread notifications' : 'Your inbox is completely clear'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1.5 max-w-sm">
              {filter === 'unread'
                ? 'Great job! You have caught up with all incoming updates and notifications.'
                : 'When others follow you, like your posts, tag you, or invite you to rooms, it will show up here instantly.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {groupedNotifications.map((group) => (
                <div key={group.title} className="space-y-3">
                  {/* Group Header */}
                  <div className="text-xs font-bold tracking-wider uppercase font-mono text-gray-400 dark:text-slate-500 pl-1">
                    {group.title}
                  </div>

                  <div className="space-y-2.5">
                    {group.items.map((notif) => {
                      const config = getNotificationConfig(notif.type);
                      return (
                        <motion.div
                          key={notif.notificationId}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card
                            className={`group p-4 sm:p-5 relative border transition-all duration-200 overflow-hidden rounded-2xl ${
                              notif.isRead
                                ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-850 hover:border-gray-200 dark:hover:border-slate-750'
                                : 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-100/30 dark:border-indigo-950/30 hover:border-indigo-100/50 dark:hover:border-indigo-950/40'
                            }`}
                          >
                            {/* Left accent colored dot/indicator for unread notifications */}
                            {!notif.isRead && (
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-500 animate-pulse" />
                            )}

                            <div className={`flex gap-4 ${!notif.isRead ? 'pl-4' : ''}`}>
                              {/* Avatar / Sender Pic */}
                              <div className="relative flex-shrink-0">
                                {notif.senderId ? (
                                  <Avatar
                                    src={notif.senderPhotoURL}
                                    fallback={notif.senderName || 'OC'}
                                    size="md"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30">
                                    <Bell className="h-5 w-5 animate-pulse" />
                                  </div>
                                )}
                                {/* Floating Badge representing Type */}
                                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white dark:border-slate-900 ${config.bgColor}`}>
                                  {config.icon}
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 pr-10">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {notif.senderName && (
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                      {notif.senderName}
                                    </span>
                                  )}
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                                    {config.label}
                                  </span>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
                                  {notif.message}
                                </p>

                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatTimeAgo(notif.createdAt)}
                                  </span>

                                  {/* Optional Route Link */}
                                  {notif.link && (
                                    <button
                                      onClick={() => navigate(notif.link!)}
                                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer hover:underline"
                                    >
                                      View
                                      <ArrowRight className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons (Absolute styled on right side) */}
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notif.isRead && (
                                  <button
                                    onClick={() => handleMarkAsRead(notif.notificationId)}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                                    title="Mark as Read"
                                  >
                                    <Check className="h-4.5 w-4.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(notif.notificationId)}
                                  className="p-1.5 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Delete Notification"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
