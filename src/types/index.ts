/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'member';

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  bio?: string;
  isSetupCompleted: boolean;
  openCommId?: string;
  fullName?: string;
  profileImage?: string;
  coverImage?: string;
  location?: string;
  interests?: string[];
  website?: string;
  birthday?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  followerCount?: number;
  postCount?: number;
  profilePhotoURL?: string;
  bannerPhotoURL?: string;
  verified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  isProfilePublic?: boolean;
  whoCanMessage?: string;
  whoCanInvite?: string;
  whoCanMention?: string;
  showOnlineStatus?: boolean;
  notifLikes?: boolean;
  notifComments?: boolean;
  notifMentions?: boolean;
  notifMessages?: boolean;
  notifRooms?: boolean;
  notifAnnouncements?: boolean;
  themePreference?: 'light' | 'dark';
  language?: string;
  country?: string;
  state?: string;
  city?: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export type Theme = 'light' | 'dark';

export interface AppStoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
}

export interface Post {
  postId: string;
  userId: string;
  uid?: string;
  username: string;
  displayName: string;
  profileImage: string;
  profilePhoto?: string;
  caption: string;
  text?: string;
  imageUrl?: string;
  imageUrls?: string[];
  likesCount: number;
  likeCount?: number;
  commentsCount: number;
  commentCount?: number;
  sharesCount?: number;
  saveCount?: number;
  viewsCount?: number;
  isEdited?: boolean;
  createdAt: string;
  updatedAt?: string;
  visibility: 'public' | 'private';
}

// Rooms Types
export type RoomType = 'text' | 'audio';
export type RoomVisibility = 'public' | 'private';
export type RoomRole = 'owner' | 'moderator' | 'member';
export type MemberStatus = 'approved' | 'pending';
export type AudioRole = 'host' | 'speaker' | 'listener';

export interface Room {
  roomId: string;
  name: string;
  description: string;
  category: string;
  roomType: RoomType;
  visibility: RoomVisibility;
  roomImage: string;
  bannerImage?: string;
  maxMembers: number | null;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  membersCount: number;
  pinnedMessages?: string[];
  announcements?: any[];
  language?: string;
  country?: string;
  state?: string;
  city?: string;
  tags?: string[];
  bannedUsers?: string[];
  rules?: string[];
}

export interface RoomMember {
  memberId: string; // roomId_userId
  roomId: string;
  userId: string;
  username: string;
  displayName: string;
  photoURL: string;
  role: RoomRole;
  status: MemberStatus;
  joinedAt: string;
  isMuted?: boolean;
  audioRole?: AudioRole;
  isSpeaking?: boolean;
  isMicrophoneOn?: boolean;
}

export interface RoomMessage {
  messageId: string;
  roomId: string;
  userId: string;
  username: string;
  displayName: string;
  photoURL: string;
  text: string;
  createdAt: string;
  reactions?: Record<string, string[]>; // emoji -> list of userIds
  replyToId?: string;
  replyToUser?: string;
  replyToText?: string;
  isPinned?: boolean;
  isReported?: boolean;
  reportedBy?: string[];
}

export interface RoomInvite {
  inviteId: string;
  roomId: string;
  roomName: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

// Notifications Types
export type NotificationType =
  | 'like'
  | 'comment'
  | 'reply'
  | 'follow'
  | 'follow_request'
  | 'follow_accept'
  | 'mention'
  | 'message'
  | 'message_request'
  | 'message_request_accept'
  | 'reaction'
  | 'room_invite'
  | 'room_invite_accept'
  | 'room_join_request'
  | 'room_approval'
  | 'share'
  | 'tag'
  | 'announcement'
  | 'system_update';

export interface Notification {
  notificationId: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
  postId?: string;
  roomId?: string;
}

export interface FollowRelation {
  followId: string; // followerId_followingId
  followerId: string;
  followerUsername: string;
  followerDisplayName: string;
  followerPhotoURL: string;
  followingId: string;
  followingUsername: string;
  followingDisplayName: string;
  followingPhotoURL: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export * from './admin';




