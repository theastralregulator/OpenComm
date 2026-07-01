import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageSquare, Eye, Bookmark, Share2, Lock } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Post } from '../types';
import { ImageCarousel } from './ImageCarousel';

interface PostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  user: any;
  formatPostTime: (isoString: string) => string;
  handleLikeToggle?: (postId: string) => void;
  handleSaveToggle?: (post: Post) => void;
  handleSharePost?: (post: Post) => void;
  likedPostIds?: Record<string, boolean>;
  savedPostIds?: Record<string, boolean>;
  onOpenComments?: (postId: string) => void;
}

export const PostModal: React.FC<PostModalProps> = ({
  post,
  isOpen,
  onClose,
  user,
  formatPostTime,
  handleLikeToggle,
  handleSaveToggle,
  handleSharePost,
  likedPostIds = {},
  savedPostIds = {},
  onOpenComments
}) => {
  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white dark:bg-slate-900 sm:rounded-2xl border border-gray-100 dark:border-slate-800 shadow-2xl overflow-y-auto"
      >
        {/* Header (Sticky) */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Avatar
              src={post.userId === user?.uid ? (user?.photoURL || post.profileImage) : post.profileImage}
              fallback={post.displayName || 'User'}
              size="md"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {post.displayName}
                </span>
                {post.visibility === 'private' && (
                  <span title="Private to Followers">
                    <Lock className="h-3 w-3 text-gray-400 dark:text-slate-500" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono tracking-tight">
                @{post.username} • {formatPostTime(post.createdAt)}
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Caption */}
          {post.caption && (
            <p className="text-[15px] md:text-[16px] text-slate-900 dark:text-slate-100 leading-relaxed font-normal whitespace-pre-wrap select-text tracking-normal mb-2">
              {post.caption}
            </p>
          )}

          {/* Attachment Image/Carousel Display */}
          {((post.imageUrls && post.imageUrls.length > 0) || post.imageUrl) && (
            <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800">
              <ImageCarousel 
                imageUrls={post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post.imageUrl!]} 
                aspectRatio={post.aspectRatio}
              />
            </div>
          )}
        </div>

        {/* Footer Interaction Bars */}
        <div className="px-5 py-4 border-t border-gray-50 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/50 sticky bottom-0">
          <div className="flex items-center gap-5 text-sm text-gray-500 dark:text-slate-400">
            {/* Like Action */}
            <button
              onClick={() => handleLikeToggle && handleLikeToggle(post.postId)}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer group ${
                likedPostIds[post.postId]
                  ? 'text-red-500 font-semibold'
                  : 'hover:text-red-500'
              }`}
            >
              <motion.span
                animate={likedPostIds[post.postId] ? { scale: [1, 1.4, 1.1, 1.2, 1] } : {}}
                transition={{ duration: 0.35 }}
                className="flex"
              >
                <Heart className={`h-5 w-5 ${likedPostIds[post.postId] ? 'fill-current' : ''}`} />
              </motion.span>
              <span>{post.likesCount}</span>
            </button>

            {/* Comment Action */}
            <button
              onClick={() => onOpenComments && onOpenComments(post.postId)}
              className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors cursor-pointer group"
            >
              <MessageSquare className="h-5 w-5 group-hover:scale-105 transition-transform" />
              <span>{post.commentsCount}</span>
            </button>

            {/* Views Count */}
            <div 
              className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500"
              title="Views"
            >
              <Eye className="h-5 w-5" />
              <span>{post.viewsCount || 0}</span>
            </div>

            {/* Bookmark Action */}
            <button
              onClick={() => handleSaveToggle && handleSaveToggle(post)}
              className={`flex items-center gap-1.5 transition-colors ml-auto cursor-pointer group ${
                savedPostIds[post.postId]
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'hover:text-indigo-500'
              }`}
              title={savedPostIds[post.postId] ? 'Saved to Bookmarks' : 'Save post'}
            >
              <Bookmark className={`h-5 w-5 group-hover:scale-110 transition-transform ${savedPostIds[post.postId] ? 'fill-current' : ''}`} />
            </button>

            {/* Share Action */}
            <button
              onClick={() => handleSharePost && handleSharePost(post)}
              className="flex items-center gap-1.5 hover:text-gray-600 dark:hover:text-slate-300 transition-colors cursor-pointer group"
              title="Share post creator"
            >
              <Share2 className="h-5 w-5 group-hover:scale-105 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
