/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Image,
  Globe,
  Lock,
  MessageSquare,
  Heart,
  Share2,
  Bookmark,
  MoreVertical,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Search,
  Eye,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  UserPlus,
  Compass
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Avatar } from '../components/ui/Avatar';
import { showToast } from '../components/ui/Toast';
import { uploadImage } from '../services/storageService';
import { getFriendlyErrorMessage } from '../services/firebase/errors';
import {
  createPost,
  editPost,
  deletePost,
  toggleLikePost,
  checkPostLiked,
  toggleSavePost,
  checkPostSaved,
  subscribeFeedPosts,
  reportPost,
  recordPostView,
  incrementPostShareCount
} from '../services/postService';
import { Post, UserProfile } from '../types';
import { DocumentSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebase/config';
import { CommentsModal } from '../components/CommentsModal';
import { SavedCollectionModal } from '../components/SavedCollectionModal';
import { ImageCarousel } from '../components/ImageCarousel';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { getRankedFeed, getSuggestedPeers, getTrendingTopics, TrendingTopic } from '../services/recommendationService';

// Helper to read natural image dimensions
const getImageDimensions = (file: File): Promise<{ width: number; height: number; aspectRatio: number }> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 800;
      resolve({
        width,
        height,
        aspectRatio: width / height
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 800, height: 800, aspectRatio: 1 });
    };
    img.src = url;
  });
};

// Memory-leak-safe sub-component to display image thumbnail in composer
const FileThumbnail: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!url) return null;
  return (
    <div className="relative h-16 w-16 rounded-xl border border-gray-200 dark:border-slate-800/80 overflow-hidden shrink-0 group shadow-xs">
      <img src={url} alt="Thumbnail preview" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 p-0.5 rounded-md bg-black/60 hover:bg-red-600 text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const PostViewRecorder: React.FC<{ postId: string; creatorId: string }> = ({ postId, creatorId }) => {
  const { user } = useAuth();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !postId || !elementRef.current) return;
    if (user.uid === creatorId) return; // Ignore creator views

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            recordPostView(postId, user.uid, creatorId);
            observer.disconnect(); // Only record once per mount
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [postId, user?.uid, creatorId]);

  return <div ref={elementRef} className="absolute top-0 left-0 w-full h-[2px] pointer-events-none opacity-0" />;
};

