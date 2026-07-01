/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  UserPlus,
  UserMinus,
  UserCheck,
  Clock,
  Compass,
  Users,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { searchProfiles, getSuggestedProfiles } from '../services/authService';
import { followUser, unfollowUser } from '../services/followService';
import { db, isFirebaseConfigured } from '../services/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { showToast } from '../components/ui/Toast';
import { UserProfile } from '../types';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Search and discover states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  // Read search from URL parameter on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryVal = params.get('search');
    if (queryVal) {
      setSearchQuery(queryVal);
    }
  }, []);

  // Real-time follow states for the current logged-in user
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Listen to follow relationships in real time
  useEffect(() => {
    if (!currentUser?.uid) return;

    if (isFirebaseConfigured && db) {
      const q = query(
        collection(db, 'follows'),
        where('followerId', '==', currentUser.uid)
      );
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const followingSet = new Set<string>();
          const pendingSet = new Set<string>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status === 'accepted') {
              followingSet.add(data.followingId);
            } else if (data.status === 'pending') {
              pendingSet.add(data.followingId);
            }
          });
          setFollowingIds(followingSet);
          setPendingIds(pendingSet);
        },
        (err) => {
          console.error('Error listening to follows:', err);
        }
      );
      return unsub;
    } else {
      // Mock local storage listener fallback
      const handleSync = () => {
        const stored = localStorage.getItem('opencomm_mock_follows');
        const list = stored ? JSON.parse(stored) : [];
        const followingSet = new Set<string>();
        const pendingSet = new Set<string>();
        list.forEach((f: any) => {
          if (f.followerId === currentUser.uid) {
            if (f.status === 'accepted') {
              followingSet.add(f.followingId);
            } else if (f.status === 'pending') {
              pendingSet.add(f.followingId);
            }
          }
        });
        setFollowingIds(followingSet);
        setPendingIds(pendingSet);
      };
      handleSync();
      window.addEventListener('storage', handleSync);
      return () => window.removeEventListener('storage', handleSync);
    }
  }, [currentUser?.uid]);

  // Load initial suggested profiles
  useEffect(() => {
    const loadSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const suggestions = await getSuggestedProfiles(6);
        // Exclude the currently logged-in user
        const filtered = suggestions.filter((p) => p.uid !== currentUser?.uid);
        setSuggestedPeople(filtered);
      } catch (err) {
        console.error('Error loading suggestion cards:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };
    if (currentUser?.uid) {
      loadSuggestions();
    }
  }, [currentUser?.uid]);

  // Live search handler with debouncing
  useEffect(() => {
    const performSearch = async () => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchProfiles(trimmed);
        // Filter out currently logged-in user from search results
        const filtered = results.filter((p) => p.uid !== currentUser?.uid);
        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching profiles:', err);
        showToast.error('An error occurred while searching profiles.');
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser?.uid]);

  // Handle follow actions
  const handleFollowClick = async (targetUser: UserProfile) => {
    if (!currentUser) {
      showToast.error('You must be logged in to follow users.');
      return;
    }

    const targetId = targetUser.uid;
    const isFollowing = followingIds.has(targetId);
    const isPending = pendingIds.has(targetId);

    try {
      if (isFollowing || isPending) {
        // Optimistic update
        setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
        setPendingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
        await unfollowUser(currentUser.uid, targetId);
        showToast.info(`You unfollowed @${targetUser.username}`);
      } else {
        // Optimistic update
        if (targetUser.isProfilePublic === false) {
          setPendingIds(prev => new Set(prev).add(targetId));
        } else {
          setFollowingIds(prev => new Set(prev).add(targetId));
        }
        await followUser(currentUser, targetUser);
        if (targetUser.isProfilePublic === false) {
          showToast.success(`Follow request sent to @${targetUser.username}`);
        } else {
          showToast.success(`You are now following @${targetUser.username}`);
        }
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      // Revert optimistic update silently
      if (isFollowing || isPending) {
        if (isFollowing) setFollowingIds(prev => new Set(prev).add(targetId));
        if (isPending) setPendingIds(prev => new Set(prev).add(targetId));
      } else {
        setFollowingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
        setPendingIds(prev => { const s = new Set(prev); s.delete(targetId); return s; });
      }
    }
  };

  // Helper to render Verified Badge
  const isUserVerified = (profile: UserProfile) => {
    return profile.role === 'admin' || profile.isProfilePublic === true; // or dynamic
  };

  // Motion variants for staggering
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div id="explore-page-wrapper" className="max-w-4xl mx-auto space-y-8 px-4 py-4 md:py-8">
      {/* Header Info Banner */}
      <div id="explore-header-section" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Compass className="h-5 w-5 text-indigo-500" />
            <span className="text-xs font-bold tracking-wider uppercase font-mono text-indigo-500">Discovery Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Explore OpenComm
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Search handles, find professional peers, and build your specialized discussion network.
          </p>
        </div>
      </div>

      {/* Modern Search Field */}
      <div id="explore-search-box" className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
          <input
            id="explore-user-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by Username, Display Name, or Email..."
            className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 dark:text-white placeholder-gray-400 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Results Container */}
      <div id="explore-results-container" className="space-y-6">
        {isSearching ? (
          /* Search Loading Skeletons */
          <div id="search-loading-skeletons" className="space-y-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className="p-5 border border-gray-50 dark:border-slate-900 bg-white dark:bg-slate-900/40 rounded-2xl flex flex-col md:flex-row items-center gap-5 animate-pulse">
                <div className="h-16 w-16 bg-gray-200 dark:bg-slate-800 rounded-full" />
                <div className="flex-1 space-y-2.5 w-full text-center md:text-left">
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/3 mx-auto md:mx-0" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/4 mx-auto md:mx-0" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-3/4 mx-auto md:mx-0 mt-3" />
                </div>
                <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-xl w-24" />
              </div>
            ))}
          </div>
        ) : searchQuery.trim() !== '' ? (
          searchResults.length > 0 ? (
            /* Search Results Grid/List */
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wider font-mono text-gray-400 dark:text-slate-500 mb-2">
                Search Results ({searchResults.length})
              </div>
              {searchResults.map((person) => {
                const isFollowing = followingIds.has(person.uid);
                const isPending = pendingIds.has(person.uid);

                return (
                  <motion.div
                    key={person.uid}
                    variants={itemVariants}
                    className="group relative p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-2xl flex flex-col md:flex-row items-center gap-5 transition-all hover:border-gray-200 dark:hover:border-slate-750 hover:shadow-md hover:shadow-gray-500/5"
                  >
                    {/* User Avatar */}
                    <div
                      className="cursor-pointer relative flex-shrink-0"
                      onClick={() => navigate(`/profile/${person.username}`)}
                    >
                      <Avatar
                        src={person.profileImage || person.photoURL}
                        fallback={person.displayName || person.fullName || person.username || 'U'}
                        alt={person.displayName || person.fullName || 'User'}
                        className="h-16 w-16 border-2 border-gray-50 dark:border-slate-800 group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 text-center md:text-left space-y-1 w-full">
                      <div className="flex flex-col md:flex-row md:items-center gap-1.5 justify-center md:justify-start">
                        <h3
                          onClick={() => navigate(`/profile/${person.username}`)}
                          className="font-bold text-gray-900 dark:text-white cursor-pointer hover:text-indigo-500 transition-colors text-base"
                        >
                          {person.displayName || person.fullName}
                        </h3>
                        {isUserVerified(person) && (
                          <Badge variant="verified" className="w-fit self-center">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div
                        onClick={() => navigate(`/profile/${person.username}`)}
                        className="text-xs font-mono text-gray-400 dark:text-slate-500 cursor-pointer hover:underline"
                      >
                        @{person.username}
                      </div>
                      
                      {person.bio && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 line-clamp-2 italic">
                          "{person.bio}"
                        </p>
                      )}

                      {/* Counts */}
                      <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-xs font-mono">
                        <div className="text-gray-400 dark:text-slate-500">
                          <span className="font-bold text-gray-800 dark:text-slate-300">{person.followersCount || 0}</span> followers
                        </div>
                        <div className="text-gray-400 dark:text-slate-500">
                          <span className="font-bold text-gray-800 dark:text-slate-300">{person.followingCount || 0}</span> following
                        </div>
                      </div>
                    </div>

                    {/* Follow Action Button */}
                    <div className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                      <button
                        onClick={() => handleFollowClick(person)}
                        className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          isFollowing
                            ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-250 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 border border-transparent hover:border-red-100'
                            : isPending
                            ? 'bg-amber-50 text-amber-600 border border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 border border-transparent shadow-xs'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4 group-hover:hidden" />
                            <UserMinus className="h-4 w-4 hidden group-hover:block" />
                            <span>Following</span>
                          </>
                        ) : isPending ? (
                          <>
                            <Clock className="h-4 w-4" />
                            <span>Requested</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            /* Search Empty State */
            <div id="search-no-results" className="text-center py-12 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-8 space-y-4">
              <div className="h-12 w-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-gray-400 dark:text-slate-500">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No users found.</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  We couldn't find any OpenComm users matching "{searchQuery}". Try searching for something else.
                </p>
              </div>
            </div>
          )
        ) : (
          /* Search Input is empty - Discover People Feed */
          <div id="discover-people-feed" className="space-y-6">
            <div className="text-xs font-semibold uppercase tracking-wider font-mono text-gray-400 dark:text-slate-500">
              Discover people on OpenComm
            </div>

            {isLoadingSuggestions ? (
              <div className="space-y-4">
                {[1, 2].map((num) => (
                  <div key={num} className="h-28 bg-white dark:bg-slate-900/40 border border-gray-50 dark:border-slate-900 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : suggestedPeople.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {suggestedPeople.map((person) => {
                  const isFollowing = followingIds.has(person.uid);
                  const isPending = pendingIds.has(person.uid);

                  return (
                    <motion.div
                      key={person.uid}
                      variants={itemVariants}
                      className="group p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:border-gray-200 dark:hover:border-slate-750 hover:shadow-xs"
                    >
                      <div className="flex gap-4 items-start">
                        <div
                          className="cursor-pointer flex-shrink-0"
                          onClick={() => navigate(`/profile/${person.username}`)}
                        >
                          <Avatar
                            src={person.profileImage || person.photoURL}
                            fallback={person.displayName || person.fullName || person.username || 'U'}
                            alt={person.displayName || person.fullName || 'User'}
                            className="h-12 w-12 border border-gray-50 dark:border-slate-850 group-hover:scale-102 transition-transform duration-200"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <h4
                              onClick={() => navigate(`/profile/${person.username}`)}
                              className="font-bold text-gray-900 dark:text-white text-sm cursor-pointer hover:text-indigo-500 transition-colors"
                            >
                              {person.displayName || person.fullName}
                            </h4>
                            {isUserVerified(person) && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                            )}
                          </div>
                          <div
                            onClick={() => navigate(`/profile/${person.username}`)}
                            className="text-[11px] font-mono text-gray-400 dark:text-slate-500 cursor-pointer hover:underline"
                          >
                            @{person.username}
                          </div>
                          {person.bio && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mt-1.5 italic">
                              "{person.bio}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-50 dark:border-slate-850/50 pt-3">
                        <div className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                          <span className="font-bold text-gray-700 dark:text-slate-300">{person.followersCount || 0}</span> followers
                        </div>
                        
                        <button
                          onClick={() => handleFollowClick(person)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1 ${
                            isFollowing
                              ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 border border-transparent hover:border-red-100'
                              : isPending
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Following</span>
                            </>
                          ) : isPending ? (
                            <>
                              <Clock className="h-3.5 w-3.5" />
                              <span>Requested</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                No suggested profiles available. Make some accounts to start building your feed!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
