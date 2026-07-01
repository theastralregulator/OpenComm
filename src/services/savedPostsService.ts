/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { Post } from '../types';

export interface SavedCollection {
  collectionId: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  userId: string;
}

export interface SavedPost {
  postId: string;
  savedAt: string;
  collectionId: string;
  post: Post;
}

const COLLECTIONS_SUB = 'savedCollections';
const SAVED_POSTS_SUB = 'posts';
const USERS_COL = 'users';

// Storage keys for Mock fallback
const MOCK_COLLECTIONS_KEY = 'opencomm_mock_saved_collections';
const MOCK_SAVED_POSTS_KEY = 'opencomm_mock_saved_posts';

function getLocalCollections(): SavedCollection[] {
  try {
    const stored = localStorage.getItem(MOCK_COLLECTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalCollections(cols: SavedCollection[]) {
  localStorage.setItem(MOCK_COLLECTIONS_KEY, JSON.stringify(cols));
  window.dispatchEvent(new Event('storage'));
}

function getLocalSavedPosts(): SavedPost[] {
  try {
    const stored = localStorage.getItem(MOCK_SAVED_POSTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalSavedPosts(posts: SavedPost[]) {
  localStorage.setItem(MOCK_SAVED_POSTS_KEY, JSON.stringify(posts));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Ensures a default 'Bookmarks' collection exists for a user.
 */
export async function ensureDefaultCollection(userId: string): Promise<SavedCollection> {
  const defaultColId = 'default_bookmarks';
  const defaultCol: SavedCollection = {
    collectionId: defaultColId,
    name: 'All Bookmarks',
    isPublic: false,
    createdAt: new Date().toISOString(),
    userId
  };

  if (isFirebaseConfigured && db) {
    const ref = doc(db, USERS_COL, userId, COLLECTIONS_SUB, defaultColId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, defaultCol);
    }
  } else {
    const cols = getLocalCollections();
    const hasDefault = cols.some(c => c.userId === userId && c.collectionId === defaultColId);
    if (!hasDefault) {
      cols.push(defaultCol);
      saveLocalCollections(cols);
    }
  }
  return defaultCol;
}

/**
 * Listens to custom collections of a user in real time.
 */
export function listenToCollections(
  userId: string,
  onUpdate: (collections: SavedCollection[]) => void,
  onError: (error: any) => void
): () => void {
  // Always guarantee default is initialized
  ensureDefaultCollection(userId).catch(console.error);

  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, USERS_COL, userId, COLLECTIONS_SUB),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: SavedCollection[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as SavedCollection);
        });
        // Make sure "All Bookmarks" is always present if not loaded yet
        if (!list.some(c => c.collectionId === 'default_bookmarks')) {
          list.push({
            collectionId: 'default_bookmarks',
            name: 'All Bookmarks',
            isPublic: false,
            createdAt: new Date().toISOString(),
            userId
          });
        }
        onUpdate(list);
      },
      (error) => {
        console.error('Error listening to saved collections:', error);
        handleFirestoreError(error, OperationType.GET, `${USERS_COL}/${userId}/${COLLECTIONS_SUB}`);
        onError(error);
      }
    );
  } else {
    const handleSync = () => {
      const list = getLocalCollections().filter(c => c.userId === userId);
      onUpdate(list);
    };

    handleSync();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }
}

/**
 * Listens to saved posts in a specific collection.
 */
export function listenToSavedPostsInCollection(
  userId: string,
  collectionId: string,
  onUpdate: (posts: SavedPost[]) => void,
  onError: (error: any) => void
): () => void {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, USERS_COL, userId, COLLECTIONS_SUB, collectionId, SAVED_POSTS_SUB),
      orderBy('savedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: SavedPost[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as SavedPost);
        });
        onUpdate(list);
      },
      (error) => {
        console.error('Error listening to saved posts:', error);
        handleFirestoreError(error, OperationType.GET, `${USERS_COL}/${userId}/${COLLECTIONS_SUB}/${collectionId}/${SAVED_POSTS_SUB}`);
        onError(error);
      }
    );
  } else {
    const handleSync = () => {
      const list = getLocalSavedPosts().filter(p => p.collectionId === collectionId);
      onUpdate(list);
    };

    handleSync();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }
}

/**
 * Creates a new custom saved collection.
 */
