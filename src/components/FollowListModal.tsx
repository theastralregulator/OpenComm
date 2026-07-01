import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, CheckCircle2, UserPlus, UserMinus, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, isFirebaseConfigured } from '../services/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { followUser, unfollowUser, onFollowsSnapshot } from '../services/followService';
import { UserProfile, FollowRelation } from '../types';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { showToast } from './ui/Toast';

const FollowUserCard: React.FC<{
  peerId: string;
  currentUserId: string;
  currentUserProfile: UserProfile;
  onNavigateToProfile: (username: string) => void;
}> = ({ peerId, currentUserId, currentUserProfile, onNavigateToProfile }) => {
  const [peerProfile, setPeerProfile] = useState<UserProfile | null>(null);
  const [weFollowStatus, setWeFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [theyFollowStatus, setTheyFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [loading, setLoading] = useState(true);

  // Subscribe to peer profile
  useEffect(() => {
    if (!peerId) return;
    if (isFirebaseConfigured && db) {
      const unsub = onSnapshot(
        doc(db, 'users', peerId),
        (docSnap) => {
          if (docSnap.exists()) {
            setPeerProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('Error reading user profile:', err);
          setLoading(false);
        }
      );
      return unsub;
    } else {
      // Mock mode
      const handleSync = () => {
        const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
        const found = mockUsers.find((u: any) => u.uid === peerId);
        if (found) {
          setPeerProfile(found);
        }
        setLoading(false);
      };
      handleSync();
      window.addEventListener('storage', handleSync);
      return () => window.removeEventListener('storage', handleSync);
    }
  }, [peerId]);

  // Subscribe to relationships
  useEffect(() => {
    if (!peerId || !currentUserId) return;
    if (isFirebaseConfigured && db) {
      const weFollowId = `${currentUserId}_${peerId}`;
      const theyFollowId = `${peerId}_${currentUserId}`;

      const unsubWe = onSnapshot(doc(db, 'follows', weFollowId), (snap) => {
        if (snap.exists()) {
          setWeFollowStatus(snap.data().status);
        } else {
          setWeFollowStatus('none');
        }
      });

      const unsubThey = onSnapshot(doc(db, 'follows', theyFollowId), (snap) => {
        if (snap.exists()) {
          setTheyFollowStatus(snap.data().status);
        } else {
          setTheyFollowStatus('none');
        }
      });

      return () => {
        unsubWe();
        unsubThey();
      };
    } else {
      // Mock mode
      const handleSync = () => {
        const stored = localStorage.getItem('opencomm_mock_follows');
        const list = stored ? JSON.parse(stored) : [];
        
        const weRel = list.find((f: any) => f.followerId === currentUserId && f.followingId === peerId);
        setWeFollowStatus(weRel ? weRel.status : 'none');

        const theyRel = list.find((f: any) => f.followerId === peerId && f.followingId === currentUserId);
        setTheyFollowStatus(theyRel ? theyRel.status : 'none');
      };
      handleSync();
      window.addEventListener('storage', handleSync);
      return () => window.removeEventListener('storage', handleSync);
    }
  }, [peerId, currentUserId]);

  if (loading || !peerProfile) {
    return (
      <div className="flex items-center gap-4 py-3 px-3 animate-pulse">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const isMutual = weFollowStatus === 'accepted' && theyFollowStatus === 'accepted';
  const isOwnCard = peerId === currentUserId;

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (weFollowStatus === 'accepted' || weFollowStatus === 'pending') {
        await unfollowUser(currentUserId, peerId);
        showToast.info(`Unfollowed @${peerProfile.username}`);
      } else {
        await followUser(currentUserProfile, peerProfile);
        if (peerProfile.isProfilePublic === false) {
          showToast.success(`Request sent to @${peerProfile.username}`);
        } else {
          showToast.success(`Following @${peerProfile.username}`);
        }
      }
    } catch (err) {
      console.error(err);
      showToast.error('Failed to update follow status');
    }
  };

  return (
    <div 
      onClick={() => onNavigateToProfile(peerProfile.username || '')}
      className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-150 cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar
          userId={peerId}
          src={peerProfile.profilePhotoURL || peerProfile.profileImage || peerProfile.photoURL}
          fallback={peerProfile.displayName || 'OC'}
          size="md"
        />
        <div className="flex flex-col min-w-0 text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
              {peerProfile.displayName}
            </span>
            {peerProfile.verified && (
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500 shrink-0" />
            )}
            {isMutual && (
              <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono px-1.5 py-0.5 rounded shrink-0 font-bold">
                Mutual
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
            @{peerProfile.username}
          </span>
          {peerProfile.bio && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              {peerProfile.bio}
            </p>
          )}
        </div>
      </div>

      {!isOwnCard && (
        <Button
          variant={weFollowStatus === 'accepted' ? 'outline' : weFollowStatus === 'pending' ? 'outline' : 'primary'}
          size="xs"
          onClick={handleFollowClick}
          className="shrink-0 text-xs py-1.5 px-3 min-h-0"
        >
          {weFollowStatus === 'accepted' ? (
            <span className="flex items-center gap-1">
              <UserMinus className="h-3 w-3" />
              <span>Following</span>
            </span>
          ) : weFollowStatus === 'pending' ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>Requested</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <UserPlus className="h-3 w-3" />
              <span>Follow</span>
            </span>
          )}
        </Button>
      )}
    </div>
  );
};

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
}

export const FollowListModal: React.FC<FollowListModalProps> = ({ isOpen, onClose, userId, type }) => {
  const { user } = useAuth();
  const [relations, setRelations] = useState<FollowRelation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);

    const unsub = onFollowsSnapshot(userId, type, (list) => {
      setRelations(list);
      setLoading(false);
    });

    return unsub;
  }, [isOpen, userId, type]);

  if (!isOpen) return null;

  const getPeerUsernameAndName = (rel: FollowRelation) => {
    if (type === 'followers') {
      return { username: rel.followerUsername, displayName: rel.followerDisplayName };
    } else {
      return { username: rel.followingUsername, displayName: rel.followingDisplayName };
    }
  };

  const filteredRelations = relations.filter((rel) => {
    const { username, displayName } = getPeerUsernameAndName(rel);
    return (
      (username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (displayName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const navigateToProfile = (username: string) => {
    onClose();
    window.location.href = `/profile/${username}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 capitalize">
              {type === 'followers' ? 'Followers' : 'Following'}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-950/20">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder={`Search ${type}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-850 dark:text-slate-100 focus:outline-none placeholder-slate-400"
            />
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Spinner fullPage={false} />
                <span className="text-xs text-slate-400 font-mono">Retrieving accounts...</span>
              </div>
            ) : filteredRelations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500 gap-2">
                <p className="text-sm font-medium">No accounts found</p>
                <p className="text-xs max-w-xs">
                  {searchQuery ? `We couldn't find any matches for "${searchQuery}".` : `This user doesn't have any ${type} yet.`}
                </p>
              </div>
            ) : (
              filteredRelations.map((rel) => {
                const peerId = type === 'followers' ? rel.followerId : rel.followingId;
                return (
                  <FollowUserCard
                    key={rel.followId}
                    peerId={peerId}
                    currentUserId={user?.uid || ''}
                    currentUserProfile={user!}
                    onNavigateToProfile={navigateToProfile}
                  />
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
