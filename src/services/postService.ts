/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  increment,
  onSnapshot,
  DocumentSnapshot,
  runTransaction
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, isFirebaseConfigured } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { createNotification } from './notificationService';
import { Post } from '../types';

const POSTS_COLLECTION = 'posts';
const USERS_COLLECTION = 'users';

/**
 * Maps a Firestore document data object to the dual-compatible Post interface.
 */
export function mapFirestoreDocToPost(data: any): Post {
  const userId = data.userId || data.uid || '';
  const uid = data.uid || data.userId || '';
  const profileImage = data.profileImage || data.profilePhoto || 'https://api.dicebear.com/7.x/adventurer/svg?seed=OpenComm';
  const profilePhoto = data.profilePhoto || data.profileImage || 'https://api.dicebear.com/7.x/adventurer/svg?seed=OpenComm';
  const caption = data.caption || data.text || '';
  const text = data.text || data.caption || '';
  const likesCount = data.likesCount !== undefined ? data.likesCount : (data.likeCount || 0);
  const likeCount = data.likeCount !== undefined ? data.likeCount : (data.likesCount || 0);
  const commentsCount = data.commentsCount !== undefined ? data.commentsCount : (data.commentCount || 0);
  const commentCount = data.commentCount !== undefined ? data.commentCount : (data.commentsCount || 0);
  const sharesCount = data.sharesCount !== undefined ? data.sharesCount : (data.saveCount || 0);
  const saveCount = data.saveCount !== undefined ? data.saveCount : (data.sharesCount || 0);

  return {
    postId: data.postId || '',
    userId,
    uid,
    username: data.username || '',
    displayName: data.displayName || '',
    profileImage,
    profilePhoto,
    caption,
    text,
    imageUrl: data.imageUrl || undefined,
    imageUrls: data.imageUrls || undefined,
    likesCount,
    likeCount,
    commentsCount,
    commentCount,
    sharesCount,
    saveCount,
    viewsCount: data.viewsCount !== undefined ? data.viewsCount : 0,
    isEdited: data.isEdited || false,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
    visibility: data.visibility || 'public'
  };
}

/**
 * LocalStorage helpers for offline mock mode support
 */
function getMockPosts(): Post[] {
  const listStr = localStorage.getItem('opencomm-mock-posts-list');
  if (!listStr) {
    const defaultPosts: Post[] = [
      {
        postId: 'mock-post-1',
        userId: 'mock-uid-jordan',
        uid: 'mock-uid-jordan',
        username: 'jordan_brooks',
        displayName: 'Jordan Brooks',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',
        profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',
        caption: 'AI and React 19 are completely reshaping development loops. Pushing some live community code to OpenComm channels tonight!',
        text: 'AI and React 19 are completely reshaping development loops. Pushing some live community code to OpenComm channels tonight!',
        likesCount: 14,
        likeCount: 14,
        commentsCount: 3,
        commentCount: 3,
        createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
        visibility: 'public'
      },
      {
        postId: 'mock-post-2',
        userId: 'mock-uid-david',
        uid: 'mock-uid-david',
        username: 'david_code',
        displayName: 'David Martinez',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
        profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david',
        caption: 'Has anyone integrated sound processors inside WebRTC community audio nodes? Seeking architecture tips.',
        text: 'Has anyone integrated sound processors inside WebRTC community audio nodes? Seeking architecture tips.',
        likesCount: 8,
        likeCount: 8,
        commentsCount: 12,
        commentCount: 12,
        createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        visibility: 'public'
      }
    ];
    localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(defaultPosts));
    return defaultPosts;
  }
  try {
    return JSON.parse(listStr).map(mapFirestoreDocToPost);
  } catch (e) {
    return [];
  }
}

function triggerMockPostsUpdate() {
  window.dispatchEvent(new CustomEvent('mock-posts-updated'));
}

function getMockPostLikes(postId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`opencomm-mock-likes-${postId}`) || '[]');
  } catch {
    return [];
  }
}

function setMockPostLikes(postId: string, userIds: string[]) {
  localStorage.setItem(`opencomm-mock-likes-${postId}`, JSON.stringify(userIds));
}