export async function createCollection(userId: string, name: string, isPublic: boolean): Promise<SavedCollection> {
  const collectionId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newCol: SavedCollection = {
    collectionId,
    name,
    isPublic,
    createdAt: new Date().toISOString(),
    userId
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, USERS_COL, userId, COLLECTIONS_SUB, collectionId), newCol);
      return newCol;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${USERS_COL}/${userId}/${COLLECTIONS_SUB}/${collectionId}`);
      throw err;
    }
  } else {
    const cols = getLocalCollections();
    cols.push(newCol);
    saveLocalCollections(cols);
    return newCol;
  }
}

/**
 * Deletes a collection and unsaves all posts inside it.
 */
export async function deleteCollection(userId: string, collectionId: string): Promise<void> {
  if (collectionId === 'default_bookmarks') {
    throw new Error('Default collection cannot be deleted.');
  }

  if (isFirebaseConfigured && db) {
    try {
      // First delete all saved posts documents inside the collection
      const postsRef = collection(db, USERS_COL, userId, COLLECTIONS_SUB, collectionId, SAVED_POSTS_SUB);
      const postsSnap = await getDocs(postsRef);
      const batch = writeBatch(db);
      postsSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      // Delete collection document
      await deleteDoc(doc(db, USERS_COL, userId, COLLECTIONS_SUB, collectionId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${USERS_COL}/${userId}/${COLLECTIONS_SUB}/${collectionId}`);
      throw err;
    }
  } else {
    // Mock Mode
    const cols = getLocalCollections().filter(c => !(c.userId === userId && c.collectionId === collectionId));
    saveLocalCollections(cols);

    const savedPosts = getLocalSavedPosts().filter(p => p.collectionId !== collectionId);
    saveLocalSavedPosts(savedPosts);
  }
}

/**
 * Saves a post to a collection.
 */
export async function savePostToCollection(userId: string, collectionId: string, post: Post): Promise<SavedPost> {
  const savedPost: SavedPost = {
    postId: post.postId,
    savedAt: new Date().toISOString(),
    collectionId,
    post
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, USERS_COL, userId, COLLECTIONS_SUB, collectionId, SAVED_POSTS_SUB, post.postId), savedPost);
      return savedPost;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${USERS_COL}/${userId}/${COLLECTIONS_SUB}/${collectionId}/${SAVED_POSTS_SUB}/${post.postId}`);
      throw err;
    }
  } else {
    const list = getLocalSavedPosts();
    // Prevent duplicate saves in same collection
    const filtered = list.filter(p => !(p.postId === post.postId && p.collectionId === collectionId));
    filtered.push(savedPost);
    saveLocalSavedPosts(filtered);
    return savedPost;
  }
}

/**
 * Unsaves a post from a specific collection.
 */
export async function unsavePostFromCollection(userId: string, collectionId: string, postId: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, USERS_COL, userId, COLLECTIONS_SUB, collectionId, SAVED_POSTS_SUB, postId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${USERS_COL}/${userId}/${COLLECTIONS_SUB}/${collectionId}/${SAVED_POSTS_SUB}/${postId}`);
      throw err;
    }
  } else {
    const list = getLocalSavedPosts().filter(p => !(p.postId === postId && p.collectionId === collectionId));
    saveLocalSavedPosts(list);
  }
}

/**
 * Moves a saved post from one collection to another.
 */
export async function movePost(
  userId: string,
  fromCollectionId: string,
  toCollectionId: string,
  post: Post
): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      // Create in new location
      const newRef = doc(db, USERS_COL, userId, COLLECTIONS_SUB, toCollectionId, SAVED_POSTS_SUB, post.postId);
      batch.set(newRef, {
        postId: post.postId,
        savedAt: new Date().toISOString(),
        collectionId: toCollectionId,
        post
      });
      // Delete in old location
      const oldRef = doc(db, USERS_COL, userId, COLLECTIONS_SUB, fromCollectionId, SAVED_POSTS_SUB, post.postId);
      batch.delete(oldRef);

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${USERS_COL}/${userId}/${COLLECTIONS_SUB}`);
      throw err;
    }
  } else {
    const list = getLocalSavedPosts();
    const idx = list.findIndex(p => p.postId === post.postId && p.collectionId === fromCollectionId);
    if (idx !== -1) {
      list[idx].collectionId = toCollectionId;
      list[idx].savedAt = new Date().toISOString();
      saveLocalSavedPosts(list);
    }
  }
}

/**
 * Helper to check all collections a post is saved in.
 */
export async function checkPostSavedStatus(
  userId: string,
  postId: string
): Promise<{ isSaved: boolean; collectionIds: string[] }> {
  if (isFirebaseConfigured && db) {
    try {
      const colsRef = collection(db, USERS_COL, userId, COLLECTIONS_SUB);
      const colsSnap = await getDocs(colsRef);
      const collectionIds: string[] = [];

      for (const colDoc of colsSnap.docs) {
        const pRef = doc(db, USERS_COL, userId, COLLECTIONS_SUB, colDoc.id, SAVED_POSTS_SUB, postId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          collectionIds.push(colDoc.id);
        }
      }

      return {
        isSaved: collectionIds.length > 0,
        collectionIds
      };
    } catch (err) {
      console.error('Error checking saved collections for post:', err);
      return { isSaved: false, collectionIds: [] };
    }
  } else {
    const list = getLocalSavedPosts().filter(p => p.postId === postId);
    const collectionIds = list.map(p => p.collectionId);
    return {
      isSaved: collectionIds.length > 0,
      collectionIds
    };
  }
}
