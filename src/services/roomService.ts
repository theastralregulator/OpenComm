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
import { db, isFirebaseConfigured } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { Room, RoomMember, RoomMessage, RoomInvite, UserProfile, RoomType, RoomVisibility, RoomRole, MemberStatus } from '../types';

const ROOMS_COLLECTION = 'rooms';
const INVITES_COLLECTION = 'roomInvites';

// Mock Data Keys
const MOCK_ROOMS_KEY = 'opencomm_mock_rooms';
const MOCK_MEMBERS_KEY = 'opencomm_mock_room_members';
const MOCK_MESSAGES_KEY = 'opencomm_mock_room_messages';
const MOCK_INVITES_KEY = 'opencomm_mock_room_invites';

// Initial Mock Rooms
const INITIAL_MOCK_ROOMS: Room[] = [
  {
    roomId: 'general-lobby',
    name: 'OpenComm Central Lobby',
    description: 'The general gathering spot for all platform members. Talk about design, social structures, and tech.',
    category: 'Technology',
    roomType: 'text',
    visibility: 'public',
    roomImage: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=400&q=80',
    maxMembers: null,
    createdBy: 'system-admin',
    creatorName: 'OpenComm Creator',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    membersCount: 3,
    pinnedMessages: []
  },
  {
    roomId: 'book-lounge',
    name: 'The Editorial Book Club',
    description: 'Discussing weekly essays, literature, design theory, and minimalist philosophies.',
    category: 'Books',
    roomType: 'text',
    visibility: 'public',
    roomImage: 'https://images.unsplash.com/photo-1513001900722-370f803f498d?auto=format&fit=crop&w=400&q=80',
    maxMembers: 20,
    createdBy: 'system-admin',
    creatorName: 'OpenComm Creator',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    membersCount: 2,
    pinnedMessages: []
  },
  {
    roomId: 'tech-audio',
    name: 'Live AI & Future Tech Talk',
    description: 'Unstructured audio room discussing LLMs, neural chips, and the next decade of interfaces.',
    category: 'AI',
    roomType: 'audio',
    visibility: 'public',
    roomImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    maxMembers: 50,
    createdBy: 'system-admin',
    creatorName: 'OpenComm Creator',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    membersCount: 4,
    pinnedMessages: []
  },
  {
    roomId: 'private-dev',
    name: 'Operators Dark Web Nest',
    description: 'Private nest for backend diagnostics and code reviews. Require Owner approval.',
    category: 'Programming',
    roomType: 'text',
    visibility: 'private',
    roomImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
    maxMembers: 10,
    createdBy: 'mock-uid-admin',
    creatorName: 'OpenComm Admin',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    membersCount: 1,
    pinnedMessages: []
  }
];

// Initial Mock Members
const INITIAL_MOCK_MEMBERS: RoomMember[] = [
  // General Lobby
  {
    memberId: 'general-lobby_system-admin',
    roomId: 'general-lobby',
    userId: 'system-admin',
    username: 'creator',
    displayName: 'OpenComm Creator',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator',
    role: 'owner',
    status: 'approved',
    joinedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    memberId: 'general-lobby_clara_o',
    roomId: 'general-lobby',
    userId: 'mock-user-1',
    username: 'clara_o',
    displayName: 'Clara Oswald',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=clara',
    role: 'moderator',
    status: 'approved',
    joinedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    memberId: 'general-lobby_watson_md',
    roomId: 'general-lobby',
    userId: 'mock-user-2',
    username: 'watson_md',
    displayName: 'Dr. John Watson',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    role: 'member',
    status: 'approved',
    joinedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  // Book Lounge
  {
    memberId: 'book-lounge_system-admin',
    roomId: 'book-lounge',
    userId: 'system-admin',
    username: 'creator',
    displayName: 'OpenComm Creator',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator',
    role: 'owner',
    status: 'approved',
    joinedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    memberId: 'book-lounge_clara_o',
    roomId: 'book-lounge',
    userId: 'mock-user-1',
    username: 'clara_o',
    displayName: 'Clara Oswald',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=clara',
    role: 'member',
    status: 'approved',
    joinedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  // Live AI Audio Room
  {
    memberId: 'tech-audio_system-admin',
    roomId: 'tech-audio',
    userId: 'system-admin',
    username: 'creator',
    displayName: 'OpenComm Creator',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator',
    role: 'owner',
    status: 'approved',
    joinedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    audioRole: 'host',
    isMuted: false,
    isSpeaking: true,
    isMicrophoneOn: true
  },
  {
    memberId: 'tech-audio_clara_o',
    roomId: 'tech-audio',
    userId: 'mock-user-1',
    username: 'clara_o',
    displayName: 'Clara Oswald',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=clara',
    role: 'moderator',
    status: 'approved',
    joinedAt: new Date(Date.now() - 3600000 * 11).toISOString(),
    audioRole: 'speaker',
    isMuted: false,
    isSpeaking: false,
    isMicrophoneOn: true
  },
  {
    memberId: 'tech-audio_watson_md',
    roomId: 'tech-audio',
    userId: 'mock-user-2',
    username: 'watson_md',
    displayName: 'Dr. John Watson',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    role: 'member',
    status: 'approved',
    joinedAt: new Date(Date.now() - 3600000 * 11).toISOString(),
    audioRole: 'listener',
    isMuted: true,
    isSpeaking: false,
    isMicrophoneOn: false
  },
  // Private Dev Nest
  {
    memberId: 'private-dev_mock-uid-admin',
    roomId: 'private-dev',
    userId: 'mock-uid-admin',
    username: 'admin',
    displayName: 'OpenComm Admin',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    role: 'owner',
    status: 'approved',
    joinedAt: new Date(Date.now() - 86400000 * 10).toISOString()
  }
];

// Initial Mock Messages
const INITIAL_MOCK_MESSAGES: RoomMessage[] = [
  {
    messageId: 'msg-1',
    roomId: 'general-lobby',
    userId: 'system-admin',
    username: 'creator',
    displayName: 'OpenComm Creator',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator',
    text: 'Welcome to OpenComm! This is our flagship community text room.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    reactions: { '👋': ['mock-user-1', 'mock-user-2'] },
    isPinned: true
  },
  {
    messageId: 'msg-2',
    roomId: 'general-lobby',
    userId: 'mock-user-1',
    username: 'clara_o',
    displayName: 'Clara Oswald',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=clara',
    text: 'Stoked to be here. The minimal, text-focused aesthetic is incredibly therapeutic.',
    createdAt: new Date(Date.now() - 3600000 * 23).toISOString(),
    reactions: { '❤️': ['system-admin'] }
  },
  {
    messageId: 'msg-3',
    roomId: 'general-lobby',
    userId: 'mock-user-2',
    username: 'watson_md',
    displayName: 'Dr. John Watson',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
    text: 'Is there a limit to how many users can join this lobby?',
    createdAt: new Date(Date.now() - 3600000 * 22).toISOString(),
    replyToId: 'msg-1',
    replyToUser: 'OpenComm Creator',
    replyToText: 'Welcome to OpenComm! This is our flagship community text room.'
  }
];

// LocalStorage helpers
function getLocalRooms(): Room[] {
  const stored = localStorage.getItem(MOCK_ROOMS_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_ROOMS_KEY, JSON.stringify(INITIAL_MOCK_ROOMS));
    return INITIAL_MOCK_ROOMS;
  }
  try { return JSON.parse(stored); } catch { return INITIAL_MOCK_ROOMS; }
}

function saveLocalRooms(rooms: Room[]) {
  localStorage.setItem(MOCK_ROOMS_KEY, JSON.stringify(rooms));
}

function getLocalMembers(): RoomMember[] {
  const stored = localStorage.getItem(MOCK_MEMBERS_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_MEMBERS_KEY, JSON.stringify(INITIAL_MOCK_MEMBERS));
    return INITIAL_MOCK_MEMBERS;
  }
  try { return JSON.parse(stored); } catch { return INITIAL_MOCK_MEMBERS; }
}

