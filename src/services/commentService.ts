/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { createNotification } from './notificationService';
import { UserProfile } from '../types';

export interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  profilePhoto: string;
  text: string;
  createdAt: string;
  isEdited: boolean;
  likesCount: number;
  repliesCount: number;
  likedBy?: string[];
}

export interface Reply {
  replyId: string;
  commentId: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  profilePhoto: string;
  text: string;
  createdAt: string;
  isEdited: boolean;
  likesCount: number;
  likedBy?: string[];
}

const COMMENTS_COLLECTION = 'comments';
const REPLIES_COLLECTION = 'replies';
const POSTS_COLLECTION = 'posts';

// Storage Keys for Mock Fallback
const MOCK_COMMENTS_KEY = 'opencomm_mock_comments';
const MOCK_REPLIES_KEY = 'opencomm_mock_replies';

function getLocalComments(): Comment[] {
  try {
    const stored = localStorage.getItem(MOCK_COMMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalComments(comments: Comment[]) {
  localStorage.setItem(MOCK_COMMENTS_KEY, JSON.stringify(comments));
  window.dispatchEvent(new Event('storage'));
}

function getLocalReplies(): Reply[] {
  try {
    const stored = localStorage.getItem(MOCK_REPLIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalReplies(replies: Reply[]) {
  localStorage.setItem(MOCK_REPLIES_KEY, JSON.stringify(replies));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Handle user mentions in comments/replies
 */
async function handleMentions(text: string, sender: UserProfile, postId: string, context: 'comment' | 'reply') {
  const mentionRegex = /@([a-zA-Z0-9_\-]+)/g;
  let match;
  const usernames: string[] = [];
  while ((match = mentionRegex.exec(text)) !== null) {
    usernames.push(match[1].toLowerCase());
  }

  if (usernames.length === 0) return;

  // Query users to find their UIDs
  if (isFirebaseConfigured && db) {
    try {
      const usersCol = collection(db, 'users');
      const snap = await getDocs(usersCol);
      snap.forEach(async (userDoc) => {
        const profile = userDoc.data() as UserProfile;
        if (profile.username && usernames.includes(profile.username.toLowerCase()) && profile.uid !== sender.uid) {
          // Send notification
          await createNotification({
            recipientId: profile.uid,
            senderId: sender.uid,
            senderName: sender.displayName || sender.fullName || 'Someone',
            senderPhotoURL: sender.photoURL || sender.profileImage || '',
            type: 'mention',
            message: `mentioned you in a ${context}: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`,
            link: '/feed',
            postId
          });
        }
      });
    } catch (err) {
      console.error('Failed to notify mentioned users:', err);
    }
  } else {
    // Mock Mode
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    mockUsers.forEach(async (u: any) => {
      if (u.username && usernames.includes(u.username.toLowerCase()) && u.uid !== sender.uid) {
        await createNotification({
          recipientId: u.uid,
          senderId: sender.uid,
          senderName: sender.displayName || sender.fullName || 'Someone',
          senderPhotoURL: sender.photoURL || sender.profileImage || '',
          type: 'mention',
          message: `mentioned you in a ${context}: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`,
          link: '/feed',
          postId
        });
      }
    });
  }
}

/**
 * Listen to comments for a specific post in real time
 */
export function listenToComments(
  postId: string,
  onUpdate: (comments: Comment[]) => void,
  onError: (error: any) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('postId', '==', postId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Comment[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Comment);
        });
        onUpdate(list);
      },
      (error) => {
        console.error('Error listening to comments:', error);
        handleFirestoreError(error, OperationType.GET, `${COMMENTS_COLLECTION}?postId=${postId}`);
        onError(error);
      }
    );
  } else {
    const handleSync = () => {
      const list = getLocalComments()
        .filter((c) => c.postId === postId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    };

    handleSync();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }
}

/**
 * Listen to replies for a specific comment in real time
 */
export function listenToReplies(
  commentId: string,
  onUpdate: (replies: Reply[]) => void,
  onError: (error: any) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, REPLIES_COLLECTION),
      where('commentId', '==', commentId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Reply[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Reply);
        });
        onUpdate(list);
      },
      (error) => {
        console.error('Error listening to replies:', error);
        handleFirestoreError(error, OperationType.GET, `${REPLIES_COLLECTION}?commentId=${commentId}`);
        onError(error);
      }
    );
  } else {
    const handleSync = () => {
      const list = getLocalReplies()
        .filter((r) => r.commentId === commentId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(list);
    };

    handleSync();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }
}

/**
 * Add a new comment to a post
 */