export const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Feed State
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [savedPostIds, setSavedPostIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Pagination cursors
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [lastTimestampMock, setLastTimestampMock] = useState<string | null>(null);

  // New Post State (Composer)
  const [composerCaption, setComposerCaption] = useState('');
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [composerVisibility, setComposerVisibility] = useState<'public' | 'private'>('public');
  const [isComposerSubmitting, setIsComposerSubmitting] = useState(false);
  const [composerProgress, setComposerProgress] = useState(0);

  // Modal Dialogs
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [postToReport, setPostToReport] = useState<Post | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Lightbox Image Viewer
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Active Post Options Menu
  const [openPostMenuId, setOpenPostMenuId] = useState<string | null>(null);

  // New Comment System State
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [activePostIdForComments, setActivePostIdForComments] = useState<string | null>(null);

  // New Saved Posts System State
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [activePostForSave, setActivePostForSave] = useState<Post | null>(null);

  // Refs
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Real-time subscription to community posts feed
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeFeedPosts(
      (fetchedPosts) => {
        setPosts(fetchedPosts);
        setLoading(false);
        setHasMore(false); // real-time feed displays all updates, no pagination needed
      },
      (err) => {
        console.error('Real-time feed connection error:', err);
        setLoading(false);
        showToast.error('Failed to load feed posts. Please refresh.');
      }
    );
    return () => unsubscribe();
  }, []);

  // Synchronize liked and bookmarked statuses whenever posts list or user changes
  useEffect(() => {
    if (!user || posts.length === 0) return;

    let isCancelled = false;
    const updateStatuses = async () => {
      const likesMap: Record<string, boolean> = {};
      const savesMap: Record<string, boolean> = {};

      await Promise.all(
        posts.map(async (post) => {
          try {
            const liked = await checkPostLiked(post.postId, user.uid);
            const saved = await checkPostSaved(post.postId, user.uid);
            likesMap[post.postId] = liked;
            savesMap[post.postId] = saved;
          } catch (err) {
            console.error('Error checking post status:', err);
          }
        })
      );

      if (!isCancelled) {
        setLikedPostIds(likesMap);
        setSavedPostIds(savesMap);
      }
    };

    updateStatuses();
    return () => {
      isCancelled = true;
    };
  }, [posts, user?.uid]);

  // Handle escape key for Lightbox and Modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setIsDeleteConfirmOpen(false);
        setIsReportModalOpen(false);
        setOpenPostMenuId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenPostMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Image Selection Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isModal = false) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;

    // Validate size and format
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validFiles = selectedFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        showToast.error(`Skipped: "${file.name}" (unsupported format)`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast.error(`Skipped: "${file.name}" (exceeds 10MB limit)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add to existing composer files (cap at 10)
    setComposerFiles(prev => {
      const merged = [...prev, ...validFiles];
      if (merged.length > 10) {
        showToast.error('Maximum of 10 images allowed. Extraneous files ignored.');
        return merged.slice(0, 10);
      }
      return merged;
    });

    setIsImageEditorOpen(true);
    if (!isModal) {
      setIsCreateModalOpen(true);
    }
  };

  const handleClearSelectedImage = () => {
    setComposerFiles([]);
    setComposerProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (modalFileInputRef.current) modalFileInputRef.current.value = '';
  };

  // Post Submission Handler
  const handlePublishPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!composerCaption.trim() && composerFiles.length === 0) {
      showToast.error('Please write some thoughts or attach an image.');
      return;
    }

    if (!user) {
      showToast.error('Session expired. Please log in.');
      return;
    }

    setIsComposerSubmitting(true);
    setComposerProgress(0);

    const uploadedUrls: string[] = [];
    try {
      if (composerFiles.length > 0) {
        for (let i = 0; i < composerFiles.length; i++) {
          const file = composerFiles[i];
          const path = `posts/${user.uid}/${Date.now()}_${i}_${file.name}`;
          try {
            const dims = await getImageDimensions(file);
            const url = await uploadImage(file, path, (progress) => {
              const singleProgressWeight = 100 / composerFiles.length;
              const completedWeight = i * singleProgressWeight;
              const activeProgressWeight = (progress / 100) * singleProgressWeight;
              setComposerProgress(Math.round(completedWeight + activeProgressWeight));
            });
            uploadedUrls.push(url);

            // Save image metadata document matching every single requested property
            if (isFirebaseConfigured && db) {
              try {
                const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                const imgMeta = {
                  imageId,
                  storagePath: path,
                  downloadURL: url,
                  width: dims.width,
                  height: dims.height,
                  aspectRatio: dims.aspectRatio,
                  ownerUid: user.uid,
                  userId: user.uid,
                  createdAt: new Date().toISOString(),
                  contentType: file.type || 'image/jpeg',
                  fileSize: file.size
                };
                await setDoc(doc(db, 'images', imageId), imgMeta);
              } catch (metaErr) {
                console.warn('Could not save image metadata document to Firestore:', metaErr);
              }
            }
          } catch (uploadErr) {
            console.error(`Image ${i} upload error:`, uploadErr);
            throw new Error('IMAGE_UPLOAD_FAILED');
          }
        }
      }

      try {
        await createPost({
          userId: user.uid,
          username: user.username || 'unknown',
          displayName: user.displayName || 'OpenComm User',
          profileImage: user.photoURL || 'https://api.dicebear.com/7.x/adventurer/svg?seed=OpenComm',
          caption: composerCaption.trim(),
          imageUrl: uploadedUrls[0] || undefined,
          imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
          visibility: composerVisibility
        });
      } catch (saveErr) {
        console.error('Firestore save error:', saveErr);
        throw saveErr;
      }

      // Reset Composer
      setComposerCaption('');
      handleClearSelectedImage();
      setIsCreateModalOpen(false);
      showToast.success('Your post has been published.');
    } catch (err: any) {
      console.error('Publish post general error:', err);
      if (err.message === 'IMAGE_UPLOAD_FAILED') {
        showToast.error('Unable to upload image. Please try again.');
      } else {
        showToast.error(`Unable to publish your post: ${getFriendlyErrorMessage(err)}`);
      }
    } finally {
      setIsComposerSubmitting(false);
      setComposerProgress(0);
    }
  };

  // Edit Post Dialog
  const handleOpenEdit = (post: Post) => {
    setPostToEdit(post);
    setEditCaption(post.caption);
    setEditVisibility(post.visibility);
    setIsEditModalOpen(true);
    setOpenPostMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!postToEdit || !user) return;
    if (!editCaption.trim() && !postToEdit.imageUrl) {
      showToast.error('Post content cannot be empty.');
      return;
    }

    setIsEditSubmitting(true);
    try {
      await editPost(postToEdit.postId, user.uid, {
        caption: editCaption.trim(),
        visibility: editVisibility
      });

      // Update post in-state
      setPosts((prev) =>
        prev.map((p) =>
          p.postId === postToEdit.postId
            ? { ...p, caption: editCaption.trim(), visibility: editVisibility, updatedAt: new Date().toISOString() }
            : p
        )
      );

      setIsEditModalOpen(false);
      setPostToEdit(null);
      showToast.success('Post updated successfully.');
    } catch (err) {
      console.error('Failed to update post:', err);
      showToast.error(`Failed to update post: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Delete Post Dialog
  const handleOpenDelete = (post: Post) => {
    setPostToDelete(post);
    setIsDeleteConfirmOpen(true);
    setOpenPostMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete || !user) return;

    setIsDeleting(true);
    try {
      await deletePost(postToDelete.postId, user.uid, postToDelete.imageUrl);

      // Remove from list
      setPosts((prev) => prev.filter((p) => p.postId !== postToDelete.postId));
      setIsDeleteConfirmOpen(false);
      setPostToDelete(null);
      showToast.success('Post deleted successfully.');
    } catch (err) {
      console.error('Failed to delete post:', err);
      showToast.error(`Failed to delete post: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Like System Action
  const handleLikeToggle = async (postId: string) => {
    if (!user) return;

    // Optimistic Update
    const liked = !!likedPostIds[postId];
    setLikedPostIds((prev) => ({ ...prev, [postId]: !liked }));
    setPosts((prev) =>
      prev.map((p) =>
        p.postId === postId
          ? { ...p, likesCount: Math.max(0, p.likesCount + (liked ? -1 : 1)) }
          : p
      )
    );

    try {
      const response = await toggleLikePost(postId, user.uid);
      // Ensure state aligns with service response
      setLikedPostIds((prev) => ({ ...prev, [postId]: response.liked }));
      setPosts((prev) =>
        prev.map((p) =>
          p.postId === postId ? { ...p, likesCount: response.likesCount } : p
        )
      );
    } catch (err) {
      console.error(err);
      // Rollback on error
      setLikedPostIds((prev) => ({ ...prev, [postId]: liked }));
      setPosts((prev) =>
        prev.map((p) =>
          p.postId === postId
            ? { ...p, likesCount: Math.max(0, p.likesCount + (liked ? 1 : -1)) }
            : p
        )
      );
      showToast.error('Action failed. Please try again.');
    }
  };

  // Save / Bookmark Action - Opens Custom Collection Selector
  const handleSaveToggle = (post: Post) => {
    if (!user) return;
    setActivePostForSave(post);
    setIsSavedModalOpen(true);
  };

  // Share Link Action
  const handleSharePost = (post: Post) => {
    const shareUrl = `${window.location.origin}/profile/${post.username}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        showToast.success('Author profile link copied! Anyone with the link can follow them.');
      },
      () => {
        showToast.error('Could not copy link.');
      }
    );
  };

  // Report Dialog
  const handleOpenReport = (post: Post) => {
    setPostToReport(post);
    setReportReason('');
    setIsReportModalOpen(true);
    setOpenPostMenuId(null);
  };

  const handleReportSubmit = async () => {
    if (!postToReport || !user) return;
    if (!reportReason.trim()) {
      showToast.error('Please specify a reason for reporting.');
      return;
    }

    setIsReporting(true);
    try {
      await reportPost(postToReport.postId, user.uid, reportReason.trim());
      setIsReportModalOpen(false);
      setPostToReport(null);
      showToast.success('Thank you. The post has been flagged for moderation.');
    } catch (err) {
      console.error(err);
      showToast.error('Failed to send report.');
    } finally {
      setIsReporting(false);
    }
  };

  // Lightbox Image Handler
  const handleOpenLightbox = (imageUrl: string) => {
    setLightboxImage(imageUrl);
    setZoomLevel(1);
    setIsLightboxOpen(true);
  };

  const formatPostTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 6000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${Math.floor(diffMins / 60)}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (err) {
      return 'Some time ago';
    }
  };

  // Dynamic peer users list and trending topics
  const [suggestedPeers, setSuggestedPeers] = useState<UserProfile[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoadingWidgets(true);
    Promise.all([
      getSuggestedPeers(user, 4),
      getTrendingTopics(5)
    ]).then(([peers, trends]) => {
      setSuggestedPeers(peers);
      setTrendingTopics(trends);
    }).catch(err => {
      console.error("Error loading widgets:", err);
    }).finally(() => {
      setLoadingWidgets(false);
    });
  }, [user]);

  const rankedFeedPosts = getRankedFeed(posts, user);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full h-full items-start">
      
      {/* Center Feed Area */}
      <div className="col-span-1 lg:col-span-2 space-y-6">
        
        {/* Create Post Composer Card */}
        <Card className="border-gray-100 dark:border-slate-800/80 shadow-xs">
          <CardContent className="flex gap-4 p-5">
            <Avatar
              src={user?.photoURL}
              fallback={user?.displayName || user?.email || 'OC'}
              size="md"
              isOnline={true}
            />
            <div className="flex-1">
              <div 
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full bg-gray-50 hover:bg-gray-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 rounded-xl px-4 py-3 text-sm text-gray-400 dark:text-slate-500 cursor-pointer transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-800/50"
              >
                What's on your mind, {user?.displayName?.split(' ')[0] || 'friend'}?
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-50 dark:border-slate-800/50 mt-4 pt-3.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Keep it constructive and informative.</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors"
                    title="Add Image"
                  >
                    <Image className="h-4.5 w-4.5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleImageSelect(e, false)}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    multiple
                  />
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    variant="primary"
                    size="sm"
                    className="rounded-lg shadow-sm font-semibold text-xs tracking-tight bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Share Thoughts
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FEED POSTS CONTAINER */}
        <div className="space-y-5">
          {loading ? (
            // Shimmering Skeleton Feed
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-gray-100 dark:border-slate-800/60 overflow-hidden">
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-28 bg-gray-200 dark:bg-slate-800 rounded-sm animate-pulse" />
                      <div className="h-2 w-20 bg-gray-200 dark:bg-slate-800 rounded-sm animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2 py-1">
                    <div className="h-3.5 w-full bg-gray-200 dark:bg-slate-800 rounded-sm animate-pulse" />
                    <div className="h-3.5 w-5/6 bg-gray-200 dark:bg-slate-800 rounded-sm animate-pulse" />
                  </div>
                  <div className="h-44 w-full bg-gray-100 dark:bg-slate-900 rounded-xl animate-pulse mt-1" />
                </CardContent>
              </Card>
            ))
          ) : posts.length === 0 ? (
            // Empty State
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-gray-150/60 dark:border-slate-800/60 shadow-xs"
            >
              <div className="h-20 w-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5">
                <Compass className="h-10 w-10" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">No conversations yet</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 max-w-sm mb-6 leading-relaxed">
                Be the first to spark an engaging discussion. Upload beautiful images or write an interactive post!
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
              >
                Create First Post
              </Button>
            </motion.div>
          ) : (
            // Render active posts list
            rankedFeedPosts.map((post) => (
              <motion.div
                key={post.postId}
                layoutId={`post-container-${post.postId}`}
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 rounded-2xl shadow-xs hover:border-gray-200 dark:hover:border-slate-700/80 transition-colors duration-200 overflow-hidden relative"
              >
                <PostViewRecorder postId={post.postId} creatorId={post.userId} />
                <div className="p-5 flex flex-col gap-4">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => navigate(`/profile/${post.username}`)}
                        className="cursor-pointer"
                      >
                        <Avatar
                          src={post.userId === user?.uid ? (user?.photoURL || post.profileImage) : post.profileImage}
                          fallback={post.displayName || 'User'}
                          size="md"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span 
                            onClick={() => navigate(`/profile/${post.username}`)}
                            className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                          >
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

                    {/* Options Actions Dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPostMenuId(openPostMenuId === post.postId ? null : post.postId);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <MoreVertical className="h-4.5 w-4.5" />
                      </button>

                      <AnimatePresence>
                        {openPostMenuId === post.postId && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.12 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-850 border border-gray-100 dark:border-slate-850 rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-black/50 py-1.5 z-30"
                          >
                            {user && post.userId === user.uid ? (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(post)}
                                  className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span>Edit Post</span>
                                </button>
                                <button
                                  onClick={() => handleOpenDelete(post)}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete Post</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleOpenReport(post)}
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/10 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>Report Post</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                handleSharePost(post);
                                setOpenPostMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Copy Creator Link</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <p className="text-[15px] md:text-[16px] text-slate-900 dark:text-slate-100 leading-relaxed font-normal whitespace-pre-wrap select-text tracking-normal mb-2">
                      {post.caption}
                    </p>
                  )}

                  {/* Attachment Image/Carousel Display */}
                  {((post.imageUrls && post.imageUrls.length > 0) || post.imageUrl) && (
                    <div className="mb-3">
                      <ImageCarousel 
                        imageUrls={post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : [post.imageUrl!]} 
                      />
                    </div>
                  )}

                  {/* Footer Interaction Bars */}
                  <div className="flex items-center gap-5 border-t border-gray-50 dark:border-slate-800/40 mt-1 pt-3.5 text-xs text-gray-400 dark:text-slate-500">
                    
                    {/* Like Action */}
                    <button
                      onClick={() => handleLikeToggle(post.postId)}
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
                        <Heart className={`h-4.5 w-4.5 ${likedPostIds[post.postId] ? 'fill-current' : ''}`} />
                      </motion.span>
                      <span>{post.likesCount}</span>
                    </button>

                    {/* Comment Action (Phase 6 details mockup) */}
                    <button
                      onClick={() => {
                        setActivePostIdForComments(post.postId);
                        setIsCommentsModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 hover:text-indigo-500 transition-colors cursor-pointer group"
                    >
                      <MessageSquare className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
                      <span>{post.commentsCount}</span>
                    </button>

                    {/* Views Count */}
                    <div 
                      className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500"
                      title="Views"
                    >
                      <Eye className="h-4.5 w-4.5" />
                      <span>{post.viewsCount || 0}</span>
                    </div>

                    {/* Bookmark Action */}
                    <button
                      onClick={() => handleSaveToggle(post)}
                      className={`flex items-center gap-1.5 transition-colors ml-auto cursor-pointer group ${
                        savedPostIds[post.postId]
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'hover:text-indigo-500'
                      }`}
                      title={savedPostIds[post.postId] ? 'Saved to Bookmarks' : 'Save post'}
                    >
                      <Bookmark className={`h-4.5 w-4.5 group-hover:scale-110 transition-transform ${savedPostIds[post.postId] ? 'fill-current' : ''}`} />
                    </button>

                    {/* Share Action */}
                    <button
                      onClick={() => handleSharePost(post)}
                      className="flex items-center gap-1.5 hover:text-gray-600 dark:hover:text-slate-300 transition-colors cursor-pointer group"
                      title="Share post creator"
                    >
                      <Share2 className="h-4.5 w-4.5 group-hover:scale-105 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {/* Infinite Scroll Trigger Anchor */}
          {hasMore && posts.length > 0 && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                  <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading older conversations...</span>
                </div>
              ) : (
                <div className="h-2 w-full" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar on Desktop (hidden on tablet/mobile) */}
      <div className="hidden lg:flex flex-col gap-6">
        
        {/* Suggested Follow Peers */}
        <Card className="border-gray-100 dark:border-slate-800/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-indigo-500" />
              <span>Suggested Peers</span>
            </h3>
          </div>
          <div className="space-y-4">
            {loadingWidgets ? (
              <div className="text-xs text-gray-400 dark:text-slate-500 py-2">Finding nearby peers...</div>
            ) : suggestedPeers.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-slate-500 py-2">No suggested peers available.</div>
            ) : (
              suggestedPeers.map((peer) => (
                <div key={peer.uid} className="flex items-center justify-between gap-3 text-xs">
                  <div 
                    onClick={() => navigate(`/profile/${peer.username}`)}
                    className="flex items-center gap-2.5 cursor-pointer group flex-1 min-w-0"
                  >
                    <Avatar
                      src={peer.profileImage || peer.photoURL}
                      fallback={peer.displayName || peer.fullName || 'OC'}
                      size="sm"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {peer.displayName || peer.fullName}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono truncate">
                        @{peer.username}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/profile/${peer.username}`)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 px-2.5 py-1 hover:bg-indigo-50 dark:hover:bg-slate-800/50 rounded-lg transition-all flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Connect</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Trending Tags list */}
        <Card className="border-gray-100 dark:border-slate-800/80 p-5">
          <div className="flex items-center gap-1.5 mb-4 text-xs font-bold tracking-wider text-gray-400 dark:text-slate-500 uppercase">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <span>Trending Topics</span>
          </div>
          <div className="space-y-3">
            {loadingWidgets ? (
              <div className="text-xs text-gray-400 dark:text-slate-500 py-1">Analyzing network pulse...</div>
            ) : trendingTopics.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-slate-500 py-1">No trending topics active.</div>
            ) : (
              trendingTopics.map((tag) => (
                <div 
                  key={tag.tag}
                  onClick={() => {
                    navigate(`/explore?search=${encodeURIComponent(tag.tag)}`);
                  }}
                  className="flex items-center justify-between text-xs cursor-pointer group"
                >
                  <span className="font-medium text-gray-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    #{tag.tag}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                    {tag.count} {tag.count === 1 ? 'post' : 'posts'}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Platform Values Info Box */}
        <Card className="border-indigo-100/50 dark:border-indigo-950/20 bg-indigo-50/10 dark:bg-slate-900/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Human-Scale Platform</h4>
              <p className="text-[11px] text-gray-400 dark:text-slate-400 leading-relaxed">
                OpenComm values rich, high-trust text and image discussions. There are no algorithmic dopamine feeds or tracking pixels.
              </p>
            </div>
          </div>
        </Card>

      </div>

      {/* CREATE POST COMPREHENSIVE MODAL DIALOG */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isComposerSubmitting) setIsCreateModalOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Compose New Conversation</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isComposerSubmitting}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user?.photoURL}
                    fallback={user?.displayName || 'OC'}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{user?.displayName}</span>
                    
                    {/* Visibility Selector */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <select
                        value={composerVisibility}
                        onChange={(e) => setComposerVisibility(e.target.value as 'public' | 'private')}
                        className="text-[10px] font-medium bg-gray-50 dark:bg-slate-800/80 border border-gray-150 dark:border-slate-700 rounded-md px-1.5 py-0.5 focus:outline-hidden text-gray-600 dark:text-slate-400 cursor-pointer"
                      >
                        <option value="public">🌎 Public Feed</option>
                        <option value="private">🔒 Followers Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Textarea
                    placeholder="Capture your thoughts, write questions, or share articles..."
                    value={composerCaption}
                    onChange={(e) => setComposerCaption(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="w-full text-sm bg-transparent border-0 focus:ring-0 p-0 shadow-none resize-none placeholder-gray-400 dark:placeholder-slate-500 min-h-[120px]"
                    disabled={isComposerSubmitting}
                  />
                  <div className="flex justify-end text-[10px] font-mono text-gray-400 dark:text-slate-500 select-none">
                    {composerCaption.length}/1000 characters
                  </div>
                </div>

                {/* Attached Image Preview inside Modal */}
                 {/* Attached Image Previews inside Modal */}
                 {composerFiles.length > 0 && (
                   <div className="space-y-2">
                     <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                       <span>Carousel Images ({composerFiles.length}/10)</span>
                       <button
                         type="button"
                         onClick={() => setIsImageEditorOpen(true)}
                         disabled={isComposerSubmitting}
                         className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-bold normal-case flex items-center gap-0.5 disabled:opacity-50"
                       >
                         <Edit2 className="h-3 w-3" />
                         <span>Edit / Crop / Rotate</span>
                       </button>
                     </div>
                     <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
                       {composerFiles.map((file, idx) => (
                         <FileThumbnail
                           key={file.name + idx}
                           file={file}
                           onRemove={() => {
                             if (!isComposerSubmitting) {
                               setComposerFiles(prev => prev.filter((_, i) => i !== idx));
                             }
                           }}
                         />
                       ))}
                     </div>
                     {isComposerSubmitting && composerProgress > 0 && (
                       <div className="space-y-1.5 pt-1.5">
                         <div className="flex justify-between text-[10px] font-bold text-indigo-500">
                           <span>Uploading {composerFiles.length} Images</span>
                           <span>{composerProgress}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                             style={{ width: `${composerProgress}%` }}
                           />
                         </div>
                       </div>
                     )}
                   </div>
                 )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-50 dark:border-slate-800/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  disabled={isComposerSubmitting}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  title="Add Image"
                >
                  <Image className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  ref={modalFileInputRef}
                  onChange={(e) => handleImageSelect(e, true)}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  multiple
                />

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isComposerSubmitting}
                    variant="secondary"
                    size="sm"
                    className="rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handlePublishPost()}
                    isLoading={isComposerSubmitting}
                    disabled={isComposerSubmitting || (!composerCaption.trim() && composerFiles.length === 0)}
                    variant="primary"
                    size="sm"
                    className="rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Publish Post
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT POST MODAL DIALOG */}
      <AnimatePresence>
        {isEditModalOpen && postToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isEditSubmitting) setIsEditModalOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Modify Conversation</h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isEditSubmitting}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={user?.photoURL}
                      fallback={user?.displayName || 'OC'}
                      size="sm"
                    />
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{user?.displayName}</span>
                  </div>

                  <select
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e.target.value as 'public' | 'private')}
                    className="text-[10px] font-medium bg-gray-50 dark:bg-slate-800/80 border border-gray-150 dark:border-slate-700 rounded-md px-1.5 py-0.5 focus:outline-hidden text-gray-600 dark:text-slate-400 cursor-pointer"
                  >
                    <option value="public">🌎 Public Feed</option>
                    <option value="private">🔒 Followers Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Textarea
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="w-full text-sm bg-transparent border-0 focus:ring-0 p-0 shadow-none resize-none placeholder-gray-400 dark:placeholder-slate-500"
                    disabled={isEditSubmitting}
                  />
                  <div className="flex justify-end text-[10px] font-mono text-gray-400 dark:text-slate-500">
                    {editCaption.length}/1000 characters
                  </div>
                </div>

                {postToEdit.imageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-slate-850 max-h-40 bg-slate-950/5">
                    <img
                      src={postToEdit.imageUrl}
                      alt="Current attachment"
                      className="w-full h-full max-h-40 object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-white bg-black/60 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>Fixed attachment</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 bg-gray-50 dark:bg-slate-900/60 border-t border-gray-50 dark:border-slate-800/60 flex items-center justify-end gap-2">
                <Button
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isEditSubmitting}
                  variant="secondary"
                  size="sm"
                  className="rounded-lg text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  isLoading={isEditSubmitting}
                  disabled={isEditSubmitting || (!editCaption.trim() && !postToEdit.imageUrl)}
                  variant="primary"
                  size="sm"
                  className="rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {isDeleteConfirmOpen && postToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) setIsDeleteConfirmOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl p-5 z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
                  <Trash2 className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Conversation?</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete this post? This operation is irreversible and will also remove any uploaded attachments.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                  variant="secondary"
                  size="sm"
                  className="rounded-lg text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  isLoading={isDeleting}
                  disabled={isDeleting}
                  variant="primary"
                  size="sm"
                  className="rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPORT CONVERSATION MODAL */}
      <AnimatePresence>
        {isReportModalOpen && postToReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isReporting) setIsReportModalOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl p-5 z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Report Conversation</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Help us keep OpenComm constructive. Please describe the issue with this post for peer moderators:
              </p>
              
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl p-2.5 focus:ring-1 focus:ring-indigo-500 text-gray-700 dark:text-slate-300"
              >
                <option value="">-- Choose reason --</option>
                <option value="harassment">Harassment or abusive language</option>
                <option value="spam">Spam or excessive self-promotion</option>
                <option value="inappropriate">Inappropriate or graphic media</option>
                <option value="misinformation">Harmful falsehoods or manipulation</option>
              </select>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  onClick={() => setIsReportModalOpen(false)}
                  disabled={isReporting}
                  variant="secondary"
                  size="sm"
                  className="rounded-lg text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReportSubmit}
                  isLoading={isReporting}
                  disabled={isReporting || !reportReason}
                  variant="primary"
                  size="sm"
                  className="rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white border-0"
                >
                  Submit Report
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN LIGHTBOX IMAGE VIEWER */}
      <AnimatePresence>
        {isLightboxOpen && lightboxImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLightboxOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm"
            />

            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                title="Close Lightbox"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative max-w-4xl max-h-[85vh] p-4 z-10 flex items-center justify-center overflow-hidden"
            >
              <motion.img
                src={lightboxImage}
                alt="Enlarged Post View"
                referrerPolicy="no-referrer"
                animate={{ scale: zoomLevel }}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
                style={{ cursor: zoomLevel > 1 ? 'grab' : 'auto' }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMMENTS MODAL */}
      <AnimatePresence>
        {isCommentsModalOpen && activePostIdForComments && (
          <CommentsModal
            isOpen={isCommentsModalOpen}
            onClose={() => {
              setIsCommentsModalOpen(false);
              setActivePostIdForComments(null);
            }}
            postId={activePostIdForComments}
          />
        )}
      </AnimatePresence>

      {/* SAVED POSTS COLLECTION MODAL */}
      <AnimatePresence>
        {isSavedModalOpen && activePostForSave && (
          <SavedCollectionModal
            isOpen={isSavedModalOpen}
            onClose={() => {
              setIsSavedModalOpen(false);
              setActivePostForSave(null);
            }}
            post={activePostForSave}
            onSavedStatusChanged={(isSaved) => {
              setSavedPostIds((prev) => ({ ...prev, [activePostForSave.postId]: isSaved }));
            }}
          />
        )}
      </AnimatePresence>

      <ImageEditorModal
        isOpen={isImageEditorOpen}
        onClose={() => setIsImageEditorOpen(false)}
        files={composerFiles}
        onSave={(edited) => setComposerFiles(edited)}
      />

    </div>
  );
};

export default FeedPage;
