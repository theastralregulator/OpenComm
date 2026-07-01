/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Search,
  Send,
  Trash2,
  Copy,
  CornerUpLeft,
  Smile,
  MoreVertical,
  Pin,
  Volume2,
  Video,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Plus,
  X,
  MessageSquare,
  Shield,
  User,
  ExternalLink,
  Archive,
  UserCheck,
  UserMinus,
  AlertTriangle,
  Image as ImageIcon,
  Film,
  Mic,
  Paperclip,
  Heart,
  ThumbsUp,
  Forward,
  Lock,
  Globe,
  Sparkles
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { showToast } from '../components/ui/Toast';

import {
  DirectChat,
  DirectMessage,
  searchPeers,
  getOrCreateChat,
  listenToChats,
  listenToMessages,
  sendDirectMessage,
  markChatAsRead,
  pinChat,
  archiveChat,
  deleteChat,
  addMessageReaction,
  deleteDirectMessage,
  deleteMessageForMe,
  editDirectMessage,
  togglePinMessage,
  forwardDirectMessage,
  listenToTyping,
  setTypingState,
  getUserProfile,
  getPeerSelectionLists,
  updateUserPresence,
  listenToAllPresence,
  uploadMessageAttachment,
  blockUser,
  reportUser,
  isUserBlocked,
  acceptMessageRequest,
  declineMessageRequest,
  getChat
} from '../services/messageService';

import { followUser, unfollowUser, getFollowStatus } from '../services/followService';
import { UserProfile } from '../types';

