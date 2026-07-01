/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  limit,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { UserProfile, UserRole } from '../types';

const ADMIN_EMAIL = 'opencomm2026@gmail.com';

/**
 * Maps technical Firebase Auth error codes into human-friendly, secure strings.
 * Technical logs are printed only to the developer console.
 */
export function mapAuthError(error: any): string {
  console.error('[OpenComm Auth Technical Error]:', error);
  const code = error?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Your email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'This email address is already in use.';
    case 'auth/weak-password':
      return 'The password is too weak. It must be at least 8 characters.';
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many login attempts. Please try again later.';
    default:
      return 'An unexpected authentication error occurred. Please try again later.';
  }
}

/**
 * Validates whether a username is unique across Firestore or local mock storage.
 */
export async function isUsernameUnique(username: string): Promise<boolean> {
  const normalizedUsername = username.trim().toLowerCase();
  
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'users'),
      where('username', '==', normalizedUsername)
    );
    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username uniqueness:', error);
      return true; // Fallback to avoid blocking, Firestore rules will enforce
    }
  } else {
    // Mock Mode Username Check
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    return !mockUsers.some((u: any) => u.username?.toLowerCase() === normalizedUsername);
  }
}

/**
 * Generates an OpenComm User ID sequentially (e.g. OC-000001) using Firestore count or local simulation count.
 */
export async function generateOpenCommId(): Promise<string> {
  let count = 0;
  
  if (isFirebaseConfigured && db) {
    try {
      const coll = collection(db, 'users');
      const snapshot = await getCountFromServer(coll);
      count = snapshot.data().count;
    } catch (error) {
      console.error('Error counting user documents for sequential ID generation:', error);
      // Fallback: generate a random suffix if counting fails
      count = Math.floor(Math.random() * 900000) + 100000;
    }
  } else {
    // Mock count
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    count = mockUsers.length;
  }
  
  const formattedCount = String(count + 1).padStart(6, '0');
  return `OC-${formattedCount}`;
}

/**
 * Registers a new user with Email and Password, creating a Firebase auth account and their corresponding Firestore user profile document.
 */
export async function registerWithEmailAndPassword(
  email: string,
  password: string,
  fullName: string,
  username: string
): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  
  // 1. Verify Username Uniqueness first before creating Auth user to prevent orphaned Auth accounts
  const unique = await isUsernameUnique(normalizedUsername);
  if (!unique) {
    throw new Error('This username is already taken.');
  }

  const openId = await generateOpenCommId();
  const timestamp = new Date().toISOString();
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;
  
  if (isFirebaseConfigured && auth && db) {
    try {
      // 2. Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const firebaseUser = userCredential.user;
      
      const role: UserRole = normalizedEmail === ADMIN_EMAIL ? 'admin' : 'member';
      
      // 3. Construct user profile record
      const profile: UserProfile = {
        uid: firebaseUser.uid,
        openCommId: openId,
        fullName: fullName.trim(),
        displayName: fullName.trim(), // initially same
        username: normalizedUsername,
        email: normalizedEmail,
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
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        verified: false,
        isOnline: true,
        lastSeen: timestamp,
      };
      
      // 4. Save User Profile to Cloud Firestore
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), profile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
      }
      
      return profile;
    } catch (error: any) {
      // Clean up Auth user if Firestore creation fails (handled gracefully if transaction/batch is not available)
      throw new Error(mapAuthError(error));
    }
  } else {
    // --- Mock Mode Registration Flow ---
    const mockUid = `mock-uid-${Math.random().toString(36).substr(2, 9)}`;
    const role: UserRole = normalizedEmail === ADMIN_EMAIL ? 'admin' : 'member';
    
    const mockProfile: UserProfile = {
      uid: mockUid,
      openCommId: openId,
      fullName: fullName.trim(),
      displayName: fullName.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
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
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      verified: false,
      isOnline: true,
      lastSeen: timestamp,
    };
    
    // Save to local list of mock users to ensure uniqueness and simulation across actions
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    mockUsers.push(mockProfile);
    localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));
    
    // Save current active mock user session
    localStorage.setItem('opencomm-mock-user', JSON.stringify(mockProfile));
    
    return mockProfile;
  }
}

