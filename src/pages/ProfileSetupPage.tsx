/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { isUsernameUnique } from '../services/authService';
import { uploadImage } from '../services/storageService';
import { getFriendlyErrorMessage } from '../services/firebase/errors';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Button } from '../components/ui/Button';
import { showToast } from '../components/ui/Toast';
import {
  Sparkles,
  User,
  Camera,
  MapPin,
  Tag,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  RefreshCw,
  Globe,
  Compass,
  Calendar,
  Search,
  Upload,
  Trash2
} from 'lucide-react';

const profileSetupSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required.')
    .max(50, 'Display name must be less than 50 characters.')
    .trim(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(20, 'Username must be at most 20 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores are permitted.')
    .trim()
    .toLowerCase(),
  bio: z.string().max(160, 'Bio must be 160 characters or less.').trim().default(''),
  location: z.string().max(80, 'Location is too long.').trim().default(''),
  website: z.union([z.string().url('Please enter a valid website URL.'), z.string().length(0)]).optional().default(''),
  birthday: z.string().optional().default(''),
  profileImage: z.string().default(''),
  coverImage: z.string().default(''),
});

type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;

const PRESET_INTERESTS = [
  'Cryptography',
  'Peer-to-Peer',
  'Open Source',
  'AI / Machine Learning',
  'Cybersecurity',
  'Data Privacy',
  'Decentralized Web',
  'UI/UX Design',
  'Systems Architecture',
  'Product Strategy',
  'Mobile Dev',
  'Embedded Hardware',
  'Design Systems',
  'Economics',
  'Philosophy',
  'Blockchain'
];

const AVATAR_SEEDS = ['Leo', 'Sophia', 'Milo', 'Ember', 'Max', 'Luna', 'Vince', 'Nova'];

const COVER_GRADIENTS = [
  'from-slate-900 to-indigo-950',
  'from-blue-600 to-indigo-900',
  'from-purple-600 to-pink-900',
  'from-slate-800 to-slate-900',
  'from-emerald-800 to-teal-950',
  'from-rose-950 to-indigo-950'
];

