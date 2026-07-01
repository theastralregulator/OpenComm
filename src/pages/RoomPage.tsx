/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import {
  ArrowLeft,
  Mic,
  MicOff,
  MessageSquare,
  LogOut,
  Send,
  Volume2,
  Users,
  Pin,
  Lock,
  Globe,
  Settings,
  UserX,
  UserCheck,
  UserMinus,
  Trash2,
  Flag,
  Share2,
  Bookmark,
  Reply,
  Smile,
  X,
  Check,
  Megaphone,
  UserPlus,
  Play,
  Clock,
  Menu,
  Shield,
  Award,
  ChevronDown,
  Edit,
  Sliders,
  Search,
  ShieldAlert
} from 'lucide-react';
import {
  getRoom,
  subscribeRoomMembers,
  subscribeRoomMessages,
  sendRoomMessage,
  deleteRoomMessage,
  reportRoomMessage,
  togglePinRoomMessage,
  reactToRoomMessage,
  leaveRoom,
  joinRoom,
  updateRoomMemberStatus,
  removeRoomMember,
  updateRoomMemberRole,
  updateRoomMemberAudioState,
  sendRoomInvite,
  updateRoom,
  deleteRoom,
  createRoomPost,
  subscribeRoomPosts,
  deleteRoomPost,
  pinRoomPost,
  reportRoomPost,
  toggleLikeRoomPost,
  toggleBookmarkRoomPost,
  createRoomComment,
  subscribeRoomComments,
  banRoomMember,
  muteRoomMember,
  addRoomAnnouncement
} from '../services/roomService';
import { Room, RoomMember, RoomMessage, RoomRole } from '../types';

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core Data State
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // User Membership State in This Room
  const [myMembership, setMyMembership] = useState<RoomMember | null>(null);

  // Chat & Messaging state
  const [chatInput, setChatInput] = useState('');
  const [searchMessageQuery, setSearchMessageQuery] = useState('');
  const [replyTarget, setReplyTarget] = useState<RoomMessage | null>(null);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState<string | null>(null);

  // Live Audio Room State (Architecture & UI)
  const [isJoinedAudio, setIsJoinedAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [audioTimerInterval, setAudioTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Modals & Panels State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteeUsername, setInviteeUsername] = useState('');
  const [showMembersPanel, setShowMembersPanel] = useState(true);

  // Tab Navigation for Rooms: 'feed' | 'chat' | 'members' | 'announcements' | 'rules'
  const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'members' | 'announcements' | 'rules'>('feed');

  // Room Feed Posts States
  const [roomPosts, setRoomPosts] = useState<any[]>([]);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostImages, setNewPostImages] = useState('');
  const [newPostAspectRatio, setNewPostAspectRatio] = useState<'original' | '1:1' | '4:5' | '3:4' | '2:3' | '16:9' | '9:16'>('original');

  // Room Post Comments States
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);

  // Interactive Full-screen Image Viewer States
  const [selectedViewerImage, setSelectedViewerImage] = useState<string | null>(null);
  const [selectedViewerImagesList, setSelectedViewerImagesList] = useState<string[]>([]);
  const [viewerZoom, setViewerZoom] = useState<number>(1); // 1 = 100%, 1.5 = 150%, 2 = 200%, etc.

  // Announcements States
  const [announcementInput, setAnnouncementInput] = useState('');

  // Room Edit Fields State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMaxMembers, setEditMaxMembers] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public');

  // Scroll ref for chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Predefined reaction emojis
  const REACTIONS = ['👍', '❤️', '🔥', '👏', '😂', '😮', '😢'];

  // Load Room Details
  const loadRoomDetails = async () => {
    if (!roomId) return;
    try {
      const roomData = await getRoom(roomId);
      if (roomData) {
        setRoom(roomData);
        setEditName(roomData.name);
        setEditDesc(roomData.description);
        setEditMaxMembers(roomData.maxMembers ? String(roomData.maxMembers) : '');
        setEditVisibility(roomData.visibility);
      } else {
        showToast.error('Room not found.');
        navigate('/rooms');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRoomDetails();
  }, [roomId]);

  // Real-time Subscriptions (Members & Messages)
  useEffect(() => {
    if (!roomId) return;

    // Subscribe Members
    const unsubMembers = subscribeRoomMembers(roomId, (membersList) => {
      setMembers(membersList);
      
      // Update my membership details
      if (user) {
        const found = membersList.find((m) => m.userId === user.uid);
        setMyMembership(found || null);
        
        // Sync joinedAudio state
        if (found && found.audioRole) {
          setIsJoinedAudio(true);
        } else {
          setIsJoinedAudio(false);
        }
      }
    });

    // Subscribe Messages
    const unsubMessages = subscribeRoomMessages(roomId, (messagesList) => {
      setMessages(messagesList);
    });

    setLoading(false);

    return () => {
      unsubMembers();
      unsubMessages();
    };
  }, [roomId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to Room Feed Posts
  useEffect(() => {
    if (!roomId || activeTab !== 'feed') return;
    const unsub = subscribeRoomPosts(roomId, (posts) => {
      setRoomPosts(posts);
    });
    return unsub;
  }, [roomId, activeTab]);

  // Subscribe to Post Comments
  useEffect(() => {
    if (!roomId || !activeCommentsPostId) {
      setCommentsList([]);
      return;
    }
    const unsub = subscribeRoomComments(roomId, activeCommentsPostId, (cmts) => {
      setCommentsList(cmts);
    });
    return unsub;
  }, [roomId, activeCommentsPostId]);

  // Live Audio timer effect
  useEffect(() => {
    if (isJoinedAudio && room?.roomType === 'audio') {
      const timer = setInterval(() => {
        setAudioTimer((prev) => prev + 1);
      }, 1000);
      setAudioTimerInterval(timer);
      return () => clearInterval(timer);
    } else {
      if (audioTimerInterval) {
        clearInterval(audioTimerInterval);
        setAudioTimerInterval(null);
      }
      setAudioTimer(0);
    }
  }, [isJoinedAudio]);

  // Helper Roles / Permissions checks
  const isOwner = myMembership?.role === 'owner';
  const isModerator = myMembership?.role === 'moderator' || isOwner;
  const isApprovedMember = myMembership?.status === 'approved';

  // Format timer seconds
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // SEND MESSAGE
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !roomId || !isApprovedMember) return;

    try {
      const replyDetails = replyTarget ? {
        replyToId: replyTarget.messageId,
        replyToUser: replyTarget.displayName || replyTarget.username,
        replyToText: replyTarget.text
      } : undefined;

      await sendRoomMessage(roomId, user, chatInput.trim(), replyDetails);
      setChatInput('');
      setReplyTarget(null);
    } catch (err) {
      showToast.error('Could not send message.');
    }
  };

  // DELETE MESSAGE
  const handleDeleteMessage = async (msgId: string) => {
    if (!roomId) return;
    try {
      await deleteRoomMessage(roomId, msgId);
      showToast.success('Message deleted.');
    } catch (err) {
      showToast.error('Could not delete message.');
    }
  };

  // PIN / UNPIN MESSAGE
  const handleTogglePin = async (msgId: string, currentPinState: boolean) => {
    if (!roomId) return;
    try {
      await togglePinRoomMessage(roomId, msgId, !currentPinState);
      showToast.success(!currentPinState ? 'Message pinned!' : 'Message unpinned.');
    } catch (err) {
      showToast.error('Failed to change message pin state.');
    }
  };

  // REPORT MESSAGE
  const handleReportMessage = async (msgId: string) => {
    if (!roomId || !user) return;
    try {
      await reportRoomMessage(roomId, msgId, user.uid);
      showToast.success('Message reported to moderators.');
    } catch (err) {
      showToast.error('Failed to report message.');
    }
  };

  // REACTION
  const handleReaction = async (msgId: string, emoji: string) => {
    if (!roomId || !user) return;
    try {
      await reactToRoomMessage(roomId, msgId, user.uid, emoji);
      setIsReactionPickerOpen(null);
    } catch (err) {
      showToast.error('Failed to toggle reaction.');
    }
  };

  // LEAVE ROOM
  const handleLeaveRoom = async () => {
    if (!roomId || !user) return;
    try {
      await leaveRoom(roomId, user.uid);
      showToast.success('You have left the room.');
      navigate('/rooms');
    } catch (err) {
      showToast.error('Failed to leave the room.');
    }
  };

  // JOIN ROOM
  const handleJoin = async () => {
    if (!roomId || !user || !room) return;
    try {
      await joinRoom(roomId, user, room.visibility === 'private');
      showToast.success(room.visibility === 'private' ? 'Access requested!' : 'Room joined!');
    } catch (err) {
      showToast.error('Failed to join room.');
    }
  };

  // JOIN / LEAVE LIVE AUDIO CHANNEL
  const handleToggleAudioJoin = async () => {
    if (!roomId || !user || !myMembership) return;

    try {
      if (isJoinedAudio) {
        // Leave audio channel (reset state, return to standard listener)
        await updateRoomMemberAudioState(roomId, user.uid, {
          audioRole: undefined,
          isMuted: undefined,
          isMicrophoneOn: undefined,
          isSpeaking: undefined
        });
        showToast.info('Left audio channel.');
      } else {
        // Join audio channel as speaker
        await updateRoomMemberAudioState(roomId, user.uid, {
          audioRole: 'speaker',
          isMuted: false,
          isMicrophoneOn: true,
          isSpeaking: false
        });
        showToast.success('Joined audio stage!');
      }
    } catch (err) {
      showToast.error('Failed to change audio channel state.');
    }
  };

  // MUTE / UNMUTE MIC
  const handleToggleMic = async () => {
    if (!roomId || !user || !myMembership) return;
    try {
      const currentlyMuted = myMembership.isMuted;
      await updateRoomMemberAudioState(roomId, user.uid, {
        isMuted: !currentlyMuted,
        isMicrophoneOn: currentlyMuted
      });
      showToast.info(!currentlyMuted ? 'Microphone muted' : 'Microphone active');
    } catch (err) {
      showToast.error('Failed to toggle microphone.');
    }
  };

  // TOGGLE SPEAKING SIMULATION (Since we do not stream real audio, lets allow user to toggle speaking state to see speaking indicators update real-time!)
  const handleToggleSpeaking = async () => {
    if (!roomId || !user || !myMembership || myMembership.isMuted) return;
    try {
      const speaking = !myMembership.isSpeaking;
      await updateRoomMemberAudioState(roomId, user.uid, {
        isSpeaking: speaking
      });
    } catch (err) {
      console.error(err);
    }
  };

  // MEMBER APPROVALS (Private Rooms)
  const handleApproveJoin = async (userId: string) => {
    if (!roomId) return;
    try {
      await updateRoomMemberStatus(roomId, userId, 'approved');
      showToast.success('Operator approved.');
    } catch (err) {
      showToast.error('Failed to approve operator.');
    }
  };

  const handleRejectJoin = async (userId: string) => {
    if (!roomId) return;
    try {
      await updateRoomMemberStatus(roomId, userId, 'pending'); // rejecting deletes the row
      showToast.info('Join request rejected.');
    } catch (err) {
      showToast.error('Failed to reject join request.');
    }
  };

  // KICK MEMBER / BAN
  const handleKickMember = async (userId: string) => {
    if (!roomId) return;
    try {
      await removeRoomMember(roomId, userId);
      showToast.success('Operator removed from room.');
    } catch (err) {
      showToast.error('Failed to kick operator.');
    }
  };

  // MEMBER ROLE MODERATION
  const handlePromoteToModerator = async (userId: string) => {
    if (!roomId) return;
    try {
      await updateRoomMemberRole(roomId, userId, 'moderator');
      showToast.success('User promoted to Moderator.');
    } catch (err) {
      showToast.error('Failed to promote user.');
    }
  };

  const handleDemoteToMember = async (userId: string) => {
    if (!roomId) return;
    try {
      await updateRoomMemberRole(roomId, userId, 'member');
      showToast.info('User role set to member.');
    } catch (err) {
      showToast.error('Failed to demote user.');
    }
  };

  const handleTransferOwnership = async (userId: string) => {
    if (!roomId) return;
    if (!window.confirm('Are you absolutely sure you want to transfer ownership of this room? You will be demoted to a regular member.')) return;
    try {
      await updateRoomMemberRole(roomId, userId, 'owner');
      showToast.success('Ownership transferred successfully!');
      setIsSettingsOpen(false);
    } catch (err) {
      showToast.error('Failed to transfer ownership.');
    }
  };

  // SEND ROOM INVITE
  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !room || !user || !inviteeUsername.trim()) return;

    try {
      // Simulating user lookup (since this is an applet, we send the invite to the string username provided)
      // Real flow: we look up users collection where username == inviteeUsername.
      // To make it fully functional and reliable, let's create the invite doc
      // with a target ID or simulate user. For demo purposes we map known mock IDs
      const mockUids: Record<string, string> = {
        clara_o: 'mock-user-1',
        watson_md: 'mock-user-2',
        admin: 'mock-uid-admin'
      };

      const targetId = mockUids[inviteeUsername.trim().toLowerCase()] || `simulated_${Date.now()}`;
      
      await sendRoomInvite(
        roomId,
        room.name,
        user.uid,
        user.displayName || user.fullName || 'Operator',
        targetId
      );

      showToast.success(`Invite sent successfully to @${inviteeUsername}!`);
      setInviteeUsername('');
      setIsInviteOpen(false);
    } catch (err) {
      showToast.error('Failed to deliver room invite.');
    }
  };

  // UPDATE ROOM DETAILS (Owner)
  const handleUpdateRoomDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;
    try {
      await updateRoom(roomId, {
        name: editName,
        description: editDesc,
        maxMembers: editMaxMembers ? parseInt(editMaxMembers) : null,
        visibility: editVisibility
      });
      showToast.success('Room settings updated successfully!');
      loadRoomDetails();
    } catch (err) {
      showToast.error('Failed to update room specifications.');
    }
  };

  // DELETE ROOM SPEC (Owner)
  const handleDeleteRoomSpec = async () => {
    if (!roomId) return;
    if (!window.confirm('WARNING: Deleting this room will permanently wipe all active stages, text dialogue history, and member records. This action cannot be undone. Proceed?')) return;
    try {
      await deleteRoom(roomId);
      showToast.success('Room destroyed.');
      navigate('/rooms');
    } catch (err) {
      showToast.error('Failed to destroy room.');
    }
  };

  // ==========================================
  // ROOM FEED POST ACTIONS
  // ==========================================
  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !user) return;
    if (!newPostCaption.trim() && !newPostImages.trim()) {
      showToast.error('Please provide some caption text or images to publish.');
      return;
    }

    try {
      const imageList = newPostImages
        .split(',')
        .map((img) => img.trim())
        .filter(Boolean);

      await createRoomPost(roomId, {
        caption: newPostCaption.trim(),
        images: imageList,
        aspectRatio: newPostAspectRatio,
        creatorId: user.uid,
        creatorName: user.displayName || user.fullName || 'Operator',
        creatorImage: user.photoURL || user.profileImage || '',
        creatorUsername: user.username || 'operator',
      });

      showToast.success('Room post published successfully!');
      setNewPostCaption('');
      setNewPostImages('');
      setNewPostAspectRatio('original');
    } catch (err) {
      showToast.error('Failed to publish post to feed.');
    }
  };

  const handlePostLikeToggle = async (postId: string) => {
    if (!roomId || !user) return;
    try {
      await toggleLikeRoomPost(roomId, postId, user.uid);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostBookmarkToggle = async (postId: string) => {
    if (!roomId || !user) return;
    try {
      await toggleBookmarkRoomPost(roomId, postId, user.uid);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!roomId) return;
    if (!window.confirm('Delete this post permanently from the community feed?')) return;
    try {
      await deleteRoomPost(roomId, postId);
      showToast.success('Feed post deleted.');
    } catch (err) {
      showToast.error('Failed to delete post.');
    }
  };

  const handlePinPost = async (postId: string, isPinned: boolean) => {
    if (!roomId) return;
    try {
      await pinRoomPost(roomId, postId, !isPinned);
      showToast.success(isPinned ? 'Post unpinned.' : 'Post pinned to the top!');
    } catch (err) {
      showToast.error('Failed to modify pin status.');
    }
  };

  const handleReportPost = async (postId: string) => {
    if (!roomId) return;
    try {
      await reportRoomPost(roomId, postId);
      showToast.info('Post reported for moderation review.');
    } catch (err) {
      showToast.error('Failed to report post.');
    }
  };

  const handleCreateCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !user || !activeCommentsPostId || !commentInput.trim()) return;

    try {
      await createRoomComment(roomId, activeCommentsPostId, {
        text: commentInput.trim(),
        creatorId: user.uid,
        creatorName: user.displayName || user.fullName || 'Operator',
        creatorImage: user.photoURL || user.profileImage || '',
        creatorUsername: user.username || 'operator',
        parentId: replyToCommentId || undefined,
      });

      setCommentInput('');
      setReplyToCommentId(null);
      showToast.success('Comment added successfully!');
    } catch (err) {
      showToast.error('Failed to submit comment.');
    }
  };

  // ==========================================
  // ROOM MODERATION & ANNOUNCEMENTS
  // ==========================================
  const handleCreateAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !announcementInput.trim()) return;

    try {
      await addRoomAnnouncement(roomId, announcementInput.trim());
      setAnnouncementInput('');
      showToast.success('Room announcement broadcasted!');
      loadRoomDetails();
    } catch (err) {
      showToast.error('Failed to post announcement.');
    }
  };

  const handleMuteUser = async (userId: string, isMuted: boolean) => {
    if (!roomId) return;
    try {
      await muteRoomMember(roomId, userId, !isMuted);
      showToast.success(isMuted ? 'User unmuted.' : 'User muted in room.');
    } catch (err) {
      showToast.error('Failed to modify mute state.');
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!roomId) return;
    if (!window.confirm('Are you sure you want to ban this user from the room? They will be removed immediately.')) return;
    try {
      await banRoomMember(roomId, userId);
      showToast.success('User banned and removed from room.');
    } catch (err) {
      showToast.error('Failed to ban user.');
    }
  };

  // Audio room classifications
  const hostMember = members.find((m) => m.audioRole === 'host' && m.status === 'approved');
  const speakersList = members.filter((m) => m.audioRole === 'speaker' && m.status === 'approved');
  const listenersList = members.filter((m) => (!m.audioRole || m.audioRole === 'listener') && m.status === 'approved');
  const pendingApprovals = members.filter((m) => m.status === 'pending');

  // Filter messages by search keyword if present
  const filteredMessages = messages.filter((msg) => {
    if (!searchMessageQuery.trim()) return true;
    return msg.text.toLowerCase().includes(searchMessageQuery.toLowerCase()) ||
           msg.displayName.toLowerCase().includes(searchMessageQuery.toLowerCase()) ||
           msg.username.toLowerCase().includes(searchMessageQuery.toLowerCase());
  });

  // Pinned messages extraction
  const pinnedMessagesList = messages.filter((m) => m.isPinned);

  if (loading || !room) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Spinner size="lg" />
        <span className="text-sm font-mono text-slate-400">Bootstrapping room protocol...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 pb-20">
      
      {/* 1. ROOM HEADER HERO BLOCK */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 shadow-2xl text-white">
        {/* Banner blur background */}
        <div className="absolute inset-0 z-0 opacity-40">
          {room.roomImage && (
            <img src={room.roomImage} alt="Room Banner" className="w-full h-full object-cover blur-2xl pointer-events-none" referrerPolicy="no-referrer" />
          )}
          <div className="absolute inset-0 bg-slate-950/80" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Details */}
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/rooms')}
              className="p-2.5 min-w-0 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col gap-1 max-w-lg">
              <div className="flex items-center flex-wrap gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-full text-[10px] font-bold tracking-widest font-mono uppercase">
                  {room.category}
                </span>
                
                {/* Type Badges */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-mono uppercase ${
                  room.roomType === 'audio' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                }`}>
                  {room.roomType === 'audio' ? <Mic className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                  <span>{room.roomType === 'audio' ? 'Live Audio Stage' : 'Text Dialogue'}</span>
                </span>

                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest font-mono uppercase ${
                  room.visibility === 'private' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {room.visibility === 'private' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                  <span>{room.visibility === 'private' ? 'Private' : 'Public'}</span>
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-white mt-1">
                {room.name}
              </h1>
              
              <p className="text-xs text-slate-300 font-sans leading-relaxed mt-1">
                {room.description || 'No description provided.'}
              </p>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono mt-2">
                <span>Created by: <strong className="text-slate-200">{room.creatorName}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{members.filter(m => m.status === 'approved').length} Operators Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center flex-wrap gap-2 z-10">
            {/* Private Room Invite Button */}
            {isApprovedMember && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                className="gap-1.5 bg-white/5 border border-white/10 text-white hover:bg-white/15"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite Operators</span>
              </Button>
            )}

            {/* Leave or Join State */}
            {myMembership ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeaveRoom}
                className="gap-1.5 bg-red-500/15 border border-red-500/20 text-red-300 hover:bg-red-500/25 shrink-0"
              >
                <LogOut className="h-4 w-4" />
                <span>Leave Room</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleJoin}
                className="gap-1.5 bg-indigo-600 border-0"
              >
                <Check className="h-4 w-4" />
                <span>{room.visibility === 'private' ? 'Request Approval' : 'Join Room'}</span>
              </Button>
            )}

            {/* Room Settings Config (Owner Only) */}
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 bg-white/5 border border-white/10 text-white hover:bg-white/15 rounded-xl"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}

            {/* Toggle Members list sidebar on desktop */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMembersPanel(!showMembersPanel)}
              className="p-2 bg-white/5 border border-white/10 text-white hover:bg-white/15 rounded-xl hidden lg:flex"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation for Room Workspace */}
      {isApprovedMember && (
        <div className="flex border-b border-slate-100 dark:border-slate-800 gap-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'feed'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Community Feed</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {room.roomType === 'audio' ? <Mic className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            <span>{room.roomType === 'audio' ? 'Live Stage & Dialogue' : 'Live Chat'}</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Operators ({members.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'announcements'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            <span>Announcements {(room.announcements && room.announcements.length > 0) ? `(${room.announcements.length})` : ''}</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-all shrink-0 ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Rules</span>
          </button>
        </div>
      )}

      {/* 2. CHAT / STAGE SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Main interactive compartment (Stage or Text Chat) */}
        <div className={`col-span-1 lg:col-span-3 flex flex-col gap-6`}>
          
          {/* Pinned Messages Shelf */}
          {pinnedMessagesList.length > 0 && isApprovedMember && (
            <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl flex items-start gap-2.5">
              <Pin className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider">
                  Pinned System Directives ({pinnedMessagesList.length})
                </span>
                <div className="max-h-20 overflow-y-auto pr-2 flex flex-col gap-2">
                  {pinnedMessagesList.map((pinnedMsg) => (
                    <div key={pinnedMsg.messageId} className="text-xs text-slate-600 dark:text-slate-300 font-sans border-l-2 border-amber-500/30 pl-2">
                      <strong className="text-slate-800 dark:text-slate-200">{pinnedMsg.displayName}</strong>:{' '}
                      <span className="italic">&quot;{pinnedMsg.text}&quot;</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AUDIO STAGE BLOCK (Visible only on live audio rooms) */}
          {room.roomType === 'audio' && (
            <div className="flex flex-col gap-6">
              
              {/* Premium Speakers podium */}
              <Card className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 text-white shadow-xl backdrop-blur-md">
                
                {/* Audio Status Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </div>
                    <span className="text-xs font-mono font-bold uppercase text-red-400 tracking-widest">
                      Live Audio Broadcast
                    </span>
                  </div>
                  
                  {isJoinedAudio && (
                    <div className="flex items-center gap-1 text-slate-300 font-mono text-xs px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg">
                      <Clock className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                      <span>Stage Time: {formatTimer(audioTimer)}</span>
                    </div>
                  )}
                </div>

                {/* Host Podium */}
                <div className="flex flex-col items-center gap-2.5 mb-8">
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                    Room Host
                  </span>
                  
                  {hostMember ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className={`relative p-1 rounded-full ${hostMember.isSpeaking ? 'ring-4 ring-indigo-500 shadow-indigo-500/20' : 'ring-2 ring-white/10'}`}>
                        <Avatar src={hostMember.photoURL} fallback={hostMember.displayName} size="xl" />
                        <span className="absolute bottom-1 right-1 p-1 bg-indigo-600 rounded-full border border-slate-900 text-white">
                          <Award className="h-3 w-3" />
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-100">{hostMember.displayName}</span>
                      <span className="text-[10px] font-mono text-slate-400">@{hostMember.username}</span>
                    </div>
                  ) : (
                    <span className="text-xs italic text-slate-500 font-mono">No Active Host</span>
                  )}
                </div>

                {/* Speakers Grid */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold text-center block mb-2">
                    Speakers Podium
                  </span>

                  <div className="flex flex-wrap gap-6 justify-center">
                    {speakersList.map((speaker) => (
                      <div key={speaker.userId} className="flex flex-col items-center gap-2 text-center w-24 group relative">
                        
                        {/* Speaker avatar with indicator */}
                        <div className={`relative p-0.5 rounded-full transition-all duration-300 ${
                          speaker.isSpeaking
                            ? 'ring-4 ring-indigo-500 scale-105 animate-pulse shadow-md shadow-indigo-500/10'
                            : 'ring-1 ring-white/10 group-hover:ring-white/30'
                        }`}>
                          <Avatar src={speaker.photoURL} fallback={speaker.displayName} size="lg" />
                          
                          {/* Mic indicator overlay */}
                          <span className={`absolute -bottom-1 -right-1 p-1 rounded-full border border-slate-950 text-white ${
                            speaker.isMuted ? 'bg-red-500' : 'bg-emerald-500'
                          }`}>
                            {speaker.isMuted ? <MicOff className="h-2.5 w-2.5" /> : <Mic className="h-2.5 w-2.5" />}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-slate-200 truncate w-full">
                          {speaker.displayName}
                        </span>

                        {/* Speaking toggle simulator for self */}
                        {speaker.userId === user?.uid && (
                          <button
                            onClick={handleToggleSpeaking}
                            className="text-[9px] font-mono text-indigo-400 hover:text-indigo-300 underline mt-0.5"
                          >
                            {speaker.isSpeaking ? 'Stop Speaking' : 'Simulate Voice'}
                          </button>
                        )}
                      </div>
                    ))}

                    {speakersList.length === 0 && (
                      <span className="text-xs italic text-slate-500 font-mono py-2">Stage podium is empty</span>
                    )}
                  </div>
                </div>

                {/* Live audio Stage action console */}
                {isApprovedMember && (
                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap justify-center gap-3">
                    <Button
                      variant={isJoinedAudio ? 'danger' : 'primary'}
                      onClick={handleToggleAudioJoin}
                      className="gap-1.5 px-6 font-semibold"
                    >
                      <Volume2 className="h-4.5 w-4.5" />
                      <span>{isJoinedAudio ? 'Leave Stage Podium' : 'Join Speaker Podium'}</span>
                    </Button>

                    {isJoinedAudio && (
                      <>
                        <Button
                          variant={myMembership?.isMuted ? 'danger' : 'outline'}
                          onClick={handleToggleMic}
                          className="gap-1.5 px-4 bg-white/5 border border-white/15 hover:bg-white/10 text-white"
                        >
                          {myMembership?.isMuted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                          <span>{myMembership?.isMuted ? 'Mic Muted' : 'Mic Active'}</span>
                        </Button>

                        {!myMembership?.isMuted && (
                          <Button
                            variant="secondary"
                            onClick={handleToggleSpeaking}
                            className={`gap-1.5 px-4 ${myMembership?.isSpeaking ? 'bg-indigo-600 text-white animate-pulse' : 'bg-white/5 border border-white/15 text-white'}`}
                          >
                            <Megaphone className="h-4.5 w-4.5" />
                            <span>{myMembership?.isSpeaking ? 'Speaking...' : 'Simulate Mic Input'}</span>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Card>

              {/* Audience Section */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold px-1">
                  Active Listeners Bench ({listenersList.length})
                </span>
                <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl">
                  {listenersList.map((listener) => (
                    <div key={listener.userId} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl">
                      <Avatar src={listener.photoURL} fallback={listener.displayName} size="xs" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-28">
                        {listener.displayName}
                      </span>
                      {listener.role === 'moderator' && <Shield className="h-3 w-3 text-indigo-400 shrink-0" />}
                    </div>
                  ))}

                  {listenersList.length === 0 && (
                    <span className="text-xs italic text-slate-400 py-2">No listeners currently on the bench</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHAT CONTAINER COMPARTMENT */}
          <Card className="flex flex-col h-[550px] shadow-lg rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800">
            {/* Chat header panel */}
            <div className="flex-shrink-0 bg-slate-50/80 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-indigo-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono uppercase tracking-wide">
                  {room.roomType === 'audio' ? 'Room Live Dialogue' : 'Text Conversation Feed'}
                </span>
              </div>

              {/* Chat Message Search Bar */}
              <div className="relative max-w-48 sm:max-w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search dialogue..."
                  value={searchMessageQuery}
                  onChange={(e) => setSearchMessageQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Scrolling Dialogue Panel */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 bg-white dark:bg-slate-900 min-h-0">
              
              {!isApprovedMember ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Lock className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Dialogue feed is locked</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    You must first join this community room to access real-time conversation history and dispatch updates.
                  </p>
                  <Button variant="primary" size="sm" onClick={handleJoin} className="mt-4">
                    Join Community Room
                  </Button>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                  <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                  <span className="text-xs font-mono">No dialogue records recorded yet</span>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isOwnMsg = msg.userId === user?.uid;
                  
                  return (
                    <div key={msg.messageId} className={`flex items-start gap-3 max-w-full group ${msg.isReported ? 'opacity-80' : ''}`}>
                      <Avatar src={msg.photoURL} fallback={msg.displayName} size="sm" className="mt-0.5 shrink-0" />
                      
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        {/* Meta */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {msg.displayName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            @{msg.username} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Thread Reply Banner */}
                        {msg.replyToId && (
                          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-2 rounded-xl text-[10px] text-slate-500 max-w-md flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Replying to @{msg.replyToUser}:</span>
                            <span className="line-clamp-1 italic">&quot;{msg.replyToText}&quot;</span>
                          </div>
                        )}

                        {/* Message Text bubble */}
                        <div className={`relative px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-50 dark:border-slate-850 rounded-2xl rounded-tl-xs text-xs text-slate-700 dark:text-slate-300 max-w-full md:max-w-xl shadow-xs break-words ${
                          msg.isPinned ? 'border-amber-400/30 bg-amber-500/[0.01]' : ''
                        }`}>
                          {msg.isReported ? (
                            <span className="italic text-slate-400 flex items-center gap-1">
                              <Flag className="h-3.5 w-3.5 text-red-400 shrink-0" />
                              <span>Dialogue flagged by operators</span>
                            </span>
                          ) : (
                            msg.text
                          )}

                          {/* Pinned label indicators */}
                          {msg.isPinned && (
                            <span className="absolute -top-2 right-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-500 rounded text-[8px] font-bold tracking-widest font-mono flex items-center gap-0.5 border border-amber-500/10">
                              <Pin className="h-2 w-2" />
                              <span>PINNED</span>
                            </span>
                          )}
                        </div>

                        {/* Reactions list */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(msg.reactions).map(([emoji, usersList]) => {
                              const hasReacted = usersList.includes(user?.uid || '');
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.messageId, emoji)}
                                  className={`px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border rounded-full text-[10px] flex items-center gap-1 transition-all ${
                                    hasReacted
                                      ? 'border-indigo-400 bg-indigo-50/10 text-indigo-500'
                                      : 'border-slate-100 dark:border-slate-850 text-slate-500'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-mono">{usersList.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Dialogue micro actions bar */}
                        <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Thread reply */}
                          <button
                            onClick={() => setReplyTarget(msg)}
                            className="text-[10px] text-slate-400 hover:text-indigo-500 font-mono flex items-center gap-0.5"
                          >
                            <Reply className="h-3 w-3" />
                            <span>Reply</span>
                          </button>

                          {/* Toggle Reactions popover trigger */}
                          <div className="relative">
                            <button
                              onClick={() => setIsReactionPickerOpen(isReactionPickerOpen === msg.messageId ? null : msg.messageId)}
                              className="text-[10px] text-slate-400 hover:text-indigo-500 font-mono flex items-center gap-0.5"
                            >
                              <Smile className="h-3 w-3" />
                              <span>React</span>
                            </button>

                            {/* Floating Reactions selector */}
                            <AnimatePresence>
                              {isReactionPickerOpen === msg.messageId && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                  className="absolute left-0 bottom-full mb-1 z-30 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-lg text-white"
                                >
                                  {REACTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg.messageId, emoji)}
                                      className="text-base hover:scale-125 transition-transform p-0.5"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Pin toggle action (Owner/Moderator Only) */}
                          {isModerator && (
                            <button
                              onClick={() => handleTogglePin(msg.messageId, !!msg.isPinned)}
                              className="text-[10px] text-slate-400 hover:text-indigo-500 font-mono flex items-center gap-0.5"
                            >
                              <Pin className="h-3 w-3" />
                              <span>{msg.isPinned ? 'Unpin' : 'Pin'}</span>
                            </button>
                          )}

                          {/* Delete Action (Owner/Moderator, or original sender) */}
                          {(isOwnMsg || isModerator) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.messageId)}
                              className="text-[10px] text-red-400 hover:text-red-500 font-mono flex items-center gap-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}

                          {/* Report (Members only) */}
                          {!isOwnMsg && (
                            <button
                              onClick={() => handleReportMessage(msg.messageId)}
                              className="text-[10px] text-slate-400 hover:text-red-400 font-mono flex items-center gap-0.5"
                            >
                              <Flag className="h-3 w-3" />
                              <span>Report</span>
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input dialogue box bar */}
            {isApprovedMember && (
              <div className="flex-shrink-0 border-t border-slate-50 dark:border-slate-800/80 p-3 bg-white dark:bg-slate-900 flex flex-col gap-2">
                
                {/* Active Thread reply reference */}
                <AnimatePresence>
                  {replyTarget && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-slate-100 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-2 rounded-xl flex items-center justify-between text-xs text-slate-500"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Reply className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">Replying to <strong className="text-slate-800 dark:text-slate-200">@{replyTarget.username}</strong>: &quot;{replyTarget.text}&quot;</span>
                      </div>
                      <button onClick={() => setReplyTarget(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Text Input form */}
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Dispatch dialogue payload..."
                    className="flex-1 px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <Button type="submit" variant="primary" className="p-3 min-w-0 rounded-xl bg-indigo-600 border-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </div>

        {/* 3. MEMBERS PANEL SIDEBAR */}
        <AnimatePresence>
          {showMembersPanel && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="col-span-1 flex flex-col gap-6"
            >
              
              {/* Private Room pending join requests (Moderator view only) */}
              {isModerator && room.visibility === 'private' && pendingApprovals.length > 0 && (
                <Card className="border border-amber-500/15 bg-amber-500/[0.02]">
                  <CardHeader className="p-4 pb-2 border-b border-amber-500/10">
                    <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" />
                      <span>Pending Join Requests ({pendingApprovals.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col gap-3">
                    {pendingApprovals.map((req) => (
                      <div key={req.userId} className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar src={req.photoURL} fallback={req.displayName} size="xs" />
                          <div className="flex flex-col truncate">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{req.displayName}</span>
                            <span className="text-[9px] text-slate-400 font-mono">@{req.username}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleApproveJoin(req.userId)}
                            className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/25"
                            title="Approve"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRejectJoin(req.userId)}
                            className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/25"
                            title="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Members List Card */}
              <Card className="rounded-3xl shadow-md border border-slate-100 dark:border-slate-800">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-50 dark:border-slate-800/50 p-4">
                  <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Operators ({members.filter(m => m.status === 'approved').length})</span>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-4 flex flex-col gap-3 max-h-[450px] overflow-y-auto">
                  {members.filter(m => m.status === 'approved').map((member) => (
                    <div key={member.userId} className="flex items-center justify-between gap-3 group/member">
                      
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar src={member.photoURL} fallback={member.displayName} size="xs" />
                        
                        <div className="flex flex-col truncate">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {member.displayName}
                            </span>
                            
                            {/* Role badge */}
                            {member.role === 'owner' ? (
                              <span title="Room Owner"><Award className="h-3 w-3 text-amber-500" /></span>
                            ) : member.role === 'moderator' ? (
                              <span title="Moderator"><Shield className="h-3 w-3 text-indigo-400" /></span>
                            ) : null}
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono">@{member.username}</span>
                        </div>
                      </div>

                      {/* Moderator/Owner Action Menus */}
                      {isModerator && member.userId !== user?.uid && (
                        <div className="opacity-0 group-hover/member:opacity-100 flex items-center gap-1 shrink-0">
                          {/* Owner only operations: promoting / transferring */}
                          {isOwner && (
                            <>
                              {member.role !== 'moderator' && (
                                <button
                                  onClick={() => handlePromoteToModerator(member.userId)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-400 rounded transition-all"
                                  title="Promote to Moderator"
                                >
                                  <Shield className="h-3 w-3" />
                                </button>
                              )}
                              {member.role === 'moderator' && (
                                <button
                                  onClick={() => handleDemoteToMember(member.userId)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded transition-all"
                                  title="Demote to Member"
                                >
                                  <UserMinus className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleTransferOwnership(member.userId)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-500 rounded transition-all"
                                title="Transfer Ownership"
                              >
                                <Award className="h-3 w-3" />
                              </button>
                            </>
                          )}

                          {/* Kick from room */}
                          <button
                            onClick={() => handleKickMember(member.userId)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-red-400 rounded transition-all"
                            title="Kick Member"
                          >
                            <UserX className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. ROOM SETTINGS / SPECEDIT MODAL */}
      <AnimatePresence>
        {isSettingsOpen && isOwner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10"
            >
              <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col gap-1 mb-6">
                <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-wider">
                  Operational Control
                </span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Update Room Configurations
                </h3>
              </div>

              <form onSubmit={handleUpdateRoomDetails} className="flex flex-col gap-4 text-xs">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                    Room Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl resize-none"
                  />
                </div>

                {/* Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Max Members */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Max Members
                    </label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      value={editMaxMembers}
                      onChange={(e) => setEditMaxMembers(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl"
                    />
                  </div>

                  {/* Visibility */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Privacy Level
                    </label>
                    <select
                      value={editVisibility}
                      onChange={(e) => setEditVisibility(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-100"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                {/* Save details */}
                <div className="flex items-center justify-between mt-6 border-t border-slate-50 dark:border-slate-800/50 pt-4">
                  {/* DESTROY ROOM */}
                  <button
                    type="button"
                    onClick={handleDeleteRoomSpec}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/15 rounded-xl border border-red-500/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Destroy Room</span>
                  </button>

                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsSettingsOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Apply Specs
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. INVITE OPERATORS MODAL */}
      <AnimatePresence>
        {isInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10"
            >
              <button onClick={() => setIsInviteOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col gap-1 mb-5">
                <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  <span>Secure Transmission</span>
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Invite Operators
                </h3>
                <p className="text-[11px] text-slate-500">
                  Type the platform username to dispatch a pending invitation payload. 
                </p>
              </div>

              <form onSubmit={handleSendInviteSubmit} className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                    Operator Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400">@</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. clara_o, watson_md"
                      value={inviteeUsername}
                      onChange={(e) => setInviteeUsername(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono italic">
                    Hint: Use &quot;clara_o&quot; or &quot;watson_md&quot; to test.
                  </span>
                </div>

                <div className="flex gap-2.5 justify-end mt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Dispatch Invite
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default RoomPage;