function saveLocalMembers(members: RoomMember[]) {
  localStorage.setItem(MOCK_MEMBERS_KEY, JSON.stringify(members));
}

function getLocalMessages(): RoomMessage[] {
  const stored = localStorage.getItem(MOCK_MESSAGES_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_MESSAGES_KEY, JSON.stringify(INITIAL_MOCK_MESSAGES));
    return INITIAL_MOCK_MESSAGES;
  }
  try { return JSON.parse(stored); } catch { return INITIAL_MOCK_MESSAGES; }
}

function saveLocalMessages(messages: RoomMessage[]) {
  localStorage.setItem(MOCK_MESSAGES_KEY, JSON.stringify(messages));
}

function getLocalInvites(): RoomInvite[] {
  const stored = localStorage.getItem(MOCK_INVITES_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_INVITES_KEY, JSON.stringify([]));
    return [];
  }
  try { return JSON.parse(stored); } catch { return []; }
}

function saveLocalInvites(invites: RoomInvite[]) {
  localStorage.setItem(MOCK_INVITES_KEY, JSON.stringify(invites));
}

// Global active sub listeners for mock reactivity
type SubscriptionCallback = (data: any) => void;
const activeMessageSubscribers: Record<string, Set<SubscriptionCallback>> = {};
const activeMemberSubscribers: Record<string, Set<SubscriptionCallback>> = {};
const activeRoomsSubscribers = new Set<SubscriptionCallback>();

function notifyMessageSubscribers(roomId: string) {
  const list = activeMessageSubscribers[roomId];
  if (list) {
    const msgs = getLocalMessages().filter(m => m.roomId === roomId);
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    list.forEach(cb => cb(msgs));
  }
}

function notifyMemberSubscribers(roomId: string) {
  const list = activeMemberSubscribers[roomId];
  if (list) {
    const mems = getLocalMembers().filter(m => m.roomId === roomId);
    list.forEach(cb => cb(mems));
  }
}

function notifyRoomsSubscribers() {
  const rooms = getLocalRooms();
  activeRoomsSubscribers.forEach(cb => cb(rooms));
}


/**
 * CREATE ROOM
 */
