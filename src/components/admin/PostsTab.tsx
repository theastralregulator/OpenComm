/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { 
  FileText, 
  Search, 
  Trash2, 
  EyeOff, 
  Eye, 
  Heart, 
  MessageSquare, 
  Sliders, 
  AlertTriangle 
} from 'lucide-react';
import { Post } from '../../types';
import { motion } from 'motion/react';

interface PostsTabProps {
  posts: Post[];
  onAction: (actionType: string, payload: any) => void;
}

export const PostsTab: React.FC<PostsTabProps> = ({ posts, onAction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'likes' | 'reported'>('newest');

  // Compute filtered & sorted posts
  const filteredPosts = posts
    .filter((post) => {
      const matchSearch = 
        post.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.username.toLowerCase().includes(searchTerm.toLowerCase());

      const isHidden = (post as any).status === 'hidden' || post.visibility === 'private';
      const matchStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && !isHidden) || 
        (statusFilter === 'hidden' && isHidden);

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortOrder === 'likes') {
        return b.likesCount - a.likesCount;
      }
      if (sortOrder === 'reported') {
        const reportsA = (a as any).reportsCount || 0;
        const reportsB = (b as any).reportsCount || 0;
        return reportsB - reportsA;
      }
      return 0;
    });

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <FileText className="h-5 w-5 text-purple-400" />
                <span>Conversation Feed Content Audit</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Monitor and moderate all public user posts, image updates, and social metrics.
              </CardDescription>
            </div>
            <div className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
              COUNT: <span className="text-white">{filteredPosts.length}</span> / {posts.length}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* SEARCH & FILTER CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search captions, author handles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white placeholder-slate-500 text-xs h-9.5 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-2 border border-slate-800 rounded-xl h-9.5">
              <Sliders className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
              >
                <option value="all">Visibility: All</option>
                <option value="active">Active (Public)</option>
                <option value="hidden">Hidden (Private/Flagged)</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-950 px-2 border border-slate-800 rounded-xl h-9.5">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="likes">Sort: Most Liked</option>
                <option value="reported">Sort: Most Reported</option>
              </select>
            </div>
          </div>

          {/* POSTS LISTING */}
          <div className="flex flex-col gap-3.5">
            {filteredPosts.map((post) => {
              const isHidden = (post as any).status === 'hidden' || post.visibility === 'private';
              const reportsCount = (post as any).reportsCount || 0;
              
              return (
                <div 
                  key={post.postId} 
                  className={`p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col sm:flex-row justify-between gap-4 transition-all ${
                    reportsCount > 0 ? 'border-red-500/10 bg-red-500/1' : 'hover:border-slate-800'
                  }`}
                >
                  {/* AUTHOR INFO & CAPTION */}
                  <div className="flex gap-3 min-w-0 flex-1">
                    <Avatar src={post.profileImage} fallback={post.displayName} size="md" className="border border-slate-800 flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">{post.displayName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">@{post.username}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-700" />
                        <span className="text-[10px] text-slate-500 font-mono">{post.createdAt ? post.createdAt.split('T')[0] : 'N/A'}</span>
                      </div>

                      <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">
                        {post.caption}
                      </p>

                      {post.imageUrl && (
                        <div className="mt-3 max-w-sm rounded-xl overflow-hidden border border-slate-800">
                          <img 
                            src={post.imageUrl} 
                            alt="post media" 
                            className="max-h-[160px] w-full object-cover bg-slate-900"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {/* SOCIAL METRICS */}
                      <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5 text-pink-500" />
                          {post.likesCount} likes
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                          {post.commentsCount} comments
                        </span>
                        {reportsCount > 0 && (
                          <span className="flex items-center gap-1 text-red-400 font-bold bg-red-500/5 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                            {reportsCount} reported flags
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                          isHidden ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isHidden ? 'HIDDEN' : 'PUBLIC'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MODERATOR ACTIONS */}
                  <div className="flex sm:flex-col justify-end items-center sm:items-end gap-2 shrink-0">
                    {isHidden ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAction('restore_post', post.postId)}
                        className="w-full sm:w-auto h-8 text-[11px] gap-1.5 border-slate-850 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Restore Post</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAction('hide_post', post.postId)}
                        className="w-full sm:w-auto h-8 text-[11px] gap-1.5 border-slate-850 text-amber-500 hover:bg-amber-500/10"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Hide Post</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Permanently delete this social post? This will purge all associated comment trees and assets.')) {
                          onAction('delete_post', post.postId);
                        }
                      }}
                      className="w-full sm:w-auto h-8 text-[11px] gap-1.5 border-slate-850 text-red-500 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Post</span>
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredPosts.length === 0 && (
              <p className="text-center text-slate-500 py-10 text-xs">
                No matching published posts discovered in the system.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
