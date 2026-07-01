/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Edit2,
  Trash2,
  Smile,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { showToast } from './ui/Toast';
import {
  Comment,
  Reply,
  listenToComments,
  listenToReplies,
  addComment,
  editComment,
  deleteComment,
  likeComment,
  addReply,
  editReply,
  deleteReply,
  likeReply
} from '../services/commentService';
import { searchProfiles } from '../services/authService';
import { UserProfile } from '../types';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, postId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Input States
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Edit / Reply Focus States
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Mentions Suggestion State
  const [mentionQuery, setMentionQuery] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [mentionIndex, setMentionIndex] = useState(-1);

  // Active expanded replies map
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentListRef = useRef<HTMLDivElement>(null);

  // Listen to comments
  useEffect(() => {
    if (!isOpen || !postId) return;
    setLoading(true);

    const unsubscribe = listenToComments(
      postId,
      (fetchedComments) => {
        setComments(fetchedComments);
        setLoading(false);
      },
      (err) => {
        console.error('Error in comments listener:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, postId]);

  // Handle Mentions autocomplete parsing
  useEffect(() => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = inputText.substring(0, cursorPosition);
    const words = textBeforeCursor.split(/[\s\n]+/);
    const lastWord = words[words.length - 1] || '';

    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const q = lastWord.substring(1);
      setMentionQuery(q);
    } else {
      setMentionQuery('');
      setSuggestedUsers([]);
    }
  }, [inputText]);

  // Query users based on mention query
  useEffect(() => {
    if (!mentionQuery) return;
    let cancelled = false;

    const fetchSuggestions = async () => {
      const results = await searchProfiles(mentionQuery);
      if (!cancelled) {
        setSuggestedUsers(results.slice(0, 5));
        setMentionIndex(0);
      }
    };

    const delayDebounce = setTimeout(fetchSuggestions, 200);
    return () => {
      cancelled = true;
      clearTimeout(delayDebounce);
    };
  }, [mentionQuery]);

  if (!isOpen) return null;

  // Insert selected mention into textarea
  const handleSelectMention = (suggestedUser: UserProfile) => {
    if (!suggestedUser.username) return;
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = inputText.substring(0, cursorPosition);
    const textAfterCursor = inputText.substring(cursorPosition);

    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newTextBefore = textBeforeCursor.substring(0, lastAtIndex) + `@${suggestedUser.username} `;
      setInputText(newTextBefore + textAfterCursor);
      setSuggestedUsers([]);
      setMentionQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
        const newPos = newTextBefore.length;
        inputRef.current?.setSelectionRange(newPos, newPos);
      }, 50);
    }
  };

  // Sorted Comments List
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  });

  // Submit main comment or nested reply
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    try {
      const profile: UserProfile = {
        uid: user.uid,
        username: user.displayName?.toLowerCase().replace(/\s+/g, '_') || 'user',
        displayName: user.displayName || 'OpenComm Member',
        photoURL: user.photoURL || '',
        ...user
      };

      if (replyToComment) {
        await addReply(replyToComment.commentId, postId, inputText.trim(), profile);
        // Automatically expand replies for this comment
        setExpandedReplies((prev) => ({ ...prev, [replyToComment.commentId]: true }));
        showToast.success('Reply posted successfully!');
        setReplyToComment(null);
      } else {
        await addComment(postId, inputText.trim(), profile);
        showToast.success('Comment added successfully!');
      }

      setInputText('');
      setShowEmojiPicker(false);
    } catch (err) {
      showToast.error('Failed to post. Please try again.');
    }
  };

  // Quick select emojis
  const EMOJIS = ['😀', '😂', '😍', '🔥', '👏', '❤️', '🎉', '👍', '🚀', '💯', '🙌', '👀'];

  const handleAddEmoji = (emoji: string) => {
    const cursor = inputRef.current?.selectionStart || 0;
    const before = inputText.substring(0, cursor);
    const after = inputText.substring(cursor);
    setInputText(before + emoji + after);
    setShowEmojiPicker(false);
    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = cursor + emoji.length;
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // Helper to format text with styled @mentions
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('@') && part.length > 1) {
        return (
          <span key={index} className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Render Time Elapsed helper
  const formatTimeAgo = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = now - time;

    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;

    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;

    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative flex flex-col w-full h-full sm:h-[85vh] sm:max-w-2xl bg-white dark:bg-slate-900 sm:rounded-2xl border border-gray-100 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Comments ({comments.length})
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Sorting Toggles */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  sortBy === 'newest'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  sortBy === 'oldest'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Oldest
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Comment list container */}
        <div
          ref={commentListRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 dark:text-slate-500">Retrieving feedback...</p>
            </div>
          ) : sortedComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="p-4 bg-indigo-50 dark:bg-slate-800/50 rounded-full mb-3 text-indigo-500">
                <MessageCircle className="h-8 w-8" />
              </div>
              <p className="text-gray-900 dark:text-white font-semibold">No comments yet</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs">
                Be the first to share your perspective on this conversation! Use @username to tag friends.
              </p>
            </div>
          ) : (
            sortedComments.map((comment) => (
              <CommentItem
                key={comment.commentId}
                comment={comment}
                postId={postId}
                user={user}
                expandedReplies={expandedReplies}
                setExpandedReplies={setExpandedReplies}
                replyToComment={replyToComment}
                setReplyToComment={setReplyToComment}
                editingCommentId={editingCommentId}
                setEditingCommentId={setEditingCommentId}
                editingReplyId={editingReplyId}
                setEditingReplyId={setEditingReplyId}
                editText={editText}
                setEditText={setEditText}
                renderFormattedText={renderFormattedText}
                formatTimeAgo={formatTimeAgo}
                inputRef={inputRef}
              />
            ))
          )}
        </div>

        {/* Footer Composition Area */}
        <div className="relative border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/80 p-4">
          {/* Autocomplete Suggestions Box */}
          <AnimatePresence>
            {suggestedUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute left-4 right-4 bottom-full mb-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto"
              >
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-700 text-[10px] font-bold tracking-wider text-gray-400 dark:text-slate-500 uppercase">
                  Mention user
                </div>
                {suggestedUsers.map((u, idx) => (
                  <button
                    key={u.uid}
                    onClick={() => handleSelectMention(u)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Avatar src={u.photoURL || u.profileImage} fallback={u.displayName || u.username} alt={u.displayName} className="h-6 w-6" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {u.displayName || u.fullName}
                        </span>
                        {(u.role === 'admin' || u.isProfilePublic === true) && <CheckCircle className="h-3.5 w-3.5 text-blue-500 fill-current" />}
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-400">
                        @{u.username}
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Reply Banner */}
          {replyToComment && (
            <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg mb-2 text-xs text-indigo-700 dark:text-indigo-300">
              <span className="truncate">
                Replying to <strong>@{replyToComment.username}</strong>
              </span>
              <button
                onClick={() => setReplyToComment(null)}
                className="p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Emoji Toolbar */}
          <div className="flex flex-wrap gap-1 mb-2 items-center">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              type="button"
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-all mr-1 cursor-pointer"
              title="Add emojis"
            >
              <Smile className="h-4 w-4" />
            </button>
            {EMOJIS.map((emo) => (
              <button
                key={emo}
                type="button"
                onClick={() => handleAddEmoji(emo)}
                className="text-sm px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {emo}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={replyToComment ? 'Write a reply...' : 'Write a comment... use @ to tag'}
                rows={1}
                className="w-full bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white rounded-xl px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 resize-none max-h-32 min-h-[42px] pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={!inputText.trim()}
              className="h-[42px] px-4 rounded-xl shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// Sub-Component for individual Comment + Nesting replies
interface CommentItemProps {
  comment: Comment;
  postId: string;
  user: any;
  expandedReplies: Record<string, boolean>;
  setExpandedReplies: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  replyToComment: Comment | null;
  setReplyToComment: React.Dispatch<React.SetStateAction<Comment | null>>;
  editingCommentId: string | null;
  setEditingCommentId: React.Dispatch<React.SetStateAction<string | null>>;
  editingReplyId: string | null;
  setEditingReplyId: React.Dispatch<React.SetStateAction<string | null>>;
  editText: string;
  setEditText: React.Dispatch<React.SetStateAction<string>>;
  renderFormattedText: (text: string) => React.ReactNode;
  formatTimeAgo: (dateStr: string) => string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  user,
  expandedReplies,
  setExpandedReplies,
  setReplyToComment,
  editingCommentId,
  setEditingCommentId,
  editText,
  setEditText,
  renderFormattedText,
  formatTimeAgo,
  inputRef
}) => {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  // Subscribe to replies
  useEffect(() => {
    let unsubscribe = () => {};
    if (expandedReplies[comment.commentId]) {
      unsubscribe = listenToReplies(
        comment.commentId,
        (fetchedReplies) => {
          setReplies(fetchedReplies);
        },
        (err) => {
          console.error(err);
        }
      );
    }
    return () => unsubscribe();
  }, [expandedReplies, comment.commentId]);

  const isLiked = comment.likedBy?.includes(user?.uid) || false;

  const handleLike = async () => {
    if (!user) return;
    try {
      await likeComment(comment.commentId, user.uid);
    } catch (e) {
      showToast.error('Failed to update like status');
    }
  };

  const handleEditInit = () => {
    setEditingCommentId(comment.commentId);
    setEditText(comment.text);
    setShowOptions(false);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim()) return;
    try {
      await editComment(comment.commentId, editText.trim());
      setEditingCommentId(null);
      showToast.success('Comment updated!');
    } catch {
      showToast.error('Failed to update comment');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment(comment.commentId, postId);
        showToast.success('Comment deleted');
      } catch {
        showToast.error('Failed to delete comment');
      }
    }
  };

  const toggleRepliesExpand = () => {
    setExpandedReplies((prev) => ({
      ...prev,
      [comment.commentId]: !prev[comment.commentId]
    }));
  };

  const handleReplyInit = () => {
    setReplyToComment(comment);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="flex gap-3 group/comment align-start">
      <Avatar src={comment.userId === user?.uid ? (user?.photoURL || comment.profilePhoto) : comment.profilePhoto} fallback={comment.displayName || comment.username} alt={comment.displayName} className="h-9 w-9 mt-0.5 border border-gray-100 dark:border-slate-800" />

      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 dark:bg-slate-800/40 px-3.5 py-2.5 rounded-2xl relative">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {comment.displayName}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-400">
                @{comment.username}
              </span>
            </div>

            {/* Quick Actions (only shown if owned by user) */}
            {user && user.uid === comment.userId && (
              <div className="relative">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>

                {showOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                    <div className="absolute right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg shadow-xl z-20 py-1 min-w-[100px] text-xs">
                      <button
                        onClick={handleEditInit}
                        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {editingCommentId === comment.commentId ? (
            <div className="space-y-2 mt-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={2}
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setEditingCommentId(null)}
                  className="px-2.5 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="px-2.5 py-1 text-[10px] font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {renderFormattedText(comment.text)}
            </p>
          )}
        </div>

        {/* Comment actions row */}
        <div className="flex items-center gap-4 mt-1.5 px-2 text-[10px] font-semibold text-gray-500 dark:text-slate-400">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 group transition-colors cursor-pointer ${
              isLiked ? 'text-rose-500' : 'hover:text-rose-500'
            }`}
          >
            <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : 'scale-90 group-hover:scale-105'}`} />
            <span>{comment.likesCount} Likes</span>
          </button>

          <button
            onClick={handleReplyInit}
            className="flex items-center gap-1 hover:text-indigo-500 transition-colors cursor-pointer"
          >
            <MessageCircle className="h-3 w-3" />
            <span>Reply</span>
          </button>

          <span className="flex items-center gap-1 text-gray-400 dark:text-slate-500">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(comment.createdAt)}</span>
          </span>

          {comment.isEdited && <span className="text-gray-400 dark:text-slate-500 font-normal italic">Edited</span>}
        </div>

        {/* Expand Replies Toggle */}
        {(comment.repliesCount > 0 || replies.length > 0) && (
          <button
            onClick={toggleRepliesExpand}
            className="flex items-center gap-1.5 mt-2 px-2 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
          >
            {expandedReplies[comment.commentId] ? (
              <>
                <ChevronUp className="h-3 w-3" />
                <span>Hide {comment.repliesCount || replies.length} replies</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                <span>View {comment.repliesCount || replies.length} replies</span>
              </>
            )}
          </button>
        )}

        {/* Nested Replies Rendering */}
        <AnimatePresence>
          {expandedReplies[comment.commentId] && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pl-4 border-l-1.5 border-gray-100 dark:border-slate-800 space-y-3.5 overflow-hidden"
            >
              {replies.map((reply) => (
                <ReplyItem
                  key={reply.replyId}
                  reply={reply}
                  commentId={comment.commentId}
                  user={user}
                  renderFormattedText={renderFormattedText}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Nested Reply Item Component
interface ReplyItemProps {
  reply: Reply;
  commentId: string;
  user: any;
  renderFormattedText: (text: string) => React.ReactNode;
  formatTimeAgo: (dateStr: string) => string;
}

const ReplyItem: React.FC<ReplyItemProps> = ({ reply, commentId, user, renderFormattedText, formatTimeAgo }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(reply.text);

  const isLiked = reply.likedBy?.includes(user?.uid) || false;

  const handleLike = async () => {
    if (!user) return;
    try {
      await likeReply(reply.replyId, user.uid);
    } catch {
      showToast.error('Failed to update like status');
    }
  };

  const handleEditInit = () => {
    setIsEditing(true);
    setEditText(reply.text);
    setShowOptions(false);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim()) return;
    try {
      await editReply(reply.replyId, editText.trim());
      setIsEditing(false);
      showToast.success('Reply updated!');
    } catch {
      showToast.error('Failed to update reply');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this reply?')) {
      try {
        await deleteReply(reply.replyId, commentId);
        showToast.success('Reply deleted');
      } catch {
        showToast.error('Failed to delete reply');
      }
    }
  };

  return (
    <div className="flex gap-2.5">
      <Avatar src={reply.userId === user?.uid ? (user?.photoURL || reply.profilePhoto) : reply.profilePhoto} fallback={reply.displayName || reply.username} alt={reply.displayName} className="h-7 w-7 mt-0.5 border border-gray-100 dark:border-slate-800" />

      <div className="flex-1 min-w-0">
        <div className="bg-gray-50/70 dark:bg-slate-800/20 px-3 py-2 rounded-xl relative">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                {reply.displayName}
              </span>
              <span className="text-[9px] text-gray-400 dark:text-slate-400">
                @{reply.username}
              </span>
            </div>

            {user && user.uid === reply.userId && (
              <div className="relative">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>

                {showOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                    <div className="absolute right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg shadow-xl z-20 py-1 min-w-[90px] text-[10px]">
                      <button
                        onClick={handleEditInit}
                        className="flex items-center gap-1 w-full px-2 py-1 text-left hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-1 w-full px-2 py-1 text-left hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-1.5">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full text-xs p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={2}
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 text-[9px] font-medium text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="px-2 py-0.5 text-[9px] font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {renderFormattedText(reply.text)}
            </p>
          )}
        </div>

        {/* Reply actions row */}
        <div className="flex items-center gap-3 mt-1 px-1.5 text-[9px] font-semibold text-gray-400 dark:text-slate-500">
          <button
            onClick={handleLike}
            className={`flex items-center gap-0.5 hover:text-rose-500 transition-colors cursor-pointer ${
              isLiked ? 'text-rose-500' : ''
            }`}
          >
            <Heart className={`h-2.5 w-2.5 ${isLiked ? 'fill-current' : ''}`} />
            <span>{reply.likesCount} Likes</span>
          </button>

          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            <span>{formatTimeAgo(reply.createdAt)}</span>
          </span>

          {reply.isEdited && <span className="font-normal italic">Edited</span>}
        </div>
      </div>
    </div>
  );
};