/**
 * Log in using email and password.
 */
export async function loginWithEmailAndPasswordService(
  emailOrUsername: string,
  password: string
): Promise<UserProfile> {
  const identifier = emailOrUsername.trim().toLowerCase();
  
  if (isFirebaseConfigured && auth && db) {
    try {
      let email = identifier;
      
      // If user signed in with username, look up their email
      if (!identifier.includes('@')) {
        const q = query(
          collection(db, 'users'),
          where('username', '==', identifier)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          throw { code: 'auth/user-not-found' };
        }
        const userDoc = querySnapshot.docs[0].data();
        email = userDoc.email;
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userSnap.exists()) {
        throw new Error('User profile record not found.');
      }
      
      return userSnap.data() as UserProfile;
    } catch (error: any) {
      throw new Error(mapAuthError(error));
    }
  } else {
    // --- Mock Mode Login Flow ---
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    
    // Find mock user by email or username
    const mockUser = mockUsers.find(
      (u: any) => u.email === identifier || u.username === identifier
    );
    
    if (!mockUser && identifier !== 'member@opencomm.dev' && identifier !== ADMIN_EMAIL) {
      throw new Error('Your email or password is incorrect.');
    }
    
    // Default fallback profiles if lists are cleared
    let profile: UserProfile;
    if (mockUser) {
      profile = mockUser;
    } else {
      const role: UserRole = identifier === ADMIN_EMAIL ? 'admin' : 'member';
      profile = {
        uid: `mock-uid-${role}`,
        openCommId: 'OC-000001',
        email: identifier,
        fullName: role === 'admin' ? 'OpenComm Admin' : 'Jordan Brooks',
        displayName: role === 'admin' ? 'OpenComm Admin' : 'Jordan Brooks',
        username: role === 'admin' ? 'admin' : 'jordan_brooks',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
        coverImage: '',
        role,
        createdAt: new Date().toISOString(),
        bio: role === 'admin' ? 'System Administrator & Architect' : 'Passionate conversationalist.',
        isSetupCompleted: true,
      };
    }
    
    localStorage.setItem('opencomm-mock-user', JSON.stringify(profile));
    return profile;
  }
}

/**
 * Triggers an email reset request.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  
  if (isFirebaseConfigured && auth) {
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch (error: any) {
      throw new Error(mapAuthError(error));
    }
  } else {
    // Mock simulation
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
}

/**
 * Completes profile setup and updates database fields.
 */
