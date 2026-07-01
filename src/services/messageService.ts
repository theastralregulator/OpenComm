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
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  where,
  runTransaction
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, isFirebaseConfigured, storage } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { UserProfile } from '../types';
import { createNotification } from './notificationService';

export interface DirectChat {
  chatId: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: Record<string, number>;
  deletedBy?: string[];
  pinnedBy?: string[];
  archivedBy?: string[];
  status?: 'active' | 'request';
  senderId?: string;
  recipientId?: string;
}

export interface DirectMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderPhotoURL: string;
  text: string;
  createdAt: string;
  reactions?: Record<string, string[]>; // emoji -> array of user uids
  replyToId?: string | null;
  replyToText?: string | null;
  replyToSenderName?: string | null;
  status: 'sending' | 'sent' | 'delivered' | 'seen';
  
  // Attachments & Premium features
  attachmentUrl?: string;
  attachmentType?: 'image' | 'video' | 'audio' | 'file';
  attachmentName?: string;
  isPinned?: boolean;
  isEdited?: boolean;
  deletedFor?: string[]; // user IDs who deleted this message for themselves
}

export interface MessageRequest {
  requestId: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  createdAt: string;
}

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';
const TYPING_COLLECTION = 'typing';
const PRESENCE_COLLECTION = 'presence';
const MESSAGE_REQUESTS_COLLECTION = 'messageRequests';
const BLOCKED_USERS_COLLECTION = 'blockedUsers';

