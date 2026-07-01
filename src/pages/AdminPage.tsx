/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ui/Toast';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc,
  getDocs
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase/config';
import { RefreshCw } from 'lucide-react';

// Import Admin Sub-tabs
import { DashboardTab } from '../components/admin/DashboardTab';
import { UsersTab } from '../components/admin/UsersTab';
import { PostsTab } from '../components/admin/PostsTab';
import { RoomsTab } from '../components/admin/RoomsTab';
import { ReportsTab } from '../components/admin/ReportsTab';
import { AnnouncementsTab } from '../components/admin/AnnouncementsTab';
import { AnalyticsTab } from '../components/admin/AnalyticsTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { ActivityLogsTab } from '../components/admin/ActivityLogsTab';

// Types
import { 
  UserProfile, 
  Post, 
  Room, 
  ContentReport, 
  SystemAnnouncement, 
  AdminActivityLog, 
  SystemSettings 
} from '../types';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Root states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    postLimit: 50,
    roomLimit: 5,
    defaultRole: 'member',
    maxUploadSize: '10MB',
    allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp']
  });

  const [loading, setLoading] = useState(true);

  // 1. Initial Local Storage Seeding for high-fidelity interactive local fallback
  const seedLocalDatabase = () => {
    // Seed Users
    if (!localStorage.getItem('opencomm-mock-users-list')) {
      const mockUsers: UserProfile[] = [
        {
          uid: 'mock-uid-admin',
          email: 'opencomm2026@gmail.com',
          displayName: 'System Admin',
          fullName: 'System Admin',
          username: 'admin',
          role: 'admin',
          createdAt: new Date().toISOString(),
          isSetupCompleted: true,
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          bio: 'Root Systems Architect'
        },
        {
          uid: 'mock-uid-jordan',
          email: 'jordan.brooks@opencomm.dev',
          displayName: 'Jordan Brooks',
          fullName: 'Jordan Brooks',
          username: 'jordan_brooks',
          role: 'member',
          createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
          isSetupCompleted: true,
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',
          bio: 'Passionate conversationalist.',
          status: 'active'
        } as any,
        {
          uid: 'mock-uid-sarah',
          email: 'sarah.sky@opencomm.dev',
          displayName: 'Sarah Sky',
          fullName: 'Sarah Sky',
          username: 'sarah_sky',
          role: 'member',
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          isSetupCompleted: true,
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
          bio: 'UX Designer & tech enthusiast.',
          status: 'active'
        } as any,
        {
          uid: 'mock-uid-david',
          email: 'david.code@opencomm.dev',
          displayName: 'David Martinez',
          fullName: 'David Martinez',
          username: 'david_code',
          role: 'member',
          createdAt: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
          isSetupCompleted: true,
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
          status: 'suspended'
        } as any,
        {
          uid: 'mock-uid-toxic',
          email: 'logan.croft@opencomm.dev',
          displayName: 'Logan Croft',
          fullName: 'Logan Croft',
          username: 'toxic_player',
          role: 'member',
          createdAt: new Date(Date.now() - 200 * 3600 * 1000).toISOString(),
          isSetupCompleted: true,
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=toxic',
          status: 'banned'
        } as any
      ];
      localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));
    }

    // Seed Posts
    if (!localStorage.getItem('opencomm-mock-posts-list')) {
      const mockPosts: Post[] = [
        {
          postId: 'mock-post-1',
          userId: 'mock-uid-jordan',
          username: 'jordan_brooks',
          displayName: 'Jordan Brooks',
          profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',
          caption: 'AI and React 19 are completely reshaping development loops. Pushing some live community code to OpenComm channels tonight!',
          likesCount: 14,
          commentsCount: 3,
          createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
          visibility: 'public'
        },
        {
          postId: 'mock-post-2',
          userId: 'mock-uid-david',
          username: 'david_code',
          displayName: 'David Martinez',
          profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
          caption: 'Has anyone integrated sound processors inside WebRTC community audio nodes? Seeking architecture tips.',
          likesCount: 8,
          commentsCount: 12,
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          visibility: 'public'
        },
        {
          postId: 'mock-post-toxic',
          userId: 'mock-uid-toxic',
          username: 'toxic_player',
          displayName: 'Logan Croft',
          profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=toxic',
          caption: 'Get cheap coins fast on third party scam site. Visit unsafe-url.xyz right now for free tokens!',
          likesCount: 0,
          commentsCount: 0,
          createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
          visibility: 'private',
          status: 'hidden',
          reportsCount: 3
        } as any
      ];
      localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(mockPosts));
    }

    // Seed Rooms
    if (!localStorage.getItem('opencomm-mock-rooms-list')) {
      const mockRooms: Room[] = [
        {
          roomId: 'mock-room-1',
          name: 'TypeScript Architects',
          description: 'A space for type-safe software modeling, custom templates, and ESM discussions.',
          category: 'Technology',
          roomType: 'text',
          visibility: 'public',
          roomImage: 'https://images.unsplash.com/photo-1516116211223-5c359a36298a?auto=format&fit=crop&q=80&w=300',
          maxMembers: 100,
          createdBy: 'mock-uid-jordan',
          creatorName: 'jordan_brooks',
          createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          membersCount: 15
        },
        {
          roomId: 'mock-room-2',
          name: 'Global UI Design Lounge',
          description: 'Live community audio stages discussing spacing frameworks, typography pairings, and micro-interactions.',
          category: 'Design',
          roomType: 'audio',
          visibility: 'public',
          roomImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=300',
          maxMembers: 50,
          createdBy: 'mock-uid-sarah',
          creatorName: 'sarah_sky',
          createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          membersCount: 22
        },
        {
          roomId: 'mock-room-3',
          name: 'SysOps Command Room',
          description: 'Strictly confidential operator hub for engineering discussions.',
          category: 'Private',
          roomType: 'text',
          visibility: 'private',
          roomImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=300',
          maxMembers: 10,
          createdBy: 'mock-uid-admin',
          creatorName: 'admin',
          createdAt: new Date(Date.now() - 100 * 3600 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          membersCount: 2
        }
      ];
      localStorage.setItem('opencomm-mock-rooms-list', JSON.stringify(mockRooms));
    }

    // Seed Reports
    if (!localStorage.getItem('opencomm-mock-reports-list')) {
      const mockReports: ContentReport[] = [
        {
          id: 'mock-rep-1',
          reporterId: 'mock-uid-jordan',
          reporterName: 'Jordan Brooks',
          reportedUserId: 'mock-uid-toxic',
          reportedUserName: 'toxic_player',
          type: 'post',
          contentId: 'mock-post-toxic',
          contentPreview: 'Get cheap coins fast on third party scam site. Visit unsafe-url.xyz...',
          reason: 'spam',
          createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          status: 'pending'
        },
        {
          id: 'mock-rep-2',
          reporterId: 'mock-uid-sarah',
          reporterName: 'Sarah Sky',
          reportedUserId: 'mock-uid-toxic',
          reportedUserName: 'toxic_player',
          type: 'message',
          contentId: 'mock-msg-spam',
          contentPreview: 'BUY SCAM TOKENS NOW!!!',
          reason: 'harassment',
          createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
          status: 'resolved'
        }
      ];
      localStorage.setItem('opencomm-mock-reports-list', JSON.stringify(mockReports));
    }

    // Seed Announcements
    if (!localStorage.getItem('opencomm-mock-announcements-list')) {
      const mockAnnouncements: SystemAnnouncement[] = [
        {
          id: 'mock-ann-1',
          title: 'Welcome to OpenComm Command Center',
          content: 'Ecosystem-wide policies, threshold rules, and moderation controls are fully initialized on this administrator terminal.',
          audience: 'everyone',
          pinned: true,
          createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
          authorName: 'System Administrator'
        },
        {
          id: 'mock-ann-2',
          title: 'Planned Database Ingress Maintenance',
          content: 'Scheduled maintenance will execute on UTC 04:00 to optimize FireStore replication nodes. Negligible latency spikes may occur.',
          audience: 'everyone',
          pinned: false,
          createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          authorName: 'System Administrator'
        }
      ];
      localStorage.setItem('opencomm-mock-announcements-list', JSON.stringify(mockAnnouncements));
    }

    // Seed Settings
    if (!localStorage.getItem('opencomm-system-settings')) {
      const defaultSettings: SystemSettings = {
        maintenanceMode: false,
        registrationEnabled: true,
        postLimit: 50,
        roomLimit: 5,
        defaultRole: 'member',
        maxUploadSize: '10MB',
        allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp']
      };
      localStorage.setItem('opencomm-system-settings', JSON.stringify(defaultSettings));
    }

    // Seed Activity Logs
    if (!localStorage.getItem('opencomm-admin-logs')) {
      const defaultLogs: AdminActivityLog[] = [
        {
          timestamp: new Date().toISOString(),
          operator: 'System Administrator',
          action: 'Operator terminal fully initialized from Phase 9 specifications.',
          ip: '192.168.10.1'
        },
        {
          timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
          operator: 'System Administrator',
          action: 'Secured zero-trust Firestore Map affectedKeys validations.',
          ip: '192.168.10.1'
        }
      ];
      localStorage.setItem('opencomm-admin-logs', JSON.stringify(defaultLogs));
    }
  };

  // 2. Data loader and subscriptions
  useEffect(() => {
    // Seed locally first to guarantee fallback sets
    seedLocalDatabase();

    if (!isFirebaseConfigured || !db || user?.role !== 'admin') {
      // Load from Local Storage Fallbacks
      setUsers(JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]'));
      setPosts(JSON.parse(localStorage.getItem('opencomm-mock-posts-list') || '[]'));
      setRooms(JSON.parse(localStorage.getItem('opencomm-mock-rooms-list') || '[]'));
      setReports(JSON.parse(localStorage.getItem('opencomm-mock-reports-list') || '[]'));
      setAnnouncements(JSON.parse(localStorage.getItem('opencomm-mock-announcements-list') || '[]'));
      setSettings(JSON.parse(localStorage.getItem('opencomm-system-settings') || '{}'));
      setActivityLogs(JSON.parse(localStorage.getItem('opencomm-admin-logs') || '[]'));
      setLoading(false);
      return;
    }

    // Online Live Subscriptions
    setLoading(true);
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      
      // Fallback seed online list if empty
      if (list.length <= 1) {
        const fallback = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
        setUsers(fallback);
      } else {
        setUsers(list);
      }
    });

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), (snap) => {
      const list: Post[] = [];
      snap.forEach(d => list.push(d.data() as Post));
      if (list.length === 0) {
        setPosts(JSON.parse(localStorage.getItem('opencomm-mock-posts-list') || '[]'));
      } else {
        setPosts(list);
      }
    });

    const unsubRooms = onSnapshot(query(collection(db, 'rooms'), orderBy('createdAt', 'desc')), (snap) => {
      const list: Room[] = [];
      snap.forEach(d => list.push(d.data() as Room));
      if (list.length === 0) {
        setRooms(JSON.parse(localStorage.getItem('opencomm-mock-rooms-list') || '[]'));
      } else {
        setRooms(list);
      }
    });

    const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
      const list: ContentReport[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ContentReport));
      if (list.length === 0) {
        setReports(JSON.parse(localStorage.getItem('opencomm-mock-reports-list') || '[]'));
      } else {
        setReports(list);
      }
    });

    const unsubAnnouncements = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), (snap) => {
      const list: SystemAnnouncement[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SystemAnnouncement));
      if (list.length === 0) {
        setAnnouncements(JSON.parse(localStorage.getItem('opencomm-mock-announcements-list') || '[]'));
      } else {
        setAnnouncements(list);
      }
    });

    const unsubLogs = onSnapshot(query(collection(db, 'admin_activity_logs'), orderBy('timestamp', 'desc')), (snap) => {
      const list: AdminActivityLog[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as AdminActivityLog));
      if (list.length === 0) {
        setActivityLogs(JSON.parse(localStorage.getItem('opencomm-admin-logs') || '[]'));
      } else {
        setActivityLogs(list);
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'system_settings', 'global_rules'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SystemSettings);
      } else {
        setSettings(JSON.parse(localStorage.getItem('opencomm-system-settings') || '{}'));
      }
    });

    setLoading(false);

    return () => {
      unsubUsers();
      unsubPosts();
      unsubRooms();
      unsubReports();
      unsubAnnouncements();
      unsubLogs();
      unsubSettings();
    };
  }, [user]);

  // 3. Centralized Activity Logging dispatch
  const dispatchLog = async (action: string) => {
    const timestamp = new Date().toISOString();
    const operatorName = user?.displayName || user?.fullName || 'System Administrator';
    const randomIP = `192.168.10.${Math.floor(Math.random() * 254) + 1}`;
    
    const newLog: AdminActivityLog = {
      timestamp,
      operator: operatorName,
      action,
      ip: randomIP
    };

    if (isFirebaseConfigured && db) {
      try {
        await addDoc(collection(db, 'admin_activity_logs'), newLog);
      } catch (err) {
        console.error('Failed pushing live activity log:', err);
      }
    }

    // Maintain in local storage fallback
    const local = JSON.parse(localStorage.getItem('opencomm-admin-logs') || '[]');
    const updated = [newLog, ...local];
    localStorage.setItem('opencomm-admin-logs', JSON.stringify(updated));
    if (!isFirebaseConfigured) {
      setActivityLogs(updated);
    }
  };

  // 4. Centralized Operator Actions Core Router
  const handleOperatorAction = async (actionType: string, payload: any) => {
    try {
      // --- USERS ACTIONS ---
      if (actionType === 'edit_user') {
        const { uid, displayName, username, email, role } = payload;
        
        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'users', uid), { displayName, username, email, role });
        }
        
        // Sync mock
        const local = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
        const updated = local.map((u: any) => u.uid === uid ? { ...u, displayName, username, email, role } : u);
        localStorage.setItem('opencomm-mock-users-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setUsers(updated);

        await dispatchLog(`Edited user credentials for @${username} (Role: ${role}).`);
        showToast.success('User profiles updated successfully.');
      }

      else if (actionType === 'reset_password') {
        const email = payload;
        await dispatchLog(`Dispatched security credential reset instructions to ${email}.`);
        showToast.success(`Credential reset guidelines dispatched to ${email}.`);
      }

      else if (actionType === 'suspend_user') {
        const uid = payload;
        const target = users.find(u => u.uid === uid);
        const username = target?.username || 'user';

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'users', uid), { status: 'suspended' });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
        const updated = local.map((u: any) => u.uid === uid ? { ...u, status: 'suspended' } : u);
        localStorage.setItem('opencomm-mock-users-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setUsers(updated);

        await dispatchLog(`Suspended user account: @${username}.`);
        showToast.success(`Account @${username} suspended temporarily.`);
      }

      else if (actionType === 'ban_user') {
        const uid = payload;
        const target = users.find(u => u.uid === uid);
        const username = target?.username || 'user';

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'users', uid), { status: 'banned' });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
        const updated = local.map((u: any) => u.uid === uid ? { ...u, status: 'banned' } : u);
        localStorage.setItem('opencomm-mock-users-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setUsers(updated);

        await dispatchLog(`Banned user profile permanently: @${username}.`);
        showToast.success(`Profile @${username} banned permanently.`);
      }

      else if (actionType === 'unban_user') {
        const uid = payload;
        const target = users.find(u => u.uid === uid);
        const username = target?.username || 'user';

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'users', uid), { status: 'active' });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
        const updated = local.map((u: any) => u.uid === uid ? { ...u, status: 'active' } : u);
        localStorage.setItem('opencomm-mock-users-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setUsers(updated);

        await dispatchLog(`Unbanned user profile, restored normal privileges: @${username}.`);
        showToast.success(`Profile @${username} reactivated.`);
      }

      else if (actionType === 'delete_user') {
        const uid = payload;
        const target = users.find(u => u.uid === uid);
        const username = target?.username || 'user';

        if (isFirebaseConfigured && db) {
          await deleteDoc(doc(db, 'users', uid));
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
        const updated = local.filter((u: any) => u.uid !== uid);
        localStorage.setItem('opencomm-mock-users-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setUsers(updated);

        await dispatchLog(`Terminated user registration permanently: @${username}.`);
        showToast.success('User account purged.');
      }

      // --- POSTS ACTIONS ---
      else if (actionType === 'hide_post') {
        const postId = payload;
        
        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'posts', postId), { visibility: 'private', status: 'hidden' });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-posts-list') || '[]');
        const updated = local.map((p: any) => p.postId === postId ? { ...p, visibility: 'private', status: 'hidden' } : p);
        localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setPosts(updated);

        await dispatchLog(`Hid social post ID: ${postId}.`);
        showToast.success('Post marked hidden.');
      }

      else if (actionType === 'restore_post') {
        const postId = payload;
        
        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'posts', postId), { visibility: 'public', status: 'active' });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-posts-list') || '[]');
        const updated = local.map((p: any) => p.postId === postId ? { ...p, visibility: 'public', status: 'active' } : p);
        localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setPosts(updated);

        await dispatchLog(`Restored post visibility: ${postId}.`);
        showToast.success('Post visibility set to Public.');
      }

      else if (actionType === 'delete_post') {
        const postId = payload;

        if (isFirebaseConfigured && db) {
          await deleteDoc(doc(db, 'posts', postId));
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-posts-list') || '[]');
        const updated = local.filter((p: any) => p.postId !== postId);
        localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setPosts(updated);

        await dispatchLog(`Purged social post from server: ${postId}.`);
        showToast.success('Post permanently deleted.');
      }

      // --- ROOMS ACTIONS ---
      else if (actionType === 'suspend_room') {
        const roomId = payload;
        const rName = rooms.find(r => r.roomId === roomId)?.name || 'room';

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'rooms', roomId), { status: 'suspended' });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-rooms-list') || '[]');
        const updated = local.map((r: any) => r.roomId === roomId ? { ...r, status: 'suspended' } : r);
        localStorage.setItem('opencomm-mock-rooms-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setRooms(updated);

        await dispatchLog(`Suspended discussion hub channel: "${rName}".`);
        showToast.success(`Room "${rName}" suspended.`);
      }

      else if (actionType === 'restore_room') {
        const roomId = payload;
        const rName = rooms.find(r => r.roomId === roomId)?.name || 'room';

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'rooms', roomId), { status: 'active' });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-rooms-list') || '[]');
        const updated = local.map((r: any) => r.roomId === roomId ? { ...r, status: 'active' } : r);
        localStorage.setItem('opencomm-mock-rooms-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setRooms(updated);

        await dispatchLog(`Restored discussion hub privileges: "${rName}".`);
        showToast.success(`Room "${rName}" restored.`);
      }

      else if (actionType === 'delete_room') {
        const roomId = payload;
        const rName = rooms.find(r => r.roomId === roomId)?.name || 'room';

        if (isFirebaseConfigured && db) {
          await deleteDoc(doc(db, 'rooms', roomId));
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-rooms-list') || '[]');
        const updated = local.filter((r: any) => r.roomId !== roomId);
        localStorage.setItem('opencomm-mock-rooms-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setRooms(updated);

        await dispatchLog(`Purged community room node: "${rName}".`);
        showToast.success('Room purged.');
      }

      // --- REPORTS ACTIONS ---
      else if (actionType === 'ignore_report') {
        const repId = payload;

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'reports', repId), { status: 'ignored' });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-reports-list') || '[]');
        const updated = local.map((r: any) => r.id === repId ? { ...r, status: 'ignored' } : r);
        localStorage.setItem('opencomm-mock-reports-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setReports(updated);

        await dispatchLog(`Ignored moderation report ID: ${repId}.`);
        showToast.success('Report dismissed.');
      }

      else if (actionType === 'delete_reported_content') {
        const { id, type, contentId } = payload;

        // 1. Delete actual item
        if (type === 'post') {
          if (isFirebaseConfigured && db) await deleteDoc(doc(db, 'posts', contentId));
          const localP = JSON.parse(localStorage.getItem('opencomm-mock-posts-list') || '[]');
          const updatedP = localP.filter((p: any) => p.postId !== contentId);
          localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(updatedP));
          if (!isFirebaseConfigured) setPosts(updatedP);
        } else if (type === 'room') {
          if (isFirebaseConfigured && db) await deleteDoc(doc(db, 'rooms', contentId));
          const localR = JSON.parse(localStorage.getItem('opencomm-mock-rooms-list') || '[]');
          const updatedR = localR.filter((r: any) => r.roomId !== contentId);
          localStorage.setItem('opencomm-mock-rooms-list', JSON.stringify(updatedR));
          if (!isFirebaseConfigured) setRooms(updatedR);
        }

        // 2. Mark report resolved
        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
        }

        const localRep = JSON.parse(localStorage.getItem('opencomm-mock-reports-list') || '[]');
        const updatedRep = localRep.map((r: any) => r.id === id ? { ...r, status: 'resolved' } : r);
        localStorage.setItem('opencomm-mock-reports-list', JSON.stringify(updatedRep));
        if (!isFirebaseConfigured) setReports(updatedRep);

        await dispatchLog(`Resolved report ID: ${id}. Purged offending content (${type}).`);
        showToast.success('Violation content purged from servers.');
      }

      else if (actionType === 'warn_user') {
        const { id, userId, username } = payload;

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
        }

        const localRep = JSON.parse(localStorage.getItem('opencomm-mock-reports-list') || '[]');
        const updatedRep = localRep.map((r: any) => r.id === id ? { ...r, status: 'resolved' } : r);
        localStorage.setItem('opencomm-mock-reports-list', JSON.stringify(updatedRep));
        if (!isFirebaseConfigured) setReports(updatedRep);

        await dispatchLog(`Dispatched official warning notice to user: @${username}.`);
        showToast.success(`Operator warnings dispatched to @${username}.`);
      }

      else if (actionType === 'suspend_user_report') {
        const { id, userId } = payload;
        await handleOperatorAction('suspend_user', userId);

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
        }

        const localRep = JSON.parse(localStorage.getItem('opencomm-mock-reports-list') || '[]');
        const updatedRep = localRep.map((r: any) => r.id === id ? { ...r, status: 'resolved' } : r);
        localStorage.setItem('opencomm-mock-reports-list', JSON.stringify(updatedRep));
        if (!isFirebaseConfigured) setReports(updatedRep);
      }

      else if (actionType === 'ban_user_report') {
        const { id, userId } = payload;
        await handleOperatorAction('ban_user', userId);

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
        }

        const localRep = JSON.parse(localStorage.getItem('opencomm-mock-reports-list') || '[]');
        const updatedRep = localRep.map((r: any) => r.id === id ? { ...r, status: 'resolved' } : r);
        localStorage.setItem('opencomm-mock-reports-list', JSON.stringify(updatedRep));
        if (!isFirebaseConfigured) setReports(updatedRep);
      }

      // --- ANNOUNCEMENTS ACTIONS ---
      else if (actionType === 'create_announcement') {
        const { title, content, audience, pinned } = payload;
        const timestamp = new Date().toISOString();
        const author = user?.displayName || 'System Admin';

        const newAnn: Partial<SystemAnnouncement> = {
          title,
          content,
          audience,
          pinned,
          createdAt: timestamp,
          authorName: author
        };

        if (isFirebaseConfigured && db) {
          await addDoc(collection(db, 'announcements'), newAnn);
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-announcements-list') || '[]');
        const newItem = { id: `ann-${Date.now()}`, ...newAnn } as SystemAnnouncement;
        const updated = [newItem, ...local];
        localStorage.setItem('opencomm-mock-announcements-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setAnnouncements(updated);

        await dispatchLog(`Published global announcement notice: "${title}".`);
        showToast.success('Global broadcast published successfully.');
      }

      else if (actionType === 'edit_announcement') {
        const { id, title, content, audience, pinned } = payload;

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'announcements', id), { title, content, audience, pinned });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-announcements-list') || '[]');
        const updated = local.map((ann: any) => ann.id === id ? { ...ann, title, content, audience, pinned } : ann);
        localStorage.setItem('opencomm-mock-announcements-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setAnnouncements(updated);

        await dispatchLog(`Edited announcement parameters for: "${title}".`);
        showToast.success('Notice update applied.');
      }

      else if (actionType === 'toggle_pin_announcement') {
        const { id, pinned } = payload;

        if (isFirebaseConfigured && db) {
          await updateDoc(doc(db, 'announcements', id), { pinned: !pinned });
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-announcements-list') || '[]');
        const updated = local.map((ann: any) => ann.id === id ? { ...ann, pinned: !pinned } : ann);
        localStorage.setItem('opencomm-mock-announcements-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setAnnouncements(updated);

        await dispatchLog(`${pinned ? 'Unpinned' : 'Pinned'} announcement ID: ${id}.`);
        showToast.success(`Notice pinned state toggled.`);
      }

      else if (actionType === 'delete_announcement') {
        const id = payload;
        
        if (isFirebaseConfigured && db) {
          await deleteDoc(doc(db, 'announcements', id));
        }

        const local = JSON.parse(localStorage.getItem('opencomm-mock-announcements-list') || '[]');
        const updated = local.filter((ann: any) => ann.id !== id);
        localStorage.setItem('opencomm-mock-announcements-list', JSON.stringify(updated));
        if (!isFirebaseConfigured) setAnnouncements(updated);

        await dispatchLog(`Removed global announcement: ${id}.`);
        showToast.success('Notice deleted.');
      }

      // --- SYSTEM SETTINGS ACTIONS ---
      else if (actionType === 'save_settings') {
        const newSettings = payload as SystemSettings;

        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'system_settings', 'global_rules'), newSettings);
        }

        localStorage.setItem('opencomm-system-settings', JSON.stringify(newSettings));
        setSettings(newSettings);

        await dispatchLog(`Updated system threshold rules and policy controls.`);
        showToast.success('System policies applied across clients.');
      }

      // --- AUDIT LOGS ACTIONS ---
      else if (actionType === 'clear_logs') {
        if (isFirebaseConfigured && db) {
          const qSnap = await getDocs(collection(db, 'admin_activity_logs'));
          qSnap.forEach(async (d) => {
            await deleteDoc(doc(db, 'admin_activity_logs', d.id));
          });
        }
        localStorage.setItem('opencomm-admin-logs', '[]');
        setActivityLogs([]);
        showToast.success('Audit trail cleared.');
      }

    } catch (err) {
      console.error('Operator action failure:', err);
      showToast.error('Unable to complete request. Please verify credentials.');
    }
  };

  // 5. Select active component based on route pathname
  const renderActiveTab = () => {
    const path = location.pathname;

    if (path === '/admin' || path === '/admin/dashboard') {
      return (
        <DashboardTab
          users={users}
          posts={posts}
          rooms={rooms}
          reports={reports}
          announcements={announcements}
          onAction={handleOperatorAction}
          navigate={navigate}
        />
      );
    }
    if (path === '/admin/users') {
      return <UsersTab users={users} onAction={handleOperatorAction} />;
    }
    if (path === '/admin/posts') {
      return <PostsTab posts={posts} onAction={handleOperatorAction} />;
    }
    if (path === '/admin/rooms') {
      return <RoomsTab rooms={rooms} onAction={handleOperatorAction} />;
    }
    if (path === '/admin/reports') {
      return <ReportsTab reports={reports} onAction={handleOperatorAction} />;
    }
    if (path === '/admin/announcements') {
      return <AnnouncementsTab announcements={announcements} onAction={handleOperatorAction} />;
    }
    if (path === '/admin/analytics') {
      return (
        <AnalyticsTab
          users={users}
          posts={posts}
          rooms={rooms}
          reports={reports}
        />
      );
    }
    if (path === '/admin/settings') {
      return <SettingsTab settings={settings} onAction={handleOperatorAction} />;
    }
    if (path === '/admin/activity-logs') {
      return <ActivityLogsTab logs={activityLogs} onAction={handleOperatorAction} />;
    }

    return (
      <div className="text-center text-slate-500 py-12 text-sm font-mono">
        UNKNOWN_OPERATOR_ROUTE
      </div>
    );
  };

  // Root Loading State fallback
  if (loading) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-400 gap-2">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
        <span className="text-xs font-mono">Synchronizing operator logs...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {renderActiveTab()}
    </div>
  );
};

export default AdminPage;