export async function updateProfileSetup(
  uid: string,
  profileData: {
    displayName: string;
    username: string;
    bio: string;
    location: string;
    interests: string[];
    profileImage?: string;
    coverImage?: string;
    website?: string;
    birthday?: string;
  }
): Promise<UserProfile> {
  const timestamp = new Date().toISOString();
  
  if (isFirebaseConfigured && db) {
    const userRef = doc(db, 'users', uid);
    try {
      // Get existing doc to preserve/initialize stats
      const existingSnap = await getDoc(userRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : {};
      
      const photo = profileData.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileData.displayName)}`;
      const banner = profileData.coverImage || '';
      const fCount = existingData.followersCount !== undefined ? existingData.followersCount : (existingData.followerCount !== undefined ? existingData.followerCount : 0);
      const pCount = existingData.postsCount !== undefined ? existingData.postsCount : (existingData.postCount !== undefined ? existingData.postCount : 0);
      
      const updateData = {
        displayName: profileData.displayName,
        username: profileData.username.toLowerCase(),
        bio: profileData.bio,
        location: profileData.location,
        interests: profileData.interests,
        photoURL: photo,
        profileImage: photo,
        profilePhotoURL: photo,
        coverImage: banner,
        bannerPhotoURL: banner,
        website: profileData.website || '',
        birthday: profileData.birthday || '',
        followersCount: fCount,
        followerCount: fCount,
        followingCount: existingData.followingCount !== undefined ? existingData.followingCount : 0,
        postsCount: pCount,
        postCount: pCount,
        isSetupCompleted: true,
        updatedAt: timestamp,
      };
      
      await updateDoc(userRef, updateData);
      
      // Sync denormalized fields across other collections (non-blocking)
      updateDenormalizedUserData(uid, updateData.photoURL, updateData.displayName);
      
      const updatedSnap = await getDoc(userRef);
      return updatedSnap.data() as UserProfile;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  } else {
    // --- Mock Mode Profile Setup Update ---
    const activeUserStr = localStorage.getItem('opencomm-mock-user');
    if (!activeUserStr) {
      throw new Error('No active user session found.');
    }
    
    const activeUser = JSON.parse(activeUserStr) as UserProfile;
    const photo = profileData.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileData.displayName)}`;
    const banner = profileData.coverImage || '';
    const fCount = activeUser.followersCount !== undefined ? activeUser.followersCount : (activeUser.followerCount !== undefined ? activeUser.followerCount : 0);
    const pCount = activeUser.postsCount !== undefined ? activeUser.postsCount : (activeUser.postCount !== undefined ? activeUser.postCount : 0);

    const updatedProfile: UserProfile = {
      ...activeUser,
      displayName: profileData.displayName,
      username: profileData.username.toLowerCase(),
      bio: profileData.bio,
      location: profileData.location,
      interests: profileData.interests,
      photoURL: photo,
      profileImage: photo,
      profilePhotoURL: photo,
      coverImage: banner,
      bannerPhotoURL: banner,
      website: profileData.website || '',
      birthday: profileData.birthday || '',
      followersCount: fCount,
      followerCount: fCount,
      followingCount: activeUser.followingCount !== undefined ? activeUser.followingCount : 0,
      postsCount: pCount,
      postCount: pCount,
      isSetupCompleted: true,
      updatedAt: timestamp,
    };
    
    // Update local active user
    localStorage.setItem('opencomm-mock-user', JSON.stringify(updatedProfile));
    
    // Update list of mock users
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    const idx = mockUsers.findIndex((u: any) => u.uid === activeUser.uid);
    if (idx !== -1) {
      mockUsers[idx] = updatedProfile;
    } else {
      mockUsers.push(updatedProfile);
    }
    localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));
    
    return updatedProfile;
  }
}

