/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Settings,
  Shield,
  Bell,
  Eye,
  HelpCircle,
  Paintbrush,
  LogOut,
  Mail,
  Key,
  Globe,
  MapPin,
  Heart,
  Tag,
  Sparkles,
  Smartphone,
  Laptop,
  ArrowRight,
  UserCheck,
  Check,
  AlertTriangle,
  RefreshCw,
  Info,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { showToast } from '../components/ui/Toast';

type SettingsTab = 'profile' | 'account' | 'privacy' | 'notifications' | 'appearance' | 'security' | 'about';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, logout, resetPassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Local state for instant field saving/feedback
  const [savingField, setSavingField] = useState<string | null>(null);

  // Profile fields state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [profileImage, setProfileImage] = useState(user?.profilePhotoURL || user?.profileImage || user?.photoURL || '');
  const [coverImage, setCoverImage] = useState(
    user?.bannerPhotoURL || user?.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
  );
  const [interestInput, setInterestInput] = useState('');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);

  // Sync state if user details load after page mount
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setWebsite(user.website || '');
      setProfileImage(user.profilePhotoURL || user.profileImage || user.photoURL || '');
      if (user.bannerPhotoURL || user.coverImage) setCoverImage(user.bannerPhotoURL || user.coverImage || '');
      if (user.interests) setInterests(user.interests);
    }
  }, [user]);

  // Privacy preferences
  const [isProfilePublic, setIsProfilePublic] = useState(user?.isProfilePublic !== false);
  const [whoCanMessage, setWhoCanMessage] = useState(user?.whoCanMessage || 'everyone');
  const [whoCanInvite, setWhoCanInvite] = useState(user?.whoCanInvite || 'everyone');
  const [whoCanMention, setWhoCanMention] = useState(user?.whoCanMention || 'everyone');
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.showOnlineStatus !== false);

  // Notification preferences
  const [notifLikes, setNotifLikes] = useState(user?.notifLikes !== false);
  const [notifComments, setNotifComments] = useState(user?.notifComments !== false);
  const [notifMentions, setNotifMentions] = useState(user?.notifMentions !== false);
  const [notifMessages, setNotifMessages] = useState(user?.notifMessages !== false);
  const [notifRooms, setNotifRooms] = useState(user?.notifRooms !== false);
  const [notifAnnouncements, setNotifAnnouncements] = useState(user?.notifAnnouncements !== false);

  // Appearance & Performance states
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(
    (localStorage.getItem('opencomm_font_size') as any) || 'medium'
  );
  const [animationsEnabled, setAnimationsEnabled] = useState<'on' | 'off' | 'reduce'>(
    (localStorage.getItem('opencomm_animations') as any) || 'on'
  );

  // Helper for Instant Firestore Field Updates
  const saveField = async (fieldName: string, value: any) => {
    if (!user) return;
    setSavingField(fieldName);
    try {
      await updateProfile({ [fieldName]: value });
      showToast.success(`Updated ${fieldName} successfully.`);
    } catch (err: any) {
      console.error(err);
      showToast.error(`Failed to update ${fieldName}: ${err.message}`);
    } finally {
      setSavingField(null);
    }
  };

  // Add tag to interests list
  const handleAddInterest = () => {
    const clean = interestInput.trim();
    if (!clean) return;
    if (interests.includes(clean)) {
      setInterestInput('');
      return;
    }
    const updated = [...interests, clean];
    setInterests(updated);
    setInterestInput('');
    saveField('interests', updated);
  };

  const handleRemoveInterest = (tag: string) => {
    const updated = interests.filter((t) => t !== tag);
    setInterests(updated);
    saveField('interests', updated);
  };

  // Account level actions
  const handlePasswordResetRequest = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      showToast.success(`A password reset link has been dispatched to ${user.email}`);
    } catch (err: any) {
      showToast.error(err.message || 'Reset dispatch failed.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    showToast.success('Logged out from current session.');
  };

  const handleDeleteAccount = () => {
    const confirm = window.confirm(
      'Are you absolutely sure you want to delete your OpenComm account? This action is irreversible and all your message archives, profile cards, and registered channels will be permanently purged from our schemas.'
    );
    if (confirm) {
      showToast.success('Mock account purge completed. Redirecting to landing page.');
      setTimeout(() => {
        logout();
        navigate('/');
      }, 1500);
    }
  };

  // Preset themes selector
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    saveField('themePreference', newTheme);
  };

  const handleFontSizeChange = (sz: 'small' | 'medium' | 'large') => {
    setFontSize(sz);
    localStorage.setItem('opencomm_font_size', sz);
    showToast.success(`Applied ${sz} typography styling.`);
  };

  const handleAnimationsChange = (mode: 'on' | 'off' | 'reduce') => {
    setAnimationsEnabled(mode);
    localStorage.setItem('opencomm_animations', mode);
    showToast.success(`Animations configured to: ${mode}`);
  };

  return (
    <div id="settings-page-wrapper" className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
      
      {/* Left Column - Dynamic Navigation Sidebar Tabs */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 rounded-2xl p-4 space-y-1.5 shadow-xs">
          <div className="px-3 pb-3 border-b border-gray-50 dark:border-slate-800/50 mb-3 text-left">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Settings Hub</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Configure your cryptographic profile & view preferences.</p>
          </div>

          <button
            id="tab-profile-trigger"
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer text-left ${
              activeTab === 'profile'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/30 dark:hover:text-slate-200'
            }`}
          >
            <User className="h-4 w-4" />
            Profile Preferences
          </button>

          <button
            id="tab-account-trigger"
            onClick={() => setActiveTab('account')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer text-left ${
              activeTab === 'account'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/30 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            Account credentials
          </button>

          <button
            id="tab-privacy-trigger"
            onClick={() => setActiveTab('privacy')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer text-left ${
              activeTab === 'privacy'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/30 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="h-4 w-4" />
            Privacy & visibility
          </button>

          <button
            id="tab-notifications-trigger"
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer text-left ${
              activeTab === 'notifications'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/30 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="h-4 w-4" />
            Notification systems
          </button>

          <button
            id="tab-appearance-trigger"
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer text-left ${
              activeTab === 'appearance'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/30 dark:hover:text-slate-200'
            }`}
          >
            <Paintbrush className="h-4 w-4" />
            Visual Themes
          </button>

          <button
            id="tab-security-trigger"
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer text-left ${
              activeTab === 'security'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/30 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="h-4 w-4" />
            Platform Security
          </button>

          <button
            id="tab-about-trigger"
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer text-left ${
              activeTab === 'about'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/30 dark:hover:text-slate-200'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            About OpenComm
          </button>
        </div>
      </div>

      {/* Right Column - Active Content Panels with smooth transitions */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Profile setup card */}
              <Card>
                <CardHeader className="border-b border-gray-50 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-left">
                    <User className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Public Identity Settings</span>
                  </CardTitle>
                  <CardDescription className="text-left">
                    Updates to display name, website link, and bio are saved instantly in real time.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 text-left">
                  {/* Photo selectors and cover previews */}
                  <div className="space-y-4">
                    <div className="relative h-32 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                      <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute bottom-3 right-3 max-w-[240px]">
                        <input
                          type="text"
                          value={coverImage}
                          onChange={(e) => {
                            setCoverImage(e.target.value);
                            saveField('coverImage', e.target.value);
                          }}
                          placeholder="Paste cover URL..."
                          className="px-2.5 py-1 text-[10px] bg-black/60 backdrop-blur-md text-white border border-white/20 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 truncate"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <Avatar src={profileImage} fallback={displayName || 'OC'} size="lg" className="border-2 border-indigo-600 shadow-md flex-shrink-0" />
                      <div className="flex-1 w-full space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500">Profile Image Link</label>
                        <input
                          type="text"
                          value={profileImage}
                          onChange={(e) => {
                            setProfileImage(e.target.value);
                            saveField('profileImage', e.target.value);
                          }}
                          placeholder="Paste profile picture URL..."
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onBlur={() => saveField('displayName', displayName)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Username (@)</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onBlur={() => saveField('username', username.toLowerCase())}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          onBlur={() => saveField('location', location)}
                          placeholder="e.g. Portland, USA"
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500">Personal Website</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          onBlur={() => saveField('website', website)}
                          placeholder="e.g. https://opencomm.dev"
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500">Intellectual Bio (Minimalist)</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      onBlur={() => saveField('bio', bio)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                      placeholder="Share your design theories or technology interests..."
                    />
                  </div>

                  {/* Interests Tags editor */}
                  <div className="space-y-2 border-t border-gray-50 dark:border-slate-800 pt-4">
                    <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-indigo-500" />
                      Interests tags
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                        placeholder="Add interest tag, e.g. Design Theory"
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <Button variant="secondary" size="sm" onClick={handleAddInterest} className="cursor-pointer">
                        Add tag
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {interests.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-100/50 dark:border-indigo-950"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveInterest(tag)}
                            className="text-indigo-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="border-b border-gray-50 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-left">
                    <Settings className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Account credentials</span>
                  </CardTitle>
                  <CardDescription className="text-left">
                    Configure cryptographic tokens and system verification details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-left">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Registered Email</span>
                      <p className="text-xs text-gray-700 dark:text-slate-300 mt-1 truncate">{user?.email}</p>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-left">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">OpenComm Id</span>
                      <p className="text-xs font-mono text-gray-700 dark:text-indigo-400 mt-1 truncate">
                        {user?.openCommId || 'OC-00219'}
                      </p>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-left">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Onboarding Date</span>
                      <p className="text-xs text-gray-700 dark:text-slate-300 mt-1">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Credentials Actions</h4>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        id="reset-pass-trigger"
                        onClick={handlePasswordResetRequest}
                        variant="outline"
                        className="flex-1 cursor-pointer"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Disptach Reset Link
                      </Button>
                      <Button onClick={handleLogout} variant="secondary" className="flex-1 cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <h4 className="text-xs font-bold">Danger Zone</h4>
                    </div>
                    <p className="text-[10px] text-red-600 dark:text-red-300 leading-relaxed">
                      Deleting your OpenComm account will instantly wipe all records. There is no backup system; once confirmed, data schema is permanently dropped.
                    </p>
                    <Button onClick={handleDeleteAccount} variant="primary" className="bg-red-600 hover:bg-red-700 text-white border-0 text-xs py-1.5 cursor-pointer">
                      Purge Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="border-b border-gray-50 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-left">
                    <Eye className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Privacy Preferences</span>
                  </CardTitle>
                  <CardDescription className="text-left">
                    Decide who can explore your content cards or message your inbox.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 text-left">
                  {/* Account Public Visibility */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Public profile visbility</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Let unregistered users look up your profile card.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isProfilePublic}
                      onChange={(e) => {
                        setIsProfilePublic(e.target.checked);
                        saveField('isProfilePublic', e.target.checked);
                      }}
                      className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Online Presence Status */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Live online status visibility</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Allow other members to see when you are online.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showOnlineStatus}
                      onChange={(e) => {
                        setShowOnlineStatus(e.target.checked);
                        saveField('showOnlineStatus', e.target.checked);
                      }}
                      className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Dropdowns */}
                  <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Permissions Matrices</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-gray-500">Who can Direct Message</label>
                        <select
                          value={whoCanMessage}
                          onChange={(e) => {
                            setWhoCanMessage(e.target.value);
                            saveField('whoCanMessage', e.target.value);
                          }}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden"
                        >
                          <option value="everyone">Everyone</option>
                          <option value="followers">Followers</option>
                          <option value="none">None</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-gray-500">Who can invite to Rooms</label>
                        <select
                          value={whoCanInvite}
                          onChange={(e) => {
                            setWhoCanInvite(e.target.value);
                            saveField('whoCanInvite', e.target.value);
                          }}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden"
                        >
                          <option value="everyone">Everyone</option>
                          <option value="followers">Followers</option>
                          <option value="none">None</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-gray-500">Who can mention you</label>
                        <select
                          value={whoCanMention}
                          onChange={(e) => {
                            setWhoCanMention(e.target.value);
                            saveField('whoCanMention', e.target.value);
                          }}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden"
                        >
                          <option value="everyone">Everyone</option>
                          <option value="followers">Followers</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="border-b border-gray-50 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-left">
                    <Bell className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Notification System Preferences</span>
                  </CardTitle>
                  <CardDescription className="text-left">
                    Select which events trigger dynamic entries in your real-time notification feed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 text-left">
                  {/* Likes Switch */}
                  <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Conversation Likes</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Alert me when a user likes my feed post.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifLikes}
                      onChange={(e) => {
                        setNotifLikes(e.target.checked);
                        saveField('notifLikes', e.target.checked);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 cursor-pointer"
                    />
                  </div>

                  {/* Comments Switch */}
                  <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Discussion Comments</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Alert me when a peer leaves comments on my thread.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifComments}
                      onChange={(e) => {
                        setNotifComments(e.target.checked);
                        saveField('notifComments', e.target.checked);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 cursor-pointer"
                    />
                  </div>

                  {/* Mentions Switch */}
                  <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">User Mentions</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Alert me when I am mentioned with @username tags.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifMentions}
                      onChange={(e) => {
                        setNotifMentions(e.target.checked);
                        saveField('notifMentions', e.target.checked);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 cursor-pointer"
                    />
                  </div>

                  {/* Messages Switch */}
                  <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Direct Messages</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Alert me when receiving private messages.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifMessages}
                      onChange={(e) => {
                        setNotifMessages(e.target.checked);
                        saveField('notifMessages', e.target.checked);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 cursor-pointer"
                    />
                  </div>

                  {/* Rooms Alerts */}
                  <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Community Rooms Invites</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Alert me for join approvals, invitations, or audio room requests.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifRooms}
                      onChange={(e) => {
                        setNotifRooms(e.target.checked);
                        saveField('notifRooms', e.target.checked);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 cursor-pointer"
                    />
                  </div>

                  {/* Announcements */}
                  <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-slate-950/50 border border-gray-100 dark:border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Platform Announcements</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">Receive occasional updates on system patches and major capabilities.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifAnnouncements}
                      onChange={(e) => {
                        setNotifAnnouncements(e.target.checked);
                        saveField('notifAnnouncements', e.target.checked);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 cursor-pointer"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="border-b border-gray-50 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-left">
                    <Paintbrush className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Visual layout appearance</span>
                  </CardTitle>
                  <CardDescription className="text-left">
                    Customize your themes, font proportions, and interface behavior.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 text-left">
                  {/* Theme Presets */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-gray-500">Application Theme</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`p-4 rounded-2xl border text-center cursor-pointer transition-all ${
                          theme === 'light'
                            ? 'border-indigo-500 bg-indigo-50/20 text-indigo-700 font-semibold'
                            : 'border-gray-100 bg-white dark:bg-slate-900 dark:border-slate-850 text-gray-500'
                        }`}
                      >
                        <span className="text-xs block">Light Clean Mode</span>
                      </button>

                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`p-4 rounded-2xl border text-center cursor-pointer transition-all ${
                          theme === 'dark'
                            ? 'border-indigo-500 bg-indigo-950/30 text-indigo-400 font-semibold'
                            : 'border-gray-100 bg-white dark:bg-slate-900 dark:border-slate-850 text-gray-500'
                        }`}
                      >
                        <span className="text-xs block">Dark Cosmic Mode</span>
                      </button>
                    </div>
                  </div>

                  {/* Font Size controls */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-gray-500">Typography Font Proportions</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['small', 'medium', 'large'].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => handleFontSizeChange(sz as any)}
                          className={`py-2 px-3 rounded-xl border text-xs capitalize font-semibold tracking-tight cursor-pointer transition-all ${
                            fontSize === sz
                              ? 'border-indigo-500 bg-indigo-50/15 text-indigo-600 dark:text-indigo-400'
                              : 'border-gray-100 dark:border-slate-850 text-gray-500'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Framer motion controller */}
                  <div className="space-y-2.5 pt-4 border-t border-gray-50 dark:border-slate-800">
                    <label className="text-xs font-semibold text-gray-500">Interface Animations</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['on', 'off', 'reduce'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => handleAnimationsChange(mode as any)}
                          className={`py-2 px-3 rounded-xl border text-xs capitalize font-semibold tracking-tight cursor-pointer transition-all ${
                            animationsEnabled === mode
                              ? 'border-indigo-500 bg-indigo-50/15 text-indigo-600 dark:text-indigo-400'
                              : 'border-gray-100 dark:border-slate-850 text-gray-500'
                          }`}
                        >
                          {mode === 'reduce' ? 'Reduce Motion' : mode === 'on' ? 'Full Motion' : 'Disabled'}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="border-b border-gray-50 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-left">
                    <Shield className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Cryptographic Security Keys</span>
                  </CardTitle>
                  <CardDescription className="text-left">
                    Manage login authentication sessions and cryptographic access credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 text-left">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Device Authorization Sessions</h4>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Laptop className="h-5 w-5 text-indigo-600" />
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Chrome on macOS</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Portland, USA • Active session</p>
                          </div>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold rounded-full uppercase tracking-wider">
                          This Device
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Safari on iPhone 15</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">London, UK • Authorized 2 days ago</p>
                          </div>
                        </div>
                        <button
                          onClick={() => showToast.success('Session terminated successfully.')}
                          className="text-[10px] font-semibold text-red-500 hover:underline cursor-pointer"
                        >
                          Revoke Access
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-50 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => {
                        showToast.success('Dispatched session termination command to all authentication peers.');
                      }}
                      className="flex-1 cursor-pointer font-semibold text-xs py-2.5"
                      variant="outline"
                    >
                      Log Out All Devices
                    </Button>
                    <Button
                      onClick={handlePasswordResetRequest}
                      className="flex-1 cursor-pointer font-semibold text-xs py-2.5"
                    >
                      Update Security Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader className="border-b border-gray-50 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-left">
                    <HelpCircle className="h-4.5 w-4.5 text-indigo-500" />
                    <span>OpenComm Platform Specs</span>
                  </CardTitle>
                  <CardDescription className="text-left">
                    Developer credentials, framework build logs, and platform policies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5 text-left">
                  <div className="flex items-center justify-between p-3.5 bg-indigo-50/10 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl">
                    <div className="text-left">
                      <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        OpenComm Build v1.8.0
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-sm">
                        Featuring real-time Firestore database schema integrations, Framer Motion animations, and custom visual presets.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">
                      Stable Release
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Engineering Credentials</h4>
                    <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                      Designed and engineered with strict adherence to human-centric interaction patterns. 100% Client-Side offline states with Firebase cloud database real-time sync.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50 dark:border-slate-800 text-xs">
                    <button
                      onClick={() => showToast.info('Terms of Service dialog.')}
                      className="p-3 bg-gray-50 dark:bg-slate-950 hover:bg-indigo-50/20 rounded-xl text-left border border-gray-100 dark:border-slate-850 cursor-pointer animate-hover"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white block">Terms of Service</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">Read usage guidelines.</span>
                    </button>

                    <button
                      onClick={() => showToast.info('Privacy Policy dialog.')}
                      className="p-3 bg-gray-50 dark:bg-slate-950 hover:bg-indigo-50/20 rounded-xl text-left border border-gray-100 dark:border-slate-850 cursor-pointer animate-hover"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white block">Privacy Policy</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">Our cryptographic guidelines.</span>
                    </button>

                    <button
                      onClick={() => showToast.info('OpenComm Help & Support Center initiated.')}
                      className="p-3 bg-gray-50 dark:bg-slate-950 hover:bg-indigo-50/20 rounded-xl text-left border border-gray-100 dark:border-slate-850 cursor-pointer animate-hover"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white block">Help & Support</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">Get instant answers and guides.</span>
                    </button>

                    <button
                      onClick={() => showToast.success('Contact dispatched. Our engineering team will respond within 24 hours.')}
                      className="p-3 bg-gray-50 dark:bg-slate-950 hover:bg-indigo-50/20 rounded-xl text-left border border-gray-100 dark:border-slate-850 cursor-pointer animate-hover"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white block">Contact Us</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">Direct line to our engineering team.</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
};

export default SettingsPage;