export const ProfileSetupPage: React.FC = () => {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [activeAvatar, setActiveAvatar] = useState('');
  const [activeCover, setActiveCover] = useState(COVER_GRADIENTS[0]);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [interestSearch, setInterestSearch] = useState('');

  // Custom Upload States
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [isDragOverAvatar, setIsDragOverAvatar] = useState(false);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [isDragOverCover, setIsDragOverCover] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileSetupFormValues>({
    resolver: zodResolver(profileSetupSchema) as any,
    defaultValues: {
      displayName: '',
      username: '',
      bio: '',
      location: '',
      website: '',
      birthday: '',
      profileImage: '',
      coverImage: COVER_GRADIENTS[0],
    },
  });

  const watchUsername = watch('username');
  const watchDisplayName = watch('displayName');
  const watchBio = watch('bio') || '';

  // Pre-populate fields once user profile is available
  useEffect(() => {
    if (user) {
      if (user.fullName) setValue('displayName', user.fullName);
      if (user.username) setValue('username', user.username);
      if (user.bio) setValue('bio', user.bio);
      if (user.location) setValue('location', user.location);
      if (user.website) setValue('website', user.website);
      if (user.birthday) setValue('birthday', user.birthday);
      
      const initialAvatar = user.profileImage || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName || user.displayName || 'OC')}`;
      setActiveAvatar(initialAvatar);
      setValue('profileImage', initialAvatar);

      if (user.coverImage) {
        setActiveCover(user.coverImage);
        setValue('coverImage', user.coverImage);
      }
      
      if (user.interests) {
        setSelectedInterests(user.interests);
      }
    }
  }, [user, setValue]);

  // Handle live username check when username value shifts
  useEffect(() => {
    if (!watchUsername || watchUsername === user?.username) {
      setUsernameError(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      if (watchUsername.length < 3 || watchUsername.length > 20 || !/^[a-zA-Z0-9_]+$/.test(watchUsername)) {
        return; // handled by zod schema validation
      }
      setIsCheckingUsername(true);
      try {
        const unique = await isUsernameUnique(watchUsername);
        if (!unique) {
          setUsernameError('This username is already taken.');
        } else {
          setUsernameError(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [watchUsername, user?.username]);

  // Avatar presets Selection
  const selectAvatarPreset = (seed: string) => {
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
    setActiveAvatar(avatarUrl);
    setValue('profileImage', avatarUrl);
  };

  // Custom Avatar Upload
  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast.error('Please upload a valid image file.');
      return;
    }
    setIsUploadingAvatar(true);
    setAvatarProgress(0);
    try {
      const folder = `users/${user?.uid || 'guest'}/avatar_${Date.now()}`;
      const url = await uploadImage(file, folder, (progress) => {
        setAvatarProgress(progress);
      });
      setActiveAvatar(url);
      setValue('profileImage', url);
      showToast.success('Profile picture updated successfully!');
    } catch (err: any) {
      console.error('Avatar upload failed during setup:', err);
      showToast.error(`Profile picture upload failed: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(watchDisplayName || user?.fullName || 'OC')}`;
    setActiveAvatar(fallback);
    setValue('profileImage', fallback);
    showToast.info('Profile picture reset to default initials.');
  };

  // Cover presets Selection
  const selectCoverPreset = (gradient: string) => {
    setActiveCover(gradient);
    setValue('coverImage', gradient);
  };

  // Custom Cover Upload
  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast.error('Please upload a valid image file.');
      return;
    }
    setIsUploadingCover(true);
    setCoverProgress(0);
    try {
      const folder = `users/${user?.uid || 'guest'}/cover_${Date.now()}`;
      const url = await uploadImage(file, folder, (progress) => {
        setCoverProgress(progress);
      });
      setActiveCover(url);
      setValue('coverImage', url);
      showToast.success('Cover image updated successfully!');
    } catch (err: any) {
      console.error('Cover upload failed during setup:', err);
      showToast.error(`Cover image upload failed: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const removeCover = () => {
    const fallback = COVER_GRADIENTS[0];
    setActiveCover(fallback);
    setValue('coverImage', fallback);
    showToast.info('Cover reset to default gradient.');
  };

  // Interests Select Handlers
  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length >= 8) {
        showToast.error('Maximum 8 interests permitted.');
        return;
      }
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const filteredInterests = PRESET_INTERESTS.filter((interest) =>
    interest.toLowerCase().includes(interestSearch.toLowerCase())
  );

  const onNextStep = () => {
    if (step === 1) {
      if (!watchDisplayName) {
        showToast.error('Please specify a display name.');
        return;
      }
      if (!watchUsername) {
        showToast.error('Please specify a username.');
        return;
      }
      if (usernameError) {
        showToast.error('Please fix the username error before moving on.');
        return;
      }
    }
    setStep(step + 1);
  };

  const onPrevStep = () => {
    setStep(step - 1);
  };

  const onFormSubmit = async (values: ProfileSetupFormValues) => {
    try {
      await completeProfile({
        displayName: values.displayName,
        username: values.username,
        bio: values.bio,
        location: values.location,
        interests: selectedInterests,
        profileImage: activeAvatar,
        coverImage: activeCover,
        website: values.website,
        birthday: values.birthday,
      });

      showToast.success('Profile created successfully! Welcome to OpenComm.');
      navigate('/feed');
    } catch (err: any) {
      console.error('Profile creation failed during setup onboarding:', err);
      showToast.error(`Unable to update profile: ${getFriendlyErrorMessage(err)}`);
    }
  };

  const handleSkip = () => {
    showToast.info('Profile onboarding skipped. You can configure this later in settings.');
    navigate('/feed');
  };

  // Character Counter
  const charRemaining = 160 - watchBio.length;

  return (
    <div className="flex-1 min-h-visual-screen bg-gray-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center transition-colors duration-300">
      <div className="w-full max-w-xl flex flex-col gap-6">
        
        {/* Onboarding Stepper Header */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Compass className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 font-mono tracking-widest uppercase">Onboarding Setup</p>
              <h4 className="text-sm font-bold text-gray-950 dark:text-white">Configure Peer Card</h4>
            </div>
          </div>
          
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-sm border border-gray-200/50 dark:border-slate-800 shadow-xs">
            <span className="text-indigo-600 dark:text-indigo-400">Step {step}</span>
            <span className="opacity-40">/</span>
            <span>3</span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Card containing Onboarding Setup */}
        <Card className="overflow-hidden shadow-xl border border-gray-150 dark:border-slate-800">
          <form onSubmit={handleSubmit(onFormSubmit)}>
            <CardContent className="p-0">
              
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="p-6 sm:p-8 space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-950 dark:text-white">Identity & Theme</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Choose how other peer communicators see you on the network. Upload your own images or choose presets.
                      </p>
                    </div>

                    {/* Banner Cover Drag & Drop / Preset Option */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 tracking-wide uppercase font-mono">
                          Header Banner Accent
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            <span>Upload custom banner</span>
                            <input
                              type="file"
                              accept="image/png, image/jpg, image/jpeg, image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCoverFile(file);
                              }}
                            />
                          </label>
                          {activeCover.startsWith('http') && (
                            <button
                              type="button"
                              onClick={removeCover}
                              className="text-xs text-red-500 hover:underline flex items-center gap-1 ml-2"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Cover Preset grid */}
                      <div className="grid grid-cols-6 gap-2">
                        {COVER_GRADIENTS.map((gradient) => (
                          <button
                            key={gradient}
                            type="button"
                            onClick={() => selectCoverPreset(gradient)}
                            className={`h-10 rounded-sm bg-gradient-to-r ${gradient} relative transition-transform hover:scale-105 active:scale-95 border-2 ${
                              activeCover === gradient ? 'border-purple-500 shadow-sm ring-1 ring-purple-500/30' : 'border-transparent'
                            }`}
                          >
                            {activeCover === gradient && (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white rounded-sm">
                                <Check className="h-4 w-4 stroke-[2.5px]" />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Drag and Drop Cover Target & Profile Overlap Preview */}
                    <div className="space-y-3">
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOverCover(true);
                        }}
                        onDragLeave={() => setIsDragOverCover(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOverCover(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleCoverFile(file);
                        }}
                        className={`relative h-32 rounded-sm border overflow-hidden transition-all ${
                          isDragOverCover
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 scale-[1.01]'
                            : 'border-gray-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Live Cover Background */}
                        {activeCover.startsWith('http') ? (
                          <img
                            src={activeCover}
                            alt="Cover Preview"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-r ${activeCover}`} />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-xs">
                          <p className="text-xs font-semibold text-white flex items-center gap-1">
                            <Camera className="h-4 w-4" /> Drag & Drop or Click to change banner
                          </p>
                        </div>

                        {/* Upload Loader for Cover */}
                        {isUploadingCover && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-white z-20">
                            <RefreshCw className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
                            <span className="text-xs font-mono">Uploading Custom Cover ({coverProgress}%)</span>
                          </div>
                        )}

                        {/* Avatar overlap */}
                        <div className="absolute bottom-3 left-4 flex items-center gap-3.5 z-10">
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragOverAvatar(true);
                            }}
                            onDragLeave={(e) => {
                              e.stopPropagation();
                              setIsDragOverAvatar(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragOverAvatar(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleAvatarFile(file);
                            }}
                            className={`h-16 w-16 rounded-full bg-white dark:bg-slate-800 p-0.5 border shadow-md relative transition-transform ${
                              isDragOverAvatar ? 'scale-110 border-indigo-500' : 'border-white/20'
                            }`}
                          >
                            {activeAvatar ? (
                              <img
                                src={activeAvatar}
                                alt="Avatar Preview"
                                className="h-full w-full rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                <User className="h-7 w-7" />
                              </div>
                            )}

                            {isUploadingAvatar && (
                              <div className="absolute inset-0 rounded-full bg-black/75 flex items-center justify-center text-white text-[10px] font-mono">
                                {avatarProgress}%
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-sm font-bold text-white leading-none drop-shadow-md">
                              {watchDisplayName || 'Jordan Brooks'}
                            </p>
                            <p className="text-xs font-mono text-slate-300 leading-none mt-1 drop-shadow-md">
                              @{watchUsername || 'username'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Custom upload avatar trigger */}
                      <div className="flex justify-between items-center pt-1">
                        <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 tracking-wide uppercase font-mono">
                          Avatar Picture Options
                        </label>
                        <div className="flex gap-3">
                          <label className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            <span>Upload profile image</span>
                            <input
                              type="file"
                              accept="image/png, image/jpg, image/jpeg, image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAvatarFile(file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={removeAvatar}
                            className="text-xs text-red-500 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>

                      {/* Avatar Presets Selection */}
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 pt-1">
                        {AVATAR_SEEDS.map((seed) => {
                          const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
                          return (
                            <button
                              key={seed}
                              type="button"
                              onClick={() => selectAvatarPreset(seed)}
                              className={`h-11 w-11 rounded-full bg-white dark:bg-slate-900 border overflow-hidden p-0.5 hover:scale-105 active:scale-95 transition-transform ${
                                activeAvatar === avatarUrl ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-gray-200 dark:border-slate-800'
                              }`}
                            >
                              <img
                                src={avatarUrl}
                                alt={seed}
                                className="h-full w-full rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        {...registerField('displayName')}
                        label="Display Name *"
                        placeholder="Jordan Brooks"
                        error={errors.displayName?.message}
                        disabled={isCheckingUsername}
                      />

                      <Input
                        {...registerField('username')}
                        label="Unique Handle *"
                        placeholder="jordan_brooks"
                        error={errors.username?.message || usernameError || undefined}
                        helperText={isCheckingUsername ? 'Verifying uniqueness...' : undefined}
                        disabled={isCheckingUsername}
                        rightIcon={isCheckingUsername ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : undefined}
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="p-6 sm:p-8 space-y-5"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-950 dark:text-white">Profile Details</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Add context to your profile card so peers know where and how to communicate.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        {...registerField('location')}
                        label="Location / Timezone"
                        placeholder="San Francisco, CA"
                        error={errors.location?.message}
                        leftIcon={<MapPin className="h-4 w-4" />}
                      />

                      <Input
                        {...registerField('birthday')}
                        label="Birthday"
                        type="date"
                        error={errors.birthday?.message}
                        leftIcon={<Calendar className="h-4 w-4" />}
                      />
                    </div>

                    <Input
                      {...registerField('website')}
                      label="Website / Portfolio URL"
                      placeholder="https://example.com"
                      error={errors.website?.message}
                      leftIcon={<Globe className="h-4 w-4" />}
                    />

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 tracking-wide uppercase font-mono">
                          Biography (Bio)
                        </label>
                        <span className={`text-[10px] font-mono font-medium ${charRemaining < 15 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                          {charRemaining} chars remaining
                        </span>
                      </div>
                      <Textarea
                        {...registerField('bio')}
                        placeholder="Tell peers about your background, goals, projects, and dialogue style."
                        error={errors.bio?.message}
                        maxLength={160}
                        rows={4}
                      />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="p-6 sm:p-8 space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-950 dark:text-white">Peer Interests</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Select tags that match your core domains to discover relevant rooms and peers (select up to 8).
                      </p>
                    </div>

                    {/* Filter Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search interests (e.g. Cryptography, Design)..."
                        value={interestSearch}
                        onChange={(e) => setInterestSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800 dark:text-slate-200"
                      />
                    </div>

                    {/* Interest grid */}
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredInterests.length > 0 ? (
                        filteredInterests.map((interest) => {
                          const isSelected = selectedInterests.includes(interest);
                          return (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => toggleInterest(interest)}
                              className={`px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer select-none transition-all flex items-center gap-1.5 border ${
                                isSelected
                                  ? 'bg-indigo-50 border-purple-500/40 text-purple-700 dark:bg-slate-900 dark:border-purple-500/60 dark:text-purple-400'
                                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Tag className="h-3 w-3 opacity-60" />
                              <span>{interest}</span>
                              {isSelected && <Check className="h-3 w-3 stroke-[3px]" />}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-xs font-mono text-gray-400 dark:text-slate-500 py-4 text-center w-full">
                          No matching categories found. Try another query.
                        </p>
                      )}
                    </div>

                    {/* Interests Count helper */}
                    <p className="text-[11px] font-mono font-medium text-gray-400 dark:text-slate-500">
                      {selectedInterests.length} of 8 categories selected.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Bar inside the Card footer */}
              <div className="flex justify-between items-center px-6 sm:px-8 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-150 dark:border-slate-900 gap-4">
                
                {/* Back / Skip */}
                <div>
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onPrevStep}
                      className="flex items-center gap-1.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back</span>
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-650 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer font-sans"
                    >
                      Skip Onboarding
                    </button>
                  )}
                </div>

                {/* Next / Submit */}
                <div>
                  {step < 3 ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={onNextStep}
                      className="flex items-center gap-1.5"
                    >
                      <span>Continue</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"
                    >
                      <span>Complete Setup</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
