/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { Notification, NotificationType } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';
const MOCK_NOTIFICATIONS_KEY = 'opencomm_mock_notifications';

// Initial Mock Notifications
const INITIAL_MOCK_NOTIFICATIONS = (recipientId: string): Notification[] => [
  {
    notificationId: 'notif-mock-1',
    recipientId,
    senderId: 'mock-user-1',
    senderName: 'Clara Oswald',
    senderPhotoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=clara',
    type: 'like',
    message: 'liked your conversation post.',
    createdAt: new Date(Date.now() - 60000 * 5).toISOString(), // 5 min ago
    isRead: false,
    link: '/feed'
  },
  {
    notificationId: 'notif-mock-2',
    recipientId,
    senderId: 'mock-user-2',
    senderName: 'Dr. John Watson',
    senderPhotoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=john',
    type: 'comment',
    message: 'commented on your conversation thread: "Spot on analysis!"',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    isRead: false,
    link: '/feed'
  },
  {
    notificationId: 'notif-mock-3',
    recipientId,
    senderId: 'mock-user-1',
    senderName: 'Clara Oswald',
    senderPhotoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=clara',
    type: 'room_invite',
    message: 'invited you to join the private room "Space Exploration".',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    isRead: true,
    link: '/rooms'
  },
  {
    notificationId: 'notif-mock-4',
    recipientId,
    type: 'announcement',
    message: 'OpenComm Update: Phase 8 is live! Enjoy Notifications, Explore, Global Search, and Premium instant Settings updates.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    isRead: true,
  }
];

function getLocalMockNotifications(recipientId: string): Notification[] {
  const stored = localStorage.getItem(MOCK_NOTIFICATIONS_KEY);
  if (!stored) {
    const initial = INITIAL_MOCK_NOTIFICATIONS(recipientId);
    localStorage.setItem(MOCK_NOTIFICATIONS_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const list = JSON.parse(stored) as Notification[];
    // Filter by recipientId to make it sandbox multi-user safe
    return list.filter(n => n.recipientId === recipientId);
  } catch (err) {
    return INITIAL_MOCK_NOTIFICATIONS(recipientId);
  }
}

function saveLocalMockNotifications(notifications: Notification[], recipientId: string) {
  try {
    const stored = localStorage.getItem(MOCK_NOTIFICATIONS_KEY);
    let allNotifications: Notification[] = [];
    if (stored) {
      allNotifications = JSON.parse(stored) as Notification[];
    }
    // Remove old items for this recipient
    allNotifications = allNotifications.filter(n => n.recipientId !== recipientId);
    // Add new/updated ones
    allNotifications = [...allNotifications, ...notifications];
    localStorage.setItem(MOCK_NOTIFICATIONS_KEY, JSON.stringify(allNotifications));
    
    // Dispatch local storage change event to sync listening components
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Listens to user's notifications in real time.
 */
export function onNotificationsSnapshot(
  recipientId: string,
  onUpdate: (notifications: Notification[]) => void,
  onError: (error: any) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('recipientId', '==', recipientId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Notification[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Notification);
        });
        onUpdate(list);
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        handleFirestoreError(error, OperationType.GET, `${NOTIFICATIONS_COLLECTION}?recipientId=${recipientId}`);
        onError(error);
      }
    );
  } else {
    // Mock Listening Simulation
    const handleSync = () => {
      const list = getLocalMockNotifications(recipientId);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    };

    // Initial load
    handleSync();

    // Listen to local changes
    window.addEventListener('storage', handleSync);
    // Return unsubscribe
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }
}

/**
 * Creates a new notification.
 */
export async function createNotification(
  notificationData: Omit<Notification, 'notificationId' | 'createdAt' | 'isRead'>
): Promise<Notification> {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = new Date().toISOString();

  const newNotification: Notification = {
    ...notificationData,
    notificationId,
    createdAt,
    isRead: false
  };

  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await setDoc(ref, newNotification);
      return newNotification;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${NOTIFICATIONS_COLLECTION}/${notificationId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const list = getLocalMockNotifications(notificationData.recipientId);
    list.unshift(newNotification);
    saveLocalMockNotifications(list, notificationData.recipientId);
    return newNotification;
  }
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(notificationId: string, recipientId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(ref, { isRead: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${NOTIFICATIONS_COLLECTION}/${notificationId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const list = getLocalMockNotifications(recipientId);
    const idx = list.findIndex(n => n.notificationId === notificationId);
    if (idx !== -1) {
      list[idx].isRead = true;
      saveLocalMockNotifications(list, recipientId);
    }
  }
}

/**
 * Marks all notifications as read for a recipient.
 */
export async function markAllNotificationsAsRead(recipientId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientId', '==', recipientId),
        where('isRead', '==', false)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.update(docSnap.ref, { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, NOTIFICATIONS_COLLECTION);
      throw err;
    }
  } else {
    // Mock Mode
    const list = getLocalMockNotifications(recipientId);
    const updated = list.map(n => ({ ...n, isRead: true }));
    saveLocalMockNotifications(updated, recipientId);
  }
}

/**
 * Deletes a single notification.
 */
export async function deleteNotification(notificationId: string, recipientId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await deleteDoc(ref);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${NOTIFICATIONS_COLLECTION}/${notificationId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const list = getLocalMockNotifications(recipientId);
    const filtered = list.filter(n => n.notificationId !== notificationId);
    saveLocalMockNotifications(filtered, recipientId);
  }
}

/**
 * Deletes all notifications for a given link.
 */
export async function deleteNotificationsByLink(recipientId: string, link: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientId', '==', recipientId),
        where('link', '==', link)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (err) {
      console.error('Failed to delete notifications by link:', err);
    }
  } else {
    // Mock Mode
    const list = getLocalMockNotifications(recipientId);
    const filtered = list.filter(n => n.link !== link);
    saveLocalMockNotifications(filtered, recipientId);
  }
}

/**
 * Deletes all notifications for a recipient.
 */
export async function clearAllNotifications(recipientId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientId', '==', recipientId)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, NOTIFICATIONS_COLLECTION);
      throw err;
    }
  } else {
    // Mock Mode
    saveLocalMockNotifications([], recipientId);
  }
}
