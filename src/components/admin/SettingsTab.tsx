/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  Sliders, 
  Check, 
  AlertTriangle, 
  Database, 
  ShieldCheck, 
  RefreshCw,
  Power,
  UserPlus,
  Shield,
  FileUp,
  Image
} from 'lucide-react';
import { SystemSettings } from '../../types';

interface SettingsTabProps {
  settings: SystemSettings;
  onAction: (actionType: string, payload: any) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onAction }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);
  const [registrationEnabled, setRegistrationEnabled] = useState(settings.registrationEnabled);
  const [postLimit, setPostLimit] = useState(settings.postLimit);
  const [roomLimit, setRoomLimit] = useState(settings.roomLimit);
  const [defaultRole, setDefaultRole] = useState(settings.defaultRole);
  const [maxUploadSize, setMaxUploadSize] = useState(settings.maxUploadSize);
  const [allowedImageTypes, setAllowedImageTypes] = useState<string[]>(settings.allowedImageTypes || ['image/png', 'image/jpeg', 'image/webp']);

  const [saving, setSaving] = useState(false);

  const handleToggleImageType = (type: string) => {
    if (allowedImageTypes.includes(type)) {
      setAllowedImageTypes(allowedImageTypes.filter(t => t !== type));
    } else {
      setAllowedImageTypes([...allowedImageTypes, type]);
    }
  };

  const handleSaveSettings = () => {
    setSaving(true);
    setTimeout(() => {
      onAction('save_settings', {
        maintenanceMode,
        registrationEnabled,
        postLimit: Number(postLimit),
        roomLimit: Number(roomLimit),
        defaultRole,
        maxUploadSize,
        allowedImageTypes
      });
      setSaving(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-left font-sans">
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-400" />
            <div>
              <CardTitle className="text-sm font-semibold text-white">System Controls & Platform Policies</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Configure rate-limiting guards, client toggles, and system security parameters.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* CRITICAL ACTIONS: MAINTENANCE & REGISTRATIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Maintenance Mode Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
              maintenanceMode 
                ? 'bg-amber-500/5 border-amber-500/20' 
                : 'bg-slate-950/60 border-slate-900'
            }`}>
              <div className="text-left">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Power className={`h-4.5 w-4.5 ${maintenanceMode ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>Maintenance Lockout Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforces global maintenance mode, blocking standard client connections and showing a maintenance screen.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className={`text-[10px] font-mono font-bold ${maintenanceMode ? 'text-amber-400' : 'text-slate-500'}`}>
                  STATUS: {maintenanceMode ? 'LOCKED_FOR_MAINTENANCE' : 'ONLINE_STABLE'}
                </span>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 h-4.5 w-4.5 bg-slate-900 cursor-pointer"
                />
              </div>
            </div>

            {/* Registration enabled */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
              !registrationEnabled 
                ? 'bg-red-500/5 border-red-500/20' 
                : 'bg-slate-950/60 border-slate-900'
            }`}>
              <div className="text-left">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <UserPlus className={`h-4.5 w-4.5 ${registrationEnabled ? 'text-indigo-400' : 'text-red-400'}`} />
                  <span>Onboarding & Account Registrations</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Allows new users to self-register via credentials. If disabled, onboarding routes are locked.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className={`text-[10px] font-mono font-bold ${registrationEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                  STATUS: {registrationEnabled ? 'REGISTRATIONS_OPEN' : 'REGISTRATIONS_BLOCKED'}
                </span>
                <input
                  type="checkbox"
                  checked={registrationEnabled}
                  onChange={(e) => setRegistrationEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 focus:ring-indigo-500 h-4.5 w-4.5 bg-slate-900 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-5 flex flex-col gap-5">
            {/* THRESHOLDS & POLICY CONTROLS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Post Upload Limit (Per Day)</label>
                <Input
                  type="number"
                  value={postLimit}
                  onChange={(e) => setPostLimit(Number(e.target.value))}
                  placeholder="e.g. 50"
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9.5 rounded-xl font-semibold"
                />
                <span className="text-[9px] text-slate-500">Maximum posts a member can publish daily to protect feeds.</span>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Room Creation Limit (Per User)</label>
                <Input
                  type="number"
                  value={roomLimit}
                  onChange={(e) => setRoomLimit(Number(e.target.value))}
                  placeholder="e.g. 5"
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9.5 rounded-xl font-semibold"
                />
                <span className="text-[9px] text-slate-500">Limits community creation totals to prevent room listing spam.</span>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Default Registration Role</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl h-9.5 px-3">
                  <select
                    value={defaultRole}
                    onChange={(e) => setDefaultRole(e.target.value as any)}
                    className="bg-transparent text-slate-300 text-xs outline-none w-full cursor-pointer py-1 font-semibold"
                  >
                    <option value="member" className="bg-slate-950">member (Default, standard privileges)</option>
                    <option value="admin" className="bg-slate-950">admin (Bootstrap role - Caution)</option>
                  </select>
                </div>
                <span className="text-[9px] text-slate-500">Role immediately assigned to newly verified email connections.</span>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Maximum Assets Upload Size</label>
                <Input
                  value={maxUploadSize}
                  onChange={(e) => setMaxUploadSize(e.target.value)}
                  placeholder="e.g. 10MB"
                  className="bg-slate-950 border-slate-800 text-white text-xs h-9.5 rounded-xl font-semibold font-mono"
                />
                <span className="text-[9px] text-slate-500">Image size compression limits enforced in cloud/client.</span>
              </div>
            </div>

            {/* ALLOWED FILE FORMATS CHIPS */}
            <div className="flex flex-col gap-2 text-left">
              <label className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Image className="h-3.5 w-3.5 text-slate-400" />
                <span>Allowed Image MIME-Types</span>
              </label>
              
              <div className="flex flex-wrap gap-2">
                {['image/png', 'image/jpeg', 'image/gif', 'image/webp'].map((mime) => {
                  const allowed = allowedImageTypes.includes(mime);
                  return (
                    <button
                      key={mime}
                      onClick={() => handleToggleImageType(mime)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-semibold border transition-all cursor-pointer ${
                        allowed
                          ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400'
                          : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-800 hover:text-slate-400'
                      }`}
                    >
                      {mime}
                    </button>
                  );
                })}
              </div>
              <span className="text-[9px] text-slate-500">Block image formats like WebP or animated GIF.</span>
            </div>
          </div>

          {/* SAVE CONTROLS */}
          <div className="flex justify-end pt-4 border-t border-slate-900 mt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              disabled={saving}
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold px-4 rounded-xl"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{saving ? 'Saving System States...' : 'Apply System Rules'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