// Helper to generate IDs
function generateUUID(): string {
  return 'dm_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Upload message attachments to Firebase Storage with a data URL fallback
 */
export async function uploadMessageAttachment(chatId: string, file: File): Promise<{ url: string; type: 'image' | 'video' | 'audio' | 'file'; name: string }> {
  let fileType: 'image' | 'video' | 'audio' | 'file' = 'file';
  if (file.type.startsWith('image/')) fileType = 'image';
  else if (file.type.startsWith('video/')) fileType = 'video';
  else if (file.type.startsWith('audio/')) fileType = 'audio';

  if (isFirebaseConfigured && storage) {
    try {
      const fileRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return { url, type: fileType, name: file.name };
    } catch (err) {
      console.error('[OpenComm] Firebase Storage upload failed, falling back to local object:', err);
    }
  }

  // Fallback to local DataURL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        url: reader.result as string,
        type: fileType,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Check if current user blocks the peer or is blocked by peer
 */
export async function isUserBlocked(userAId: string, userBId: string): Promise<boolean> {
  if (isFirebaseConfigured && db) {
    try {
      const docA = doc(db, BLOCKED_USERS_COLLECTION, `${userAId}_${userBId}`);
      const docB = doc(db, BLOCKED_USERS_COLLECTION, `${userBId}_${userAId}`);
      const [snapA, snapB] = await Promise.all([getDoc(docA), getDoc(docB)]);
      return snapA.exists() || snapB.exists();
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  const blockedList = JSON.parse(localStorage.getItem('opencomm_blocked_users') || '[]');
  return blockedList.includes(`${userAId}_${userBId}`) || blockedList.includes(`${userBId}_${userAId}`);
}

/**
 * Search peers by username, display name, or full name
 */
export async function searchPeers(queryText: string, currentUserId: string): Promise<UserProfile[]> {
  const searchTerm = queryText.toLowerCase().trim();
  if (!searchTerm) return [];

  if (isFirebaseConfigured && db) {
    try {
      const usersCol = collection(db, 'users');
      const qSnapshot = await getDocs(usersCol);
      const allUsers: UserProfile[] = [];
      qSnapshot.forEach((doc) => {
        const u = doc.data() as UserProfile;
        if (u.uid !== currentUserId) {
          allUsers.push(u);
        }
      });
      return allUsers.filter(u =>
        (u.username?.toLowerCase().includes(searchTerm) ||
         u.displayName?.toLowerCase().includes(searchTerm) ||
         u.fullName?.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('[OpenComm] Error searching users in Firestore:', error);
      throw new Error('Unable to complete search. Please try again.');
    }
  } else {
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    return mockUsers.filter((u: any) =>
      u.uid !== currentUserId &&
      (u.username?.toLowerCase().includes(searchTerm) ||
       u.displayName?.toLowerCase().includes(searchTerm) ||
       u.fullName?.toLowerCase().includes(searchTerm))
    );
  }
}

/**
 * Fetch and categorize users for Starting a New Chat
 */
export async function getPeerSelectionLists(currentUserId: string): Promise<{
  following: UserProfile[];
  followers: UserProfile[];
  mutual: UserProfile[];
  nearby: UserProfile[];
  remaining: UserProfile[];
}> {
  if (isFirebaseConfigured && db) {
    try {
      // 1. Fetch all users except currentUser
      const usersCol = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCol);
      let allUsers: UserProfile[] = [];
      let currentUserProfile: UserProfile | null = null;

      usersSnapshot.forEach((doc) => {
        const u = doc.data() as UserProfile;
        if (u.uid === currentUserId) {
          currentUserProfile = u;
        } else {
          allUsers.push(u);
        }
      });

      // 2. Fetch accepted follow relations
      const followsCol = collection(db, 'follows');
      const followsQuery = query(followsCol, where('status', '==', 'accepted'));
      const followsSnapshot = await getDocs(followsQuery);

      const followingIds = new Set<string>();
      const followerIds = new Set<string>();

      followsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.followerId === currentUserId) {
          followingIds.add(data.followingId);
        }
        if (data.followingId === currentUserId) {
          followerIds.add(data.followerId);
        }
      });

      const mutualIds = new Set<string>(
        Array.from(followingIds).filter(id => followerIds.has(id))
      );

      // Clean individual lists
      const mutual: UserProfile[] = [];
      const following: UserProfile[] = [];
      const followers: UserProfile[] = [];
      const nearby: UserProfile[] = [];
      const remaining: UserProfile[] = [];

      const curLoc = currentUserProfile?.location?.toLowerCase().trim() || '';

      allUsers.forEach(u => {
        const uid = u.uid;
        if (mutualIds.has(uid)) {
          mutual.push(u);
        } else if (followingIds.has(uid)) {
          following.push(u);
        } else if (followerIds.has(uid)) {
          followers.push(u);
        } else if (curLoc && u.location && (
          u.location.toLowerCase().includes(curLoc) || curLoc.includes(u.location.toLowerCase())
        )) {
          nearby.push(u);
        } else {
          remaining.push(u);
        }
      });

      // Sort remaining by recent activity or signup
      remaining.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return { following, followers, mutual, nearby, remaining };
    } catch (error) {
      console.error('[OpenComm] Error fetching starting lists:', error);
    }
  }

  // Local storage mock fallback
  const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
  const currentUserMock = mockUsers.find((u: any) => u.uid === currentUserId);
  const peers = mockUsers.filter((u: any) => u.uid !== currentUserId);

  return {
    following: peers.slice(0, 1),
    followers: peers.slice(1, 2),
    mutual: [],
    nearby: peers.filter((p: any) => p.location && p.location === currentUserMock?.location),
    remaining: peers.slice(2)
  };
}

/**
 * Get or create a direct conversation.
 * Uses deterministic ID ([userAId, userBId].sort().join('_')) to guarantee 
 * exactly one conversation per pair, regardless of who initiates.
 */
export async function getOrCreateChat(userAId: string, userBId: string): Promise<string> {
  const chatId = [userAId, userBId].sort().join('_');
  const now = new Date().toISOString();

  if (isFirebaseConfigured && db) {
    // Attempt 1: Try to read and/or create the conversation
    try {
      const chatRef = doc(db, CONVERSATIONS_COLLECTION, chatId);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        // Conversation already exists — restore for requester if they deleted it
        const data = chatSnap.data();
        if (Array.isArray(data.deletedBy) && data.deletedBy.includes(userAId)) {
          try {
            await updateDoc(chatRef, { deletedBy: arrayRemove(userAId) });
          } catch (updateErr) {
            // Non-fatal: conversation still opens
            console.warn('[OpenComm] Could not restore deleted chat, continuing:', updateErr);
          }
        }
        return chatId;
      }

      // Conversation does not exist — create it now
      const newChat: DirectChat = {
        chatId,
        participants: [userAId, userBId],
        createdAt: now,
        updatedAt: now,
        lastMessage: null,
        unreadCount: { [userAId]: 0, [userBId]: 0 },
        deletedBy: [],
        pinnedBy: [],
        archivedBy: [],
        status: 'active',  // Always active — no message-request gate blocking chat
        senderId: userAId,
        recipientId: userBId
      };

      await setDoc(chatRef, newChat);
      return chatId;
    } catch (error: any) {
      // Log the real Firebase error code so it's visible in devtools
      const code = error?.code || 'unknown';
      const msg = error?.message || String(error);
      console.error(`[OpenComm] getOrCreateChat failed (code=${code}):`, msg);

      // Attempt 2: If the document already exists (race condition), just return the id
      if (code === 'already-exists' || code === 'permission-denied') {
        console.warn('[OpenComm] Falling back to returning chatId optimistically.');
        return chatId;
      }

      // Last resort: still return the chatId so the UI can navigate without crashing
      return chatId;
    }
  }

  // --- Local-storage Mock Mode ---
  const chats: DirectChat[] = JSON.parse(localStorage.getItem('opencomm_mock_direct_chats') || '[]');
  const existing = chats.find(c => c.chatId === chatId);
  if (existing) return chatId;

  const newChat: DirectChat = {
    chatId,
    participants: [userAId, userBId],
    createdAt: now,
    updatedAt: now,
    lastMessage: null,
    unreadCount: { [userAId]: 0, [userBId]: 0 },
    status: 'active'
  };
  chats.push(newChat);
  localStorage.setItem('opencomm_mock_direct_chats', JSON.stringify(chats));
  return chatId;
}


/**
 * Accept a Message Request
 */
export async function acceptMessageRequest(chatId: string, currentUserId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const chatRef = doc(db, CONVERSATIONS_COLLECTION, chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const data = chatSnap.data() as DirectChat;
        await updateDoc(chatRef, { status: 'active' });

        const reqRef = doc(db, MESSAGE_REQUESTS_COLLECTION, `${data.senderId}_${currentUserId}`);
        await updateDoc(reqRef, { status: 'accepted' });

        // Trigger notification
        if (data.senderId) {
          await createNotification({
            recipientId: data.senderId,
            senderId: currentUserId,
            senderName: 'Someone',
            senderPhotoURL: '',
            type: 'message_request_accept',
            message: 'accepted your message request!',
            link: '/messages'
          });
        }
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  }
}

/**
 * Decline/Delete message request
 */
export async function declineMessageRequest(chatId: string, currentUserId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const chatRef = doc(db, CONVERSATIONS_COLLECTION, chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const data = chatSnap.data() as DirectChat;
        await deleteDoc(chatRef);
        const reqRef = doc(db, MESSAGE_REQUESTS_COLLECTION, `${data.senderId}_${currentUserId}`);
        await deleteDoc(reqRef);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Block a user
 */
export async function blockUser(currentUserId: string, blockUserId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const blockId = `${currentUserId}_${blockUserId}`;
      await setDoc(doc(db, BLOCKED_USERS_COLLECTION, blockId), {
        blockId,
        blockedBy: currentUserId,
        blockedUser: blockUserId,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    const list = JSON.parse(localStorage.getItem('opencomm_blocked_users') || '[]');
    list.push(`${currentUserId}_${blockUserId}`);
    localStorage.setItem('opencomm_blocked_users', JSON.stringify(list));
  }
}

/**
 * Report a user
 */
export async function reportUser(senderId: string, reporterId: string, reason: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const reportRef = doc(collection(db, 'reports'));
      await setDoc(reportRef, {
        reportId: reportRef.id,
        reportedUser: senderId,
        reportedBy: reporterId,
        reason,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Presence triggers (Instant updates via Firestore)
 */
export async function updateUserPresence(uid: string, status: 'online' | 'away' | 'offline'): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const presenceRef = doc(db, PRESENCE_COLLECTION, uid);
      await setDoc(presenceRef, {
        uid,
        status,
        lastActive: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  }
}

export function listenToAllPresence(callback: (presenceMap: Record<string, { status: 'online' | 'away' | 'offline'; lastActive: string }>) => void): () => void {
  if (isFirebaseConfigured && db) {
    const presenceRef = collection(db, PRESENCE_COLLECTION);
    return onSnapshot(presenceRef, (snapshot) => {
      const presenceMap: Record<string, { status: 'online' | 'away' | 'offline'; lastActive: string }> = {};
      snapshot.forEach((doc) => {
        presenceMap[doc.id] = doc.data() as any;
      });
      callback(presenceMap);
    });
  }
  callback({});
  return () => {};
}

/**
 * Listen to direct conversations for the current user (including unread count)
 */
export function listenToChats(userId: string, callback: (chats: DirectChat[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    const chatsRef = collection(db, CONVERSATIONS_COLLECTION);
    const q = query(
      chatsRef,
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const chats: DirectChat[] = [];
      snapshot.forEach((doc) => {
        const c = doc.data() as DirectChat;
        if (!c.deletedBy || !c.deletedBy.includes(userId)) {
          chats.push(c);
        }
      });
      callback(chats);
    }, (error) => {
      console.error('[OpenComm] Error listening to chats:', error);
    });
  }

  // Fallback
  const stored = JSON.parse(localStorage.getItem('opencomm_mock_direct_chats') || '[]');
  callback(stored);
  return () => {};
}

/**
 * Listen to messages for a chat with real-time updates and pagination
 */
export function listenToMessages(
  chatId: string,
  limitCount: number,
  callback: (messages: DirectMessage[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const messagesRef = collection(db, 'messages', chatId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const messages: DirectMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push(doc.data() as DirectMessage);
      });
      callback(messages.reverse());
    }, (error) => {
      console.error('[OpenComm] Error listening to messages:', error);
    });
  }

  // Fallback
  const messages = JSON.parse(localStorage.getItem('opencomm_mock_direct_messages') || '[]');
  const chatMsgs = messages.filter((m: any) => m.chatId === chatId).slice(-limitCount);
  callback(chatMsgs);
  return () => {};
}

/**
 * Send a direct message
 */
export async function sendDirectMessage(
  chatId: string,
  sender: UserProfile,
  recipientId: string,
  text: string,
  replyTo?: { id: string; text: string; senderName: string } | null,
  attachment?: { url: string; type: 'image' | 'video' | 'audio' | 'file'; name: string } | null
): Promise<void> {
  const messageId = generateUUID();
  const now = new Date().toISOString();

  const newMessage: DirectMessage = {
    messageId,
    chatId,
    senderId: sender.uid,
    senderName: sender.displayName || sender.username || 'OpenComm User',
    senderUsername: sender.username || 'user',
    senderPhotoURL: sender.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    text,
    createdAt: now,
    reactions: {},
    replyToId: replyTo?.id || null,
    replyToText: replyTo?.text || null,
    replyToSenderName: replyTo?.senderName || null,
    status: 'sent',
    attachmentUrl: attachment?.url || undefined,
    attachmentType: attachment?.type || undefined,
    attachmentName: attachment?.name || undefined
  };

  if (isFirebaseConfigured && db) {
    try {
      // 1. Create message document at messages/{conversationId}/messages/{messageId}
      await setDoc(doc(db, 'messages', chatId, 'messages', messageId), newMessage);

      // 2. Update chat metadata and increment unread count
      const chatRef = doc(db, CONVERSATIONS_COLLECTION, chatId);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as DirectChat;
        const deletedBy = chatData.deletedBy || [];
        const unreadCount = chatData.unreadCount || {};
        const nextDeletedBy = deletedBy.filter((id) => id !== sender.uid && id !== recipientId);
        const recipientUnread = (unreadCount[recipientId] || 0) + 1;

        await updateDoc(chatRef, {
          updatedAt: now,
          lastMessage: {
            text: text || (attachment ? `Sent an ${attachment.type}` : ''),
            senderId: sender.uid,
            createdAt: now
          },
          [`unreadCount.${recipientId}`]: recipientUnread,
          deletedBy: nextDeletedBy
        });
      }

      // 3. Create Real Notifications
      await createNotification({
        recipientId,
        senderId: sender.uid,
        senderName: sender.displayName || sender.username || 'Peer',
        senderPhotoURL: sender.photoURL || '',
        type: 'message',
        message: replyTo ? `replied to your message: "${text}"` : `sent you a message: "${text || 'attachment'}"`,
        link: `/messages/${chatId}`
      });
    } catch (error) {
      console.error('[OpenComm] Error sending message:', error);
      throw new Error('Unable to send message.');
    }
  } else {
    // Fallback Mock
    const messages = JSON.parse(localStorage.getItem('opencomm_mock_direct_messages') || '[]');
    messages.push(newMessage);
    localStorage.setItem('opencomm_mock_direct_messages', JSON.stringify(messages));
  }
}

/**
 * Edit a Direct Message
 */
export async function editDirectMessage(chatId: string, messageId: string, newText: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, 'messages', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        text: newText,
        isEdited: true
      });

      // Update chat's last message if edited message is the last one
      const chatRef = doc(db, CONVERSATIONS_COLLECTION, chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as DirectChat;
        if (chatData.lastMessage && chatData.lastMessage.createdAt) {
          await updateDoc(chatRef, {
            [`lastMessage.text`]: newText
          });
        }
      }
    } catch (e) {
      console.error('Error editing message:', e);
    }
  }
}