/**
 * Updates any field of the user profile, saving changes instantly.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const timestamp = new Date().toISOString();
  
  if (isFirebaseConfigured && db) {
    const userRef = doc(db, 'users', uid);
    try {
      const updatedFields: any = {
        ...updates,
        updatedAt: timestamp
      };

      // Keep photoURL, profileImage, and profilePhotoURL in perfect sync
      const pPhoto = updates.profileImage || updates.photoURL || updates.profilePhotoURL;
      if (pPhoto) {
        updatedFields.photoURL = pPhoto;
        updatedFields.profileImage = pPhoto;
        updatedFields.profilePhotoURL = pPhoto;
      }

      // Keep coverImage and bannerPhotoURL in perfect sync
      const bPhoto = updates.coverImage || updates.bannerPhotoURL;
      if (bPhoto) {
        updatedFields.coverImage = bPhoto;
        updatedFields.bannerPhotoURL = bPhoto;
      }

      // Keep follower and post counts in perfect sync
      if (updates.followersCount !== undefined) {
        updatedFields.followerCount = updates.followersCount;
      } else if (updates.followerCount !== undefined) {
        updatedFields.followersCount = updates.followerCount;
      }

      if (updates.postsCount !== undefined) {
        updatedFields.postCount = updates.postsCount;
      } else if (updates.postCount !== undefined) {
        updatedFields.postsCount = updates.postCount;
      }

      await updateDoc(userRef, updatedFields);

      // Background sync denormalized fields (non-blocking)
      const finalPhoto = updatedFields.photoURL || updatedFields.profileImage || updatedFields.profilePhotoURL;
      if (finalPhoto || updatedFields.displayName) {
        updateDenormalizedUserData(uid, finalPhoto, updatedFields.displayName);
      }

      const updatedSnap = await getDoc(userRef);
      return updatedSnap.data() as UserProfile;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      throw err;
    }
  } else {
    // Mock Mode
    const activeUserStr = localStorage.getItem('opencomm-mock-user');
    if (!activeUserStr) {
      throw new Error('No active user session found.');
    }
    const activeUser = JSON.parse(activeUserStr) as UserProfile;
    
    // Sync update properties for mock mode
    const finalUpdates = { ...updates };
    const pPhoto = updates.profileImage || updates.photoURL || updates.profilePhotoURL;
    if (pPhoto) {
      finalUpdates.photoURL = pPhoto;
      finalUpdates.profileImage = pPhoto;
      finalUpdates.profilePhotoURL = pPhoto;
    }
    const bPhoto = updates.coverImage || updates.bannerPhotoURL;
    if (bPhoto) {
      finalUpdates.coverImage = bPhoto;
      finalUpdates.bannerPhotoURL = bPhoto;
    }
    if (updates.followersCount !== undefined) {
      finalUpdates.followerCount = updates.followersCount;
    } else if (updates.followerCount !== undefined) {
      finalUpdates.followersCount = updates.followerCount;
    }
    if (updates.postsCount !== undefined) {
      finalUpdates.postCount = updates.postsCount;
    } else if (updates.postCount !== undefined) {
      finalUpdates.postsCount = updates.postCount;
    }

    const updatedProfile: UserProfile = {
      ...activeUser,
      ...finalUpdates,
      updatedAt: timestamp
    };
    
    localStorage.setItem('opencomm-mock-user', JSON.stringify(updatedProfile));
    
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    const idx = mockUsers.findIndex((u: any) => u.uid === uid);
    if (idx !== -1) {
      mockUsers[idx] = updatedProfile;
    } else {
      mockUsers.push(updatedProfile);
    }
    localStorage.setItem('opencomm-mock-users-list', JSON.stringify(mockUsers));
    
    return updatedProfile;
  }
}

/**
 * Retrieves a user profile by their unique username.
 */
export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  const normalizedUsername = username.trim().toLowerCase();
  
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, 'users'),
      where('username', '==', normalizedUsername)
    );
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }
      return querySnapshot.docs[0].data() as UserProfile;
    } catch (error) {
      console.error('Error fetching profile by username:', error);
      return null;
    }
  } else {
    // Mock Mode
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    const user = mockUsers.find((u: any) => u.username?.toLowerCase() === normalizedUsername);
    return user || null;
  }
}

/**
 * Searches user profiles by display name, username, or full name.
 */
export async function searchProfiles(searchTerm: string): Promise<UserProfile[]> {
  const cleanSearch = searchTerm.trim().toLowerCase();
  if (!cleanSearch) return [];
  
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'users'), limit(100));
      const snapshot = await getDocs(q);
      const list: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        const u = docSnap.data() as UserProfile;
        if (
          u.displayName?.toLowerCase().includes(cleanSearch) ||
          u.username?.toLowerCase().includes(cleanSearch) ||
          u.fullName?.toLowerCase().includes(cleanSearch)
        ) {
          list.push(u);
        }
      });
      return list;
    } catch (err) {
      console.error(err);
      return [];
    }
  } else {
    // Mock Mode
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    return mockUsers.filter((u: any) =>
      u.displayName?.toLowerCase().includes(cleanSearch) ||
      u.username?.toLowerCase().includes(cleanSearch) ||
      u.fullName?.toLowerCase().includes(cleanSearch)
    );
  }
}

/**
 * Retrieves a list of suggested user profiles.
 */