export async function createRoom(
  roomData: Omit<Room, 'roomId' | 'createdAt' | 'updatedAt' | 'membersCount' | 'pinnedMessages'>,
  userProfile: UserProfile
): Promise<Room> {
  const roomId = roomData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `room_${Date.now()}`;
  
  // Ensure uniqueness or append random characters
  const finalRoomId = `${roomId}-${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();

  // Pick a nice fallback category image
  const defaultImages: Record<string, string> = {
    Technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
    Programming: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80',
    Gaming: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    AI: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    Music: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    Books: 'https://images.unsplash.com/photo-1513001900722-370f803f498d?auto=format&fit=crop&w=400&q=80'
  };
  const roomImage = roomData.roomImage || defaultImages[roomData.category] || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80';

  const newRoom: Room = {
    ...roomData,
    roomId: finalRoomId,
    roomImage,
    createdAt: timestamp,
    updatedAt: timestamp,
    membersCount: 1,
    pinnedMessages: []
  };

  const initialMember: RoomMember = {
    memberId: `${finalRoomId}_${userProfile.uid}`,
    roomId: finalRoomId,
    userId: userProfile.uid,
    username: userProfile.username || 'user',
    displayName: userProfile.displayName || userProfile.fullName || 'User',
    photoURL: userProfile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.displayName || 'OC')}`,
    role: 'owner',
    status: 'approved',
    joinedAt: timestamp,
    audioRole: roomData.roomType === 'audio' ? 'host' : undefined,
    isMuted: roomData.roomType === 'audio' ? false : undefined,
    isMicrophoneOn: roomData.roomType === 'audio' ? true : undefined,
    isSpeaking: false
  };

  if (isFirebaseConfigured && db) {
    try {
      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db!, ROOMS_COLLECTION, finalRoomId);
        const memberRef = doc(db!, `${ROOMS_COLLECTION}/${finalRoomId}/members`, userProfile.uid);
        
        transaction.set(roomRef, newRoom);
        transaction.set(memberRef, initialMember);
      });
      return newRoom;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${finalRoomId}`);
    }
  } else {
    // Mock Mode
    const rooms = getLocalRooms();
    rooms.unshift(newRoom);
    saveLocalRooms(rooms);

    const members = getLocalMembers();
    members.push(initialMember);
    saveLocalMembers(members);

    notifyRoomsSubscribers();
    return newRoom;
  }
}

/**
 * EDIT ROOM DETAILS
 */
export async function updateRoom(
  roomId: string,
  updates: Partial<Omit<Room, 'roomId' | 'createdBy' | 'createdAt' | 'membersCount' | 'pinnedMessages'>>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const rawUpdates = { ...updates, updatedAt: timestamp };

  if (isFirebaseConfigured && db) {
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await updateDoc(roomRef, rawUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  } else {
    const rooms = getLocalRooms();
    const idx = rooms.findIndex(r => r.roomId === roomId);
    if (idx !== -1) {
      rooms[idx] = { ...rooms[idx], ...rawUpdates };
      saveLocalRooms(rooms);
      notifyRoomsSubscribers();
    }
  }
}

/**
 * DELETE ROOM
 */
export async function deleteRoom(roomId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      // Best effort deleting collections. Client-side SDK cannot recursively delete nested subcollections
      // easily without Cloud Functions, so we do it by deleting the top level room document.
      // In firestore, deleting room won't delete subcollections but it makes them orphaned.
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await deleteDoc(roomRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rooms/${roomId}`);
    }
  } else {
    const rooms = getLocalRooms();
    saveLocalRooms(rooms.filter(r => r.roomId !== roomId));

    const members = getLocalMembers();
    saveLocalMembers(members.filter(m => m.roomId !== roomId));

    const messages = getLocalMessages();
    saveLocalMessages(messages.filter(m => m.roomId !== roomId));

    notifyRoomsSubscribers();
    notifyMemberSubscribers(roomId);
    notifyMessageSubscribers(roomId);
  }
}

/**
 * FETCH ALL ROOMS (supports filters, search)
 */
export async function getRooms(filters?: {
  search?: string;
  category?: string;
}): Promise<Room[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, ROOMS_COLLECTION), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      let rooms: Room[] = [];
      snap.forEach((d) => {
        rooms.push(d.data() as Room);
      });

      // Filter on client to support advanced combination searches without compound indexes
      if (filters?.category) {
        rooms = rooms.filter(r => r.category.toLowerCase() === filters.category!.toLowerCase());
      }
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        rooms = rooms.filter(r => 
          r.name.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          r.category.toLowerCase().includes(s) ||
          r.creatorName.toLowerCase().includes(s)
        );
      }
      return rooms;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, ROOMS_COLLECTION);
    }
  } else {
    let rooms = getLocalRooms();
    if (filters?.category) {
      rooms = rooms.filter(r => r.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      rooms = rooms.filter(r => 
        r.name.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s) ||
        r.category.toLowerCase().includes(s) ||
        r.creatorName.toLowerCase().includes(s)
      );
    }
    return rooms;
  }
}

/**
 * FETCH SINGLE ROOM
 */
export async function getRoom(roomId: string): Promise<Room | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
      return snap.exists() ? (snap.data() as Room) : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`);
    }
  } else {
    const rooms = getLocalRooms();
    return rooms.find(r => r.roomId === roomId) || null;
  }
}

/**
 * JOIN ROOM (or create approval request)
 */
export async function joinRoom(
  roomId: string,
  userProfile: UserProfile,
  requiresApproval: boolean
): Promise<RoomMember> {
  const timestamp = new Date().toISOString();
  const status: MemberStatus = requiresApproval ? 'pending' : 'approved';

  const newMember: RoomMember = {
    memberId: `${roomId}_${userProfile.uid}`,
    roomId,
    userId: userProfile.uid,
    username: userProfile.username || 'user',
    displayName: userProfile.displayName || userProfile.fullName || 'User',
    photoURL: userProfile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.displayName || 'OC')}`,
    role: 'member',
    status,
    joinedAt: timestamp,
    audioRole: 'listener',
    isMuted: true,
    isSpeaking: false,
    isMicrophoneOn: false
  };

  if (isFirebaseConfigured && db) {
    try {
      const memberRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/members`, userProfile.uid);
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);

      await runTransaction(db, async (transaction) => {
        transaction.set(memberRef, newMember);
        if (status === 'approved') {
          transaction.update(roomRef, { membersCount: increment(1) });
        }
      });
      return newMember;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}/members/${userProfile.uid}`);
    }
  } else {
    const members = getLocalMembers();
    // Prevent duplicate entries
    const existingIdx = members.findIndex(m => m.roomId === roomId && m.userId === userProfile.uid);
    if (existingIdx !== -1) {
      return members[existingIdx];
    }

    members.push(newMember);
    saveLocalMembers(members);

    if (status === 'approved') {
      const rooms = getLocalRooms();
      const rIdx = rooms.findIndex(r => r.roomId === roomId);
      if (rIdx !== -1) {
        rooms[rIdx].membersCount = (rooms[rIdx].membersCount || 0) + 1;
        saveLocalRooms(rooms);
        notifyRoomsSubscribers();
      }
    }

    notifyMemberSubscribers(roomId);
    return newMember;
  }
}

