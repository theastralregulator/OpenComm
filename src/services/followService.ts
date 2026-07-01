/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { FollowRelation, UserProfile } from '../types';
import { createNotification } from './notificationService';

const FOLLOWS_COLLECTION = 'follows';
const MOCK_FOLLOWS_KEY = 'opencomm_mock_follows';

function getLocalMockFollows(): FollowRelation[] {
  const stored = localStorage.getItem(MOCK_FOLLOWS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as FollowRelation[];
  } catch (err) {
    return [];
  }
}

function saveLocalMockFollows(follows: FollowRelation[]) {
  localStorage.setItem(MOCK_FOLLOWS_KEY, JSON.stringify(follows));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Sends a follow request or automatically follows another user.
 */
export async function followUser(follower: UserProfile, following: UserProfile): Promise<void> {
  const followId = `${follower.uid}_${following.uid}`;
  const status = following.isProfilePublic === false ? 'pending' : 'accepted';
  const timestamp = new Date().toISOString();

  const relation: FollowRelation = {
    followId,
    followerId: follower.uid,
    followerUsername: follower.username || '',
    followerDisplayName: follower.displayName || follower.fullName || '',
    followerPhotoURL: follower.photoURL || '',
    followingId: following.uid,
    followingUsername: following.username || '',
    followingDisplayName: following.displayName || following.fullName || '',
    followingPhotoURL: following.photoURL || '',
    status,
    createdAt: timestamp
  };

  if (isFirebaseConfigured && db) {
    try {
      // 1. Write the follow relationship
      const followRef = doc(db, FOLLOWS_COLLECTION, followId);
      await setDoc(followRef, relation);

      // 2. If accepted, update follow counts
      if (status === 'accepted') {
        const followerRef = doc(db, 'users', follower.uid);
        const followingRef = doc(db, 'users', following.uid);

        // Run transaction or simple updates to increment counts
        await runTransaction(db, async (transaction) => {
          const followerSnap = await transaction.get(followerRef);
          const followingSnap = await transaction.get(followingRef);

          if (followerSnap.exists()) {
            const current = followerSnap.data().followingCount || 0;
            transaction.update(followerRef, { followingCount: current + 1 });
          }
          if (followingSnap.exists()) {
            const current = followingSnap.data().followersCount || 0;
            const currentF = followingSnap.data().followerCount || 0;
            transaction.update(followingRef, { 
              followersCount: current + 1,
              followerCount: currentF + 1
            });
          }
        });
      }

      // 3. Create Notification
      await createNotification({
        recipientId: following.uid,
        senderId: follower.uid,
        senderName: follower.displayName || follower.fullName || 'Someone',
        senderPhotoURL: follower.photoURL,
        type: status === 'pending' ? 'follow_request' : 'follow',
        message: status === 'pending' ? 'sent you a follow request.' : 'started following you.',
        link: `/profile/${follower.username}`
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${FOLLOWS_COLLECTION}/${followId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const list = getLocalMockFollows();
    if (list.some(f => f.followId === followId)) return;

    list.push(relation);
    saveLocalMockFollows(list);

    // Update profiles in local storage
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    const followerIdx = mockUsers.findIndex((u: any) => u.uid === follower.uid);
    const followingIdx = mockUsers.findIndex((u: any) => u.uid === following.uid);

    if (status === 'accepted') {
      if (followerIdx !== -1) {
        mockUsers[followerIdx].followingCount = (mockUsers[followerIdx].followingCount || 0) + 1;
      }
      if (followingIdx !== -1) {
        mockUsers[followingIdx].followersCount = (mockUsers[followingIdx].followersCount || 0) + 1;
        mockUsers[followingIdx].followerCount = (mockUsers[followingIdx].followerCount || 0) + 1;
      }
      localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));

      // Sync active mock user if matching
      const activeUser = JSON.parse(localStorage.getItem('opencomm-mock-user') || '{}');
      if (activeUser.uid === follower.uid) {
        activeUser.followingCount = (activeUser.followingCount || 0) + 1;
        localStorage.setItem('opencomm-mock-user', JSON.stringify(activeUser));
      } else if (activeUser.uid === following.uid) {
        activeUser.followersCount = (activeUser.followersCount || 0) + 1;
        activeUser.followerCount = (activeUser.followerCount || 0) + 1;
        localStorage.setItem('opencomm-mock-user', JSON.stringify(activeUser));
      }
    }

    // Create Notification
    await createNotification({
      recipientId: following.uid,
      senderId: follower.uid,
      senderName: follower.displayName || follower.fullName || 'Someone',
      senderPhotoURL: follower.photoURL,
      type: status === 'pending' ? 'follow_request' : 'follow',
      message: status === 'pending' ? 'sent you a follow request.' : 'started following you.',
      link: `/profile/${follower.username}`
    });
  }
}

/**
 * Unfollows a user.
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const followId = `${followerId}_${followingId}`;

  if (isFirebaseConfigured && db) {
    try {
      const followRef = doc(db, FOLLOWS_COLLECTION, followId);
      const followSnap = await getDoc(followRef);
      if (!followSnap.exists()) return;

      const data = followSnap.data() as FollowRelation;
      await deleteDoc(followRef);

      if (data.status === 'accepted') {
        const followerRef = doc(db, 'users', followerId);
        const followingRef = doc(db, 'users', followingId);

        await runTransaction(db, async (transaction) => {
          const followerSnap = await transaction.get(followerRef);
          const followingSnap = await transaction.get(followingRef);

          if (followerSnap.exists()) {
            const current = followerSnap.data().followingCount || 0;
            transaction.update(followerRef, { followingCount: Math.max(0, current - 1) });
          }
          if (followingSnap.exists()) {
            const current = followingSnap.data().followersCount || 0;
            const currentF = followingSnap.data().followerCount || 0;
            transaction.update(followingRef, { 
              followersCount: Math.max(0, current - 1),
              followerCount: Math.max(0, currentF - 1)
            });
          }
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${FOLLOWS_COLLECTION}/${followId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const list = getLocalMockFollows();
    const existingRelation = list.find(f => f.followId === followId);
    if (!existingRelation) return;

    const updatedList = list.filter(f => f.followId !== followId);
    saveLocalMockFollows(updatedList);

    if (existingRelation.status === 'accepted') {
      const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
      const followerIdx = mockUsers.findIndex((u: any) => u.uid === followerId);
      const followingIdx = mockUsers.findIndex((u: any) => u.uid === followingId);

      if (followerIdx !== -1) {
        mockUsers[followerIdx].followingCount = Math.max(0, (mockUsers[followerIdx].followingCount || 0) - 1);
      }
      if (followingIdx !== -1) {
        mockUsers[followingIdx].followersCount = Math.max(0, (mockUsers[followingIdx].followersCount || 0) - 1);
        mockUsers[followingIdx].followerCount = Math.max(0, (mockUsers[followingIdx].followerCount || 0) - 1);
      }
      localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));

      // Sync active mock user if matching
      const activeUser = JSON.parse(localStorage.getItem('opencomm-mock-user') || '{}');
      if (activeUser.uid === followerId) {
        activeUser.followingCount = Math.max(0, (activeUser.followingCount || 0) - 1);
        localStorage.setItem('opencomm-mock-user', JSON.stringify(activeUser));
      } else if (activeUser.uid === followingId) {
        activeUser.followersCount = Math.max(0, (activeUser.followersCount || 0) - 1);
        activeUser.followerCount = Math.max(0, (activeUser.followerCount || 0) - 1);
        localStorage.setItem('opencomm-mock-user', JSON.stringify(activeUser));
      }
    }
  }
}

/**
 * Removes a follower.
 */
export async function removeFollower(followerId: string, followingId: string): Promise<void> {
  // followerId is the one who followed followingId.
  // followingId is removing followerId.
  await unfollowUser(followerId, followingId);
}

/**
 * Accepts an incoming follow request.
 */
export async function acceptFollowRequest(followerId: string, followingId: string): Promise<void> {
  const followId = `${followerId}_${followingId}`;

  if (isFirebaseConfigured && db) {
    try {
      const followRef = doc(db, FOLLOWS_COLLECTION, followId);
      const followSnap = await getDoc(followRef);
      if (!followSnap.exists()) return;

      const followData = followSnap.data() as FollowRelation;
      if (followData.status === 'accepted') return;

      await updateDoc(followRef, { status: 'accepted' });

      const followerRef = doc(db, 'users', followerId);
      const followingRef = doc(db, 'users', followingId);

      await runTransaction(db, async (transaction) => {
        const followerSnap = await transaction.get(followerRef);
        const followingSnap = await transaction.get(followingRef);

        if (followerSnap.exists()) {
          const current = followerSnap.data().followingCount || 0;
          transaction.update(followerRef, { followingCount: current + 1 });
        }
        if (followingSnap.exists()) {
          const current = followingSnap.data().followersCount || 0;
          const currentF = followingSnap.data().followerCount || 0;
          transaction.update(followingRef, { 
            followersCount: current + 1,
            followerCount: currentF + 1
          });
        }
      });

      // Send a follow_accept notification
      const followingSnap = await getDoc(followingRef);
      const followingProfile = followingSnap.data() as UserProfile;

      await createNotification({
        recipientId: followerId,
        senderId: followingId,
        senderName: followingProfile.displayName || followingProfile.fullName || 'Someone',
        senderPhotoURL: followingProfile.photoURL,
        type: 'follow_accept',
        message: 'accepted your follow request.',
        link: `/profile/${followingProfile.username}`
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${FOLLOWS_COLLECTION}/${followId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const list = getLocalMockFollows();
    const idx = list.findIndex(f => f.followId === followId);
    if (idx === -1 || list[idx].status === 'accepted') return;

    list[idx].status = 'accepted';
    saveLocalMockFollows(list);

    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    const followerIdx = mockUsers.findIndex((u: any) => u.uid === followerId);
    const followingIdx = mockUsers.findIndex((u: any) => u.uid === followingId);

    if (followerIdx !== -1) {
      mockUsers[followerIdx].followingCount = (mockUsers[followerIdx].followingCount || 0) + 1;
    }
    if (followingIdx !== -1) {
      mockUsers[followingIdx].followersCount = (mockUsers[followingIdx].followersCount || 0) + 1;
      mockUsers[followingIdx].followerCount = (mockUsers[followingIdx].followerCount || 0) + 1;
    }
    localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));

    // Sync active mock user if matching
    const activeUser = JSON.parse(localStorage.getItem('opencomm-mock-user') || '{}');
    if (activeUser.uid === followerId) {
      activeUser.followingCount = (activeUser.followingCount || 0) + 1;
      localStorage.setItem('opencomm-mock-user', JSON.stringify(activeUser));
    } else if (activeUser.uid === followingId) {
      activeUser.followersCount = (activeUser.followersCount || 0) + 1;
      activeUser.followerCount = (activeUser.followerCount || 0) + 1;
      localStorage.setItem('opencomm-mock-user', JSON.stringify(activeUser));
    }

    const followingUser = mockUsers.find((u: any) => u.uid === followingId) || {};

    await createNotification({
      recipientId: followerId,
      senderId: followingId,
      senderName: followingUser.displayName || followingUser.fullName || 'Someone',
      senderPhotoURL: followingUser.photoURL,
      type: 'follow_accept',
      message: 'accepted your follow request.',
      link: `/profile/${followingUser.username}`
    });
  }
}

/**
 * Rejects/cancels an incoming follow request.
 */
export async function rejectFollowRequest(followerId: string, followingId: string): Promise<void> {
  const followId = `${followerId}_${followingId}`;

  if (isFirebaseConfigured && db) {
    try {
      const followRef = doc(db, FOLLOWS_COLLECTION, followId);
      await deleteDoc(followRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${FOLLOWS_COLLECTION}/${followId}`);
      throw err;
    }
  } else {
    const list = getLocalMockFollows();
    const updated = list.filter(f => f.followId !== followId);
    saveLocalMockFollows(updated);
  }
}

/**
 * Gets the current follow status between two users.
 */
export async function getFollowStatus(followerId: string, followingId: string): Promise<'none' | 'pending' | 'accepted'> {
  const followId = `${followerId}_${followingId}`;

  if (isFirebaseConfigured && db) {
    try {
      const followRef = doc(db, FOLLOWS_COLLECTION, followId);
      const followSnap = await getDoc(followRef);
      if (!followSnap.exists()) return 'none';
      return (followSnap.data() as FollowRelation).status;
    } catch (err) {
      console.error('Error getting follow status:', err);
      return 'none';
    }
  } else {
    const list = getLocalMockFollows();
    const rel = list.find(f => f.followId === followId);
    return rel ? rel.status : 'none';
  }
}

/**
 * Listens to active follow relationships in real time (where status is accepted).
 */
export function onFollowsSnapshot(
  userId: string,
  type: 'followers' | 'following',
  onUpdate: (follows: FollowRelation[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, FOLLOWS_COLLECTION),
      where(type === 'followers' ? 'followingId' : 'followerId', '==', userId),
      where('status', '==', 'accepted')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: FollowRelation[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as FollowRelation);
        });
        onUpdate(list);
      },
      (error) => {
        console.error(`Error listening to ${type}:`, error);
      }
    );
  } else {
    const handleSync = () => {
      const list = getLocalMockFollows();
      const filtered = list.filter(f => 
        (type === 'followers' ? f.followingId === userId : f.followerId === userId) && 
        f.status === 'accepted'
      );
      onUpdate(filtered);
    };

    handleSync();
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }
}

/**
 * Listens to pending follow requests in real time.
 */
export function onPendingFollowRequestsSnapshot(
  userId: string,
  onUpdate: (requests: FollowRelation[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, FOLLOWS_COLLECTION),
      where('followingId', '==', userId),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: FollowRelation[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as FollowRelation);
        });
        onUpdate(list);
      },
      (error) => {
        console.error('Error listening to pending follow requests:', error);
      }
    );
  } else {
    const handleSync = () => {
      const list = getLocalMockFollows();
      const filtered = list.filter(f => f.followingId === userId && f.status === 'pending');
      onUpdate(filtered);
    };

    handleSync();
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }
}