/**
 * Pin message in conversation
 */
export async function togglePinMessage(chatId: string, messageId: string, pin: boolean): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'messages', chatId, 'messages', messageId), {
        isPinned: pin
      });
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Forward a Direct Message to another chat
 */
export async function forwardDirectMessage(
  msg: DirectMessage,
  targetChatId: string,
  sender: UserProfile,
  recipientId: string
): Promise<void> {
  await sendDirectMessage(
    targetChatId,
    sender,
    recipientId,
    `[Forwarded]: ${msg.text}`,
    null,
    msg.attachmentUrl ? { url: msg.attachmentUrl, type: msg.attachmentType || 'file', name: msg.attachmentName || 'file' } : null
  );
}

/**
 * Delete message for me (soft delete)
 */
export async function deleteMessageForMe(chatId: string, messageId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, 'messages', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        deletedFor: arrayUnion(userId)
      });
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Delete message for everyone (hard delete)
 */
export async function deleteDirectMessage(messageId: string, chatId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'messages', chatId, 'messages', messageId));

      const chatRef = doc(db, CONVERSATIONS_COLLECTION, chatId);
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const chatData = chatSnap.data() as DirectChat;
        const messagesRef = collection(db, 'messages', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const prevMsg = qSnap.docs[0].data() as DirectMessage;
          await updateDoc(chatRef, {
            lastMessage: {
              text: prevMsg.text,
              senderId: prevMsg.senderId,
              createdAt: prevMsg.createdAt
            }
          });
        } else {
          await updateDoc(chatRef, { lastMessage: null });
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Mark a chat's unread count to 0 and update peer message status to 'seen'
 */
export async function markChatAsRead(chatId: string, userId: string, otherUserId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const chatRef = doc(db, CONVERSATIONS_COLLECTION, chatId);
      await updateDoc(chatRef, {
        [`unreadCount.${userId}`]: 0
      });

      const messagesRef = collection(db, 'messages', chatId, 'messages');
      const q = query(
        messagesRef,
        where('senderId', '==', otherUserId),
        where('status', '!=', 'seen')
      );

      const qSnapshot = await getDocs(q);
      qSnapshot.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'messages', chatId, 'messages', docSnap.id), { status: 'seen' });
      });
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Toggle pin conversation
 */