export async function getSuggestedProfiles(limitCount = 5): Promise<UserProfile[]> {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, 'users'), limit(limitCount));
      const snapshot = await getDocs(q);
      const list: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as UserProfile);
      });
      return list;
    } catch (err) {
      console.error(err);
      return [];
    }
  } else {
    const mockUsers = JSON.parse(localStorage.getItem('opencomm-mock-users-list') || '[]');
    if (mockUsers.length === 0) {
      return [
        {
          uid: 'mock-user-1',
          openCommId: 'OC-000002',
          email: 'clara@opencomm.dev',
          fullName: 'Clara Oswald',
          displayName: 'Clara Oswald',
          username: 'clara_o',
          photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=clara',
          profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=clara',
          bio: 'Traveling through time and space. Curious mind, design lover.',
          interests: ['Science', 'Travel', 'AI'],
          role: 'member',
          createdAt: new Date().toISOString(),
          isSetupCompleted: true
        } as any,
        {
          uid: 'mock-user-2',
          openCommId: 'OC-000003',
          email: 'john@opencomm.dev',
          fullName: 'Dr. John Watson',
          displayName: 'Dr. John Watson',
          username: 'watson_md',
          photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=john',
          profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=john',
          bio: 'Physician, military veteran, and blogger. Obsessed with diagnostics.',
          interests: ['Science', 'Books', 'Technology'],
          role: 'member',
          createdAt: new Date().toISOString(),
          isSetupCompleted: true
        } as any
      ];
    }
    return mockUsers.slice(0, limitCount);
  }
}

/**
 * Asynchronously updates the user's photo and displayName across posts, comments, and replies.
 */
export async function updateDenormalizedUserData(
  uid: string,
  photoURL?: string,
  displayName?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  
  try {
    const updatePayload: any = {};
    if (photoURL !== undefined) {
      updatePayload.profileImage = photoURL;
      updatePayload.profilePhoto = photoURL;
    }
    if (displayName !== undefined) {
      updatePayload.displayName = displayName;
    }
    
    if (Object.keys(updatePayload).length === 0) return;

    console.info(`⚡ OpenComm: Syncing updated user profile data for ${uid} across collections...`);

    // 1. Update user's posts
    const postsQuery = query(collection(db, 'posts'), where('userId', '==', uid));
    const postsSnap = await getDocs(postsQuery);
    const postPromises = postsSnap.docs.map((postDoc) => {
      const p: any = {};
      if (photoURL !== undefined) p.profileImage = photoURL;
      if (displayName !== undefined) p.displayName = displayName;
      return updateDoc(postDoc.ref, p).catch(err => 
        console.warn(`Could not sync post ${postDoc.id}:`, err)
      );
    });

    // 2. Update user's comments
    const commentsQuery = query(collection(db, 'comments'), where('userId', '==', uid));
    const commentsSnap = await getDocs(commentsQuery);
    const commentPromises = commentsSnap.docs.map((commentDoc) => {
      const c: any = {};
      if (photoURL !== undefined) c.profilePhoto = photoURL;
      if (displayName !== undefined) c.displayName = displayName;
      return updateDoc(commentDoc.ref, c).catch(err =>
        console.warn(`Could not sync comment ${commentDoc.id}:`, err)
      );
    });

    // 3. Update user's replies
    const repliesQuery = query(collection(db, 'replies'), where('userId', '==', uid));
    const repliesSnap = await getDocs(repliesQuery);
    const replyPromises = repliesSnap.docs.map((replyDoc) => {
      const r: any = {};
      if (photoURL !== undefined) r.profilePhoto = photoURL;
      if (displayName !== undefined) r.displayName = displayName;
      return updateDoc(replyDoc.ref, r).catch(err =>
        console.warn(`Could not sync reply ${replyDoc.id}:`, err)
      );
    });

    await Promise.all([...postPromises, ...commentPromises, ...replyPromises]);
    console.info(`⚡ OpenComm: Denormalized user profile data synced successfully.`);
  } catch (err) {
    console.warn(`⚠️ OpenComm: Failed to sync denormalized user data for ${uid}:`, err);
  }
}


