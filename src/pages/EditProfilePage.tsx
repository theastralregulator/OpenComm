/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  User,
  Camera,
  MapPin,
  Tag,
  Check,
  ArrowLeft,
  RefreshCw,
  Globe,
  Calendar,
  Search,
  Upload,
  Trash2,
  Save
} from 'lucide-react';

const editProfileSchema = z.object({
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

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

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

export const EditProfilePage: React.FC = () => {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [activeAvatar, setActiveAvatar] = useState('');
  const [activeCover, setActiveCover] = useState(COVER_GRADIENTS[0]);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [interestSearch, setInterestSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema) as any,
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
      if (user.displayName) setValue('displayName', user.displayName);
      if (user.username) setValue('username', user.username);
      if (user.bio) setValue('bio', user.bio);
      if (user.location) setValue('location', user.location);
      if (user.website) setValue('website', user.website);
      if (user.birthday) setValue('birthday', user.birthday);
      
      const initialAvatar = user.profilePhotoURL || user.profileImage || user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName || user.displayName || 'OC')}`;
      setActiveAvatar(initialAvatar);
      setValue('profileImage', initialAvatar);

      const initialCover = user.bannerPhotoURL || user.coverImage;
      if (initialCover) {
        setActiveCover(initialCover);
        setValue('coverImage', initialCover);
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

  // Avatar preset
  const selectAvatarPreset = (seed: string) => {
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
    setActiveAvatar(avatarUrl);
    setValue('profileImage', avatarUrl);
  };

  // Custom Avatar Upload
  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast.error('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
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
      console.error('Avatar upload failed:', err);
      showToast.error(`Profile picture upload failed: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const removeAvatar = () => {
    const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(watchDisplayName || user?.fullName || 'OC')}`;
    setActiveAvatar(fallback);
    setValue('profileImage', fallback);
    showToast.info('Profile picture reset.');
  };

  // Cover preset
  const selectCoverPreset = (gradient: string) => {
    setActiveCover(gradient);
    setValue('coverImage', gradient);
  };

  // Custom Cover Upload
  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast.error('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
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
      console.error('Cover upload failed:', err);
      showToast.error(`Cover image upload failed: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const removeCover = () => {
    const fallback = COVER_GRADIENTS[0];
    setActiveCover(fallback);
    setValue('coverImage', fallback);
    showToast.info('Cover reset.');
  };

  // Interests Tags
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

  const onFormSubmit = async (values: EditProfileFormValues) => {
    if (usernameError) {
      showToast.error('Please fix the username error before saving.');
      return;
    }
    setIsSaving(true);
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

      showToast.success('Profile updated successfully!');
      navigate(`/profile/${values.username}`);
    } catch (err: any) {
      console.error('Profile save failed:', err);
      showToast.error(`Unable to save changes: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const charRemaining = 160 - watchBio.length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto px-1 sm:px-4">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2 min-w-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 font-mono tracking-wider uppercase">
          SETTINGS / EDIT PROFILE
        </span>
      </div>

      <div className="flex flex-col gap-1 text-left">
        <h1 className="text-xl font-bold tracking-tight text-gray-990 dark:text-white">Edit Profile</h1>
        <p className="text-xs text-gray-500 dark:text-slate-400">Configure your public-facing peer card, visual avatar, cover photo, and category tags.</p>
      </div>

      <Card className="overflow-hidden border border-gray-150 dark:border-slate-800 shadow-xl">
        <form onSubmit={handleSubmit(onFormSubmit)} className="text-left">
          <div className="flex flex-col">
            
            {/* Cover photo banner drop target */}
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
              className={`relative h-44 sm:h-52 w-full overflow-hidden border-b transition-all ${
                isDragOverCover
                  ? 'ring-4 ring-indigo-500/30 bg-black/10 scale-[0.99] border-dashed border-indigo-500'
                  : 'border-gray-150 dark:border-slate-800'
              }`}
            >
              {activeCover && activeCover.startsWith('http') ? (
                <img
                  src={activeCover}
                  alt="Cover Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-r ${activeCover || 'from-slate-900 to-indigo-950'}`} />
              )}
              
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center hover:opacity-100 transition-opacity opacity-0 backdrop-blur-xs">
                <p className="text-xs font-semibold text-white flex items-center gap-1">
                  <Camera className="h-4 w-4" /> Drag & Drop or Click preset below to modify
                </p>
              </div>

              {isUploadingCover && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center text-white z-20">
                  <RefreshCw className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
                  <span className="text-xs font-mono">Uploading Banner ({coverProgress}%)</span>
                </div>
              )}

              {/* Avatar Overlay Overlap */}
              <div className="absolute -bottom-8 left-4 sm:left-8 z-10">
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
                  className={`h-24 w-24 rounded-full bg-white dark:bg-slate-900 p-0.5 border shadow-lg relative transition-transform ${
                    isDragOverAvatar ? 'scale-105 border-indigo-500' : 'border-white/20'
                  }`}
                >
                  {activeAvatar ? (
                    <img
                      src={activeAvatar}
                      alt="Avatar"
                      className="h-full w-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center text-white text-xs font-mono font-bold">
                      {avatarProgress}%
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer">
                    <Camera className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Inner Content form sections */}
            <div className="px-4 sm:px-8 pt-14 pb-8 space-y-6">
              
              {/* Visual customization panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100 dark:border-slate-800">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 font-mono uppercase tracking-wider">Banner Customization</p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        <span>Upload banner</span>
                        <input
                          type="file"
                          accept="image/*"
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
                  
                  {/* Preset cover gradient choices */}
                  <div className="grid grid-cols-6 gap-2">
                    {COVER_GRADIENTS.map((gradient) => (
                      <button
                        key={gradient}
                        type="button"
                        onClick={() => selectCoverPreset(gradient)}
                        className={`h-8 rounded-sm bg-gradient-to-r ${gradient} relative transition-transform hover:scale-105 active:scale-95 border-2 ${
                          activeCover === gradient ? 'border-purple-500 shadow-xs' : 'border-transparent'
                        }`}
                      >
                        {activeCover === gradient && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white rounded-sm">
                            <Check className="h-3.5 w-3.5 stroke-[2.5px]" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 font-mono uppercase tracking-wider">Avatar Customization</p>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        <span>Upload custom</span>
                        <input
                          type="file"
                          accept="image/*"
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

                  {/* Preset Avatar choices */}
                  <div className="grid grid-cols-8 gap-1.5">
                    {AVATAR_SEEDS.map((seed) => {
                      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
                      return (
                        <button
                          key={seed}
                          type="button"
                          onClick={() => selectAvatarPreset(seed)}
                          className={`h-8 w-8 rounded-full bg-white dark:bg-slate-900 border overflow-hidden p-0.5 hover:scale-105 active:scale-95 transition-transform ${
                            activeAvatar === avatarUrl ? 'border-purple-500 ring-1 ring-purple-500/20' : 'border-gray-200 dark:border-slate-800'
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
              </div>

              {/* Form inputs section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  {...registerField('displayName')}
                  label="Display Name *"
                  placeholder="Jordan Brooks"
                  error={errors.displayName?.message}
                />

                <Input
                  {...registerField('username')}
                  label="Unique Handle *"
                  placeholder="jordan_brooks"
                  error={errors.username?.message || usernameError || undefined}
                  helperText={isCheckingUsername ? 'Checking availability...' : undefined}
                  disabled={isCheckingUsername}
                  rightIcon={isCheckingUsername ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : undefined}
                />

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

                <div className="md:col-span-2">
                  <Input
                    {...registerField('website')}
                    label="Website / Portfolio URL"
                    placeholder="https://yourportfolio.com"
                    error={errors.website?.message}
                    leftIcon={<Globe className="h-4 w-4" />}
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 tracking-wide uppercase font-mono">
                      Biography (Bio)
                    </label>
                    <span className={`text-[10px] font-mono font-medium ${charRemaining < 15 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                      {charRemaining} characters remaining
                    </span>
                  </div>
                  <Textarea
                    {...registerField('bio')}
                    placeholder="Write a brief pitch about your domains, dialogue styles, and dialog topics."
                    error={errors.bio?.message}
                    maxLength={160}
                    rows={3}
                  />
                </div>
              </div>

              {/* Interests tag select section */}
              <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-slate-800">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono uppercase tracking-wider">Configure Interests (up to 8)</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Match dialogue contexts and discover relevant community peers.</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter domains..."
                    value={interestSearch}
                    onChange={(e) => setInterestSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                  {filteredInterests.length > 0 ? (
                    filteredInterests.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-3 py-1 rounded-sm text-xs font-semibold cursor-pointer select-none transition-all flex items-center gap-1.5 border ${
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
                    <p className="text-xs font-mono text-gray-450 dark:text-slate-550 w-full text-center">No matches found.</p>
                  )}
                </div>
              </div>

              {/* Action save panel */}
              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white border-transparent gap-1.5"
                  disabled={isSaving || isCheckingUsername}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>

            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditProfilePage;