function getMockSavedPosts(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`opencomm-mock-saved-posts-${userId}`) || '[]');
  } catch {
    return [];
  }
}

function setMockSavedPosts(userId: string, postIds: string[]) {
  localStorage.setItem(`opencomm-mock-saved-posts-${userId}`, JSON.stringify(postIds));
}

/**
 * Creates a new post in Firestore.
 */
export async function createPost(postData: Omit<Post, 'postId' | 'createdAt' | 'likesCount' | 'commentsCount' | 'sharesCount' | 'isEdited'>): Promise<Post> {
  if (!isFirebaseConfigured || !db) {
    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const createdAt = new Date().toISOString();
    const cleanPost: Post = {
      postId,
      userId: postData.userId,
      uid: postData.userId,
      username: postData.username || '',
      displayName: postData.displayName || '',
      profileImage: postData.profileImage || '',
      profilePhoto: postData.profileImage || '',
      caption: postData.caption || '',
      text: postData.caption || '',
      imageUrl: postData.imageUrl || undefined,
      imageUrls: (postData as any).imageUrls || undefined,
      likesCount: 0,
      likeCount: 0,
      commentsCount: 0,
      commentCount: 0,
      sharesCount: 0,
      saveCount: 0,
      isEdited: false,
      createdAt,
      updatedAt: createdAt,
      visibility: postData.visibility || 'public'
    };
    const list = getMockPosts();
    list.unshift(cleanPost);
    localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(list));
    triggerMockPostsUpdate();

    // Increment user postsCount (Best effort)
    try {
      const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
      const userIdx = mockUsers.findIndex((u: any) => u.uid === postData.userId);
      if (userIdx > -1) {
        mockUsers[userIdx].postsCount = (mockUsers[userIdx].postsCount || 0) + 1;
        localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));
      }
      const activeUser = JSON.parse(localStorage.getItem('opencomm-mock-user') || '{}');
      if (activeUser.uid === postData.userId) {
        activeUser.postsCount = (activeUser.postsCount || 0) + 1;
        localStorage.setItem('opencomm-mock-user', JSON.stringify(activeUser));
      }
    } catch (err) {
      console.warn('Could not update mock user postsCount:', err);
    }

    return cleanPost;
  }

  const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = new Date().toISOString();
  
  // Clean payload matching all fields (legacy + requested)
  const cleanPost: any = {
    postId,
    userId: postData.userId,
    uid: postData.userId,
    username: postData.username || '',
    displayName: postData.displayName || '',
    profileImage: postData.profileImage || '',
    profilePhoto: postData.profileImage || '',
    caption: postData.caption || '',
    text: postData.caption || '',
    imageUrl: postData.imageUrl || null,
    imageUrls: (postData as any).imageUrls || null,
    likesCount: 0,
    likeCount: 0,
    commentsCount: 0,
    commentCount: 0,
    sharesCount: 0,
    saveCount: 0,
    isEdited: false,
    createdAt,
    updatedAt: createdAt,
    visibility: postData.visibility || 'public'
  };

  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await setDoc(postRef, cleanPost);

    // Increment user postsCount (Best effort)
    try {
      const userRef = doc(db, USERS_COLLECTION, postData.userId);
      await updateDoc(userRef, {
        postsCount: increment(1)
      });
    } catch (err) {
      console.warn('Could not update user postsCount:', err);
    }

    return mapFirestoreDocToPost(cleanPost);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${POSTS_COLLECTION}/${postId}`);
  }
}

/**
 * Edits an existing post caption/visibility and optional image.
 */
export async function editPost(
  postId: string,
  userId: string,
  updates: { caption: string; visibility: 'public' | 'private'; imageUrl?: string }
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const list = getMockPosts();
    const idx = list.findIndex(p => p.postId === postId);
    if (idx === -1) {
      throw new Error('Post does not exist.');
    }
    const currentUserId = list[idx].userId || list[idx].uid;
    if (currentUserId !== userId) {
      throw new Error('Unauthorized edit attempt.');
    }
    list[idx] = {
      ...list[idx],
      caption: updates.caption,
      text: updates.caption,
      visibility: updates.visibility,
      isEdited: true,
      imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : list[idx].imageUrl,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(list));
    triggerMockPostsUpdate();
    return;
  }

  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      throw new Error('Post does not exist.');
    }
    const postData = postSnap.data();
    const currentUserId = postData.userId || postData.uid;
    if (currentUserId !== userId) {
      throw new Error('Unauthorized edit attempt.');
    }

    const editFields: any = {
      caption: updates.caption,
      text: updates.caption,
      visibility: updates.visibility,
      isEdited: true,
      updatedAt: new Date().toISOString()
    };

    if (updates.imageUrl !== undefined) {
      editFields.imageUrl = updates.imageUrl;
    } else if (postData.imageUrl) {
      editFields.imageUrl = postData.imageUrl;
    } else {
      editFields.imageUrl = null;
    }

    await updateDoc(postRef, editFields);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${POSTS_COLLECTION}/${postId}`);
  }
}

