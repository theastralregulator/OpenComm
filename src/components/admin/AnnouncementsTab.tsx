/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Pin, 
  Edit, 
  Users, 
  Check, 
  X, 
  ListPlus,
  Compass
} from 'lucide-react';
import { SystemAnnouncement } from '../../types';

interface AnnouncementsTabProps {
  announcements: SystemAnnouncement[];
  onAction: (actionType: string, payload: any) => void;
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ announcements, onAction }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<'everyone' | 'admins' | 'specific_users' | 'specific_rooms'>('everyone');
  const [pinned, setPinned] = useState(false);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setAudience('everyone');
    setPinned(false);
    setIsCreating(false);
    setEditingId(null);
  };

  const handleCreateAnnouncement = () => {
    if (!title.trim() || !content.trim()) return;
    onAction('create_announcement', { title, content, audience, pinned });
    resetForm();
  };

  const handleStartEdit = (ann: SystemAnnouncement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setAudience(ann.audience);
    setPinned(ann.pinned);
    setIsCreating(true);
  };

  const handleSaveEdit = () => {
    if (!editingId || !title.trim() || !content.trim()) return;
    onAction('edit_announcement', { id: editingId, title, content, audience, pinned });
    resetForm();
  };

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      {/* FORM CARD */}
      {isCreating && (
        <Card className="bg-slate-900/40 border-indigo-500/30 backdrop-blur-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-indigo-400" />
              <span>{editingId ? 'Edit Global Notice Parameters' : 'Publish New System Broadcast'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">Notice Heading / Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Scheduled system maintenance..."
                className="bg-slate-950 border-slate-800 text-white text-xs h-9.5 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">Notice Body Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Type the detailed announcement text here. Markdown components are fully supported in clients..."
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Audience */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Target User Audience</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl h-9.5 px-3">
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                    className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
                  >
                    <option value="everyone" className="bg-slate-950 text-white">Everyone (Global App)</option>
                    <option value="admins" className="bg-slate-950 text-white">System Operators / Admins Only</option>
                    <option value="specific_rooms" className="bg-slate-950 text-white">Target community rooms</option>
                  </select>
                </div>
              </div>

              {/* Pin notice */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl h-9.5 px-4 mt-5">
                <span className="text-xs text-slate-300 font-semibold flex items-center gap-2">
                  <Pin className="h-4 w-4 text-indigo-400" />
                  <span>Pin to Global Feed Dash</span>
                </span>
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-900 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="h-8.5 text-xs text-slate-300 border-slate-800"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={editingId ? handleSaveEdit : handleCreateAnnouncement}
                className="h-8.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              >
                <Check className="h-4 w-4" />
                <span>{editingId ? 'Update Notice' : 'Publish Broadcast'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ANNOUNCEMENTS LIST */}
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-900">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
              <Megaphone className="h-5 w-5 text-indigo-400" />
              <span>Published Announcements System</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Manage system updates, release schedules, and alerts.
            </CardDescription>
          </div>

          {!isCreating && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => setIsCreating(true)}
              className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white gap-1 text-[11px]"
            >
              <Plus className="h-4 w-4" />
              <span>Create Announcement</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-3.5">
            {announcements.map((ann) => (
              <div 
                key={ann.id} 
                className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col sm:flex-row justify-between gap-4 hover:border-slate-800 transition-colors relative"
              >
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                      {ann.title}
                    </h4>
                    
                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase ${
                      ann.pinned 
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {ann.pinned ? 'PINNED' : 'STANDARD'}
                    </span>

                    <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase bg-slate-900 text-slate-400">
                      AUDIENCE: {ann.audience}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 whitespace-pre-wrap leading-relaxed">
                    {ann.content}
                  </p>

                  <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-slate-500">
                    <span>Published: <strong>{ann.createdAt.split('T')[0]}</strong></span>
                    <span>Operator: <strong className="text-indigo-400">@{ann.authorName}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col justify-end items-center sm:items-end gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onAction('toggle_pin_announcement', { id: ann.id, pinned: ann.pinned })}
                    className="w-full sm:w-auto h-7 text-[10px] gap-1 border-slate-850 text-indigo-400 hover:bg-indigo-500/10"
                    title="Toggle pin notice"
                  >
                    <Pin className="h-3.5 w-3.5" />
                    <span>{ann.pinned ? 'Unpin' : 'Pin'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleStartEdit(ann)}
                    className="w-full sm:w-auto h-7 text-[10px] gap-1 border-slate-850 text-slate-300 hover:bg-slate-800"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit Notice</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      if (confirm('Permanently remove this broadcast announcement? This is irreversible.')) {
                        onAction('delete_announcement', ann.id);
                      }
                    }}
                    className="w-full sm:w-auto h-7 text-[10px] gap-1 border-slate-850 text-red-500 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            ))}

            {announcements.length === 0 && (
              <p className="text-center text-slate-500 py-10 text-xs">
                No system announcements have been drafted or broadcast.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