export const MessagesPage: React.FC = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Active Direct Chat and messages state
  const [chats, setChats] = useState<DirectChat[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [activeChat, setActiveChat] = useState<DirectChat | null>(null);
  const [activePeer, setActivePeer] = useState<UserProfile | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // Real-time Presence map
  const [presenceMap, setPresenceMap] = useState<Record<string, { status: 'online' | 'away' | 'offline'; lastActive: string }>>({});

  // Pagination count
  const [messageLimit, setMessageLimit] = useState(25);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Tabs / Filter Categories in Sidebar
  type ActiveTab = 'all' | 'unread' | 'following' | 'followers' | 'requests' | 'groups' | 'rooms' | 'archived' | 'blocked' | 'pinned';
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');

  // Search & Inputs
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');

  // Modals & Popups
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Starting chat hierarchical categories
  const [startChatLists, setStartChatLists] = useState<{
    following: UserProfile[];
    followers: UserProfile[];
    mutual: UserProfile[];
    nearby: UserProfile[];
    remaining: UserProfile[];
  }>({ following: [], followers: [], mutual: [], nearby: [], remaining: [] });
  const [isLoadingStartLists, setIsLoadingStartLists] = useState(false);

  // Mutual followers cache (for UI cards)
  const [mutualFollowersCount, setMutualFollowersCount] = useState<Record<string, number>>({});
  const [followingStatusMap, setFollowingStatusMap] = useState<Record<string, boolean>>({});

  // Message reply reference
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  
  // Message forward state
  const [forwardingMsg, setForwardingMsg] = useState<DirectMessage | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);

  // Message edit state
  const [editingMsg, setEditingMsg] = useState<DirectMessage | null>(null);
  const [editInput, setEditInput] = useState('');

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Loading States
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Scroll references
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatLogContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Typing timer
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Quick Emoji constants
  const QUICK_EMOJIS = ['❤️', '👍', '😂', '🔥', '👏'];
  const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '❤️', '🔥', '👏', '🎉', '🚀', '💡', '💯', '✨', '🤔', '👀', '❌', '👀', '🤐', '😎', '💀', '🥳'];

  // Cache user profiles so we don't query Firestore repeatedly
  const [userProfileCache, setUserProfileCache] = useState<Record<string, UserProfile>>({});

  // 1. Manage current user presence
  useEffect(() => {
    if (!currentUser) return;

    updateUserPresence(currentUser.uid, 'online');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserPresence(currentUser.uid, 'online');
      } else {
        updateUserPresence(currentUser.uid, 'away');
      }
    };

    const handleBeforeUnload = () => {
      updateUserPresence(currentUser.uid, 'offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Listen to everyone's presence in real time
    const unsubscribePresence = listenToAllPresence((pMap) => {
      setPresenceMap(pMap);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribePresence();
      if (currentUser) {
        updateUserPresence(currentUser.uid, 'offline');
      }
    };
  }, [currentUser]);

  // 2. Listen to Direct Chats List
  useEffect(() => {
    if (!currentUser) return;

    setIsLoadingChats(true);
    const unsubscribe = listenToChats(currentUser.uid, async (fetchedChats) => {
      setChats(fetchedChats);
      setIsLoadingChats(false);

      // Cache profiles of participants in those chats
      fetchedChats.forEach(async (chat) => {
        const otherId = chat.participants.find(id => id !== currentUser.uid);
        if (otherId && !userProfileCache[otherId]) {
          try {
            const profile = await getUserProfile(otherId);
            if (profile) {
              setUserProfileCache(prev => ({ ...prev, [otherId]: profile }));
              
              // Also calculate follow status
              const isFollowed = await getFollowStatus(currentUser.uid, otherId);
              setFollowingStatusMap(prev => ({ ...prev, [otherId]: isFollowed === 'accepted' }));
            }
          } catch (err) {
            console.error('Error pre-fetching cache for peer:', otherId, err);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. React to route's chatId parameter
  useEffect(() => {
    if (!currentUser) return;

    if (chatId) {
      const active = chats.find(c => c.chatId === chatId) || null;
      
      if (active) {
        setActiveChat(active);
        const otherId = active.participants.find(id => id !== currentUser.uid);
        if (otherId) {
          if (userProfileCache[otherId]) {
            setActivePeer(userProfileCache[otherId]);
          } else {
            getUserProfile(otherId).then(profile => {
              if (profile) {
                setActivePeer(profile);
                setUserProfileCache(prev => ({ ...prev, [otherId]: profile }));
              }
            });
          }
        }
      } else {
        // Chat not in list yet — derive the other user ID from the chatId and ensure the chat exists
        const parts = chatId.split('_');
        const otherId = parts.find(id => id !== currentUser.uid);
        if (otherId) {
          getUserProfile(otherId).then(async (profile) => {
            if (profile) {
              setActivePeer(profile);
              setUserProfileCache(prev => ({ ...prev, [otherId]: profile }));
              // Ensure chat document exists (creates if not) — never throws
              await getOrCreateChat(currentUser.uid, otherId);
              // Immediately try to hydrate activeChat from Firestore
              try {
                const fetchedChat = await getChat(chatId);
                if (fetchedChat) {
                  setActiveChat(fetchedChat);
                } else {
                  // Provide optimistic active chat to prevent infinite loading
                  setActiveChat({
                    chatId,
                    participants: [currentUser.uid, otherId],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastMessage: null,
                    unreadCount: { [currentUser.uid]: 0, [otherId]: 0 },
                    status: 'active',
                    senderId: currentUser.uid,
                    recipientId: otherId
                  });
                  console.log('[OpenComm] Chat created optimistically, awaiting real-time sync...');
                }
              } catch (err) {
                console.warn('[OpenComm] Could not fetch chat yet, listener will sync:', err);
                setActiveChat({
                  chatId,
                  participants: [currentUser.uid, otherId],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  lastMessage: null,
                  unreadCount: { [currentUser.uid]: 0, [otherId]: 0 },
                  status: 'active',
                  senderId: currentUser.uid,
                  recipientId: otherId
                });
              }
            }
          }).catch(err => {
            console.error('[OpenComm] Error loading peer profile:', err);
          });
        }
      }
    } else {
      setActiveChat(null);
      setActivePeer(null);
      setMessages([]);
    }
  }, [chatId, chats, currentUser]);

  // 4. Listen to Active Messages & Typing State
  useEffect(() => {
    if (!chatId || !currentUser) return;

    setIsLoadingMessages(true);
    const unsubscribeMessages = listenToMessages(chatId, messageLimit, (fetchedMessages) => {
      // Filter out messages soft-deleted for me
      const visibleMsgs = fetchedMessages.filter(
        msg => !msg.deletedFor || !msg.deletedFor.includes(currentUser.uid)
      );

      setMessages(visibleMsgs);
      setHasMoreMessages(fetchedMessages.length >= messageLimit);
      setIsLoadingMessages(false);
      scrollToBottom();

      // Automatically mark chat as read
      if (activePeer) {
        markChatAsRead(chatId, currentUser.uid, activePeer.uid);
      }
    });

    const unsubscribeTyping = listenToTyping(chatId, (typingIds) => {
      setTypingUsers(typingIds.filter(id => id !== currentUser.uid));
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [chatId, activePeer, currentUser, messageLimit]);

  // Handle typing indicator updates
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (!chatId || !currentUser) return;

    setTypingState(chatId, currentUser.uid, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTypingState(chatId, currentUser.uid, false);
    }, 2000);
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Load more messages on scrolling up
  const handleScroll = () => {
    if (!chatLogContainerRef.current || isLoadingMessages || !hasMoreMessages) return;
    const { scrollTop } = chatLogContainerRef.current;
    if (scrollTop === 0) {
      setMessageLimit(prev => prev + 25);
    }
  };

  // Fetch Start Chat Lists when Start Chat Modal is opened
  useEffect(() => {
    if (!isNewChatOpen || !currentUser) return;

    setIsLoadingStartLists(true);
    getPeerSelectionLists(currentUser.uid)
      .then(async (lists) => {
        setStartChatLists(lists);

        // Pre-fetch following stats in background
        const allPeers = [...lists.following, ...lists.followers, ...lists.mutual, ...lists.nearby, ...lists.remaining];
        
        // Calculate mutual count dynamically
        const followingSet = new Set(lists.following.map(u => u.uid).concat(lists.mutual.map(u => u.uid)));
        
        const countMap: Record<string, number> = {};
        allPeers.forEach(p => {
          countMap[p.uid] = 0; // standard fallback
          // Set following states
          followingStatusMap[p.uid] = followingSet.has(p.uid);
        });

        setMutualFollowersCount(countMap);
        setFollowingStatusMap(followingStatusMap);
      })
      .finally(() => setIsLoadingStartLists(false));
  }, [isNewChatOpen, currentUser]);

  // Real-time User Search in start chat modal
  useEffect(() => {
    if (!currentUser) return;
    const term = userSearchTerm.trim();
    if (!term) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchPeers(term, currentUser.uid);
        setUserSearchResults(results);
      } catch (err) {
        console.error('Error searching peers:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [userSearchTerm, currentUser]);

  // Create or select direct message conversation
  const handleStartChat = async (peer: UserProfile) => {
    if (!currentUser) return;
    const id = await getOrCreateChat(currentUser.uid, peer.uid);
    setIsNewChatOpen(false);
    setUserSearchTerm('');
    setUserSearchResults([]);
    navigate(`/messages/${id}`);
  };

  // Handle follow / unfollow on the Start Chat Modal users
  const handleToggleFollow = async (peer: UserProfile) => {
    if (!currentUser) return;
    const currentlyFollowing = followingStatusMap[peer.uid];
    try {
      if (currentlyFollowing) {
        // Optimistic update
        setFollowingStatusMap(prev => ({ ...prev, [peer.uid]: false }));
        await unfollowUser(currentUser.uid, peer.uid);
      } else {
        // Optimistic update
        setFollowingStatusMap(prev => ({ ...prev, [peer.uid]: true }));
        await followUser(currentUser, peer);
      }
    } catch (e) {
      console.error(e);
      // Revert silently
      setFollowingStatusMap(prev => ({ ...prev, [peer.uid]: currentlyFollowing }));
    }
  };

  // Send Direct Message
  const handleSendMessage = async (attachment: { url: string; type: 'image' | 'video' | 'audio' | 'file'; name: string } | null = null) => {
    const text = inputMessage.trim();
    if (!text && !attachment) return;
    if (!chatId || !currentUser || !activePeer || isSending) return;

    setIsSending(true);
    setInputMessage('');
    setReplyingTo(null);
    setShowEmojiPicker(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTypingState(chatId, currentUser.uid, false);

    try {
      await sendDirectMessage(
        chatId,
        currentUser,
        activePeer.uid,
        text,
        replyingTo ? { id: replyingTo.messageId, text: replyingTo.text, senderName: replyingTo.senderName } : null,
        attachment
      );
      scrollToBottom();
      inputRef.current?.focus();
    } catch (err) {
      console.error(err);
      showToast.error('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // File Upload trigger
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !chatId) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    showToast.info(`Uploading ${file.name}...`);
    try {
      const res = await uploadMessageAttachment(chatId, file);
      await handleSendMessage(res);
      showToast.success('File shared successfully!');
    } catch (err) {
      console.error(err);
      showToast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Mic/Voice Note Recording Native HTML5 Recorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const voiceFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        
        setIsUploading(true);
        showToast.info('Uploading voice note...');
        try {
          const res = await uploadMessageAttachment(chatId!, voiceFile);
          await handleSendMessage(res);
          showToast.success('Voice note sent!');
        } catch (err) {
          console.error(err);
          showToast.error('Failed to send voice note.');
        } finally {
          setIsUploading(false);
          // Stop stream tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Mic permission declined or unavailable:', err);
      showToast.error('Microphone access is required for voice notes.');
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (!mediaRecorder || !isRecording) return;
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (shouldSend) {
      mediaRecorder.stop();
    } else {
      // Cancelled
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
      setIsRecording(false);
      showToast.info('Voice note cancelled.');
    }

    setIsRecording(false);
    setMediaRecorder(null);
  };

  // Format Duration seconds -> e.g. "0:45"
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Edit sent message
  const handleStartEdit = (msg: DirectMessage) => {
    setEditingMsg(msg);
    setEditInput(msg.text);
  };

  const handleSaveEdit = async () => {
    if (!editingMsg || !chatId || !editInput.trim()) return;
    try {
      await editDirectMessage(chatId, editingMsg.messageId, editInput.trim());
      setEditingMsg(null);
      setEditInput('');
      showToast.success('Message updated.');
    } catch (e) {
      console.error(e);
      showToast.error('Failed to edit message.');
    }
  };

  // Forward message
  const handleOpenForward = (msg: DirectMessage) => {
    setForwardingMsg(msg);
    setIsForwardModalOpen(true);
  };

  const handleConfirmForward = async (targetChat: DirectChat) => {
    if (!forwardingMsg || !currentUser) return;
    try {
      const recipientId = targetChat.participants.find(id => id !== currentUser.uid)!;
      await forwardDirectMessage(forwardingMsg, targetChat.chatId, currentUser, recipientId);
      setIsForwardModalOpen(false);
      setForwardingMsg(null);
      showToast.success('Message forwarded successfully!');
    } catch (err) {
      console.error(err);
      showToast.error('Failed to forward message.');
    }
  };

  // Pin message
  const handleTogglePinMessage = async (msg: DirectMessage) => {
    if (!chatId) return;
    try {
      await togglePinMessage(chatId, msg.messageId, !msg.isPinned);
      showToast.success(msg.isPinned ? 'Message unpinned.' : 'Message pinned in this chat.');
    } catch (e) {
      console.error(e);
    }
  };

  // Delete message for me
  const handleDeleteMe = async (msg: DirectMessage) => {
    if (!currentUser || !chatId) return;
    try {
      await deleteMessageForMe(chatId, msg.messageId, currentUser.uid);
      setMessages(prev => prev.filter(m => m.messageId !== msg.messageId));
      showToast.success('Message deleted for you.');
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message for everyone
  const handleDeleteEveryone = async (msg: DirectMessage) => {
    if (!chatId) return;
    try {
      await deleteDirectMessage(msg.messageId, chatId);
      showToast.success('Message deleted for everyone.');
    } catch (err) {
      console.error(err);
    }
  };

  // Message Requests: Accept / Decline / Block / Report
  const handleAcceptRequest = async () => {
    if (!chatId || !currentUser) return;
    try {
      await acceptMessageRequest(chatId, currentUser.uid);
      setActiveChat(prev => prev ? { ...prev, status: 'active' } : null);
      showToast.success('Request accepted! Chat is now in your active inbox.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineRequest = async () => {
    if (!chatId || !currentUser) return;
    if (!window.confirm('Are you sure you want to decline and delete this message request?')) return;
    try {
      await declineMessageRequest(chatId, currentUser.uid);
      navigate('/messages');
      showToast.info('Request declined.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleBlockRequest = async () => {
    if (!activePeer || !currentUser || !chatId) return;
    if (!window.confirm(`Are you sure you want to block @${activePeer.username}?`)) return;
    try {
      await blockUser(currentUser.uid, activePeer.uid);
      await declineMessageRequest(chatId, currentUser.uid);
      navigate('/messages');
      showToast.success(`@${activePeer.username} has been blocked.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReportRequest = async () => {
    if (!activePeer || !currentUser || !chatId) return;
    const reason = window.prompt('Specify reason for reporting this conversation:');
    if (reason === null) return;
    try {
      await reportUser(activePeer.uid, currentUser.uid, reason || 'Inappropriate messaging request');
      await blockUser(currentUser.uid, activePeer.uid);
      await declineMessageRequest(chatId, currentUser.uid);
      navigate('/messages');
      showToast.success('User reported and blocked.');
    } catch (e) {
      console.error(e);
    }
  };

  // Archive / Pin conversation
  const handleTogglePinChat = async () => {
    if (!chatId || !currentUser) return;
    const isPinned = activeChat?.pinnedBy?.includes(currentUser.uid);
    try {
      await pinChat(chatId, currentUser.uid, !isPinned);
      setIsMoreMenuOpen(false);
      showToast.success(isPinned ? 'Chat unpinned.' : 'Chat pinned.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleArchiveChat = async () => {
    if (!chatId || !currentUser) return;
    const isArchived = activeChat?.archivedBy?.includes(currentUser.uid);
    try {
      await archiveChat(chatId, currentUser.uid, !isArchived);
      setIsMoreMenuOpen(false);
      showToast.success(isArchived ? 'Chat restored from archive.' : 'Chat archived.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteConversation = async () => {
    if (!chatId || !currentUser) return;
    if (!window.confirm('Delete conversation? This hides it from your inbox but preserves history for the peer.')) return;
    try {
      await deleteChat(chatId, currentUser.uid);
      setIsMoreMenuOpen(false);
      navigate('/messages');
      showToast.success('Conversation removed.');
    } catch (e) {
      console.error(e);
    }
  };

  // Filter conversations matching the selected category (tab)
  const filteredChatsByTab = chats.filter((c) => {
    if (!currentUser) return false;
    const otherId = c.participants.find(id => id !== currentUser.uid);
    const isPinned = c.pinnedBy?.includes(currentUser.uid);
    const isArchived = c.archivedBy?.includes(currentUser.uid);
    const unreadCount = c.unreadCount?.[currentUser.uid] || 0;
    const isRequest = c.status === 'request' && c.recipientId === currentUser.uid;

    // Filter out requests and archives from 'all' inbox
    if (activeTab === 'all') {
      return c.status === 'active' && !isArchived;
    }
    if (activeTab === 'unread') {
      return unreadCount > 0 && !isArchived;
    }
    if (activeTab === 'pinned') {
      return isPinned && !isArchived;
    }
    if (activeTab === 'archived') {
      return isArchived;
    }
    if (activeTab === 'requests') {
      return isRequest;
    }
    if (activeTab === 'following') {
      return otherId && followingStatusMap[otherId];
    }
    if (activeTab === 'followers') {
      // In follow relations
      return true; // Simple display of these chats
    }
    return true;
  });

  // Filter by chat search input query
  const searchedChats = filteredChatsByTab.filter(c => {
    if (!currentUser) return false;
    const otherId = c.participants.find(id => id !== currentUser.uid);
    const cachedProfile = otherId ? userProfileCache[otherId] : null;
    const name = cachedProfile?.displayName || cachedProfile?.fullName || '';
    const username = cachedProfile?.username || '';
    const lastMsgText = c.lastMessage?.text || '';

    const queryStr = chatSearchQuery.toLowerCase().trim();
    return (
      name.toLowerCase().includes(queryStr) ||
      username.toLowerCase().includes(queryStr) ||
      lastMsgText.toLowerCase().includes(queryStr)
    );
  });

  // Calculate unread & requests count to show inside category badge
  const unreadChatsCount = chats.filter(c => currentUser && (c.unreadCount?.[currentUser.uid] || 0) > 0 && !c.archivedBy?.includes(currentUser.uid)).length;
  const requestsChatsCount = chats.filter(c => currentUser && c.status === 'request' && c.recipientId === currentUser.uid).length;

  // Search inside conversation highlighted text
  const highlightMessageText = (text: string) => {
    const q = messageSearchQuery.trim();
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-amber-300 dark:bg-amber-500/60 text-slate-900 dark:text-white px-0.5 rounded font-semibold">
              {p}
            </mark>
          ) : (
            p
          )
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] w-full relative">
      <div className="grid grid-cols-12 h-full bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-all">
        
        {/* =======================================
            SECTION 1: CHAT LIST SIDEBAR
            ======================================= */}
        <div className={`col-span-12 md:col-span-4 flex flex-col h-full border-r border-gray-150 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 ${
          chatId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-150 dark:border-slate-800/80 flex items-center justify-between">
            <h1 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-500" />
              <span>Direct Messages</span>
            </h1>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsNewChatOpen(true)}
              className="rounded-xl h-8 w-8 !p-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
              title="Start New Chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Inbox */}
          <div className="p-3 border-b border-gray-100 dark:border-slate-800/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search inbox or contacts..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-gray-800 dark:text-slate-100"
              />
              {chatSearchQuery && (
                <button onClick={() => setChatSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Horizontal scroll tabs for categories */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-gray-100 dark:border-slate-800/50 bg-gray-50/20 dark:bg-slate-950/20 scrollbar-none">
            {(['all', 'unread', 'pinned', 'requests', 'following', 'archived'] as ActiveTab[]).map((tab) => {
              const isActive = activeTab === tab;
              let badgeCount = 0;
              if (tab === 'unread') badgeCount = unreadChatsCount;
              if (tab === 'requests') badgeCount = requestsChatsCount;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                      : 'bg-white dark:bg-slate-850 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800/50'
                  }`}
                >
                  <span className="capitalize">{tab === 'all' ? 'All Chats' : tab}</span>
                  {badgeCount > 0 && (
                    <span className={`text-[8px] font-extrabold h-4 px-1 rounded-full flex items-center justify-center min-w-[16px] ${
                      isActive ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'
                    }`}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chats Log List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50/20 dark:bg-slate-900/5">
            {isLoadingChats ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-slate-800 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchedChats.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                <Mail className="h-8 w-8 text-gray-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-semibold">No discussions found</p>
                <p className="text-[10px] mt-1">Start a secure private conversation with your connections!</p>
              </div>
            ) : (
              <AnimatePresence>
                {searchedChats.map((c) => {
                  const otherId = c.participants.find(id => id !== currentUser?.uid);
                  const peerProfile = otherId ? userProfileCache[otherId] : null;
                  const displayName = peerProfile?.displayName || peerProfile?.fullName || 'Direct Chat';
                  const username = peerProfile?.username || 'user';
                  const photo = peerProfile?.photoURL;
                  
                  const isPinned = c.pinnedBy?.includes(currentUser?.uid || '');
                  const unreadCount = c.unreadCount?.[currentUser?.uid || ''] || 0;
                  const isSelected = c.chatId === chatId;

                  // Real-time peer presence state
                  const peerPresence = otherId ? presenceMap[otherId] : null;
                  const isOnline = peerPresence?.status === 'online';

                  let formattedTime = '';
                  if (c.updatedAt) {
                    const date = new Date(c.updatedAt);
                    const now = new Date();
                    if (date.toDateString() === now.toDateString()) {
                      formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else {
                      formattedTime = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    }
                  }

                  return (
                    <motion.div
                      key={c.chatId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => navigate(`/messages/${c.chatId}`)}
                      className={`group flex items-center justify-between p-3 rounded-2xl border border-transparent cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-100/30 dark:bg-slate-800/60 dark:border-slate-800/50'
                          : 'hover:bg-gray-100/75 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={photo}
                          fallback={displayName}
                          size="md"
                          isOnline={isOnline}
                          className="border border-gray-100 dark:border-slate-800/50 shadow-xs flex-shrink-0"
                        />
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {displayName}
                            </span>
                            {isPinned && (
                              <Pin className="h-3 w-3 text-indigo-500 fill-indigo-500/30 rotate-45 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                            @{username}
                          </span>
                          <p className={`text-[11px] truncate mt-0.5 ${
                            unreadCount > 0 ? 'text-gray-900 dark:text-slate-200 font-bold' : 'text-gray-500 dark:text-slate-400'
                          }`}>
                            {c.lastMessage ? (
                              <>
                                <span className="font-semibold text-[10px] text-indigo-400 dark:text-indigo-500 mr-0.5">
                                  {c.lastMessage.senderId === currentUser?.uid ? 'You: ' : ''}
                                </span>
                                {c.lastMessage.text}
                              </>
                            ) : (
                              <span className="text-gray-400 italic">No messages yet</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-[9px] text-gray-400 dark:text-slate-500 font-mono">
                          {formattedTime}
                        </span>
                        {unreadCount > 0 ? (
                          <span className="flex h-5 min-w-5 px-1.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold items-center justify-center animate-pulse shadow-md">
                            {unreadCount}
                          </span>
                        ) : isSelected ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* =======================================
            SECTION 2: CHAT WINDOW
            ======================================= */}
        <div className={`col-span-12 md:col-span-8 lg:col-span-5 flex flex-col h-full bg-gray-50/10 dark:bg-slate-900/10 ${
          chatId ? 'flex' : 'hidden md:flex'
        }`}>
          {chatId && (!activeChat || !activePeer) ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Clock className="h-6 w-6 text-indigo-400 animate-spin mb-2" />
              <span className="text-xs text-gray-400">Loading conversation...</span>
            </div>
          ) : activeChat && activePeer ? (
            <>
              {/* Header */}
              <div className="px-4.5 py-3 border-b border-gray-150 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/75 backdrop-blur-md flex items-center justify-between z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => navigate('/messages')} className="p-1.5 text-gray-500 md:hidden hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl">
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <Avatar
                    src={activePeer.photoURL}
                    fallback={activePeer.displayName || activePeer.username || 'Peer'}
                    size="md"
                    isOnline={presenceMap[activePeer.uid]?.status === 'online'}
                    className="border border-gray-100 dark:border-slate-800/50"
                  />
                  <div className="text-left min-w-0">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate block">
                      {activePeer.displayName || activePeer.fullName || 'Direct Chat'}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-400 font-mono truncate block">
                      {typingUsers.length > 0 ? (
                        <span className="text-indigo-500 font-semibold animate-pulse">Typing...</span>
                      ) : presenceMap[activePeer.uid]?.status === 'online' ? (
                        <span className="text-emerald-500 font-medium flex items-center gap-1">🟢 Online</span>
                      ) : presenceMap[activePeer.uid]?.status === 'away' ? (
                        <span className="text-amber-500 font-medium flex items-center gap-1">🌙 Away</span>
                      ) : (
                        <span className="text-gray-400">
                          ⚫ Offline {presenceMap[activePeer.uid]?.lastActive ? `(Seen ${new Date(presenceMap[activePeer.uid].lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMessageSearchOpen(!isMessageSearchOpen)}
                    className={`p-2 rounded-xl transition-colors ${
                      isMessageSearchOpen ? 'text-indigo-600 bg-indigo-50 dark:bg-slate-800' : 'text-gray-500 hover:text-indigo-600'
                    }`}
                    title="Search Messages"
                  >
                    <Search className="h-4 w-4" />
                  </button>

                  <button onClick={() => showToast.info('Connecting space audio room integration...')} className="p-2 text-gray-500 hover:text-indigo-600 rounded-xl">
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => showToast.info('Video feed launcher running...')} className="p-2 text-gray-500 hover:text-indigo-600 rounded-xl">
                    <Video className="h-4 w-4" />
                  </button>

                  <div className="relative">
                    <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-xl">
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {isMoreMenuOpen && (
                      <>
                        <div onClick={() => setIsMoreMenuOpen(false)} className="fixed inset-0 z-20" />
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-30 animate-fade">
                          <button
                            onClick={handleTogglePinChat}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                          >
                            <Pin className="h-3.5 w-3.5 text-gray-500" />
                            <span>{activeChat?.pinnedBy?.includes(currentUser?.uid || '') ? 'Unpin Chat' : 'Pin Chat'}</span>
                          </button>
                          <button
                            onClick={handleToggleArchiveChat}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 flex items-center gap-2 transition-colors"
                          >
                            <Archive className="h-3.5 w-3.5 text-gray-500" />
                            <span>{activeChat?.archivedBy?.includes(currentUser?.uid || '') ? 'Unarchive Chat' : 'Archive Chat'}</span>
                          </button>
                          <hr className="border-gray-100 dark:border-slate-800/50 my-1" />
                          <button
                            onClick={handleDeleteConversation}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Conversation</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Search inside conversation */}
              {isMessageSearchOpen && (
                <div className="px-4.5 py-2 border-b border-gray-100 dark:border-slate-800/50 bg-indigo-50/20 dark:bg-indigo-950/10 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search this conversation..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="w-full text-[11px] pl-8 pr-8 py-1.5 rounded-xl border border-gray-150 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-indigo-500 focus:outline-none text-gray-800 dark:text-slate-100"
                    />
                    {messageSearchQuery && (
                      <button onClick={() => setMessageSearchQuery('')} className="absolute right-2.5 top-2 text-gray-400">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Log container */}
              <div
                ref={chatLogContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4.5 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800 bg-gray-50/10 dark:bg-slate-950/10"
              >
                {isLoadingMessages ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Clock className="h-6 w-6 text-indigo-400 animate-spin mb-2" />
                    <span className="text-xs text-gray-400">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-transparent">
                    <MessageSquare className="h-8 w-8 text-indigo-500 animate-bounce mb-3" />
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-200">This is the start of your secure chat</p>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">All conversations are real-time, peer-secured, and stored natively.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hasMoreMessages && (
                      <div className="text-center py-2">
                        <button
                          onClick={() => setMessageLimit(prev => prev + 25)}
                          className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 dark:bg-slate-800 px-3 py-1 rounded-full cursor-pointer"
                        >
                          Load Previous Messages
                        </button>
                      </div>
                    )}

                    {messages.map((msg, index) => {
                      const isMe = msg.senderId === currentUser?.uid;
                      const isQueryMatched = messageSearchQuery.trim() && msg.text.toLowerCase().includes(messageSearchQuery.toLowerCase());
                      const isFirstInCluster = index === 0 || messages[index - 1].senderId !== msg.senderId;
                      const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={msg.messageId}
                          className={`flex items-start gap-2.5 group relative ${isMe ? 'justify-end' : 'justify-start'} ${
                            isQueryMatched ? 'ring-1 ring-amber-400 bg-amber-50/5 rounded-2xl p-1' : ''
                          }`}
                        >
                          {!isMe && (
                            <div className="w-8 flex-shrink-0">
                              {isFirstInCluster && (
                                <Avatar src={msg.senderPhotoURL} fallback={msg.senderName} size="xs" className="border border-gray-150" />
                              )}
                            </div>
                          )}

                          <div className={`flex flex-col max-w-[70%] text-left relative ${isMe ? 'items-end' : 'items-start'}`}>
                            {msg.replyToId && (
                              <div className="mb-1 flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 py-1 px-2 rounded-lg max-w-full truncate border border-gray-200/10">
                                <CornerUpLeft className="h-2.5 w-2.5 text-indigo-400 flex-shrink-0" />
                                <span className="font-semibold truncate max-w-[80px]">{msg.replyToSenderName}:</span>
                                <span className="italic truncate">{msg.replyToText}</span>
                              </div>
                            )}

                            {/* Main Message Bubble */}
                            <div className="relative">
                              <div
                                className={`text-xs px-3.5 py-2.5 rounded-2xl leading-relaxed shadow-xs ${
                                  isMe
                                    ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-tr-none font-medium'
                                    : 'bg-white dark:bg-slate-850 text-gray-800 dark:text-slate-200 border border-gray-150/40 dark:border-slate-800 rounded-tl-none'
                                }`}
                              >
                                {highlightMessageText(msg.text)}

                                {/* Media Attachments inside Message bubble */}
                                {msg.attachmentUrl && (
                                  <div className="mt-2.5 overflow-hidden rounded-xl border border-gray-100/10 bg-slate-900/10">
                                    {msg.attachmentType === 'image' && (
                                      <img src={msg.attachmentUrl} alt="shared asset" className="max-w-full max-h-48 object-cover rounded-xl cursor-zoom-in" onClick={() => window.open(msg.attachmentUrl, '_blank')} />
                                    )}
                                    {msg.attachmentType === 'video' && (
                                      <video src={msg.attachmentUrl} controls className="max-w-full rounded-xl" />
                                    )}
                                    {msg.attachmentType === 'audio' && (
                                      <audio src={msg.attachmentUrl} controls className="max-w-full p-1" />
                                    )}
                                    {msg.attachmentType === 'file' && (
                                      <a
                                        href={msg.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2.5 text-[11px] text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-xl"
                                      >
                                        <Paperclip className="h-3.5 w-3.5" />
                                        <span className="truncate flex-1 font-bold">{msg.attachmentName || 'Shared Document'}</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.entries(msg.reactions).map(([emoji, uids]) => (
                                    <button
                                      key={emoji}
                                      onClick={() => addMessageReaction(chatId, msg.messageId, currentUser!.uid, emoji)}
                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] border bg-white dark:bg-slate-900 text-gray-500"
                                    >
                                      <span>{emoji}</span>
                                      <span>{uids.length}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400 font-mono">
                              <span>{timeStr}</span>
                              {isMe && (
                                <span className="ml-0.5">
                                  {msg.status === 'seen' ? (
                                    <CheckCheck className="h-3 w-3 text-indigo-400" />
                                  ) : msg.status === 'delivered' ? (
                                    <CheckCheck className="h-3 w-3 text-gray-400" />
                                  ) : (
                                    <Check className="h-3 w-3 text-gray-400" />
                                  )}
                                </span>
                              )}
                              {msg.isPinned && <Pin className="h-2.5 w-2.5 text-indigo-500 fill-indigo-500" />}
                              {msg.isEdited && <span className="text-[8px] italic">(edited)</span>}
                            </div>

                            {/* Hover Actions Menu (Desktop floating) */}
                            <div
                              className="hidden group-hover:flex absolute top-1/2 -translate-y-1/2 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-800 shadow-lg rounded-2xl p-1 z-10 gap-1 animate-fade"
                              style={{ [isMe ? 'left' : 'right']: '-150px' }}
                            >
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => addMessageReaction(chatId, msg.messageId, currentUser!.uid, emoji)}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <hr className="border-gray-100 dark:border-slate-800 w-px h-4 self-center mx-0.5" />
                              <button onClick={() => setReplyingTo(msg)} className="p-1 text-gray-500 hover:text-indigo-600 rounded">
                                <CornerUpLeft className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleOpenForward(msg)} className="p-1 text-gray-500 hover:text-indigo-600 rounded">
                                <Forward className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleTogglePinMessage(msg)} className="p-1 text-gray-500 hover:text-indigo-600 rounded">
                                <Pin className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleStartEdit(msg)} className="p-1 text-gray-500 hover:text-indigo-600 rounded">
                                <Sparkles className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDeleteMe(msg)} className="p-1 text-gray-500 hover:text-red-500 rounded" title="Delete for me">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              {isMe && (
                                <button onClick={() => handleDeleteEveryone(msg)} className="p-1 text-red-500 hover:text-red-600 rounded" title="Delete for everyone">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Requests Accept/Decline Overlay Banner */}
              {activeChat.status === 'request' && activeChat.recipientId === currentUser?.uid && (
                <div className="p-4 bg-indigo-50/90 dark:bg-slate-900 border-t border-indigo-100 flex flex-col items-center justify-center text-center gap-2.5 z-10 animate-slide">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Shield className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">Incoming Message Request</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-300 max-w-sm">
                    @{activePeer.username} wants to communicate with you, but you do not follow them. They won't see read receipts until you accept.
                  </p>
                  <div className="flex gap-2 w-full max-w-md justify-center">
                    <Button onClick={handleAcceptRequest} size="sm" variant="primary" className="text-[10px] font-bold px-4">Accept</Button>
                    <Button onClick={handleDeclineRequest} size="sm" variant="outline" className="text-[10px] font-bold px-4">Decline</Button>
                    <Button onClick={handleBlockRequest} size="sm" variant="outline" className="text-[10px] font-bold px-4 text-amber-600 border-amber-200">Block</Button>
                    <Button onClick={handleReportRequest} size="sm" variant="outline" className="text-[10px] font-bold px-4 text-red-600 border-red-200">Report</Button>
                  </div>
                </div>
              )}

              {/* Message Composer Footer */}
              {activeChat.status !== 'request' && (
                <div className="p-3 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-150 dark:border-slate-800/80 z-10 flex flex-col gap-2">
                  
                  {replyingTo && (
                    <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-indigo-50/50 dark:bg-slate-850 text-xs border border-indigo-150/20">
                      <div className="flex items-center gap-1.5 truncate">
                        <CornerUpLeft className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="font-bold text-indigo-600">Replying to {replyingTo.senderName}:</span>
                        <span className="text-gray-500 truncate max-w-sm">{replyingTo.text}</span>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {editingMsg && (
                    <div className="flex flex-col gap-2 p-2 bg-amber-50/50 dark:bg-slate-850 border border-amber-200/20 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-600">Editing Message:</span>
                        <button onClick={() => setEditingMsg(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-950 border border-gray-100 rounded-lg p-1.5 text-xs focus:outline-none"
                        />
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-2.5">
                    {/* Media Attachments Dropdown Menu */}
                    <div className="flex items-center gap-1">
                      <label className="p-2 text-gray-500 hover:text-indigo-600 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50" title="Share Document / Image / Video">
                        <Paperclip className="h-4.5 w-4.5" />
                        <input type="file" onChange={handleFileUpload} className="hidden" />
                      </label>

                      {/* Native mic recording trigger */}
                      {isRecording ? (
                        <div className="flex items-center gap-1.5 bg-red-500 text-white rounded-xl px-2.5 py-1.5 text-[10px] font-bold animate-pulse">
                          <Mic className="h-3.5 w-3.5" />
                          <span>{formatDuration(recordingDuration)}</span>
                          <button onClick={() => stopRecording(true)} className="p-0.5 hover:bg-white/20 rounded font-bold ml-1 text-white">Send</button>
                          <button onClick={() => stopRecording(false)} className="p-0.5 hover:bg-white/20 rounded font-bold ml-1 text-white">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={startRecording} className="p-2 text-gray-500 hover:text-indigo-600 rounded-xl" title="Record Voice Note">
                          <Mic className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-xl">
                        <Smile className="h-4.5 w-4.5" />
                      </button>

                      {showEmojiPicker && (
                        <>
                          <div onClick={() => setShowEmojiPicker(false)} className="fixed inset-0 z-20" />
                          <div className="absolute left-0 bottom-12 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-30 w-64 animate-slide">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Emojis</p>
                            <div className="grid grid-cols-6 gap-2">
                              {COMMON_EMOJIS.map((emoji) => (
                                <button key={emoji} onClick={() => setInputMessage(prev => prev + emoji)} className="text-lg p-0.5 hover:bg-gray-50 dark:hover:bg-slate-800 rounded">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-150 px-3.5 py-1">
                      <textarea
                        ref={inputRef}
                        placeholder="Type a secure message..."
                        value={inputMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-xs py-2 text-gray-800 dark:text-slate-100 placeholder-gray-400 resize-none min-h-[36px] max-h-[120px]"
                      />
                    </div>

                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isSending}
                      className={`h-11 w-11 rounded-2xl !p-0 flex items-center justify-center cursor-pointer transition-all ${
                        inputMessage.trim() ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Send className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 dark:bg-slate-900/5">
              <div className="h-14 w-14 rounded-full bg-indigo-50 dark:bg-slate-850 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm border border-gray-100/50">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 mb-1.5">No Conversation Loaded</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm">
                Choose an existing conversation thread from your left side drawer menu, or start a new contact discussion with peer colleagues.
              </p>
              <Button onClick={() => setIsNewChatOpen(true)} className="mt-4 text-xs font-bold gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>Start New Chat</span>
              </Button>
            </div>
          )}
        </div>

        {/* =======================================
            SECTION 3: USER PROFILE INFORMATION PANEL (Desktop-Only)
            ======================================= */}
        <div className="hidden lg:flex lg:col-span-3 border-l border-gray-150 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex-col h-full overflow-y-auto">
          {activePeer ? (
            <div className="p-5 flex flex-col items-center text-center">
              <div className="relative mb-4 mt-2">
                <Avatar
                  src={activePeer.photoURL}
                  fallback={activePeer.displayName || activePeer.username || 'Peer'}
                  size="xl"
                  isOnline={presenceMap[activePeer.uid]?.status === 'online'}
                  className="border-2 border-indigo-100 dark:border-slate-800 shadow-md animate-fade"
                />
              </div>

              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 block">
                {activePeer.displayName || activePeer.fullName}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono block mb-3">
                @{activePeer.username}
              </span>

              {activePeer.role === 'admin' && (
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full flex items-center gap-1">
                  Verified Admin
                </span>
              )}

              <hr className="border-gray-100 dark:border-slate-800/60 w-full my-4.5" />

              <div className="w-full text-left space-y-4 px-1.5">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Bio Description
                  </span>
                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed bg-gray-50/50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-150/20">
                    {activePeer.bio || 'This user hasn\'t published a biography yet.'}
                  </p>
                </div>

                {activePeer.location && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider w-16">
                      Location
                    </span>
                    <span className="font-medium truncate">{activePeer.location}</span>
                  </div>
                )}

                {activePeer.website && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider w-16">
                      Website
                    </span>
                    <a
                      href={activePeer.website.startsWith('http') ? activePeer.website : `https://${activePeer.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold truncate"
                    >
                      <span>Visit site</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="w-full mt-6 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold"
                  onClick={() => navigate(`/profile/${activePeer.username}`)}
                >
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  <span>View Full Profile</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 h-full flex flex-col items-center justify-center text-center text-gray-400 bg-transparent">
              <Mail className="h-8 w-8 text-gray-200 dark:text-slate-800 mb-2 animate-pulse" />
              <p className="text-[11px] font-medium leading-relaxed max-w-[180px]">
                Select an active conversation to view biography and other social detail directories.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* =======================================
          MODAL: START NEW CONVERSATION (Hierarchical Contacts List)
          ======================================= */}
      <Modal
        isOpen={isNewChatOpen}
        onClose={() => {
          setIsNewChatOpen(false);
          setUserSearchTerm('');
          setUserSearchResults([]);
        }}
        title="Start New Secure Chat"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Select a verified colleague or search in real time by display name, username, or full name.
          </p>

          {/* Real-time Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users... (e.g. clara, admin)"
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-gray-150 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-950 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-gray-800 dark:text-slate-100"
              autoFocus
            />
            {isSearchingUsers && (
              <div className="absolute right-3.5 top-3">
                <Clock className="h-4 w-4 text-indigo-500 animate-spin" />
              </div>
            )}
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {/* Real-time search results overrides suggestions */}
            {userSearchTerm.trim() ? (
              userSearchResults.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">Search Results</span>
                  {userSearchResults.map((peer) => (
                    <div
                      key={peer.uid}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 border border-transparent transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={peer.photoURL} fallback={peer.displayName || peer.username || '?'} size="md" isOnline={presenceMap[peer.uid]?.status === 'online'} />
                        <div className="text-left">
                          <span className="text-xs font-extrabold text-gray-950 dark:text-gray-100 flex items-center gap-1">
                            {peer.displayName || peer.fullName}
                            {peer.role === 'admin' && <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" title="Verified Admin" />}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">@{peer.username}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleFollow(peer)}
                          className={`text-[9px] font-extrabold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            followingStatusMap[peer.uid]
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-indigo-50 text-indigo-600 border-indigo-200/50'
                          }`}
                        >
                          {followingStatusMap[peer.uid] ? 'Unfollow' : 'Follow'}
                        </button>
                        <Button size="sm" onClick={() => handleStartChat(peer)} className="text-[10px] font-bold">Message</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-xs font-semibold">No peers found matching "{userSearchTerm}"</p>
                </div>
              )
            ) : isLoadingStartLists ? (
              <div className="flex items-center justify-center py-10 gap-2">
                <Clock className="h-5 w-5 text-indigo-500 animate-spin" />
                <span className="text-xs text-gray-400">Loading suggested peers list...</span>
              </div>
            ) : (
              // Suggestion lists in requested order
              <div className="space-y-4 pt-1">
                {/* 1. Users I follow */}
                {startChatLists.following.length > 0 && (
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-indigo-500" />
                      <span>Users I Follow</span>
                    </span>
                    <div className="space-y-1">
                      {startChatLists.following.map((peer) => (
                        <div key={peer.uid} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/20 border border-transparent">
                          <div className="flex items-center gap-3">
                            <Avatar src={peer.photoURL} fallback={peer.displayName || peer.username || '?'} size="sm" isOnline={presenceMap[peer.uid]?.status === 'online'} />
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{peer.displayName || peer.fullName}</span>
                              <span className="text-[9px] text-gray-400 block font-mono">@{peer.username}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleFollow(peer)}
                              className="text-[9px] font-bold px-2 py-1 rounded-lg border bg-gray-100 text-gray-600"
                            >
                              Unfollow
                            </button>
                            <Button size="sm" variant="outline" className="text-[10px] font-bold" onClick={() => handleStartChat(peer)}>Message</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Users who follow me */}
                {startChatLists.followers.length > 0 && (
                  <div>
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-2">Users Who Follow Me</span>
                    <div className="space-y-1">
                      {startChatLists.followers.map((peer) => (
                        <div key={peer.uid} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/20 border border-transparent">
                          <div className="flex items-center gap-3">
                            <Avatar src={peer.photoURL} fallback={peer.displayName || peer.username || '?'} size="sm" isOnline={presenceMap[peer.uid]?.status === 'online'} />
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{peer.displayName || peer.fullName}</span>
                              <span className="text-[9px] text-gray-400 block font-mono">@{peer.username}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleFollow(peer)}
                              className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
                                followingStatusMap[peer.uid] ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                              }`}
                            >
                              {followingStatusMap[peer.uid] ? 'Unfollow' : 'Follow'}
                            </button>
                            <Button size="sm" variant="outline" className="text-[10px] font-bold" onClick={() => handleStartChat(peer)}>Message</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Mutual followers */}
                {startChatLists.mutual.length > 0 && (
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Mutual Followers</span>
                    </span>
                    <div className="space-y-1">
                      {startChatLists.mutual.map((peer) => (
                        <div key={peer.uid} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/20 border border-transparent">
                          <div className="flex items-center gap-3">
                            <Avatar src={peer.photoURL} fallback={peer.displayName || peer.username || '?'} size="sm" isOnline={presenceMap[peer.uid]?.status === 'online'} />
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{peer.displayName || peer.fullName}</span>
                              <span className="text-[9px] text-gray-400 block font-mono">@{peer.username}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleFollow(peer)}
                              className="text-[9px] font-bold px-2 py-1 rounded-lg border bg-gray-100 text-gray-600"
                            >
                              Unfollow
                            </button>
                            <Button size="sm" variant="outline" className="text-[10px] font-bold" onClick={() => handleStartChat(peer)}>Message</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Nearby users */}
                {startChatLists.nearby.length > 0 && (
                  <div>
                    <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Nearby Users</span>
                    </span>
                    <div className="space-y-1">
                      {startChatLists.nearby.map((peer) => (
                        <div key={peer.uid} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/20 border border-transparent">
                          <div className="flex items-center gap-3">
                            <Avatar src={peer.photoURL} fallback={peer.displayName || peer.username || '?'} size="sm" isOnline={presenceMap[peer.uid]?.status === 'online'} />
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{peer.displayName || peer.fullName}</span>
                              <span className="text-[9px] text-gray-450 block">{peer.location || 'Nearby'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleFollow(peer)}
                              className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
                                followingStatusMap[peer.uid] ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                              }`}
                            >
                              {followingStatusMap[peer.uid] ? 'Unfollow' : 'Follow'}
                            </button>
                            <Button size="sm" variant="outline" className="text-[10px] font-bold" onClick={() => handleStartChat(peer)}>Message</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Remaining users sorted by activity */}
                {startChatLists.remaining.length > 0 && (
                  <div>
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-2">Remaining Contacts</span>
                    <div className="space-y-1">
                      {startChatLists.remaining.map((peer) => (
                        <div key={peer.uid} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/20 border border-transparent">
                          <div className="flex items-center gap-3">
                            <Avatar src={peer.photoURL} fallback={peer.displayName || peer.username || '?'} size="sm" isOnline={presenceMap[peer.uid]?.status === 'online'} />
                            <div className="text-left">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{peer.displayName || peer.fullName}</span>
                              <span className="text-[9px] text-gray-400 block font-mono">@{peer.username}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleFollow(peer)}
                              className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
                                followingStatusMap[peer.uid] ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                              }`}
                            >
                              {followingStatusMap[peer.uid] ? 'Unfollow' : 'Follow'}
                            </button>
                            <Button size="sm" variant="outline" className="text-[10px] font-bold" onClick={() => handleStartChat(peer)}>Message</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* =======================================
          MODAL: FORWARD MESSAGE DIRECTORY
          ======================================= */}
      <Modal
        isOpen={isForwardModalOpen}
        onClose={() => {
          setIsForwardModalOpen(false);
          setForwardingMsg(null);
        }}
        title="Forward Message"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Select which active peer conversation you wish to forward this message to:</p>
          <div className="max-h-[250px] overflow-y-auto space-y-1.5 pr-1">
            {chats.map(chat => {
              const otherId = chat.participants.find(id => id !== currentUser?.uid);
              const peer = otherId ? userProfileCache[otherId] : null;
              if (!peer) return null;

              return (
                <div
                  key={chat.chatId}
                  onClick={() => handleConfirmForward(chat)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 border border-transparent cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={peer.photoURL} fallback={peer.displayName || peer.username || '?'} size="sm" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{peer.displayName || peer.fullName}</span>
                      <span className="text-[9px] text-gray-400 block font-mono">@{peer.username}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-[10px] font-bold">Forward</Button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default MessagesPage;
