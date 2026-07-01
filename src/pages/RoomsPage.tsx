/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ui/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import {
  Users,
  Lock,
  Search,
  PlusCircle,
  ArrowUpRight,
  MessageSquare,
  Mic,
  Tag,
  Sparkles,
  Layers,
  Check,
  X,
  Bell,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Globe
} from 'lucide-react';
import {
  createRoom,
  subscribeRooms,
  subscribeRoomMembers,
  joinRoom,
  getMyInvites,
  respondToInvite
} from '../services/roomService';
import { Room, RoomMember, RoomType, RoomVisibility } from '../types';

// Hardcoded Categories
const CATEGORIES = [
  'Technology',
  'Programming',
  'Gaming',
  'Sports',
  'Music',
  'Photography',
  'Education',
  'Business',
  'Movies',
  'Books',
  'AI',
  'Travel',
  'Science'
];

export const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Rooms Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [userMemberships, setUserMemberships] = useState<Record<string, RoomMember>>({});
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'joined' | 'trending' | 'recommended'>('all');

  // Create Room Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomCat, setRoomCat] = useState('Technology');
  const [roomType, setRoomType] = useState<RoomType>('text');
  const [roomVis, setRoomVis] = useState<RoomVisibility>('public');
  const [maxMembers, setMaxMembers] = useState<string>('');
  const [roomImage, setRoomImage] = useState('');
  const [roomRules, setRoomRules] = useState('');
  const [roomLanguage, setRoomLanguage] = useState('');
  const [roomCountry, setRoomCountry] = useState('');
  const [roomState, setRoomState] = useState('');
  const [roomCity, setRoomCity] = useState('');
  const [roomTags, setRoomTags] = useState('');

  // Predefined image suggestions based on categories
  const categoryImages: Record<string, string> = {
    Technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    Programming: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
    Gaming: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    AI: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    Music: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    Books: 'https://images.unsplash.com/photo-1513001900722-370f803f498d?auto=format&fit=crop&w=600&q=80',
    Sports: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
    Photography: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=600&q=80',
    Education: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80',
    Business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    Movies: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
    Travel: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80',
    Science: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80'
  };

  // Real-time Rooms Sync
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeRooms((allRooms) => {
      setRooms(allRooms);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync memberships for the current user across all rooms
  useEffect(() => {
    if (!user || rooms.length === 0) return;

    const unsubscribers: (() => void)[] = [];

    rooms.forEach((room) => {
      const unsub = subscribeRoomMembers(room.roomId, (membersList) => {
        const myMembership = membersList.find((m) => m.userId === user.uid);
        if (myMembership) {
          setUserMemberships((prev) => ({
            ...prev,
            [room.roomId]: myMembership
          }));
        } else {
          setUserMemberships((prev) => {
            const copy = { ...prev };
            delete copy[room.roomId];
            return copy;
          });
        }
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [rooms, user]);

  // Fetch private room invites for this user
  const fetchInvites = async () => {
    if (!user) return;
    try {
      const activeInvites = await getMyInvites(user.uid);
      setInvites(activeInvites);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 10000); // Poll invites every 10s
    return () => clearInterval(interval);
  }, [user]);

  // Invite Response
  const handleInviteResponse = async (inviteId: string, status: 'accepted' | 'declined') => {
    if (!user) return;
    try {
      await respondToInvite(inviteId, status, user);
      showToast.success(`Invitation ${status === 'accepted' ? 'accepted' : 'declined'}`);
      fetchInvites();
    } catch (err) {
      showToast.error('Could not respond to invitation.');
    }
  };

  // Join Room Button Action
  const handleJoinOrEnterRoom = async (room: Room) => {
    if (!user) return;

    const membership = userMemberships[room.roomId];

    if (membership) {
      if (membership.status === 'approved') {
        navigate(`/room/${room.roomId}`);
      } else {
        showToast.info('Your join request is still pending approval by the room owner.');
      }
      return;
    }

    // New membership join
    try {
      const requiresApproval = room.visibility === 'private';
      await joinRoom(room.roomId, user, requiresApproval);
      
      if (requiresApproval) {
        showToast.success('Join request submitted to the room owner!');
      } else {
        showToast.success(`Joined room "${room.name}" successfully!`);
        navigate(`/room/${room.roomId}`);
      }
    } catch (err) {
      showToast.error('An error occurred while attempting to join.');
    }
  };

  // Submit Create Room Form
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!roomName.trim()) {
      showToast.error('Room name is required.');
      return;
    }

    try {
      const selectedImg = roomImage || categoryImages[roomCat] || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80';

      const created = await createRoom({
        name: roomName,
        description: roomDesc,
        category: roomCat,
        roomType,
        visibility: roomVis,
        maxMembers: maxMembers ? parseInt(maxMembers) : null,
        roomImage: selectedImg,
        createdBy: user.uid,
        creatorName: user.displayName || user.fullName || 'Operator',
        rules: roomRules.trim() || undefined,
        language: roomLanguage.trim() || undefined,
        country: roomCountry.trim() || undefined,
        state: roomState.trim() || undefined,
        city: roomCity.trim() || undefined,
        tags: roomTags.trim() ? roomTags.split(',').map(t => t.trim()).filter(Boolean) : undefined
      }, user);

      showToast.success(`Room "${created.name}" created!`);
      setIsCreateOpen(false);
      navigate(`/room/${created.roomId}`);

      // Clear Form
      setRoomName('');
      setRoomDesc('');
      setMaxMembers('');
      setRoomImage('');
      setRoomRules('');
      setRoomLanguage('');
      setRoomCountry('');
      setRoomState('');
      setRoomCity('');
      setRoomTags('');
    } catch (err) {
      showToast.error('Failed to create community room.');
    }
  };

  // Helper to calculate recommendation score for a room based on:
  // Country, State, City, Language, Interests, Joined Rooms, Activity (membersCount)
  const getRecommendationMatch = (room: Room) => {
    if (!user) return { score: 0, reasons: [] as string[] };
    let score = 0;
    const reasons: string[] = [];

    // Fallbacks for profile specifics to ensure robust matching if user fields are unset
    const userLanguage = user.language || 'English';
    const userCountry = user.country || 'US';
    const userState = user.state || 'California';
    const userCity = user.city || 'San Francisco';
    const userInterests = user.interests || ['Technology', 'Programming', 'AI', 'Gaming', 'Music', 'Design'];

    // 1. Language match
    if (room.language && room.language.toLowerCase() === userLanguage.toLowerCase()) {
      score += 30;
      reasons.push(`🗣️ Matches Language (${room.language})`);
    } else if (room.language && room.language.toLowerCase() === 'english') {
      score += 10;
    }

    // 2. Country match
    if (room.country && room.country.toLowerCase() === userCountry.toLowerCase()) {
      score += 35;
      reasons.push(`🌍 Local Country (${room.country})`);
    }

    // 3. State match
    if (room.state && room.state.toLowerCase() === userState.toLowerCase()) {
      score += 15;
      reasons.push(`📍 State Match (${room.state})`);
    }

    // 4. City match
    if (room.city && room.city.toLowerCase() === userCity.toLowerCase()) {
      score += 15;
      reasons.push(`🏢 City Match (${room.city})`);
    }

    // 5. Category/Interests match
    const catLower = room.category.toLowerCase();
    const isInterestCategory = userInterests.some((interest: string) => 
      interest.toLowerCase().includes(catLower) || catLower.includes(interest.toLowerCase())
    );
    if (isInterestCategory) {
      score += 40;
      reasons.push(`✨ Matches Category Interests`);
    }

    // 6. Tags match
    if (room.tags && room.tags.length > 0) {
      const matchingTags = room.tags.filter(tag => 
        userInterests.some((interest: string) => interest.toLowerCase().includes(tag.toLowerCase()))
      );
      if (matchingTags.length > 0) {
        score += matchingTags.length * 15;
        reasons.push(`🏷️ Matches Tags: ${matchingTags.slice(0, 2).join(', ')}`);
      }
    }

    // 7. Activity boost
    if (room.membersCount && room.membersCount > 0) {
      const activityPoints = Math.min(25, room.membersCount * 2.5);
      score += activityPoints;
    }

    // Filter out if user is banned
    if (room.bannedUsers && room.bannedUsers.includes(user.uid)) {
      score = -1000;
    }

    return { score: Math.round(score), reasons };
  };

  // Filter and Category Matching Logic
  const unfilteredAndMatchedRooms = rooms.filter((room) => {
    // 1. Live Search matching including state, tags, language
    const matchesSearch =
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.tags && room.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      (room.language && room.language.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (room.country && room.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (room.city && room.city.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Category matching
    if (selectedCategory && room.category !== selectedCategory) {
      return false;
    }

    // 3. Tab matching
    if (activeTab === 'joined') {
      return userMemberships[room.roomId]?.status === 'approved';
    }
    if (activeTab === 'trending') {
      return room.membersCount >= 3; // Rooms with 3+ members count as trending
    }
    if (activeTab === 'recommended') {
      // Don't recommend rooms they've already joined to keep recommendations interesting
      const isAlreadyJoined = userMemberships[room.roomId]?.status === 'approved';
      if (isAlreadyJoined) return false;
      
      const { score } = getRecommendationMatch(room);
      return score > 0;
    }

    return true;
  });

  // Sort and assign matches to filteredRooms
  const filteredRooms = [...unfilteredAndMatchedRooms];
  if (activeTab === 'recommended') {
    filteredRooms.sort((a, b) => {
      const scoreA = getRecommendationMatch(a).score;
      const scoreB = getRecommendationMatch(b).score;
      return scoreB - scoreA;
    });
  }

  return (
    <div id="rooms-directory-container" className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 pb-20">
      
      {/* 1. Header Hero Panel */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-purple-950 border border-slate-800 p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 blur-3xl rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-full text-xs font-semibold tracking-wider uppercase text-indigo-300 font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Phase 6: Audio & Discussions Directory</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-linear-to-r from-white via-slate-100 to-indigo-200">
              Curated Community Rooms
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed font-sans">
              Enter secure discussion rooms with like-minded peers. Start high-fidelity live audio stages or real-time text debates. High-trust design for digital operators.
            </p>
          </div>
          
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 px-6 py-3 bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg border-0 shadow-indigo-500/20"
            >
              <PlusCircle className="h-5 w-5" />
              <span>Create New Room</span>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* 2. Invitations Alert Banner */}
      <AnimatePresence>
        {invites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-3 p-4 bg-linear-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/20 rounded-2xl"
          >
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Bell className="h-4.5 w-4.5 animate-bounce" />
              <span>Pending Room Invitations ({invites.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {invites.map((invite) => (
                <div key={invite.inviteId} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-slate-300 gap-4">
                  <div className="flex flex-col gap-1 truncate">
                    <span className="font-bold text-slate-100 truncate">{invite.roomName}</span>
                    <span className="text-slate-400 truncate">Invited by: {invite.inviterName}</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleInviteResponse(invite.inviteId, 'accepted')}
                      className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/25 transition-all"
                      title="Accept"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleInviteResponse(invite.inviteId, 'declined')}
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/25 transition-all"
                      title="Decline"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Search & Toolbar Block */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-white/50 dark:bg-slate-900/45 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs backdrop-blur-md">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search rooms by name, category, or operators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
          />
        </div>

        {/* Filters Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            Explore All
          </button>
          <button
            onClick={() => setActiveTab('joined')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'joined'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            Joined Rooms
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'trending'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'recommended'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            Recommended
          </button>
        </div>
      </div>

      {/* 4. Horizontal Categories Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono tracking-wider uppercase px-1">
          <Tag className="h-3.5 w-3.5 text-indigo-400" />
          <span>Browse Category Channels</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              selectedCategory === null
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                : 'bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                selectedCategory === category
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Rooms Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner size="lg" />
          <span className="text-sm font-mono text-slate-400">Loading discussion rooms network...</span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-slate-200 dark:border-slate-850 rounded-3xl bg-white/50 dark:bg-slate-900/30">
          <Layers className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No rooms match your filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Try adjusting your search terms, filtering by another category, or initiate a brand new channel using the &quot;Create Room&quot; builder!
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory(null);
              setSearchTerm('');
              setActiveTab('all');
            }}
            className="mt-4"
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => {
            const membership = userMemberships[room.roomId];
            const isApproved = membership?.status === 'approved';
            const isPending = membership?.status === 'pending';

            return (
              <motion.div
                key={room.roomId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -4 }}
                className="group flex flex-col justify-between h-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 rounded-2xl shadow-xs hover:shadow-lg transition-all overflow-hidden"
              >
                {/* Room Image and Badges Header */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                  {room.roomImage ? (
                    <img
                      src={room.roomImage}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-900 to-slate-950" />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                  
                  {/* Category Pill */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white border border-white/10 rounded-lg text-[9px] font-bold tracking-widest font-mono uppercase">
                    {room.category}
                  </span>

                  {/* Visibility & Type Flags */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {/* Room Type badge */}
                    <span className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-white" title={room.roomType === 'audio' ? 'Live Audio' : 'Text Conversation'}>
                      {room.roomType === 'audio' ? <Mic className="h-3.5 w-3.5 text-indigo-400" /> : <MessageSquare className="h-3.5 w-3.5 text-teal-400" />}
                    </span>
                    
                    {/* Visibility badge */}
                    <span className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-white" title={room.visibility === 'private' ? 'Private' : 'Public'}>
                      {room.visibility === 'private' ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Globe className="h-3.5 w-3.5 text-emerald-400" />}
                    </span>
                  </div>

                  {/* Title overlay at the bottom of image */}
                  <div className="absolute bottom-3 left-3 right-3 flex flex-col">
                    <h3 className="text-base font-bold text-white truncate drop-shadow-sm">
                      {room.name}
                    </h3>
                    <span className="text-[10px] text-slate-300 font-mono">
                      Created by: {room.creatorName}
                    </span>
                  </div>
                </div>

                {/* Card Description */}
                <CardContent className="pt-4 pb-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {room.description || 'No description provided.'}
                  </p>
                  
                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-slate-50 dark:border-slate-800/50 pt-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{room.membersCount || 0} Operators</span>
                    </span>
                    {room.maxMembers && (
                      <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px]">
                        Cap: {room.maxMembers}
                      </span>
                    )}
                  </div>
                </CardContent>

                {/* Card CTA Footer */}
                <CardFooter className="bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-50 dark:border-slate-800/40 p-4 pt-3.5">
                  <Button
                    variant={isApproved ? 'primary' : isPending ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleJoinOrEnterRoom(room)}
                    disabled={isPending}
                    className="w-full gap-1.5 text-xs font-semibold font-sans py-2"
                  >
                    {isApproved ? (
                      <>
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Enter Room</span>
                      </>
                    ) : isPending ? (
                      <>
                        <Users className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-amber-500">Pending Approval</span>
                      </>
                    ) : room.visibility === 'private' ? (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        <span>Request Access</span>
                      </>
                    ) : (
                      <>
                        <span>Join Room</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 6. CREATE ROOM PREMIUM MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl z-10 overflow-y-auto max-h-[90vh]"
            >
              {/* Close icon */}
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col gap-1 mb-6">
                <div className="inline-flex items-center gap-1.5 text-indigo-500 text-xs font-mono font-bold uppercase tracking-wider">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Room Provisioner</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Establish Community Stage
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide custom structural descriptors for your dedicated discussion cell.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateRoomSubmit} className="flex flex-col gap-4 text-xs">
                {/* Room Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                    Room Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next-Gen Design Patterns"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Room Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a clear outline detailing what the room discusses..."
                    value={roomDesc}
                    onChange={(e) => setRoomDesc(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Row: Category & Max Members */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Room Category
                    </label>
                    <select
                      value={roomCat}
                      onChange={(e) => setRoomCat(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Max Members */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Max Members (Optional)
                    </label>
                    <input
                      type="number"
                      min={2}
                      placeholder="e.g. 20 (Unbounded if empty)"
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Row: Room Type & Visibility */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Room Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Room Structure
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomType('text')}
                        className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all ${
                          roomType === 'text'
                            ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Text Room</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomType('audio')}
                        className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all ${
                          roomType === 'audio'
                            ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <Mic className="h-4 w-4" />
                        <span>Audio Room</span>
                      </button>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Privacy Level
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomVis('public')}
                        className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all ${
                          roomVis === 'public'
                            ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <Globe className="h-4 w-4" />
                        <span>Public</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomVis('private')}
                        className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-semibold transition-all ${
                          roomVis === 'private'
                            ? 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-800/40 text-amber-600 dark:text-amber-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        <Lock className="h-4 w-4" />
                        <span>Private</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Image URL */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Custom Room Image URL
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Category default if empty)
                    </span>
                  </div>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={roomImage}
                    onChange={(e) => setRoomImage(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Regional & Language Specifics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Language
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. English, Español"
                      value={roomLanguage}
                      onChange={(e) => setRoomLanguage(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. US, Canada, Spain"
                      value={roomCountry}
                      onChange={(e) => setRoomCountry(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                      State / City
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        placeholder="State"
                        value={roomState}
                        onChange={(e) => setRoomState(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={roomCity}
                        onChange={(e) => setRoomCity(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. design, web3, ai, mindfulness"
                    value={roomTags}
                    onChange={(e) => setRoomTags(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Rules */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
                    Room Rules & Moderation Standards
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 1. Respect peers. 2. No hate speech. 3. Avoid spamming."
                    value={roomRules}
                    onChange={(e) => setRoomRules(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateOpen(false)}
                    className="font-semibold text-slate-500 dark:text-slate-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="px-6 font-semibold bg-linear-to-r from-indigo-500 to-purple-600 border-0"
                  >
                    Create Room
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
export default RoomsPage;
