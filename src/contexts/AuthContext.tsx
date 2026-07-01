/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../services/firebase/config';
import { handleFirestoreError, OperationType } from '../services/firebase/errors';
import { UserProfile, UserRole } from '../types';
import {
  registerWithEmailAndPassword,
  loginWithEmailAndPasswordService,
  sendPasswordReset,
  updateProfileSetup,
  generateOpenCommId,
  updateUserProfile,
} from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  isMockMode: boolean;
  logout: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string, fullName: string, username: string) => Promise<UserProfile>;
  resetPassword: (email: string) => Promise<void>;
  completeProfile: (profileData: {
    displayName: string;
    username: string;
    bio: string;
    location: string;
    interests: string[];
    profileImage?: string;
    coverImage?: string;
    website?: string;
    birthday?: string;
  }) => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'opencomm2026@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(!isFirebaseConfigured);

  // Fallback local persistence for mock mode
  useEffect(() => {
    if (!isFirebaseConfigured) {
      const storedMockUser = localStorage.getItem('opencomm-mock-user');
      if (storedMockUser) {
        try {
          setUser(JSON.parse(storedMockUser));
        } catch {
          localStorage.removeItem('opencomm-mock-user');
        }
      }
      setLoading(false);
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) return;

    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setLoading(true);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to profile updates in real-time
        unsubProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setUser(data);
            setLoading(false);

            // Migration for missing audit fields (Issue 5: Firebase Audit)
            const needsMigration = 
              data.profilePhotoURL === undefined ||
              data.bannerPhotoURL === undefined ||
              data.followerCount === undefined ||
              data.followingCount === undefined ||
              data.postCount === undefined ||
              data.bio === undefined ||
              data.website === undefined ||
              data.location === undefined ||
              data.displayName === undefined ||
              data.username === undefined;

            if (needsMigration) {
              const migrationUpdates: any = {};
              if (data.displayName === undefined) migrationUpdates.displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
              if (data.username === undefined) migrationUpdates.username = firebaseUser.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${firebaseUser.uid.substring(0, 5)}`;
              if (data.profilePhotoURL === undefined) migrationUpdates.profilePhotoURL = data.profileImage || data.photoURL || firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.displayName || 'OC')}`;
              if (data.bannerPhotoURL === undefined) migrationUpdates.bannerPhotoURL = data.coverImage || '';
              if (data.bio === undefined) migrationUpdates.bio = data.bio || '';
              if (data.website === undefined) migrationUpdates.website = data.website || '';
              if (data.location === undefined) migrationUpdates.location = data.location || '';
              if (data.followerCount === undefined) migrationUpdates.followerCount = data.followersCount !== undefined ? data.followersCount : 0;
              if (data.followingCount === undefined) migrationUpdates.followingCount = data.followingCount !== undefined ? data.followingCount : 0;
              if (data.postCount === undefined) migrationUpdates.postCount = data.postsCount !== undefined ? data.postsCount : 0;
              
              try {
                await updateDoc(userRef, migrationUpdates);
              } catch (migrationErr) {
                console.warn('⚡ OpenComm: Failed to migrate missing user audit fields:', migrationErr);
              }
            }
          } else {
            // Document doesn't exist, bootstrap it (only once)
            try {
              const role: UserRole = firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'member';
              const openId = await generateOpenCommId();
              const timestamp = new Date().toISOString();
              const defaultAvatar = firebaseUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firebaseUser.email || 'OC')}`;
              
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                openCommId: openId,
                fullName: firebaseUser.displayName || 'OpenComm User',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                username: firebaseUser.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${firebaseUser.uid.substring(0, 5)}`,
                email: firebaseUser.email || '',
                photoURL: defaultAvatar,
                profileImage: defaultAvatar,
                coverImage: '',
                bio: '',
                location: '',
                interests: [],
                role,
                createdAt: timestamp,
                updatedAt: timestamp,
                isSetupCompleted: false,
              };
              
              await setDoc(userRef, newProfile);
              setUser(newProfile);
            } catch (err) {
              console.error('Error bootstrapping profile:', err);
            } finally {
              setLoading(false);
            }
          }
          setIsMockMode(false);
        }, (error) => {
          console.error('Error fetching/setting user profile in Firestore:', error);
          // Standard Firestore error wrapper from skill
          try {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          } catch (wrappedError) {
            // Keep app from crashing, set basic authenticated state
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'member',
              createdAt: new Date().toISOString(),
              isSetupCompleted: false,
            });
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Standard Login wrapper
  const login = async (emailOrUsername: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const profile = await loginWithEmailAndPasswordService(emailOrUsername, password);
      setUser(profile);
      setIsMockMode(!isFirebaseConfigured);
      return profile;
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Standard Register wrapper
  const register = async (
    email: string,
    password: string,
    fullName: string,
    username: string
  ): Promise<UserProfile> => {
    setLoading(true);
    try {
      const profile = await registerWithEmailAndPassword(email, password, fullName, username);
      setUser(profile);
      setIsMockMode(!isFirebaseConfigured);
      return profile;
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Standard Password Reset wrapper
  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordReset(email);
  };

  // Standard Complete Profile Setup wrapper
  const completeProfile = async (profileData: {
    displayName: string;
    username: string;
    bio: string;
    location: string;
    interests: string[];
    profileImage?: string;
    coverImage?: string;
    website?: string;
    birthday?: string;
  }): Promise<UserProfile> => {
    if (!user) {
      throw new Error('No user is currently authenticated.');
    }
    setLoading(true);
    try {
      const updatedProfile = await updateProfileSetup(user.uid, profileData);
      setUser(updatedProfile);
      return updatedProfile;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Standard Update Profile wrapper for instant saving
  const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!user) {
      throw new Error('No user is currently authenticated.');
    }
    setLoading(true);
    try {
      const updatedProfile = await updateUserProfile(user.uid, updates);
      setUser(updatedProfile);
      return updatedProfile;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    } else {
      localStorage.removeItem('opencomm-mock-user');
    }
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseConfigured,
        isMockMode,
        logout,
        login,
        register,
        resetPassword,
        completeProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// High-Performance, deduplicated real-time cache hook for user profiles
const profileListenersCount: Record<string, number> = {};
const profileListenersUnsub: Record<string, () => void> = {};
const profileCache: Record<string, UserProfile> = {};
const profileCacheListeners: Record<string, Set<(p: UserProfile) => void>> = {};

export function useUserProfileRealTime(uid: string | undefined): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(uid && profileCache[uid] ? profileCache[uid] : null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }

    if (profileCache[uid]) {
      setProfile(profileCache[uid]);
    }

    if (!profileCacheListeners[uid]) {
      profileCacheListeners[uid] = new Set();
    }

    const callback = (latestProfile: UserProfile) => {
      setProfile(latestProfile);
    };

    profileCacheListeners[uid].add(callback);

    if (!profileListenersCount[uid]) {
      profileListenersCount[uid] = 0;
    }
    profileListenersCount[uid]++;

    if (profileListenersCount[uid] === 1) {
      const userRef = doc(db, 'users', uid);
      profileListenersUnsub[uid] = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          profileCache[uid] = data;
          if (profileCacheListeners[uid]) {
            profileCacheListeners[uid].forEach(cb => cb(data));
          }
        }
      }, (error) => {
        console.warn('⚡ OpenComm: Error listening to user profile:', uid, error);
      });
    }

    return () => {
      if (profileCacheListeners[uid]) {
        profileCacheListeners[uid].delete(callback);
      }
      profileListenersCount[uid]--;
      if (profileListenersCount[uid] === 0) {
        if (profileListenersUnsub[uid]) {
          profileListenersUnsub[uid]();
          delete profileListenersUnsub[uid];
        }
        delete profileCache[uid];
        delete profileCacheListeners[uid];
      }
    };
  }, [uid]);

  return profile;
}
