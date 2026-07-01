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
  MessageSquare, 
  Search, 
  Trash2, 
  Lock, 
  Globe, 
  Mic, 
  FileText, 
  UserMinus, 
  UserCheck, 
  Sliders, 
  Users 
} from 'lucide-react';
import { Room } from '../../types';
import { useNavigate } from 'react-router-dom';

interface RoomsTabProps {
  rooms: Room[];
  onAction: (actionType: string, payload: any) => void;
}

export const RoomsTab: React.FC<RoomsTabProps> = ({ rooms, onAction }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'audio'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');

  // Filter computation
  const filteredRooms = rooms.filter((room) => {
    const matchSearch = 
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.creatorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = typeFilter === 'all' || room.roomType === typeFilter;
    const matchVisibility = visibilityFilter === 'all' || room.visibility === visibilityFilter;

    return matchSearch && matchType && matchVisibility;
  });

  return (
    <div className="flex flex-col gap-6 w-full text-left">
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                <span>Discussion Hubs & Community Rooms</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Monitor live audio and text channels, manage privacy models, and manage inactive hubs.
              </CardDescription>
            </div>
            <div className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-400">
              ROOMS: <span className="text-white">{filteredRooms.length}</span> / {rooms.length}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* FILTERS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search room name, topic, owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-white placeholder-slate-500 text-xs h-9.5 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-2 border border-slate-800 rounded-xl h-9.5">
              <Sliders className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
              >
                <option value="all">Channel Mode: All</option>
                <option value="text">Text Chats</option>
                <option value="audio">Live Audio Stage</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-950 px-2 border border-slate-800 rounded-xl h-9.5">
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
              >
                <option value="all">Privacy Model: All</option>
                <option value="public">Public Directories</option>
                <option value="private">Private (Invite Only)</option>
              </select>
            </div>
          </div>

          {/* ROOMS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRooms.map((room) => {
              const isSuspended = (room as any).status === 'suspended';
              
              return (
                <div 
                  key={room.roomId} 
                  className={`p-4 bg-slate-950/40 border rounded-2xl flex flex-col gap-3.5 hover:border-slate-800 transition-all ${
                    isSuspended ? 'border-amber-500/10 bg-amber-500/1' : 'border-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <img 
                      src={room.roomImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300'} 
                      alt="room visual" 
                      className="h-14 w-14 rounded-xl object-cover border border-slate-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{room.name}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase flex items-center gap-0.5 ${
                          room.roomType === 'audio' 
                            ? 'bg-purple-500/10 text-purple-400' 
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {room.roomType === 'audio' ? <Mic className="h-2 w-2" /> : <FileText className="h-2 w-2" />}
                          {room.roomType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {room.description || 'No topic specifications provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-900 text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {room.membersCount} members
                      </span>
                      <span className="flex items-center gap-1">
                        {room.visibility === 'public' 
                          ? <Globe className="h-3.5 w-3.5 text-slate-400" /> 
                          : <Lock className="h-3.5 w-3.5 text-indigo-400" />
                        }
                        {room.visibility.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-slate-400">
                      Owner: <span className="text-indigo-400 font-bold">@{room.creatorName}</span>
                    </div>
                  </div>

                  {/* ADMIN ACTIONS */}
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => navigate(`/room/${room.roomId}`)}
                      className="h-8 text-[10px] py-1 bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      View Channel
                    </Button>

                    {isSuspended ? (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onAction('restore_room', room.roomId)}
                        className="h-8 text-[10px] py-1 border-slate-850 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>Restore Hub</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onAction('suspend_room', room.roomId)}
                        className="h-8 text-[10px] py-1 border-slate-850 text-amber-500 hover:bg-amber-500/10"
                      >
                        <UserMinus className="h-3.5 w-3.5 shrink-0" />
                        <span>Suspend Hub</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        if (confirm('Permanently delete this room? This will wipe the room, all chat histories, stage parameters, and file uploads.')) {
                          onAction('delete_room', room.roomId);
                        }
                      }}
                      className="h-8 text-[10px] py-1 border-slate-850 text-red-500 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Delete Hub</span>
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredRooms.length === 0 && (
              <p className="text-center text-slate-500 py-10 col-span-2 text-xs">
                No community rooms located match parameters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
