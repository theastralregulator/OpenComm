/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  MessageCircle, 
  Users, 
  ShieldCheck, 
  Play, 
  Code2, 
  CheckCircle,
  Eye,
  Search,
  Bell,
  ArrowRight,
  Monitor,
  Heart,
  ChevronDown,
  Volume2,
  Lock,
  Globe,
  Radio,
  Image as ImageIcon,
  Send,
  Zap,
  Cpu,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { showToast } from '../components/ui/Toast';
import { ThemeToggle } from '../components/ui/ThemeToggle';

// Animated statistics counter component
const AnimatedCounter: React.FC<{ target: number; suffix?: string; label: string }> = ({ target, suffix = '', label }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) return;

    const totalDuration = 2000;
    const incrementTime = Math.max(Math.floor(totalDuration / end), 20);
    
    const timer = setInterval(() => {
      // Speed up the count exponentially
      const diff = Math.ceil((end - start) / 15);
      start += diff;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="flex flex-col items-center justify-center p-6 border border-gray-200/50 dark:border-slate-800/40 rounded-xl bg-white/40 dark:bg-slate-950/20 backdrop-blur-md shadow-soft">
      <span className="text-3xl sm:text-4xl font-mono font-black text-gray-900 dark:text-white tracking-tight">
        {count.toLocaleString()}{suffix}
      </span>
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mt-1 font-mono">
        {label}
      </span>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mockTab, setMockTab] = useState<'feed' | 'rooms' | 'profile' | 'notifications'>('feed');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  
  // Simulated Interactive States inside the Mock Preview
  const [likeCount, setLikeCount] = useState(432);
  const [isLiked, setIsLiked] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [mockMessages, setMockMessages] = useState([
    { sender: 'Ariel Chen', text: 'Hey everyone, the final layouts are ready!' },
    { sender: 'Dante Stark', text: 'Looking extremely sleek! Loving the typography.' }
  ]);

  const handleLikeMockPost = () => {
    if (isLiked) {
      setLikeCount(prev => prev - 1);
      setIsLiked(false);
      showToast.info('Removed like from mockup post');
    } else {
      setLikeCount(prev => prev + 1);
      setIsLiked(true);
      showToast.success('Liked mockup post! (Interactive Preview)');
    }
  };

  const handleJoinMockRoom = () => {
    setJoinedRoom(prev => !prev);
    if (!joinedRoom) {
      showToast.success('Joined "Design Systems Elite" live audio mockup!');
    } else {
      showToast.info('Left live audio mockup');
    }
  };

  const handleSendMockMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentMessage.trim()) return;
    setMockMessages(prev => [...prev, { sender: 'You', text: sentMessage }]);
    setSentMessage('');
    showToast.success('Message sent within mock interface!');
  };

  // Generate slow particles for the premium hero background
  const [particles, setParticles] = useState<{ id: number; size: number; x: number; y: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 6 + 4,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 15
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-bg-light dark:bg-bg-dark text-gray-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-x-hidden selection:bg-primary-blue/20">
      
      {/* 2. Hero Section */}
      <section id="hero" className="relative pt-12 pb-24 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Hero Background Glows & Particles */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          {/* Blurred Glowing Blobs */}
          <motion.div 
            animate={{ 
              x: [0, 20, -25, 0], 
              y: [0, -35, 25, 0] 
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-[10%] w-[350px] h-[350px] bg-gradient-to-tr from-primary-blue/15 to-primary-purple/15 blur-[120px] rounded-full"
          />
          <motion.div 
            animate={{ 
              x: [0, -30, 20, 0], 
              y: [0, 25, -35, 0] 
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 right-[15%] w-[400px] h-[400px] bg-gradient-to-tr from-accent-purple/10 to-primary-blue/15 blur-[130px] rounded-full"
          />
          
          {/* Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0.1, y: '105vh' }}
              animate={{ 
                opacity: [0.1, 0.4, 0.1], 
                y: '-5vh',
                x: [`${p.x}vw`, `${p.x + (Math.random() * 4 - 2)}vw`]
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: "linear"
              }}
              className="absolute w-1.5 h-1.5 bg-primary-purple/25 dark:bg-accent-blue/30 rounded-full"
              style={{ left: `${p.x}%` }}
            />
          ))}
        </div>

        {/* Hero Left Column */}
        <div className="lg:col-span-5 flex flex-col items-start text-left gap-6 lg:pr-4">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-primary-blue/5 dark:bg-primary-blue/10 border border-primary-blue/20 dark:border-primary-blue/30 rounded-full text-xs font-semibold text-primary-blue dark:text-accent-blue"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary-purple animate-pulse" />
            <span>Join the Elite Dialogue Circles</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black text-gray-900 dark:text-white leading-[1.08] tracking-tight"
          >
            Open Conversations.<br />
            <span className="bg-gradient-to-r from-primary-blue via-primary-purple to-secondary-purple bg-clip-text text-transparent">
              Real Connections.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-gray-500 dark:text-slate-400 leading-relaxed font-sans max-w-lg"
          >
            OpenComm is a premium, conversation-first social platform where users connect through immersive rooms, verified direct messaging, organic forums, and elite, targeted discussions. Experience social media redesigned for depth, simplicity, and trust.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-wrap gap-3.5 mt-2"
          >
            <Link to="/register">
              <Button variant="premium" className="px-6 py-3 text-sm font-semibold shadow-md bg-gradient-to-r from-primary-blue via-primary-purple to-secondary-purple text-white hover:shadow-lg transition-all rounded-xl">
                <span>Get Started Now</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="px-6 py-3 text-sm font-semibold border-gray-200/80 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900/40 rounded-xl">
                <span>Sign In</span>
              </Button>
            </Link>
          </motion.div>

          {/* Core Mini Metrics below Hero content */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-3 gap-6 pt-8 mt-4 border-t border-gray-100 dark:border-slate-900/60 w-full"
          >
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-mono font-bold text-gray-900 dark:text-white">142K+</span>
              <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 uppercase mt-1">Users Connected</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-mono font-bold text-primary-purple">8.4K+</span>
              <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 uppercase mt-1">Active Rooms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-mono font-bold text-primary-blue">1.2M+</span>
              <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 uppercase mt-1">Messages Sent</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Right Column - Premium Browser Mockup & Floating Cards */}
        <div className="lg:col-span-7 relative flex justify-center items-center mt-12 lg:mt-0">
          
          {/* Floating Card 1: Active Users */}
          <motion.div 
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden xl:flex absolute -left-12 top-10 z-20 items-center gap-2.5 p-3 rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md shadow-soft"
          >
            <div className="flex -space-x-2">
              <Avatar fallback="SQ" size="sm" isOnline={true} ringVariant="gradient" />
              <Avatar fallback="DS" size="sm" isOnline={true} />
              <Avatar fallback="AC" size="sm" isOnline={true} ringVariant="speaking" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-gray-900 dark:text-white">Active Users</span>
              <span className="text-[9px] font-mono text-emerald-500 font-semibold animate-pulse">● 432 Live Now</span>
            </div>
          </motion.div>

          {/* Floating Card 2: Voice Stream */}
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="hidden xl:flex absolute -left-20 bottom-16 z-20 items-center gap-3 p-3.5 rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md shadow-soft"
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Radio className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-gray-900 dark:text-white">Late Night Lofi</span>
              <div className="flex items-center gap-1.5 text-[9px] font-semibold text-gray-400 mt-0.5">
                <Users className="h-2.5 w-2.5" />
                <span>124 Tuning In</span>
              </div>
            </div>
          </motion.div>

          {/* Floating Card 3: Notification Toast */}
          <motion.div 
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="hidden xl:flex absolute -right-8 top-20 z-20 items-center gap-3 p-3.5 rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md shadow-soft"
          >
            <div className="h-8.5 w-8.5 rounded-xl bg-primary-purple/10 flex items-center justify-center text-primary-purple">
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-gray-900 dark:text-white">Dante Stark speaking</span>
              <span className="text-[9px] font-semibold text-gray-400">Design Systems Roundtable</span>
            </div>
          </motion.div>

          {/* Floating Card 4: Stats Analytics */}
          <motion.div 
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="hidden xl:flex absolute -right-12 bottom-12 z-20 items-center gap-3 p-3.5 rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md shadow-soft"
          >
            <div className="h-8.5 w-8.5 rounded-xl bg-primary-blue/10 flex items-center justify-center text-primary-blue font-mono font-black text-xs">
              +
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold text-gray-900 dark:text-white">Rooms Growth</span>
              <span className="text-[9px] font-mono text-primary-purple font-semibold">+24% Today</span>
            </div>
          </motion.div>

          {/* Main Interactive Browser Preview Layout */}
          <motion.div 
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[620px] rounded-2xl border border-gray-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 shadow-luxury overflow-hidden"
          >
            {/* Window Top Controls Frame */}
            <div className="bg-gray-50/80 dark:bg-slate-900/60 px-4 py-3 border-b border-gray-100 dark:border-slate-900 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 block" />
              </div>
              <div className="flex-1 mx-6 bg-white dark:bg-slate-950 rounded-lg px-3 py-1 border border-gray-100 dark:border-slate-800/80 text-[11px] font-mono text-gray-400 dark:text-slate-500 flex items-center gap-1.5 select-none">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span>opencomm.app/{mockTab}</span>
              </div>
            </div>

            {/* Browser Content Body */}
            <div className="grid grid-cols-12 min-h-[380px] bg-slate-50/30 dark:bg-slate-950/20 text-left">
              
              {/* Sidebar Tabs - Mini Nav Panel */}
              <div className="col-span-3 sm:col-span-2.5 border-r border-gray-100 dark:border-slate-900 p-2 sm:p-3 flex flex-col gap-1.5 bg-gray-50/20 dark:bg-slate-900/20">
                <button 
                  onClick={() => setMockTab('feed')}
                  className={`w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    mockTab === 'feed' 
                      ? 'bg-primary-blue/10 text-primary-blue' 
                      : 'text-gray-500 hover:bg-gray-100/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <MessageCircle className="h-4.5 w-4.5 shrink-0" />
                  <span className="hidden sm:inline">Feed</span>
                </button>

                <button 
                  onClick={() => setMockTab('rooms')}
                  className={`w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    mockTab === 'rooms' 
                      ? 'bg-primary-purple/10 text-primary-purple' 
                      : 'text-gray-500 hover:bg-gray-100/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Radio className="h-4.5 w-4.5 shrink-0" />
                  <span className="hidden sm:inline">Rooms</span>
                </button>

                <button 
                  onClick={() => setMockTab('profile')}
                  className={`w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    mockTab === 'profile' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'text-gray-500 hover:bg-gray-100/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Avatar fallback="SQ" size="sm" className="h-4.5 w-4.5 border-none" />
                  <span className="hidden sm:inline">Profile</span>
                </button>

                <button 
                  onClick={() => setMockTab('notifications')}
                  className={`w-full flex items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    mockTab === 'notifications' 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'text-gray-500 hover:bg-gray-100/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Bell className="h-4.5 w-4.5 shrink-0" />
                  <span className="hidden sm:inline">Notifs</span>
                </button>
              </div>

              {/* Main Content Area in Mock Screen */}
              <div className="col-span-9 sm:col-span-9.5 p-4 sm:p-5 h-[380px] overflow-y-auto">
                <AnimatePresence mode="wait">
                  
                  {/* FEED VIEW MOCK */}
                  {mockTab === 'feed' && (
                    <motion.div 
                      key="mock-feed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-4"
                    >
                      {/* Create Post header */}
                      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between shadow-soft">
                        <span className="text-xs text-gray-400">Share something premium...</span>
                        <div className="flex gap-2 text-gray-400">
                          <ImageIcon className="h-4 w-4" />
                          <Radio className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Premium Mock Post Card */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-soft flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Avatar fallback="SQ" size="md" isOnline={true} ringVariant="gradient" />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-gray-900 dark:text-white leading-none">Seraphina Quinn</span>
                                <Badge variant="verified" className="text-[7px] scale-90 px-1 py-0 border-none">✓</Badge>
                              </div>
                              <span className="text-[9px] text-gray-400">@seraphina · 2h ago</span>
                            </div>
                          </div>
                          <Badge variant="premium" className="text-[8px]">Pinned</Badge>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed font-sans">
                          Just completed design specs for OpenComm. We are structuring low-latency spatial audio rooms paired with verified user credentials. What does everyone think of the clean bento layouts? 🎨✨
                        </p>

                        {/* Interactive Like action bar inside mockup */}
                        <div className="flex items-center gap-4.5 pt-2 border-t border-gray-50 dark:border-slate-800/40 text-[10px] font-mono font-bold">
                          <button 
                            onClick={handleLikeMockPost}
                            className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
                            <span>{likeCount} Likes</span>
                          </button>
                          <span className="text-gray-300 dark:text-slate-700">|</span>
                          <span className="text-gray-400 flex items-center gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>18 Comments</span>
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ROOMS VIEW MOCK */}
                  {mockTab === 'rooms' && (
                    <motion.div 
                      key="mock-rooms"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-3.5"
                    >
                      <span className="text-[10px] font-bold font-mono tracking-widest text-gray-400 uppercase">
                        Live Audio Spaces
                      </span>

                      {/* Main Interactive Room Card */}
                      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-soft flex flex-col gap-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="online" className="px-1.5 py-0.5 text-[8px]">● LIVE</Badge>
                            <span className="text-[9px] font-mono font-bold text-gray-400">#design-ethics</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-500 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>142 speaking</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white font-sans">
                            Design Systems Roundtable
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Hosted by Dante Stark, Seraphina Quinn, & Ariel Chen
                          </p>
                        </div>

                        {/* Speaking Waves Visualization when joined */}
                        {joinedRoom && (
                          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">You are in the listener bench</span>
                              <Volume2 className="h-3.5 w-3.5 text-emerald-500 animate-bounce" />
                            </div>
                            <div className="flex items-end gap-1 h-5 pt-1.5">
                              {Array.from({ length: 14 }).map((_, i) => (
                                <span 
                                  key={i} 
                                  className="flex-1 bg-emerald-500 rounded-sm"
                                  style={{ 
                                    height: `${Math.floor(Math.random() * 85) + 15}%`,
                                    animation: `pulse 1.${i % 3 + 1}s infinite alternate` 
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <Button 
                          onClick={handleJoinMockRoom} 
                          variant={joinedRoom ? 'outline' : 'premium'} 
                          size="sm" 
                          className="w-full text-[10px] font-mono font-bold"
                        >
                          {joinedRoom ? 'Leave Room' : 'Join Live Audio Panel'}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* PROFILE VIEW MOCK */}
                  {mockTab === 'profile' && (
                    <motion.div 
                      key="mock-profile"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft">
                        {/* Profile Mesh Cover */}
                        <div className="h-16 bg-gradient-to-r from-primary-blue/30 via-primary-purple/30 to-secondary-purple/20" />
                        <div className="p-4 pt-1 flex flex-col gap-2 relative">
                          {/* Avatar Overflow */}
                          <div className="absolute -top-6 left-4">
                            <Avatar fallback="SQ" size="lg" ringVariant="gradient" isOnline={true} />
                          </div>
                          
                          <div className="pl-20 flex flex-col">
                            <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">Seraphina Quinn</span>
                            <span className="text-[9px] text-gray-400">@seraphina · Member since 2026</span>
                          </div>

                          <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed font-sans mt-1">
                            Interface Architect & Sound Engineer. Crafting beautiful, high-trust spaces on OpenComm. Specializing in low-latency communication structures.
                          </p>

                          <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-gray-50 dark:border-slate-800/40 text-center font-mono font-bold text-[9px] text-gray-400">
                            <div>
                              <span className="text-xs text-gray-900 dark:text-white block">3,421</span>
                              <span>followers</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-900 dark:text-white block">128</span>
                              <span>discussions</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-900 dark:text-white block">42</span>
                              <span>rooms hosted</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* NOTIFICATIONS VIEW MOCK */}
                  {mockTab === 'notifications' && (
                    <motion.div 
                      key="mock-notifications"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-2.5"
                    >
                      <span className="text-[10px] font-bold font-mono tracking-widest text-gray-400 uppercase">
                        Recent Notifications
                      </span>

                      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800/80 shadow-soft flex items-start gap-3">
                          <Avatar fallback="DS" size="sm" isOnline={true} />
                          <div className="flex flex-col text-left">
                            <span className="text-[11px] text-gray-900 dark:text-white leading-normal">
                              <strong>Dante Stark</strong> followed you back.
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono mt-0.5">10m ago</span>
                          </div>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800/80 shadow-soft flex items-start gap-3">
                          <Avatar fallback="AC" size="sm" isOnline={true} ringVariant="speaking" />
                          <div className="flex flex-col text-left">
                            <span className="text-[11px] text-gray-900 dark:text-white leading-normal">
                              <strong>Ariel Chen</strong> invited you to speak in "AI Ethics & Global Impact".
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono mt-0.5">1h ago</span>
                          </div>
                        </div>

                        <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-800/60 shadow-soft flex items-start gap-3">
                          <div className="h-7 w-7 rounded-lg bg-primary-blue/10 text-primary-blue flex items-center justify-center text-[10px] font-bold shrink-0 font-mono">
                            S
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-[11px] text-gray-900 dark:text-white leading-normal">
                              System node updated to <strong>Frankfurt-Edge-09</strong> for lowest audio latency.
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono mt-0.5">3h ago</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Trusted Statistics */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full border-t border-b border-gray-100 dark:border-slate-800/60">
        <div className="text-center mb-10">
          <span className="text-[10px] font-bold font-mono tracking-widest text-primary-purple uppercase">
            Platform Statistics
          </span>
          <h2 className="text-2xl sm:text-3xl font-sans font-bold text-gray-900 dark:text-white mt-2 leading-tight">
            Trusted by Creators Worldwide
          </h2>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <AnimatedCounter target={142000} suffix="+" label="Connected Users" />
          <AnimatedCounter target={420000} suffix="+" label="Discussions Shared" />
          <AnimatedCounter target={8400} suffix="+" label="Live Audio Rooms" />
          <AnimatedCounter target={164} suffix="+" label="Global Regions" />
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-2xl mx-auto flex flex-col gap-3.5 mb-16">
          <span className="text-[10px] font-bold font-mono tracking-widest text-primary-purple uppercase">
            ELEGANT ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-4xl font-sans font-bold text-gray-900 dark:text-white">
            Designed for Elite Discussions
          </h2>
          <p className="text-base text-gray-500 dark:text-slate-400 font-sans mt-1">
            We built OpenComm from the ground up to foster real conversations, eliminating shallow engagement traps and optimizing for focus.
          </p>
        </div>

        {/* Features 6-card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-2xl text-left shadow-soft hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary-blue to-accent-blue flex items-center justify-center text-white shadow-md shadow-primary-blue/10">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conversation Feed</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Engage with a structured discussion layout designed for clarity. High-trust threads place thoughtful content ahead of noise.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-2xl text-left shadow-soft hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary-purple to-accent-purple flex items-center justify-center text-white shadow-md shadow-primary-purple/10">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Image Sharing</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Upload crisp, high-resolution visual boards, photos, or schematics that load instantly and display with desktop precision.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-2xl text-left shadow-soft hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/10">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Public & Private Rooms</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Establish gated discussion centers for invite-only panels, or host dynamic open spaces for broad global audiences.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-2xl text-left shadow-soft hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-md shadow-amber-500/10">
              <Radio className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Live Audio Rooms</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Experience flawless audio broadcasting with native codecs and dynamic speaker seating charts. No voice delays.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-2xl text-left shadow-soft hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shadow-md shadow-rose-500/10">
              <Send className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Direct Messaging</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Communicate in real-time with peers using fully verified endpoints, supporting quick reactions and shared file links.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 rounded-2xl text-left shadow-soft hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/10">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Privacy & Security</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Take back control of your profile data. Robust cloud security blocks automated scraping, data tracking, or data leaks.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Product Showcase Sections (Alternating) */}
      <section id="showcase" className="py-16 bg-slate-50/40 dark:bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-28">
          
          <div className="text-center max-w-xl mx-auto">
            <span className="text-[10px] font-bold font-mono tracking-widest text-primary-purple uppercase">
              DEEP WALKTHROUGH
            </span>
            <h2 className="text-3xl font-sans font-bold text-gray-900 dark:text-white mt-2">
              Inside the Product Suite
            </h2>
          </div>

          {/* Showcase 1: Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
            <div className="lg:col-span-5 flex flex-col gap-5">
              <Badge variant="cyan" className="w-fit">Social Module</Badge>
              <h3 className="text-2xl sm:text-3xl font-sans font-bold text-gray-900 dark:text-white leading-tight">
                High-Trust Interactive Feed
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                Enjoy a curated timeline where posts are highlighted for constructive depth rather than viral engagement hacks. Share technical blueprints, markdown ideas, or high-fidelity media uploads effortlessly.
              </p>
              <ul className="flex flex-col gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-primary-blue" />
                  <span>Verified Creator Checkmarks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-primary-blue" />
                  <span>Subtle, distraction-free likes & comments</span>
                </li>
              </ul>
            </div>
            
            {/* Visual Panel Right */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-soft">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50 dark:border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Avatar fallback="SQ" size="md" ringVariant="gradient" isOnline={true} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Seraphina Quinn</span>
                    <span className="text-[9px] text-gray-400">@seraphina · designer</span>
                  </div>
                </div>
                <Badge variant="verified">Verify Spec</Badge>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                "Our design ecosystem uses a modular slate token palette. By establishing responsive typography early, layout alignments map perfectly across web viewport containers."
              </p>
              <div className="mt-4 p-4.5 bg-slate-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-850 rounded-xl flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">DesignTokens.json</span>
                <span className="text-[10px] font-mono text-primary-purple font-semibold">Ready to deploy (42KB)</span>
              </div>
            </div>
          </div>

          {/* Showcase 2: Audio Rooms (Reverse Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
            <div className="lg:col-span-7 order-2 lg:order-1 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-soft">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50 dark:border-slate-800/40">
                <span className="text-xs font-bold font-mono text-gray-400">#design-ethics</span>
                <Badge variant="online" glow={true}>Live Session</Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-1.5 p-2 bg-primary-blue/5 dark:bg-primary-blue/10 border border-primary-blue/15 rounded-xl">
                  <Avatar fallback="DS" size="md" isOnline={true} ringVariant="premium" />
                  <span className="text-[10px] font-bold text-gray-950 dark:text-white">Dante</span>
                  <span className="text-[8px] text-primary-blue uppercase font-bold font-mono">Host</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-xl animate-pulse">
                  <Avatar fallback="SQ" size="md" isOnline={true} ringVariant="speaking" />
                  <span className="text-[10px] font-bold text-gray-950 dark:text-white">Seraphina</span>
                  <span className="text-[8px] text-emerald-500 uppercase font-bold font-mono">Speaking</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-gray-50 dark:border-slate-800">
                  <Avatar fallback="AC" size="md" isOnline={true} />
                  <span className="text-[10px] font-bold text-gray-900 dark:text-slate-300">Ariel</span>
                  <span className="text-[8px] text-gray-400 uppercase font-bold font-mono">Muted</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col gap-5">
              <Badge variant="premium" className="w-fit">Voice Module</Badge>
              <h3 className="text-2xl sm:text-3xl font-sans font-bold text-gray-900 dark:text-white leading-tight">
                Immersive Audio Rooms
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                Tune in to crystal clear discussion panels, workspace team spaces, or casual group talks. Our custom audio seat allocation maps speakers and listeners in pristine latency-free order.
              </p>
              <ul className="flex flex-col gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-primary-purple" />
                  <span>Dynamic animated voice waveforms</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-primary-purple" />
                  <span>Mute checks & microphone access controls</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Showcase 3: Profiles */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
            <div className="lg:col-span-5 flex flex-col gap-5">
              <Badge variant="verified" className="w-fit">Identity Module</Badge>
              <h3 className="text-2xl sm:text-3xl font-sans font-bold text-gray-900 dark:text-white leading-tight">
                Premium Creator Portfolios
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                Present your authentic professional self. Profiles on OpenComm act as structured portfolios, highlighting your hosted panels, articles, statistics, and speaking history without distraction.
              </p>
              <ul className="flex flex-col gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  <span>Clean custom bio layouts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                  <span>Hosted discussion trackers</span>
                </li>
              </ul>
            </div>
            
            {/* Visual Panel Right */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-soft">
              <div className="h-20 bg-gradient-to-r from-accent-blue/20 to-primary-purple/20 rounded-xl" />
              <div className="flex gap-4.5 mt-4 text-left relative">
                <div className="absolute -top-10 left-4">
                  <Avatar fallback="DS" size="lg" ringVariant="premium" isOnline={true} />
                </div>
                <div className="pl-24 flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-950 dark:text-white">Dante Stark</span>
                    <Badge variant="admin" className="text-[7px]">Staff</Badge>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">Founding Systems Architect</span>
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                    Building core telemetry structures at OpenComm. Obsessed with high-framerate animation and type-safe systems.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Showcase 4: Messaging */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
            <div className="lg:col-span-7 order-2 lg:order-1 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-soft">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50 dark:border-slate-800/40">
                <div className="flex items-center gap-2">
                  <Avatar fallback="AC" size="sm" isOnline={true} />
                  <span className="text-xs font-bold text-gray-950 dark:text-white">Ariel Chen</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-primary-purple">Secure Node DM</span>
              </div>
              
              <div className="flex flex-col gap-2.5 h-[160px] overflow-y-auto mb-4 p-2 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl">
                {mockMessages.map((m, idx) => (
                  <div key={idx} className={`flex flex-col ${m.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[8px] font-mono text-gray-400 px-1">{m.sender}</span>
                    <div className={`p-2.5 rounded-xl text-xs max-w-[80%] mt-0.5 font-sans ${
                      m.sender === 'You' 
                        ? 'bg-primary-blue text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 text-gray-800 dark:text-slate-300 rounded-tl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMockMessage} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type secure DM..." 
                  value={sentMessage}
                  onChange={(e) => setSentMessage(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-850 rounded-xl focus:outline-none focus:border-primary-blue dark:text-white"
                />
                <Button type="submit" variant="primary" size="sm" className="rounded-xl">
                  Send
                </Button>
              </form>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col gap-5">
              <Badge variant="cyan" className="w-fit">DM Module</Badge>
              <h3 className="text-2xl sm:text-3xl font-sans font-bold text-gray-900 dark:text-white leading-tight">
                Secure Direct Messaging
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                Connect instantly with direct private channels. Text, images, links, and code snippets are handled safely with zero surveillance or data logging. Enjoy clean, fast chatting.
              </p>
              <ul className="flex flex-col gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-primary-blue" />
                  <span>Real-time delivery & secure handshake logs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-primary-blue" />
                  <span>Clean keyboard chat workflows</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* 6. Mission Section */}
      <section id="mission" className="py-24 px-6 max-w-5xl mx-auto w-full text-center">
        <div className="p-8 sm:p-12 rounded-3xl border border-primary-blue/15 bg-primary-blue/5 dark:bg-slate-950/20 backdrop-blur-md shadow-soft flex flex-col items-center gap-6 relative overflow-hidden">
          {/* Subtle background circle glows */}
          <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-primary-blue/10 blur-[60px]" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-primary-purple/10 blur-[60px]" />

          <span className="text-[10px] font-bold font-mono tracking-widest text-primary-blue uppercase">
            OUR CORE VALUES
          </span>
          <h2 className="text-3xl sm:text-4xl font-sans font-bold text-gray-900 dark:text-white">
            Our Mission
          </h2>
          
          <p className="text-base sm:text-lg text-gray-600 dark:text-slate-300 leading-relaxed max-w-3xl font-sans">
            "At OpenComm, we believe in restoring communication depth. Modern platforms prioritize endless scrolling, dopamine spikes, and visual clutter. We focus on conversations—real discussion circles, immersive voice groups, and verified users connected in an environment of high mutual trust and simplicity."
          </p>

          <div className="flex gap-4 mt-2">
            <Link to="/register">
              <Button variant="premium" className="px-5 py-2.5 text-xs font-semibold bg-gradient-to-r from-primary-blue via-primary-purple to-secondary-purple text-white rounded-xl">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Why OpenComm */}
      <section className="py-24 px-6 max-w-7xl mx-auto w-full text-center">
        <div className="max-w-xl mx-auto flex flex-col gap-3.5 mb-16">
          <span className="text-[10px] font-bold font-mono tracking-widest text-primary-purple uppercase">
            WHY JOIN US
          </span>
          <h2 className="text-3xl font-sans font-bold text-gray-900 dark:text-white">
            Redefining the Dialogue Space
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {/* Card 1 */}
          <div className="p-6 border border-gray-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 flex flex-col gap-3">
            <Zap className="h-5 w-5 text-primary-blue" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Conversation-First</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Every detail is calibrated to support premium long-form and real-time verbal interactions. No distractions.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 border border-gray-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 flex flex-col gap-3">
            <Monitor className="h-5 w-5 text-primary-purple" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Clean Interface</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generous negative space, minimalist palettes, and standard typography elements keep reading readable.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 border border-gray-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 flex flex-col gap-3">
            <Cpu className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Fast Performance</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Built on highly optimized, modern engines supporting instant page render and seamless dark mode.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 border border-gray-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 flex flex-col gap-3">
            <Lock className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Privacy Focused</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your profile data is yours alone. We never share your details, direct messages, or logs.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 border border-gray-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 flex flex-col gap-3">
            <Sparkles className="h-5 w-5 text-rose-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Modern Design</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Beautiful hand-crafted design tokens, spring curves, and high contrast glassmorphic UI.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 border border-gray-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 flex flex-col gap-3">
            <Globe className="h-5 w-5 text-primary-blue" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Worldwide Access</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Communicate from any region through an intelligent edge network layout for premium latency control.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Frequently Asked Questions */}
      <section id="faq" className="py-24 px-6 max-w-4xl mx-auto w-full text-left">
        <div className="text-center mb-16">
          <span className="text-[10px] font-bold font-mono tracking-widest text-primary-purple uppercase">
            COMMON INQUIRIES
          </span>
          <h2 className="text-3xl font-sans font-bold text-gray-900 dark:text-white mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {[
            {
              q: "What is OpenComm?",
              a: "OpenComm is a high-trust, elite social networking and discussion platform designed exclusively for meaningful conversations, private and public audio rooms, direct secure messaging, and constructive visual sharing."
            },
            {
              q: "Is it free to join?",
              a: "Yes! OpenComm is free to join. Users can participate in public discussion groups, connect with other members, and stream audio sessions. Gated and enterprise workspaces are available under custom subscription plans."
            },
            {
              q: "How do discussion rooms work?",
              a: "Rooms can be started instantly by verified users. They can either be text forums or active audio spaces with speakers seated in modular slots and listener waves feeding real-time audio playback with no latency."
            },
            {
              q: "Can I create private rooms?",
              a: "Absolutely. When creating a room, you can set it to private. Only verified guests or members with invite links or custom security tokens will be able to request access to join."
            },
            {
              q: "Is my personal data secure?",
              a: "Yes. OpenComm uses native cloud-database rules, full credential checkups, and zero data brokers. We do not track your visual layouts, record your discussions, or target ads based on your conversations."
            }
          ].map((item, idx) => (
            <div 
              key={idx}
              className="border border-gray-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 p-5 cursor-pointer shadow-soft transition-all duration-300"
              onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-sans font-bold text-sm text-gray-950 dark:text-white">
                  {item.q}
                </span>
                <ChevronDown 
                  className={`h-4.5 w-4.5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaqIndex === idx ? 'rotate-180 text-primary-purple' : ''}`} 
                />
              </div>
              
              <AnimatePresence initial={false}>
                {openFaqIndex === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed font-sans pr-4">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Call To Action (CTA) */}
      <section className="py-24 px-6 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-tr from-primary-blue via-primary-purple to-secondary-purple p-8 sm:p-14 text-center text-white relative overflow-hidden shadow-luxury">
          
          {/* Subtle background circles */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-white/5 rounded-full blur-[80px]" />

          <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 relative z-10">
            <span className="text-[10px] font-bold font-mono tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full text-white backdrop-blur-xs">
              SECURE YOUR DIALOGUE CIRCLE
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-black leading-tight tracking-tight">
              Ready to Join OpenComm?
            </h2>
            <p className="text-sm sm:text-base text-white/80 max-w-lg leading-relaxed">
              Step into high-trust communication. Connect through professional feeds, active audio spaces, and secure peer channels.
            </p>
            
            <div className="flex flex-wrap justify-center gap-3.5 mt-2">
              <Link to="/register">
                <Button className="px-6 py-3.5 bg-white text-primary-purple text-xs font-bold rounded-xl shadow-md hover:bg-slate-50 transition-colors">
                  Create Free Account
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold rounded-xl">
                  Login to Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="mt-auto border-t border-gray-150/40 dark:border-slate-850 py-16 px-6 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 text-left">
          
          {/* Column 1: Brand details */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-blue via-primary-purple to-secondary-purple flex items-center justify-center text-white shadow-md font-mono font-black text-lg">
                O
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white font-sans tracking-tight">OpenComm</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 max-w-sm leading-relaxed">
              A high-trust, luxury social platform designed for elite, focused discussions. Bridging latency-free voice streaming with verified peer-to-peer networks.
            </p>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-4">
              OpenComm &copy; 2026. Built with modern React and Tailwind.
            </span>
          </div>

          {/* Column 2: Navigation links */}
          <div className="md:col-span-2.5 flex flex-col gap-3">
            <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 dark:text-slate-500 uppercase">
              Product Suite
            </span>
            <div className="flex flex-col gap-2.5 text-xs text-gray-500 dark:text-slate-400 font-semibold">
              <a href="#hero" className="hover:text-primary-blue transition-colors">Hero Overview</a>
              <a href="#features" className="hover:text-primary-blue transition-colors">Key Features</a>
              <a href="#showcase" className="hover:text-primary-blue transition-colors">Showcase Room</a>
              <a href="#faq" className="hover:text-primary-blue transition-colors">FAQ</a>
            </div>
          </div>

          {/* Column 3: Policy links */}
          <div className="md:col-span-2.5 flex flex-col gap-3">
            <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 dark:text-slate-500 uppercase">
              Trust & Security
            </span>
            <div className="flex flex-col gap-2.5 text-xs text-gray-500 dark:text-slate-400 font-semibold">
              <a href="#" className="hover:text-primary-blue transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary-blue transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary-blue transition-colors">Security Center</a>
              <a href="#" className="hover:text-primary-blue transition-colors">Compliance</a>
            </div>
          </div>

          {/* Column 4: Contact/Support */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 dark:text-slate-500 uppercase">
              Support Node
            </span>
            <div className="flex flex-col gap-2.5 text-xs text-gray-500 dark:text-slate-400 font-semibold font-mono">
              <a href="#" className="hover:text-primary-blue transition-colors">Contact Center</a>
              <a href="#" className="hover:text-primary-blue transition-colors">System Status</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