/**
 * Deletes a post, including any associated image in Storage.
 */
export async function deletePost(postId: string, userId: string, imageUrl?: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const list = getMockPosts();
    const updatedList = list.filter(p => p.postId !== postId);
    localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(updatedList));
    triggerMockPostsUpdate();

    // Decrement user postsCount (Best effort)
    try {
      const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
      const userIdx = mockUsers.findIndex((u: any) => u.uid === userId);
      if (userIdx > -1) {
        mockUsers[userIdx].postsCount = Math.max(0, (mockUsers[userIdx].postsCount || 0) - 1);
        localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));
      }
      const activeUser = JSON.parse(localStorage.getItem('opencomm-mock-user') || '{}');
      if (activeUser.uid === userId) {
        activeUser.postsCount = Math.max(0, (activeUser.postsCount || 0) - 1);
        localStorage.setItem('opencomm-mock-user', JSON.stringify(activeUser));
      }
    } catch (err) {
      console.warn('Could not decrement user postsCount:', err);
    }
    return;
  }

  try {
    // 1. Delete image from Storage if exists and was uploaded to Storage
    if (imageUrl && imageUrl.includes('firebasestorage') && storage) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (err) {
        console.warn('Failed to delete storage image, might be already deleted or incorrect path:', err);
      }
    }

    // 2. Delete Firestore Document
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await deleteDoc(postRef);

    // 3. Decrement user postsCount (Best effort)
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        postsCount: increment(-1)
      });
    } catch (err) {
      console.warn('Could not decrement user postsCount:', err);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${POSTS_COLLECTION}/${postId}`);
  }
}

/**
 * Toggles "Like" on a post. Returns new like state and likes count.
 */
export async function toggleLikePost(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
  if (!isFirebaseConfigured || !db) {
    const likes = getMockPostLikes(postId);
    const hasLiked = likes.includes(userId);
    let newLikes: string[];
    let liked = false;

    if (hasLiked) {
      newLikes = likes.filter(id => id !== userId);
    } else {
      newLikes = [...likes, userId];
      liked = true;
    }
    setMockPostLikes(postId, newLikes);

    const list = getMockPosts();
    const idx = list.findIndex(p => p.postId === postId);
    if (idx > -1) {
      const diff = liked ? 1 : -1;
      const newCount = Math.max(0, (list[idx].likesCount || 0) + diff);
      list[idx] = {
        ...list[idx],
        likesCount: newCount,
        likeCount: newCount
      };
      localStorage.setItem('opencomm-mock-posts-list', JSON.stringify(list));
      triggerMockPostsUpdate();
      return { liked, likesCount: newCount };
    }
    return { liked, likesCount: newLikes.length };
  }

  const likeRef = doc(db, `${POSTS_COLLECTION}/${postId}/likes`, userId);
  const postRef = doc(db, POSTS_COLLECTION, postId);
  
  const likeSnap = await getDoc(likeRef);
  const hasLiked = likeSnap.exists();

  if (hasLiked) {
    // Unlike
    await deleteDoc(likeRef);
    await updateDoc(postRef, { 
      likesCount: increment(-1),
      likeCount: increment(-1)
    });
    
    const updatedPostSnap = await getDoc(postRef);
    const updatedPostData = updatedPostSnap.data();
    const mapped = mapFirestoreDocToPost(updatedPostData);
    return { liked: false, likesCount: mapped.likesCount };
  } else {
    // Like
    await setDoc(likeRef, { userId, uid: userId, createdAt: new Date().toISOString() });
    await updateDoc(postRef, { 
      likesCount: increment(1),
      likeCount: increment(1)
    });

    const updatedPostSnap = await getDoc(postRef);
    const updatedPostData = updatedPostSnap.data();
    const mapped = mapFirestoreDocToPost(updatedPostData);

    // Send real-time notification
    const recipientId = mapped.userId || mapped.uid;
    if (recipientId !== userId) {
      try {
        const senderSnap = await getDoc(doc(db, USERS_COLLECTION, userId));
        const senderProfile = senderSnap.exists() ? senderSnap.data() : null;
        await createNotification({
          recipientId,
          senderId: userId,
          senderName: senderProfile?.displayName || senderProfile?.fullName || 'Someone',
          senderPhotoURL: senderProfile?.profileImage || senderProfile?.photoURL || '',
          type: 'like',
          message: 'liked your conversation post.',
          link: '/feed',
          postId
        });
      } catch (err) {
        console.error('Failed to send like notification:', err);
      }
    }

    return { liked: true, likesCount: mapped.likesCount };
  }
}

/**
 * Checks if the user liked a specific post.
 */
export async function checkPostLiked(postId: string, userId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    return getMockPostLikes(postId).includes(userId);
  }
  const likeRef = doc(db, `${POSTS_COLLECTION}/${postId}/likes`, userId);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
}

/**
 * Toggles "Saved" / "Bookmarked" state for a post.
 */
export async function toggleSavePost(postId: string, userId: string, postDetails: Post): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    const saved = getMockSavedPosts(userId);
    const isSaved = saved.includes(postId);
    let newSaved: string[];
    if (isSaved) {
      newSaved = saved.filter(id => id !== postId);
    } else {
      newSaved = [...saved, postId];
    }
    setMockSavedPosts(userId, newSaved);
    return !isSaved;
  }

  const saveRef = doc(db, `${USERS_COLLECTION}/${userId}/savedPosts`, postId);
  const saveSnap = await getDoc(saveRef);
  const isSaved = saveSnap.exists();

  if (isSaved) {
    await deleteDoc(saveRef);
    return false; // un-saved
  } else {
    await setDoc(saveRef, {
      postId,
      savedAt: new Date().toISOString(),
      ...postDetails
    });
    return true; // saved
  }
}

/**
 * Checks if a user has saved a post.
 */
export async function checkPostSaved(postId: string, userId: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) {
    return getMockSavedPosts(userId).includes(postId);
  }
  const saveRef = doc(db, `${USERS_COLLECTION}/${userId}/savedPosts`, postId);
  const saveSnap = await getDoc(saveRef);
  return saveSnap.exists();
}

/**
 * Fetches chronic posts with pagination support.
 */
export async function getFeedPosts(
  pageSize = 10,
  lastVisibleDoc?: DocumentSnapshot | null,
  lastVisibleTimestampMock?: string | null
): Promise<{ posts: Post[]; lastDoc: DocumentSnapshot | null; lastTimestampMock: string | null; hasMore: boolean }> {
  if (!isFirebaseConfigured || !db) {
    const list = getMockPosts();
    return {
      posts: list,
      lastDoc: null,
      lastTimestampMock: null,
      hasMore: false
    };
  }

  try {
    let q = query(
      collection(db, POSTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastVisibleDoc) {
      q = query(
        collection(db, POSTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    const snap = await getDocs(q);
    const posts: Post[] = [];
    snap.forEach((docSnap) => {
      posts.push(mapFirestoreDocToPost(docSnap.data()));
    });

    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;

    return {
      posts,
      lastDoc,
      lastTimestampMock: null,
      hasMore
    };
  } catch (err) {
    console.error('Error fetching Firestore posts:', err);
    throw err;
  }
}

/**
 * Submits a report document against a post.
 */
export async function reportPost(postId: string, reporterId: string, reason: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const reportId = `report_${Date.now()}`;
    const report = {
      reportId,
      postId,
      reporterId,
      reason,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    try {
      const reports = JSON.parse(localStorage.getItem('opencomm-mock-reports-list') || '[]');
      reports.unshift(report);
      localStorage.setItem('opencomm-mock-reports-list', JSON.stringify(reports));
    } catch (e) {
      console.warn('Could not save mock report:', e);
    }
    return;
  }

  const reportId = `report_${Date.now()}`;
  const reportRef = doc(db, 'reports', reportId);
  await setDoc(reportRef, {
    reportId,
    postId,
    reporterId,
    reason,
    createdAt: new Date().toISOString(),
    status: 'pending'
  });
}

/**
 * Subscribes to the public feed posts in real-time.
 */
export function subscribeFeedPosts(
  onUpdate: (posts: Post[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    // Return mock data immediately
    const initialPosts = getMockPosts();
    onUpdate(initialPosts);

    const handleUpdate = () => {
      onUpdate(getMockPosts());
    };

    window.addEventListener('mock-posts-updated', handleUpdate);
    return () => {
      window.removeEventListener('mock-posts-updated', handleUpdate);
    };
  }

  const q = query(
    collection(db, POSTS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const posts: Post[] = [];
      snapshot.forEach((docSnap) => {
        posts.push(mapFirestoreDocToPost(docSnap.data()));
      });
      onUpdate(posts);
    },
    (error) => {
      console.error('Real-time feed sync error:', error);
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, POSTS_COLLECTION);
      }
    }
  );
  return unsubscribe;
}

/**
 * Records a unique view on a post for a logged-in user (ignoring the creator's view).
 */
export async function recordPostView(
  postId: string,
  userId: string,
  postCreatorId: string
): Promise<void> {
  if (!postId || !userId) return;
  if (userId === postCreatorId) return; // Ignore creator's own views

  if (isFirebaseConfigured && db) {
    try {
      const viewRef = doc(db, 'posts', postId, 'views', userId);
      const viewSnap = await getDoc(viewRef);
      if (viewSnap.exists()) return; // Already viewed

      // Save view and increment count atomically
      await runTransaction(db, async (transaction) => {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) return;

        transaction.set(viewRef, { viewedAt: new Date().toISOString() });
        const currentViews = postSnap.data().viewsCount || 0;
        transaction.update(postRef, { viewsCount: currentViews + 1 });
      });
    } catch (err) {
      console.warn('Failed to record post view:', err);
    }
  } else {
    // Mock Mode
    try {
      const storageKey = 'opencomm_mock_post_views';
      const storedViews = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const viewId = `${postId}_${userId}`;
      if (storedViews.includes(viewId)) return; // Already viewed

      storedViews.push(viewId);
      localStorage.setItem(storageKey, JSON.stringify(storedViews));

      // Increment viewsCount in mock-posts-list
      const postsListKey = 'opencomm-mock-posts-list';
      const mockPosts = JSON.parse(localStorage.getItem(postsListKey) || '[]');
      const idx = mockPosts.findIndex((p: any) => p.postId === postId);
      if (idx !== -1) {
        mockPosts[idx].viewsCount = (mockPosts[idx].viewsCount || 0) + 1;
        localStorage.setItem(postsListKey, JSON.stringify(mockPosts));
        window.dispatchEvent(new Event('mock-posts-updated'));
      }
    } catch (err) {
      console.warn('Failed to record mock post view:', err);
    }
  }
}

/**
 * Increments the share count of a post.
 */
export async function incrementPostShareCount(postId: string): Promise<void> {
  if (!postId) return;

  if (isFirebaseConfigured && db) {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        sharesCount: increment(1)
      });
    } catch (err) {
      console.warn('Failed to increment post share count:', err);
    }
  } else {
    // Mock Mode
    try {
      const postsListKey = 'opencomm-mock-posts-list';
      const mockPosts = JSON.parse(localStorage.getItem(postsListKey) || '[]');
      const idx = mockPosts.findIndex((p: any) => p.postId === postId);
      if (idx !== -1) {
        mockPosts[idx].sharesCount = (mockPosts[idx].sharesCount || 0) + 1;
        localStorage.setItem(postsListKey, JSON.stringify(mockPosts));
        window.dispatchEvent(new Event('mock-posts-updated'));
      }
    } catch (err) {
      console.warn('Failed to increment mock post share count:', err);
    }
  }
}
