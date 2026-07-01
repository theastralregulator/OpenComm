/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProfileByUsername } from '../services/authService';
import { followUser, unfollowUser } from '../services/followService';
import { db, isFirebaseConfigured } from '../services/firebase/config';
import { doc, onSnapshot, query, collection, where, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { getOrCreateChat } from '../services/messageService';
import { UserProfile } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { showToast } from '../components/ui/Toast';
import { FollowListModal } from '../components/FollowListModal';
import {
  Mail,
  Edit3,
  CalendarDays,
  ArrowLeft,
  Globe,
  MapPin,
  Calendar,
  MoreVertical,
  Link as LinkIcon,
  Share2,
  ShieldAlert,
  UserPlus,
  UserMinus,
  Clock,
  MessageSquare,
  Tag
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [activeFollowModal, setActiveFollowModal] = useState<'followers' | 'following' | null>(null);

  const isOwnProfile = !username || username.toLowerCase() === user?.username?.toLowerCase() || username === 'me';

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      if (isOwnProfile) {
        setProfile(user);
        setIsLoading(false);
      } else if (username) {
        try {
          const loaded = await getProfileByUsername(username);
          setProfile(loaded);
        } catch (err) {
          console.error(err);
          showToast.error('Failed to load profile.');
        } finally {
          setIsLoading(false);
        }
      }
    }
    loadProfile();
  }, [username, user, isOwnProfile]);

  // Real-time listener for the follow relationship status
  useEffect(() => {
    if (!user?.uid || !profile?.uid || isOwnProfile) return;

    if (isFirebaseConfigured && db) {
      const followId = `${user.uid}_${profile.uid}`;
      const unsub = onSnapshot(doc(db, 'follows', followId), (docSnap) => {
        if (docSnap.exists()) {
          setFollowStatus(docSnap.data().status);
        } else {
          setFollowStatus('none');
        }
      });
      return unsub;
    } else {
      const handleSync = () => {
        const stored = localStorage.getItem('opencomm_mock_follows');
        const list = stored ? JSON.parse(stored) : [];
        const rel = list.find((f: any) => f.followerId === user.uid && f.followingId === profile.uid);
        setFollowStatus(rel ? rel.status : 'none');
      };
      handleSync();
      window.addEventListener('storage', handleSync);
      return () => window.removeEventListener('storage', handleSync);
    }
  }, [user?.uid, profile?.uid, isOwnProfile]);

  // Real-time listener for profile changes to get instant follow counts
  useEffect(() => {
    if (!profile?.uid) return;

    if (isFirebaseConfigured && db) {
      const unsub = onSnapshot(doc(db, 'users', profile.uid), (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      });
      return unsub;
    } else {
      const handleSync = () => {
        const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
        const latest = mockUsers.find((u: any) => u.uid === profile.uid);
        if (latest) {
          setProfile(latest);
        }
      };
      window.addEventListener('storage', handleSync);
      return () => window.removeEventListener('storage', handleSync);
    }
  }, [profile?.uid]);

  const handleFollowToggle = async () => {
    if (!user || !profile) return;
    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        await unfollowUser(user.uid, profile.uid);
        showToast.info(`You unfollowed @${profile.username}`);
      } else {
        await followUser(user, profile);
        if (profile.isProfilePublic === false) {
          showToast.success(`Follow request sent to @${profile.username}`);
        } else {
          showToast.success(`You are now following @${profile.username}`);
        }
      }
    } catch (err) {
      console.error(err);
      showToast.error('Failed to update follow status.');
    }
  };

  const copyProfileLink = () => {
    const url = `${window.location.origin}/profile/${profile?.username || ''}`;
    navigator.clipboard.writeText(url);
    showToast.success('Profile link copied to clipboard!');
    setIsMenuOpen(false);
  };

  const shareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile?.displayName} (@${profile?.username}) on OpenComm`,
        text: profile?.bio || 'Check out my profile on OpenComm!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      copyProfileLink();
    }
    setIsMenuOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <Spinner fullPage={false} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center w-full max-w-2xl mx-auto">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Profile Not Found</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">The requested user handle "@{username}" does not exist on this network.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/feed')}>
          Return to Feed
        </Button>
      </div>
    );
  }

  // Format Join Date
  const joinDate = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : 'June 2026';

  // Format Birthday
  const formattedBirthday = profile.birthday 
    ? new Date(profile.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto px-1 sm:px-4">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2 min-w-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 font-mono tracking-wider uppercase">
          COMMUNICATOR / @{profile.username}
        </span>
      </div>

      {/* Main Card */}
      <Card className="overflow-hidden border border-gray-150 dark:border-slate-800 shadow-lg">
        <CardContent className="px-4 sm:px-8 py-8">
          <div className="flex flex-col gap-6">
            
            {/* Header section with Avatar and Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="shrink-0 p-1 bg-white dark:bg-slate-900 rounded-full border border-gray-100 dark:border-slate-850 shadow-md">
                  <Avatar
                    userId={profile.uid}
                    src={profile.profilePhotoURL || profile.profileImage || profile.photoURL}
                    fallback={profile.displayName || 'OC'}
                    size="xl"
                  />
                </div>
                
                {/* User Info */}
                <div className="text-left flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-990 dark:text-white tracking-tight">
                      {profile.displayName}
                    </h1>
                    {profile.role === 'admin' && (
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-100/50 dark:border-indigo-900/50">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-400 dark:text-slate-500">
                    @{profile.username} • ID: {profile.openCommId || 'OC-000000'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/profile/edit')}
                    className="gap-1.5"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant={followStatus === 'accepted' ? 'outline' : followStatus === 'pending' ? 'outline' : 'primary'}
                      size="sm"
                      onClick={handleFollowToggle}
                      className="gap-1.5 transition-all duration-200"
                    >
                      {followStatus === 'accepted' ? (
                        <>
                          <UserMinus className="h-4 w-4" />
                          <span>Following</span>
                        </>
                      ) : followStatus === 'pending' ? (
                        <>
                          <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                          <span>Requested</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span>Follow</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!user?.uid || !profile?.uid) return;
                        try {
                          showToast.info(`Initiating secure connection with @${profile.username}...`);
                          const chatId = await getOrCreateChat(user.uid, profile.uid);
                          navigate(`/messages/${chatId}`);
                        } catch (err) {
                          console.error(err);
                          showToast.error('Unable to open conversation.');
                        }
                      }}
                      className="p-2 min-w-0"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Dropdown 3-dot Menu */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 min-w-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl z-40 py-1 text-left animate-in fade-in-50 slide-in-from-top-1">
                        <button
                          onClick={copyProfileLink}
                          className="w-full px-4 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-sans"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                          <span>Copy Profile Link</span>
                        </button>
                        <button
                          onClick={shareProfile}
                          className="w-full px-4 py-2 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-sans"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Share Profile</span>
                        </button>
                        {!isOwnProfile && (
                          <>
                            <div className="border-t border-gray-100 dark:border-slate-800 my-1" />
                            <button
                              onClick={() => {
                                showToast.info(`User @${profile.username} blocked (simulated).`);
                                setIsMenuOpen(false);
                              }}
                              className="w-full px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 flex items-center gap-2 cursor-pointer font-sans"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                              <span>Block User</span>
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Statistics bar */}
            <div className="grid grid-cols-3 gap-4 border-y border-gray-100/70 dark:border-slate-800/80 py-4 text-center">
              <div className="p-1.5">
                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">{profile.postCount !== undefined ? profile.postCount : (profile.postsCount || 0)}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono tracking-wider uppercase">Posts</p>
              </div>
              <button 
                onClick={() => setActiveFollowModal('followers')} 
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 p-1.5 rounded-xl transition-colors duration-200 outline-none"
              >
                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">{profile.followerCount !== undefined ? profile.followerCount : (profile.followersCount || 0)}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono tracking-wider uppercase">Followers</p>
              </button>
              <button 
                onClick={() => setActiveFollowModal('following')} 
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 p-1.5 rounded-xl transition-colors duration-200 outline-none"
              >
                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">{profile.followingCount || 0}</p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono tracking-wider uppercase">Following</p>
              </button>
            </div>

            {/* Bio section */}
            <div className="text-left">
              <p className="font-semibold text-xs text-gray-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">Biography</p>
              <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {profile.bio || 'This user is mysterious and has not composed an elevator biography yet.'}
              </p>
            </div>

            {/* Profile Meta Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500 dark:text-slate-400 border-t border-gray-100/50 dark:border-slate-800/50 pt-4 text-left">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                <span className="font-mono">Joined {joinDate}</span>
              </div>
              
              {profile.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  <span>{profile.location}</span>
                </div>
              )}

              {profile.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </div>
              )}

              {formattedBirthday && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  <span>Born {formattedBirthday}</span>
                </div>
              )}
            </div>

            {/* Interests Section */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="border-t border-gray-100/50 dark:border-slate-800/50 pt-4 text-left">
                <p className="font-semibold text-xs text-gray-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-3">Interests & Domains</p>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-slate-400 text-xs font-semibold rounded-sm border border-gray-150 dark:border-slate-800/80 flex items-center gap-1.5"
                    >
                      <Tag className="h-3 w-3 opacity-60" />
                      <span>{interest}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs section */}
      <ProfileTabsSection profile={profile} isOwnProfile={isOwnProfile} />

      <FollowListModal
        isOpen={activeFollowModal !== null}
        onClose={() => setActiveFollowModal(null)}
        userId={profile.uid}
        type={activeFollowModal || 'followers'}
      />
    </div>
  );
};

// Sub-component for Tabs: Conversations and Saved Bookmarks
import {
  Folder,
  FolderPlus,
  Lock,
  Plus,
  Grid,
  Heart,
  Eye,
  Bookmark,
  ChevronRight,
  FolderSync,
  X,
  PlusCircle,
  FolderUp,
  ExternalLink,
  Trash2
} from 'lucide-react';
import {
  SavedCollection,
  SavedPost,
  listenToCollections,
  listenToSavedPostsInCollection,
  createCollection,
  deleteCollection,
  unsavePostFromCollection,
  movePost
} from '../services/savedPostsService';

import { PostModal } from '../components/PostModal';
import { Post } from '../types';

interface ProfileTabsSectionProps {
  profile: UserProfile;
  isOwnProfile: boolean;
}

const ProfileTabsSection: React.FC<ProfileTabsSectionProps> = ({ profile, isOwnProfile }) => {
  const [activeTab, setActiveTab] = useState<'conversations' | 'saved'>('conversations');

  // User Posts State
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Saved Collections State
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [activeColId, setActiveColId] = useState<string>('default_bookmarks');
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // New Collection Form
  const [isCreatingCol, setIsCreatingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColIsPublic, setNewColIsPublic] = useState(false);

  // Active Move dropdown for a saved post ID
  const [activeMovePostId, setActiveMovePostId] = useState<string | null>(null);
  const [activePostForView, setActivePostForView] = useState<Post | null>(null);

  const formatPostTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Some time ago';
    }
  };

  // Subscribe to User Posts
  useEffect(() => {
    setLoadingPosts(true);
    if (isFirebaseConfigured && db) {
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data());
        });
        setUserPosts(list);
        setLoadingPosts(false);
      }, (err) => {
        console.error(err);
        setLoadingPosts(false);
      });
      return unsub;
    } else {
      const handleSync = () => {
        const stored = localStorage.getItem('opencomm_mock_posts');
        const list = stored ? JSON.parse(stored) : [];
        const filtered = list
          .filter((p: any) => p.userId === profile.uid)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserPosts(filtered);
        setLoadingPosts(false);
      };
      handleSync();
      window.addEventListener('storage', handleSync);
      return () => window.removeEventListener('storage', handleSync);
    }
  }, [profile.uid]);

  // Subscribe to collections
  useEffect(() => {
    if (activeTab !== 'saved') return;

    const unsub = listenToCollections(
      profile.uid,
      (cols) => {
        // Filter out private collections if not viewing own profile
        const visibleCols = isOwnProfile ? cols : cols.filter((c) => c.isPublic);
        setCollections(visibleCols);
        
        // Default to first visible collection if activeColId becomes invalid
        if (visibleCols.length > 0 && !visibleCols.some(c => c.collectionId === activeColId)) {
          setActiveColId(visibleCols[0].collectionId);
        }
      },
      (err) => console.error(err)
    );
    return unsub;
  }, [activeTab, profile.uid, isOwnProfile]);

  // Subscribe to saved posts inside active collection
  useEffect(() => {
    if (activeTab !== 'saved' || !activeColId) return;
    setLoadingSaved(true);

    const unsub = listenToSavedPostsInCollection(
      profile.uid,
      activeColId,
      (posts) => {
        setSavedPosts(posts);
        setLoadingSaved(false);
      },
      (err) => {
        console.error(err);
        setLoadingSaved(false);
      }
    );
    return unsub;
  }, [activeTab, activeColId, profile.uid]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    try {
      const newCol = await createCollection(profile.uid, newColName.trim(), newColIsPublic);
      setNewColName('');
      setNewColIsPublic(false);
      setIsCreatingCol(false);
      setActiveColId(newCol.collectionId);
      showToast.success(`Collection "${newCol.name}" created!`);
    } catch {
      showToast.error('Failed to create collection.');
    }
  };

  const handleDeleteCollection = async (colId: string) => {
    if (window.confirm('Are you sure you want to delete this folder? All saved links inside will be removed.')) {
      try {
        await deleteCollection(profile.uid, colId);
        showToast.success('Folder deleted.');
        setActiveColId('default_bookmarks');
      } catch (err: any) {
        showToast.error(err.message || 'Failed to delete folder.');
      }
    }
  };

  const handleUnsave = async (postId: string) => {
    try {
      await unsavePostFromCollection(profile.uid, activeColId, postId);
      showToast.success('Removed bookmark.');
    } catch {
      showToast.error('Failed to remove bookmark.');
    }
  };

  const handleMove = async (savedPost: SavedPost, targetColId: string) => {
    try {
      await movePost(profile.uid, activeColId, targetColId, savedPost.post);
      setActiveMovePostId(null);
      showToast.success('Moved successfully!');
    } catch {
      showToast.error('Failed to move saved post.');
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-5 text-left">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('conversations')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'conversations'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Grid className="h-4 w-4" />
          <span>Conversations ({userPosts.length})</span>
        </button>

        {(isOwnProfile || collections.some(c => c.isPublic)) && (
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'saved'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>Saved Bookmarks</span>
          </button>
        )}
      </div>

      {/* Conversations View */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingPosts ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Fetching timeline...</p>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="col-span-2 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-gray-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">No Conversations yet</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">This communicator hasn't broadcasted any posts on the network.</p>
            </div>
          ) : (
            userPosts.map((post) => (
              <Card 
                key={post.postId} 
                className="border border-gray-150 dark:border-slate-800/80 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer"
                onClick={() => setActivePostForView(post as Post)}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full text-left gap-3">
                  <div className="space-y-2">
                    {post.imageUrl && (
                      <div className="h-40 w-full overflow-hidden rounded-lg border border-gray-100 dark:border-slate-800">
                        <img src={post.imageUrl} alt="Post media" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-[13.5px] text-slate-800 dark:text-slate-200 font-sans leading-relaxed line-clamp-4 font-normal">
                      {post.caption}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100/50 dark:border-slate-800/50 pt-3 mt-1 text-[10px] font-bold tracking-wide text-gray-400 dark:text-slate-500 uppercase font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {post.likesCount || 0}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {post.commentsCount || 0}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {post.viewsCount || 0}</span>
                    </div>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Saved Bookmarks View */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Folders List Pane (Left Column) */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                Folders ({collections.length})
              </h3>
              {isOwnProfile && !isCreatingCol && (
                <button
                  onClick={() => setIsCreatingCol(true)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-indigo-500 cursor-pointer"
                  title="Create Folder"
                >
                  <PlusCircle className="h-4.5 w-4.5" />
                </button>
              )}
            </div>

            {/* Form to Create Folder */}
            <AnimatePresence>
              {isOwnProfile && isCreatingCol && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateCollection}
                  className="border border-gray-150 dark:border-slate-800 rounded-xl p-3 bg-gray-50 dark:bg-slate-800/20 space-y-2.5 overflow-hidden text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase font-mono">New Folder</span>
                    <button type="button" onClick={() => setIsCreatingCol(false)} className="p-0.5 rounded text-gray-400 hover:bg-gray-200">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Folder name (e.g. Design)"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-gray-250 dark:border-slate-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-slate-400 font-medium">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newColIsPublic}
                        onChange={(e) => setNewColIsPublic(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span>Make Folder Public</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button type="button" onClick={() => setIsCreatingCol(false)} className="px-2 py-1 text-[10px] font-medium text-gray-500">
                      Cancel
                    </button>
                    <button type="submit" className="px-2.5 py-1 text-[10px] font-semibold bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors">
                      Create
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              {collections.map((col) => {
                const isActive = col.collectionId === activeColId;
                return (
                  <div
                    key={col.collectionId}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-all text-left relative group ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/40 text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => setActiveColId(col.collectionId)}
                      className="flex-1 flex items-center gap-2.5 text-xs truncate cursor-pointer"
                    >
                      <Folder className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <span className="truncate">{col.name}</span>
                      {col.isPublic ? (
                        <span title="Public Folder"><Globe className="h-3 w-3 text-emerald-500 shrink-0" /></span>
                      ) : (
                        <span title="Private Folder"><Lock className="h-3 w-3 text-amber-500 shrink-0" /></span>
                      )}
                    </button>

                    {isOwnProfile && col.collectionId !== 'default_bookmarks' && (
                      <button
                        onClick={() => handleDeleteCollection(col.collectionId)}
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-600 transition-all cursor-pointer absolute right-2"
                        title="Delete folder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saved Posts Grid Pane (Right 2 Columns) */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest font-mono">
              Saved Items ({savedPosts.length})
            </h3>

            {loadingSaved ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] text-gray-400 font-medium">Syncing folder...</p>
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-16 text-center">
                <FolderSync className="h-8 w-8 mx-auto text-gray-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">No items in this folder</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Bookmark posts in the Feed and choose this folder to save them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedPosts.map((savedItem) => (
                  <Card key={savedItem.postId} className="border border-gray-150 dark:border-slate-800/80 shadow-sm relative group overflow-visible">
                    <CardContent className="p-4 flex flex-col justify-between h-full gap-2.5 text-left relative overflow-visible">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 truncate">
                          <span>@{savedItem.post.username}</span>
                          <span>•</span>
                          <span>{new Date(savedItem.savedAt).toLocaleDateString()}</span>
                        </div>
                        {savedItem.post.imageUrl && (
                          <div className="h-32 w-full overflow-hidden rounded-lg border border-gray-100 dark:border-slate-800 mb-1">
                            <img src={savedItem.post.imageUrl} alt="Post media" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="text-xs text-gray-800 dark:text-slate-200 line-clamp-3">
                          {savedItem.post.caption}
                        </p>
                      </div>

                      {/* Management Row (Only visible if own profile) */}
                      {isOwnProfile && (
                        <div className="flex items-center gap-2 border-t border-gray-100 dark:border-slate-800/60 pt-2 mt-1 justify-end relative overflow-visible">
                          {/* Move to another folder trigger */}
                          <div className="relative overflow-visible">
                            <button
                              onClick={() => setActiveMovePostId(activeMovePostId === savedItem.postId ? null : savedItem.postId)}
                              className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
                            >
                              <FolderUp className="h-3 w-3" /> Move
                            </button>

                            {activeMovePostId === savedItem.postId && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveMovePostId(null)} />
                                <div className="absolute right-0 bottom-full mb-1 bg-white dark:bg-slate-800 border border-gray-150 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 min-w-[120px] text-[10px]">
                                  <div className="px-2 py-1 text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase border-b border-gray-100 dark:border-slate-700">Move to Folder</div>
                                  {collections
                                    .filter((c) => c.collectionId !== activeColId)
                                    .map((col) => (
                                      <button
                                        key={col.collectionId}
                                        onClick={() => handleMove(savedItem, col.collectionId)}
                                        className="w-full text-left px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 truncate"
                                      >
                                        {col.name}
                                      </button>
                                    ))}
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => handleUnsave(savedItem.postId)}
                            className="text-[10px] font-semibold text-red-500 hover:text-red-600 flex items-center gap-0.5 cursor-pointer"
                          >
                            <X className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full View Post Modal */}
      <PostModal 
        isOpen={activePostForView !== null}
        post={activePostForView}
        onClose={() => setActivePostForView(null)}
        user={profile}
        formatPostTime={formatPostTime}
      />
    </div>
  );
};

export default ProfilePage;