export async function addComment(postId: string, text: string, user: UserProfile): Promise<Comment> {
  const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = new Date().toISOString();

  const newComment: Comment = {
    commentId,
    postId,
    userId: user.uid,
    username: user.username || 'user',
    displayName: user.displayName || user.fullName || 'OpenComm User',
    profilePhoto: user.photoURL || user.profileImage || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    text,
    createdAt,
    isEdited: false,
    likesCount: 0,
    repliesCount: 0,
    likedBy: []
  };

  if (isFirebaseConfigured && db) {
    try {
      // Create comment document
      await setDoc(doc(db, COMMENTS_COLLECTION, commentId), newComment);

      // Increment commentsCount and commentCount in post
      const postRef = doc(db, POSTS_COLLECTION, postId);
      await updateDoc(postRef, {
        commentsCount: increment(1),
        commentCount: increment(1)
      });

      // Get post owner to notify them
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        if (postData.userId !== user.uid) {
          await createNotification({
            recipientId: postData.userId,
            senderId: user.uid,
            senderName: user.displayName || user.fullName || 'Someone',
            senderPhotoURL: user.photoURL || user.profileImage || '',
            type: 'comment',
            message: `commented on your post: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
            link: '/feed',
            postId
          });
        }
      }

      // Handle mentions asynchronously
      handleMentions(text, user, postId, 'comment');

      return newComment;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${COMMENTS_COLLECTION}/${commentId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const comments = getLocalComments();
    comments.push(newComment);
    saveLocalComments(comments);

    // Update post commentsCount in localStorage
    try {
      const posts = JSON.parse(localStorage.getItem('opencomm_mock_posts') || '[]');
      const postIndex = posts.findIndex((p: any) => p.postId === postId);
      if (postIndex !== -1) {
        posts[postIndex].commentsCount = (posts[postIndex].commentsCount || 0) + 1;
        localStorage.setItem('opencomm_mock_posts', JSON.stringify(posts));
        window.dispatchEvent(new Event('storage'));

        const targetPost = posts[postIndex];
        if (targetPost.userId !== user.uid) {
          await createNotification({
            recipientId: targetPost.userId,
            senderId: user.uid,
            senderName: user.displayName || user.fullName || 'Someone',
            senderPhotoURL: user.photoURL || user.profileImage || '',
            type: 'comment',
            message: `commented on your post: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
            link: '/feed',
            postId
          });
        }
      }
    } catch (e) {
      console.error(e);
    }

    handleMentions(text, user, postId, 'comment');
    return newComment;
  }
}

/**
 * Edit comment text
 */
export async function editComment(commentId: string, text: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, COMMENTS_COLLECTION, commentId), {
        text,
        isEdited: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COMMENTS_COLLECTION}/${commentId}`);
      throw err;
    }
  } else {
    const comments = getLocalComments();
    const index = comments.findIndex((c) => c.commentId === commentId);
    if (index !== -1) {
      comments[index].text = text;
      comments[index].isEdited = true;
      saveLocalComments(comments);
    }
  }
}

/**
 * Delete a comment and decrement post comment count
 */
export async function deleteComment(commentId: string, postId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      // Delete the comment document
      await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));

      // Decrement post comment count
      await updateDoc(doc(db, POSTS_COLLECTION, postId), {
        commentsCount: increment(-1),
        commentCount: increment(-1)
      });

      // Query and delete all nested replies
      const q = query(collection(db, REPLIES_COLLECTION), where('commentId', '==', commentId));
      const repliesSnap = await getDocs(q);
      const batch = writeBatch(db);
      repliesSnap.forEach((replyDoc) => {
        batch.delete(replyDoc.ref);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COMMENTS_COLLECTION}/${commentId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const comments = getLocalComments().filter((c) => c.commentId !== commentId);
    saveLocalComments(comments);

    const replies = getLocalReplies().filter((r) => r.commentId !== commentId);
    saveLocalReplies(replies);

    try {
      const posts = JSON.parse(localStorage.getItem('opencomm_mock_posts') || '[]');
      const postIndex = posts.findIndex((p: any) => p.postId === postId);
      if (postIndex !== -1) {
        posts[postIndex].commentsCount = Math.max(0, (posts[postIndex].commentsCount || 0) - 1);
        localStorage.setItem('opencomm_mock_posts', JSON.stringify(posts));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Like or unlike a comment
 */
export async function likeComment(commentId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, COMMENTS_COLLECTION, commentId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Comment;
        const likedBy = data.likedBy || [];
        const isLiked = likedBy.includes(userId);

        if (isLiked) {
          await updateDoc(ref, {
            likedBy: arrayRemove(userId),
            likesCount: increment(-1)
          });
        } else {
          await updateDoc(ref, {
            likedBy: arrayUnion(userId),
            likesCount: increment(1)
          });

          // Optional: Send like notification to comment author
          if (data.userId !== userId) {
            await createNotification({
              recipientId: data.userId,
              senderId: userId,
              senderName: 'Someone',
              type: 'like',
              message: `liked your comment: "${data.text.substring(0, 30)}..."`,
              link: '/feed',
              postId: data.postId
            });
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${COMMENTS_COLLECTION}/${commentId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const comments = getLocalComments();
    const index = comments.findIndex((c) => c.commentId === commentId);
    if (index !== -1) {
      const c = comments[index];
      c.likedBy = c.likedBy || [];
      const likedIndex = c.likedBy.indexOf(userId);
      if (likedIndex !== -1) {
        c.likedBy.splice(likedIndex, 1);
        c.likesCount = Math.max(0, c.likesCount - 1);
      } else {
        c.likedBy.push(userId);
        c.likesCount += 1;
      }
      saveLocalComments(comments);
    }
  }
}

/**
 * Add a new reply to a comment
 */
export async function addReply(commentId: string, postId: string, text: string, user: UserProfile): Promise<Reply> {
  const replyId = `reply_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = new Date().toISOString();

  const newReply: Reply = {
    replyId,
    commentId,
    postId,
    userId: user.uid,
    username: user.username || 'user',
    displayName: user.displayName || user.fullName || 'OpenComm User',
    profilePhoto: user.photoURL || user.profileImage || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    text,
    createdAt,
    isEdited: false,
    likesCount: 0,
    likedBy: []
  };

  if (isFirebaseConfigured && db) {
    try {
      // Save the reply document
      await setDoc(doc(db, REPLIES_COLLECTION, replyId), newReply);

      // Increment repliesCount in comment
      const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
      await updateDoc(commentRef, {
        repliesCount: increment(1)
      });

      // Get comment owner to notify them
      const commentSnap = await getDoc(commentRef);
      if (commentSnap.exists()) {
        const commentData = commentSnap.data() as Comment;
        if (commentData.userId !== user.uid) {
          await createNotification({
            recipientId: commentData.userId,
            senderId: user.uid,
            senderName: user.displayName || user.fullName || 'Someone',
            senderPhotoURL: user.photoURL || user.profileImage || '',
            type: 'reply',
            message: `replied to your comment: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
            link: '/feed',
            postId
          });
        }
      }

      handleMentions(text, user, postId, 'reply');
      return newReply;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${REPLIES_COLLECTION}/${replyId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const replies = getLocalReplies();
    replies.push(newReply);
    saveLocalReplies(replies);

    // Increment repliesCount on comment
    const comments = getLocalComments();
    const commentIndex = comments.findIndex((c) => c.commentId === commentId);
    if (commentIndex !== -1) {
      comments[commentIndex].repliesCount = (comments[commentIndex].repliesCount || 0) + 1;
      saveLocalComments(comments);

      const commentData = comments[commentIndex];
      if (commentData.userId !== user.uid) {
        await createNotification({
          recipientId: commentData.userId,
          senderId: user.uid,
          senderName: user.displayName || user.fullName || 'Someone',
          senderPhotoURL: user.photoURL || user.profileImage || '',
          type: 'reply',
          message: `replied to your comment: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          link: '/feed',
          postId
        });
      }
    }

    handleMentions(text, user, postId, 'reply');
    return newReply;
  }
}