export async function pinChat(chatId: string, userId: string, pin: boolean): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, CONVERSATIONS_COLLECTION, chatId), {
        pinnedBy: pin ? arrayUnion(userId) : arrayRemove(userId)
      });
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Toggle archive conversation
 */
export async function archiveChat(chatId: string, userId: string, archive: boolean): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, CONVERSATIONS_COLLECTION, chatId), {
        archivedBy: archive ? arrayUnion(userId) : arrayRemove(userId)
      });
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Delete direct chat conversation (soft delete)
 */
export async function deleteChat(chatId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, CONVERSATIONS_COLLECTION, chatId), {
        deletedBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Message reactions updates
 */
export async function addMessageReaction(
  chatId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, 'messages', chatId, 'messages', messageId);
      const msgSnap = await getDoc(msgRef);

      if (msgSnap.exists()) {
        const msgData = msgSnap.data() as DirectMessage;
        const currentReactions = msgData.reactions || {};
        const updatedReactions: Record<string, string[]> = {};
        let toggledOff = false;

        Object.entries(currentReactions).forEach(([existingEmoji, uids]) => {
          const filteredUids = uids.filter(id => id !== userId);
          if (existingEmoji === emoji && uids.includes(userId)) {
            toggledOff = true;
          }
          if (filteredUids.length > 0) {
            updatedReactions[existingEmoji] = filteredUids;
          }
        });

        if (!toggledOff) {
          if (!updatedReactions[emoji]) {
            updatedReactions[emoji] = [];
          }
          updatedReactions[emoji].push(userId);

          // Create Notification for reaction
          if (msgData.senderId !== userId) {
            await createNotification({
              recipientId: msgData.senderId,
              senderId: userId,
              senderName: 'Someone',
              senderPhotoURL: '',
              type: 'reaction',
              message: `reacted ${emoji} to your message: "${msgData.text}"`,
              link: `/messages/${chatId}`
            });
          }
        }

        await updateDoc(msgRef, { reactions: updatedReactions });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Listen to typing indicators
 */
export function listenToTyping(chatId: string, callback: (typingUsers: string[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    return onSnapshot(doc(db, TYPING_COLLECTION, chatId), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().typingUsers || []);
      } else {
        callback([]);
      }
    });
  }
  callback([]);
  return () => {};
}

export async function setTypingState(chatId: string, userId: string, isTyping: boolean): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, TYPING_COLLECTION, chatId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const typingUsers = docSnap.data().typingUsers || [];
        const nextUsers = isTyping
          ? Array.from(new Set([...typingUsers, userId]))
          : typingUsers.filter((id: string) => id !== userId);
        await updateDoc(docRef, { typingUsers: nextUsers });
      } else {
        await setDoc(docRef, { typingUsers: isTyping ? [userId] : [] });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Get single user profile
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
    } catch (error) {
      console.error(error);
    }
  }
  return null;
}

/**
 * Get direct chat conversation document by chatId
 */
export async function getChat(chatId: string): Promise<DirectChat | null> {
  if (isFirebaseConfigured && db) {
    try {
      const chatRef = doc(db, CONVERSATIONS_COLLECTION, chatId);
      const snap = await getDoc(chatRef);
      if (snap.exists()) {
        return snap.data() as DirectChat;
      }
    } catch (error) {
      console.error('[OpenComm] Error fetching chat:', error);
    }
  }
  // Mock mode fallback
  const chats: DirectChat[] = JSON.parse(localStorage.getItem('opencomm_mock_direct_chats') || '[]');
  return chats.find(c => c.chatId === chatId) || null;
}
