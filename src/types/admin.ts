/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, UserRole } from './index';

export type UserStatus = 'active' | 'suspended' | 'banned';

export interface AdminActivityLog {
  id?: string;
  timestamp: string;
  operator: string;
  action: string;
  ip: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  audience: 'everyone' | 'admins' | 'specific_users' | 'specific_rooms';
  targetIds?: string[];
  pinned: boolean;
  createdAt: string;
  authorName: string;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  postLimit: number;
  roomLimit: number;
  defaultRole: UserRole;
  maxUploadSize: string;
  allowedImageTypes: string[];
}

export interface ContentReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  type: 'post' | 'message' | 'room' | 'user';
  contentId: string;
  contentPreview: string;
  reason: 'spam' | 'harassment' | 'hate_speech' | 'inappropriate' | 'inaccurate';
  createdAt: string;
  status: 'pending' | 'resolved' | 'ignored';
}