/**
 * Edit a reply
 */
export async function editReply(replyId: string, text: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, REPLIES_COLLECTION, replyId), {
        text,
        isEdited: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${REPLIES_COLLECTION}/${replyId}`);
      throw err;
    }
  } else {
    const replies = getLocalReplies();
    const index = replies.findIndex((r) => r.replyId === replyId);
    if (index !== -1) {
      replies[index].text = text;
      replies[index].isEdited = true;
      saveLocalReplies(replies);
    }
  }
}

/**
 * Delete a reply and decrement comment reply count
 */
export async function deleteReply(replyId: string, commentId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, REPLIES_COLLECTION, replyId));

      await updateDoc(doc(db, COMMENTS_COLLECTION, commentId), {
        repliesCount: increment(-1)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${REPLIES_COLLECTION}/${replyId}`);
      throw err;
    }
  } else {
    const replies = getLocalReplies().filter((r) => r.replyId !== replyId);
    saveLocalReplies(replies);

    const comments = getLocalComments();
    const commentIndex = comments.findIndex((c) => c.commentId === commentId);
    if (commentIndex !== -1) {
      comments[commentIndex].repliesCount = Math.max(0, (comments[commentIndex].repliesCount || 0) - 1);
      saveLocalComments(comments);
    }
  }
}

/**
 * Like or unlike a reply
 */
export async function likeReply(replyId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, REPLIES_COLLECTION, replyId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Reply;
        const likedBy = data.likedBy || [];
        const isLiked = likedBy.includes(userId);

        if (isLiked) {
          await updateDoc(ref, {
            likedBy: arrayRemove(userId),
            likesCount: increment(-1)
          });
        } else {
          await updateDoc(ref, {
            likedBy: arrayUnion(userId),
            likesCount: increment(1)
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${REPLIES_COLLECTION}/${replyId}`);
      throw err;
    }
  } else {
    const replies = getLocalReplies();
    const index = replies.findIndex((r) => r.replyId === replyId);
    if (index !== -1) {
      const r = replies[index];
      r.likedBy = r.likedBy || [];
      const likedIndex = r.likedBy.indexOf(userId);
      if (likedIndex !== -1) {
        r.likedBy.splice(likedIndex, 1);
        r.likesCount = Math.max(0, r.likesCount - 1);
      } else {
        r.likedBy.push(userId);
        r.likesCount += 1;
      }
      saveLocalReplies(replies);
    }
  }
}