/**
 * LEAVE ROOM
 */
export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const memberRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/members`, userId);
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);

      const memberSnap = await getDoc(memberRef);
      if (!memberSnap.exists()) return;
      const memberData = memberSnap.data() as RoomMember;

      await runTransaction(db, async (transaction) => {
        transaction.delete(memberRef);
        if (memberData.status === 'approved') {
          transaction.update(roomRef, { membersCount: increment(-1) });
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rooms/${roomId}/members/${userId}`);
    }
  } else {
    const members = getLocalMembers();
    const index = members.findIndex(m => m.roomId === roomId && m.userId === userId);
    if (index === -1) return;

    const wasApproved = members[index].status === 'approved';
    members.splice(index, 1);
    saveLocalMembers(members);

    if (wasApproved) {
      const rooms = getLocalRooms();
      const rIdx = rooms.findIndex(r => r.roomId === roomId);
      if (rIdx !== -1) {
        rooms[rIdx].membersCount = Math.max(0, (rooms[rIdx].membersCount || 1) - 1);
        saveLocalRooms(rooms);
        notifyRoomsSubscribers();
      }
    }

    notifyMemberSubscribers(roomId);
  }
}

/**
 * LISTEN REALTIME TO ROOM MEMBERS
 */
export function subscribeRoomMembers(roomId: string, callback: (members: RoomMember[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, `${ROOMS_COLLECTION}/${roomId}/members`));
    return onSnapshot(q, (snap) => {
      const list: RoomMember[] = [];
      snap.forEach((d) => {
        list.push(d.data() as RoomMember);
      });
      callback(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/members`);
    });
  } else {
    if (!activeMemberSubscribers[roomId]) {
      activeMemberSubscribers[roomId] = new Set();
    }
    activeMemberSubscribers[roomId].add(callback);
    
    // Immediate push
    const current = getLocalMembers().filter(m => m.roomId === roomId);
    callback(current);

    return () => {
      activeMemberSubscribers[roomId]?.delete(callback);
    };
  }
}

/**
 * LISTEN REALTIME TO MESSAGES
 */
export function subscribeRoomMessages(roomId: string, callback: (messages: RoomMessage[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, `${ROOMS_COLLECTION}/${roomId}/messages`),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      const list: RoomMessage[] = [];
      snap.forEach((d) => {
        list.push(d.data() as RoomMessage);
      });
      callback(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/messages`);
    });
  } else {
    if (!activeMessageSubscribers[roomId]) {
      activeMessageSubscribers[roomId] = new Set();
    }
    activeMessageSubscribers[roomId].add(callback);

    // Immediate push
    const current = getLocalMessages().filter(m => m.roomId === roomId);
    current.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    callback(current);

    return () => {
      activeMessageSubscribers[roomId]?.delete(callback);
    };
  }
}

/**
 * SUBSCRIBE REALTIME TO ROOMS LIST (to support active badges updating instantly)
 */
export function subscribeRooms(callback: (rooms: Room[]) => void): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(collection(db, ROOMS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list: Room[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Room);
      });
      callback(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, ROOMS_COLLECTION);
    });
  } else {
    activeRoomsSubscribers.add(callback);
    callback(getLocalRooms());
    return () => {
      activeRoomsSubscribers.delete(callback);
    };
  }
}

/**
 * SEND REALTIME MESSAGE
 */
