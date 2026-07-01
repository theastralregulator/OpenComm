/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Folder,
  Lock,
  Globe,
  Check,
  FolderPlus,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { showToast } from './ui/Toast';
import {
  SavedCollection,
  listenToCollections,
  createCollection,
  savePostToCollection,
  unsavePostFromCollection,
  checkPostSavedStatus
} from '../services/savedPostsService';
import { Post } from '../types';

interface SavedCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onSavedStatusChanged?: (isSaved: boolean) => void;
}

export const SavedCollectionModal: React.FC<SavedCollectionModalProps> = ({
  isOpen,
  onClose,
  post,
  onSavedStatusChanged
}) => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [savedInColIds, setSavedInColIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // New Collection Form
  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColIsPublic, setNewColIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync collections and saved status
  useEffect(() => {
    if (!isOpen || !user || !post) return;
    setLoading(true);

    // Listen to collections
    const unsubCollections = listenToCollections(
      user.uid,
      (cols) => {
        setCollections(cols);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    // Check saved status across all collections
    const checkSaved = async () => {
      const status = await checkPostSavedStatus(user.uid, post.postId);
      setSavedInColIds(status.collectionIds);
    };
    checkSaved();

    return () => {
      unsubCollections();
    };
  }, [isOpen, user, post]);

  if (!isOpen || !user || !post) return null;

  const handleToggleSave = async (colId: string) => {
    const isCurrentlySaved = savedInColIds.includes(colId);
    try {
      if (isCurrentlySaved) {
        await unsavePostFromCollection(user.uid, colId, post.postId);
        const updated = savedInColIds.filter((id) => id !== colId);
        setSavedInColIds(updated);
        showToast.success('Removed from collection!');
        onSavedStatusChanged?.(updated.length > 0);
      } else {
        await savePostToCollection(user.uid, colId, post);
        const updated = [...savedInColIds, colId];
        setSavedInColIds(updated);
        showToast.success('Saved to collection!');
        onSavedStatusChanged?.(true);
      }
    } catch (err) {
      showToast.error('Failed to update bookmark status.');
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newCol = await createCollection(user.uid, newColName.trim(), newColIsPublic);
      showToast.success(`Collection "${newCol.name}" created!`);
      setNewColName('');
      setNewColIsPublic(false);
      setIsCreating(false);

      // Auto save post to the newly created collection
      await handleToggleSave(newCol.collectionId);
    } catch (err) {
      showToast.error('Failed to create collection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative flex flex-col w-full max-w-md bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Bookmark Collections
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto max-h-[60vh] space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400 dark:text-slate-500">Loading collections...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map((col) => {
                const isSaved = savedInColIds.includes(col.collectionId);
                return (
                  <button
                    key={col.collectionId}
                    onClick={() => handleToggleSave(col.collectionId)}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 group-hover:bg-indigo-50 dark:group-hover:bg-slate-700 group-hover:text-indigo-500 transition-all">
                        <Folder className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {col.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                          {col.isPublic ? (
                            <>
                              <Globe className="h-3 w-3 text-emerald-500" />
                              <span>Public Collection</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 text-amber-500" />
                              <span>Private Collection</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                        isSaved
                          ? 'bg-indigo-500 border-indigo-500 text-white'
                          : 'border-gray-200 dark:border-slate-700 group-hover:border-indigo-300'
                      }`}
                    >
                      {isSaved && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Create new collection toggle */}
          <AnimatePresence mode="wait">
            {!isCreating ? (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 hover:border-indigo-500/50 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-all cursor-pointer mt-2"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Create Custom Collection</span>
              </motion.button>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                onSubmit={handleCreateCollection}
                className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/20 space-y-3 mt-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">New Collection</span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Collection Name (e.g. Technology, Memes)"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                />

                <div className="flex items-center justify-between py-1.5 px-1 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-2 px-2">
                    {newColIsPublic ? (
                      <Globe className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-300">
                      {newColIsPublic ? 'Public Collection (Others can view)' : 'Private Collection'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewColIsPublic(!newColIsPublic)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      newColIsPublic ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        newColIsPublic ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <Button type="submit" disabled={isSubmitting} className="px-3 py-1.5 text-xs h-auto">
                    {isSubmitting ? 'Creating...' : 'Create & Save'}
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
          <span>{savedInColIds.length} active bookmark saves</span>
          <button
            onClick={onClose}
            className="font-bold text-indigo-500 hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
