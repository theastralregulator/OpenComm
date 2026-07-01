/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  List, 
  Search, 
  Trash2, 
  Activity, 
  Shield, 
  Database,
  RefreshCw
} from 'lucide-react';
import { AdminActivityLog } from '../../types';

interface ActivityLogsTabProps {
  logs: AdminActivityLog[];
  onAction: (actionType: string, payload: any) => void;
}

export const ActivityLogsTab: React.FC<ActivityLogsTabProps> = ({ logs, onAction }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((log) => {
    return (
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full text-left font-sans">
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                <List className="h-5 w-5 text-indigo-400" />
                <span>Ecosystem Auditing & Operator Logs</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Zero-Trust audit trails documenting administrative changes, user moderation events, and security access points.
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Purge all administrative logs? This action is highly sensitive and will wipe the local log trail.')) {
                    onAction('clear_logs', null);
                  }
                }}
                className="h-8 text-[11px] text-red-400 hover:bg-red-500/10 border-slate-850 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Purge Logs</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search audit trail keywords, administrator names, or network IPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-950 border-slate-800 text-white placeholder-slate-500 text-xs h-9.5 rounded-xl"
            />
          </div>

          {/* TABLE LOGS */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="p-4 w-[160px]">Timestamp</th>
                  <th className="p-4 w-[180px]">Administrator</th>
                  <th className="p-4">Action Event Description</th>
                  <th className="p-4 w-[140px] text-right">Routing IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-mono text-[11px] text-slate-300">
                {filteredLogs.map((log, idx) => {
                  const [date, timePart] = log.timestamp.split('T');
                  const time = timePart ? timePart.split('.')[0] : '00:00:00';
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                      {/* TIMESTAMP */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-200">{date}</span>
                          <span className="text-[10px] text-slate-500">{time} UTC</span>
                        </div>
                      </td>

                      {/* OPERATOR */}
                      <td className="p-4 font-semibold text-indigo-400">
                        {log.operator}
                      </td>

                      {/* ACTION */}
                      <td className="p-4 text-xs font-sans text-slate-200 font-medium">
                        {log.action}
                      </td>

                      {/* IP ADDRESS */}
                      <td className="p-4 text-right text-slate-500 font-semibold">
                        {log.ip}
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500 font-sans">
                      No matching audit records located.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