export async function sendRoomMessage(
  roomId: string,
  userProfile: UserProfile,
  text: string,
  replyDetails?: { replyToId: string; replyToUser: string; replyToText: string }
): Promise<RoomMessage> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const newMessage: RoomMessage = {
    messageId,
    roomId,
    userId: userProfile.uid,
    username: userProfile.username || 'user',
    displayName: userProfile.displayName || userProfile.fullName || 'User',
    photoURL: userProfile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.displayName || 'OC')}`,
    text,
    createdAt: timestamp,
    reactions: {},
    isPinned: false,
    isReported: false,
    reportedBy: [],
    ...replyDetails
  };

  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/messages`, messageId);
      await setDoc(msgRef, newMessage);
      return newMessage;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/messages/${messageId}`);
    }
  } else {
    const messages = getLocalMessages();
    messages.push(newMessage);
    saveLocalMessages(messages);
    notifyMessageSubscribers(roomId);
    return newMessage;
  }
}

/**
 * DELETE MESSAGE
 */
export async function deleteRoomMessage(roomId: string, messageId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/messages`, messageId);
      await deleteDoc(msgRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rooms/${roomId}/messages/${messageId}`);
    }
  } else {
    const messages = getLocalMessages();
    saveLocalMessages(messages.filter(m => m.messageId !== messageId));
    notifyMessageSubscribers(roomId);
  }
}

/**
 * REPORT MESSAGE
 */
export async function reportRoomMessage(roomId: string, messageId: string, reporterId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/messages`, messageId);
      await updateDoc(msgRef, {
        isReported: true,
        reportedBy: arrayUnion(reporterId)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/messages/${messageId}`);
    }
  } else {
    const messages = getLocalMessages();
    const idx = messages.findIndex(m => m.messageId === messageId);
    if (idx !== -1) {
      const reportedBy = messages[idx].reportedBy || [];
      if (!reportedBy.includes(reporterId)) {
        reportedBy.push(reporterId);
      }
      messages[idx] = {
        ...messages[idx],
        isReported: true,
        reportedBy
      };
      saveLocalMessages(messages);
      notifyMessageSubscribers(roomId);
    }
  }
}

/**
 * TOGGLE PIN MESSAGE
 */
export async function togglePinRoomMessage(roomId: string, messageId: string, isPinned: boolean): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/messages`, messageId);
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);

      await runTransaction(db, async (transaction) => {
        transaction.update(msgRef, { isPinned });
        transaction.update(roomRef, {
          pinnedMessages: isPinned ? arrayUnion(messageId) : arrayRemove(messageId)
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/messages/${messageId}`);
    }
  } else {
    const messages = getLocalMessages();
    const mIdx = messages.findIndex(m => m.messageId === messageId);
    if (mIdx !== -1) {
      messages[mIdx] = { ...messages[mIdx], isPinned };
      saveLocalMessages(messages);
    }

    const rooms = getLocalRooms();
    const rIdx = rooms.findIndex(r => r.roomId === roomId);
    if (rIdx !== -1) {
      const pinned = rooms[rIdx].pinnedMessages || [];
      if (isPinned) {
        if (!pinned.includes(messageId)) pinned.push(messageId);
      } else {
        const pIdx = pinned.indexOf(messageId);
        if (pIdx !== -1) pinned.splice(pIdx, 1);
      }
      rooms[rIdx].pinnedMessages = pinned;
      saveLocalRooms(rooms);
      notifyRoomsSubscribers();
    }

    notifyMessageSubscribers(roomId);
  }
}

/**
 * REACT TO MESSAGE
 */
export async function reactToRoomMessage(roomId: string, messageId: string, userId: string, emoji: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const msgRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/messages`, messageId);
      // Retrieve first to perform reaction toggle
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists()) return;
      const reactions = (msgSnap.data() as RoomMessage).reactions || {};

      const users = reactions[emoji] || [];
      if (users.includes(userId)) {
        reactions[emoji] = users.filter(uid => uid !== userId);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji] = [...users, userId];
      }

      await updateDoc(msgRef, { reactions });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/messages/${messageId}`);
    }
  } else {
    const messages = getLocalMessages();
    const idx = messages.findIndex(m => m.messageId === messageId);
    if (idx !== -1) {
      const reactions = messages[idx].reactions || {};
      const users = reactions[emoji] || [];
      if (users.includes(userId)) {
        reactions[emoji] = users.filter(uid => uid !== userId);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji] = [...users, userId];
      }
      messages[idx] = { ...messages[idx], reactions };
      saveLocalMessages(messages);
      notifyMessageSubscribers(roomId);
    }
  }
}

/**
 * APPROVE / REJECT PRIVATE ROOM JOIN REQUESTS
 */
export async function updateRoomMemberStatus(roomId: string, userId: string, status: MemberStatus): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const memberRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/members`, userId);
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);

      await runTransaction(db, async (transaction) => {
        if (status === 'approved') {
          transaction.update(memberRef, { status: 'approved' });
          transaction.update(roomRef, { membersCount: increment(1) });
        } else {
          // Reject is simply a deletion of the pending document
          transaction.delete(memberRef);
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/members/${userId}`);
    }
  } else {
    const members = getLocalMembers();
    const index = members.findIndex(m => m.roomId === roomId && m.userId === userId);
    if (index === -1) return;

    if (status === 'approved') {
      members[index].status = 'approved';
      saveLocalMembers(members);

      const rooms = getLocalRooms();
      const rIdx = rooms.findIndex(r => r.roomId === roomId);
      if (rIdx !== -1) {
        rooms[rIdx].membersCount = (rooms[rIdx].membersCount || 0) + 1;
        saveLocalRooms(rooms);
        notifyRoomsSubscribers();
      }
    } else {
      members.splice(index, 1);
      saveLocalMembers(members);
    }

    notifyMemberSubscribers(roomId);
  }
}

/**
 * KICK MEMBER
 */
export async function removeRoomMember(roomId: string, userId: string): Promise<void> {
  await leaveRoom(roomId, userId);
}

/**
 * PROMOTE / DEMOTE / TRANSFER OWNERSHIP
 */
export async function updateRoomMemberRole(roomId: string, userId: string, newRole: RoomRole): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const memberRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/members`, userId);
      await updateDoc(memberRef, { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/members/${userId}`);
    }
  } else {
    const members = getLocalMembers();
    const index = members.findIndex(m => m.roomId === roomId && m.userId === userId);
    if (index !== -1) {
      // If transferring ownership, demote previous owner to admin/moderator/member
      if (newRole === 'owner') {
        const prevOwnerIdx = members.findIndex(m => m.roomId === roomId && m.role === 'owner');
        if (prevOwnerIdx !== -1) {
          members[prevOwnerIdx].role = 'member';
        }
      }
      members[index].role = newRole;
      saveLocalMembers(members);
      notifyMemberSubscribers(roomId);
    }
  }
}

/**
 * UPDATE AUDIO SPEAKER STATE (Host, Speaker, Listener)
 */
export async function updateRoomMemberAudioState(
  roomId: string,
  userId: string,
  updates: {
    audioRole?: 'host' | 'speaker' | 'listener';
    isMuted?: boolean;
    isMicrophoneOn?: boolean;
    isSpeaking?: boolean;
  }
): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const memberRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/members`, userId);
      await updateDoc(memberRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/members/${userId}`);
    }
  } else {
    const members = getLocalMembers();
    const index = members.findIndex(m => m.roomId === roomId && m.userId === userId);
    if (index !== -1) {
      members[index] = { ...members[index], ...updates };
      saveLocalMembers(members);
      notifyMemberSubscribers(roomId);
    }
  }
}

/**
 * SEND INVITE TO USER FOR PRIVATE ROOM
 */
export async function sendRoomInvite(
  roomId: string,
  roomName: string,
  inviterId: string,
  inviterName: string,
  inviteeId: string
): Promise<RoomInvite> {
  const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const newInvite: RoomInvite = {
    inviteId,
    roomId,
    roomName,
    inviterId,
    inviterName,
    inviteeId,
    createdAt: timestamp,
    status: 'pending'
  };

  if (isFirebaseConfigured && db) {
    try {
      const inviteRef = doc(db, INVITES_COLLECTION, inviteId);
      await setDoc(inviteRef, newInvite);
      return newInvite;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `roomInvites/${inviteId}`);
    }
  } else {
    const invites = getLocalInvites();
    invites.push(newInvite);
    saveLocalInvites(invites);
    return newInvite;
  }
}

/**
 * FETCH PENDING INVITES FOR AUTH USER
 */
export async function getMyInvites(userId: string): Promise<RoomInvite[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, INVITES_COLLECTION),
        where('inviteeId', '==', userId),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      const list: RoomInvite[] = [];
      snap.forEach((d) => {
        list.push(d.data() as RoomInvite);
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, INVITES_COLLECTION);
    }
  } else {
    return getLocalInvites().filter(i => i.inviteeId === userId && i.status === 'pending');
  }
}

/**
 * RESPOND TO INVITE
 */
export async function respondToInvite(
  inviteId: string,
  status: 'accepted' | 'declined',
  userProfile: UserProfile
): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const inviteRef = doc(db, INVITES_COLLECTION, inviteId);
      const inviteSnap = await getDoc(inviteRef);
      if (!inviteSnap.exists()) return;
      const invite = inviteSnap.data() as RoomInvite;

      await runTransaction(db, async (transaction) => {
        transaction.update(inviteRef, { status });
        if (status === 'accepted') {
          const memberRef = doc(db!, `${ROOMS_COLLECTION}/${invite.roomId}/members`, userProfile.uid);
          const roomRef = doc(db!, ROOMS_COLLECTION, invite.roomId);

          const newMember: RoomMember = {
            memberId: `${invite.roomId}_${userProfile.uid}`,
            roomId: invite.roomId,
            userId: userProfile.uid,
            username: userProfile.username || 'user',
            displayName: userProfile.displayName || userProfile.fullName || 'User',
            photoURL: userProfile.photoURL || '',
            role: 'member',
            status: 'approved',
            joinedAt: new Date().toISOString()
          };

          transaction.set(memberRef, newMember);
          transaction.update(roomRef, { membersCount: increment(1) });
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `roomInvites/${inviteId}`);
    }
  } else {
    const invites = getLocalInvites();
    const idx = invites.findIndex(i => i.inviteId === inviteId);
    if (idx === -1) return;

    invites[idx].status = status;
    saveLocalInvites(invites);

    if (status === 'accepted') {
      const invite = invites[idx];
      const members = getLocalMembers();
      
      const newMember: RoomMember = {
        memberId: `${invite.roomId}_${userProfile.uid}`,
        roomId: invite.roomId,
        userId: userProfile.uid,
        username: userProfile.username || 'user',
        displayName: userProfile.displayName || userProfile.fullName || 'User',
        photoURL: userProfile.photoURL || '',
        role: 'member',
        status: 'approved',
        joinedAt: new Date().toISOString()
      };

      members.push(newMember);
      saveLocalMembers(members);

      const rooms = getLocalRooms();
      const rIdx = rooms.findIndex(r => r.roomId === invite.roomId);
      if (rIdx !== -1) {
        rooms[rIdx].membersCount = (rooms[rIdx].membersCount || 0) + 1;
        saveLocalRooms(rooms);
        notifyRoomsSubscribers();
      }
      notifyMemberSubscribers(invite.roomId);
    }
  }
}

/**
 * Create a Post in a specific Room
 */
export async function createRoomPost(
  roomId: string,
  postData: { caption: string; imageUrls?: string[]; aspectRatio?: string },
  userProfile: UserProfile
): Promise<any> {
  const postId = `rpost_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const newPost = {
    postId,
    roomId,
    userId: userProfile.uid,
    username: userProfile.username || 'user',
    displayName: userProfile.displayName || userProfile.fullName || 'User',
    profileImage: userProfile.photoURL || '',
    caption: postData.caption,
    imageUrls: postData.imageUrls || [],
    aspectRatio: postData.aspectRatio || 'original',
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
    isEdited: false,
    isPinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    likedBy: [],
    bookmarkedBy: [],
    sharedBy: []
  };

  if (isFirebaseConfigured && db) {
    try {
      const postRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts`, postId);
      await setDoc(postRef, newPost);
      return newPost;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/roomPosts/${postId}`);
    }
  } else {
    const localKey = `opencomm_mock_room_posts_${roomId}`;
    const posts = JSON.parse(localStorage.getItem(localKey) || '[]');
    posts.unshift(newPost);
    localStorage.setItem(localKey, JSON.stringify(posts));
    
    // Trigger any reactive updates in window
    window.dispatchEvent(new CustomEvent(`room-posts-updated-${roomId}`));
    return newPost;
  }
}

/**
 * Real-time subscription to Room Posts
 */
export function subscribeRoomPosts(
  roomId: string,
  callback: (posts: any[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts`),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push(d.data());
      });
      callback(list);
    }, (err) => {
      console.warn('Error subscribing room posts:', err);
    });
  } else {
    const handleUpdate = () => {
      const localKey = `opencomm_mock_room_posts_${roomId}`;
      const posts = JSON.parse(localStorage.getItem(localKey) || '[]');
      callback(posts);
    };

    window.addEventListener(`room-posts-updated-${roomId}`, handleUpdate);
    // Immediate call
    handleUpdate();

    return () => {
      window.removeEventListener(`room-posts-updated-${roomId}`, handleUpdate);
    };
  }
}

/**
 * Delete a Post in a specific Room
 */
export async function deleteRoomPost(roomId: string, postId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const postRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts`, postId);
      await deleteDoc(postRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rooms/${roomId}/roomPosts/${postId}`);
    }
  } else {
    const localKey = `opencomm_mock_room_posts_${roomId}`;
    const posts = JSON.parse(localStorage.getItem(localKey) || '[]');
    const updated = posts.filter((p: any) => p.postId !== postId);
    localStorage.setItem(localKey, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(`room-posts-updated-${roomId}`));
  }
}

/**
 * Pin / Unpin a Post in a specific Room
 */
export async function pinRoomPost(roomId: string, postId: string, isPinned: boolean): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const postRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts`, postId);
      await updateDoc(postRef, { isPinned });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/roomPosts/${postId}`);
    }
  } else {
    const localKey = `opencomm_mock_room_posts_${roomId}`;
    const posts = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = posts.findIndex((p: any) => p.postId === postId);
    if (idx > -1) {
      posts[idx].isPinned = isPinned;
      localStorage.setItem(localKey, JSON.stringify(posts));
      window.dispatchEvent(new CustomEvent(`room-posts-updated-${roomId}`));
    }
  }
}

/**
 * Report a Post in a specific Room
 */
export async function reportRoomPost(roomId: string, postId: string, reporterId: string, reason: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const reportId = `report_${Date.now()}`;
      const reportRef = doc(db, `roomReports`, reportId);
      await setDoc(reportRef, {
        reportId,
        roomId,
        postId,
        reporterId,
        reason,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `roomReports/${postId}`);
    }
  } else {
    const reports = JSON.parse(localStorage.getItem('opencomm_mock_room_reports') || '[]');
    reports.push({ roomId, postId, reporterId, reason, createdAt: new Date().toISOString() });
    localStorage.setItem('opencomm_mock_room_reports', JSON.stringify(reports));
  }
}

/**
 * Toggle Like on Room Post
 */
export async function toggleLikeRoomPost(roomId: string, postId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const postRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts`, postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        const likedBy = postData.likedBy || [];
        const isLiked = likedBy.includes(userId);
        
        await updateDoc(postRef, {
          likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
          likesCount: increment(isLiked ? -1 : 1)
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/roomPosts/${postId}`);
    }
  } else {
    const localKey = `opencomm_mock_room_posts_${roomId}`;
    const posts = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = posts.findIndex((p: any) => p.postId === postId);
    if (idx > -1) {
      const likedBy = posts[idx].likedBy || [];
      const userIdx = likedBy.indexOf(userId);
      if (userIdx > -1) {
        likedBy.splice(userIdx, 1);
        posts[idx].likesCount = Math.max(0, (posts[idx].likesCount || 1) - 1);
      } else {
        likedBy.push(userId);
        posts[idx].likesCount = (posts[idx].likesCount || 0) + 1;
      }
      posts[idx].likedBy = likedBy;
      localStorage.setItem(localKey, JSON.stringify(posts));
      window.dispatchEvent(new CustomEvent(`room-posts-updated-${roomId}`));
    }
  }
}

/**
 * Toggle Bookmark (Save) on Room Post
 */
export async function toggleBookmarkRoomPost(roomId: string, postId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const postRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts`, postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        const bookmarkedBy = postData.bookmarkedBy || [];
        const isSaved = bookmarkedBy.includes(userId);

        await updateDoc(postRef, {
          bookmarkedBy: isSaved ? arrayRemove(userId) : arrayUnion(userId)
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/roomPosts/${postId}`);
    }
  } else {
    const localKey = `opencomm_mock_room_posts_${roomId}`;
    const posts = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = posts.findIndex((p: any) => p.postId === postId);
    if (idx > -1) {
      const bookmarkedBy = posts[idx].bookmarkedBy || [];
      const userIdx = bookmarkedBy.indexOf(userId);
      if (userIdx > -1) {
        bookmarkedBy.splice(userIdx, 1);
      } else {
        bookmarkedBy.push(userId);
      }
      posts[idx].bookmarkedBy = bookmarkedBy;
      localStorage.setItem(localKey, JSON.stringify(posts));
      window.dispatchEvent(new CustomEvent(`room-posts-updated-${roomId}`));
    }
  }
}

/**
 * Create a Comment on Room Post
 */
export async function createRoomComment(
  roomId: string,
  postId: string,
  text: string,
  userProfile: UserProfile,
  parentId?: string
): Promise<any> {
  const commentId = `rcmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const newComment = {
    commentId,
    postId,
    roomId,
    userId: userProfile.uid,
    username: userProfile.username || 'user',
    displayName: userProfile.displayName || userProfile.fullName || 'User',
    profileImage: userProfile.photoURL || '',
    text,
    createdAt: timestamp,
    parentId: parentId || null,
    likesCount: 0,
    likedBy: []
  };

  if (isFirebaseConfigured && db) {
    try {
      const cmtRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts/${postId}/roomComments`, commentId);
      await setDoc(cmtRef, newComment);

      // Increment comments count on post
      const postRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts`, postId);
      await updateDoc(postRef, {
        commentsCount: increment(1)
      });

      return newComment;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${roomId}/roomPosts/${postId}/roomComments/${commentId}`);
    }
  } else {
    const localKey = `opencomm_mock_room_comments_${postId}`;
    const comments = JSON.parse(localStorage.getItem(localKey) || '[]');
    comments.push(newComment);
    localStorage.setItem(localKey, JSON.stringify(comments));

    // Increment count on post
    const postsKey = `opencomm_mock_room_posts_${roomId}`;
    const posts = JSON.parse(localStorage.getItem(postsKey) || '[]');
    const idx = posts.findIndex((p: any) => p.postId === postId);
    if (idx > -1) {
      posts[idx].commentsCount = (posts[idx].commentsCount || 0) + 1;
      localStorage.setItem(postsKey, JSON.stringify(posts));
      window.dispatchEvent(new CustomEvent(`room-posts-updated-${roomId}`));
    }

    window.dispatchEvent(new CustomEvent(`room-comments-updated-${postId}`));
    return newComment;
  }
}

/**
 * Subscribe Real-time to Room Comments
 */
export function subscribeRoomComments(
  roomId: string,
  postId: string,
  callback: (comments: any[]) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, `${ROOMS_COLLECTION}/${roomId}/roomPosts/${postId}/roomComments`),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push(d.data());
      });
      callback(list);
    }, (err) => {
      console.warn('Error subscribing room comments:', err);
    });
  } else {
    const handleUpdate = () => {
      const localKey = `opencomm_mock_room_comments_${postId}`;
      const comments = JSON.parse(localStorage.getItem(localKey) || '[]');
      callback(comments);
    };

    window.addEventListener(`room-comments-updated-${postId}`, handleUpdate);
    handleUpdate();

    return () => {
      window.removeEventListener(`room-comments-updated-${postId}`, handleUpdate);
    };
  }
}

/**
 * Moderation: Ban user from Room
 */
export async function banRoomMember(roomId: string, userId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await updateDoc(roomRef, {
        bannedUsers: arrayUnion(userId)
      });
      // Remove member record
      const memberRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/members`, userId);
      await deleteDoc(memberRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  } else {
    const rooms = getLocalRooms();
    const idx = rooms.findIndex(r => r.roomId === roomId);
    if (idx > -1) {
      const banned = rooms[idx].bannedUsers || [];
      if (!banned.includes(userId)) {
        banned.push(userId);
      }
      rooms[idx].bannedUsers = banned;
      rooms[idx].membersCount = Math.max(1, (rooms[idx].membersCount || 1) - 1);
      saveLocalRooms(rooms);
    }
    const members = getLocalMembers();
    const updatedMembers = members.filter(m => !(m.roomId === roomId && m.userId === userId));
    saveLocalMembers(updatedMembers);
    notifyRoomsSubscribers();
    notifyMemberSubscribers(roomId);
  }
}

/**
 * Moderation: Mute / Unmute user in Room
 */
export async function muteRoomMember(roomId: string, userId: string, isMuted: boolean): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const memberRef = doc(db, `${ROOMS_COLLECTION}/${roomId}/members`, userId);
      await updateDoc(memberRef, { isMuted });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}/members/${userId}`);
    }
  } else {
    const members = getLocalMembers();
    const idx = members.findIndex(m => m.roomId === roomId && m.userId === userId);
    if (idx > -1) {
      members[idx].isMuted = isMuted;
      saveLocalMembers(members);
      notifyMemberSubscribers(roomId);
    }
  }
}

/**
 * Moderation: Add announcement to Room
 */
export async function addRoomAnnouncement(roomId: string, text: string, authorName: string): Promise<void> {
  const annId = `ann_${Date.now()}`;
  const announcement = { id: annId, text, createdAt: new Date().toISOString(), authorName };

  if (isFirebaseConfigured && db) {
    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      await updateDoc(roomRef, {
        announcements: arrayUnion(announcement)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  } else {
    const rooms = getLocalRooms();
    const idx = rooms.findIndex(r => r.roomId === roomId);
    if (idx > -1) {
      const anns = rooms[idx].announcements || [];
      anns.unshift(announcement);
      rooms[idx].announcements = anns;
      saveLocalRooms(rooms);
      notifyRoomsSubscribers();
    }
  }
}

