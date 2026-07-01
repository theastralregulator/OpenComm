/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, CheckCircle2, Sparkles, MailOpen } from 'lucide-react';

export type BadgeVariant = 'online' | 'offline' | 'verified' | 'admin' | 'moderator' | 'premium' | 'unread' | 'default' | 'cyan';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  glow?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  glow = false,
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase border select-none';

  const variants = {
    default: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-850',
    
    online: 'bg-emerald-50/50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    
    offline: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800/60',
    
    verified: 'bg-blue-50/50 text-blue-600 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
    
    admin: 'bg-red-50/50 text-red-600 border-red-200/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
    
    moderator: 'bg-amber-50/50 text-amber-600 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    
    premium: 'bg-purple-50/50 text-primary-purple border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30',
    
    unread: 'bg-primary-blue/10 text-primary-blue border-primary-blue/20 dark:bg-primary-blue/20 dark:text-accent-blue dark:border-primary-blue/30',

    cyan: 'bg-cyan-50/50 text-accent-cyan border-accent-cyan/20 dark:bg-cyan-950/20 dark:text-accent-cyan dark:border-accent-cyan/30',
  };

  const icons = {
    default: null,
    online: <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />,
    offline: <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />,
    verified: <CheckCircle2 className="h-3 w-3 text-blue-500 dark:text-blue-400 stroke-[3px]" />,
    admin: <Shield className="h-3 w-3 text-red-500 dark:text-red-400 stroke-[3.5px]" />,
    moderator: <Shield className="h-3 w-3 text-amber-500 dark:text-amber-400 stroke-[3.5px]" />,
    premium: <Sparkles className="h-3 w-3 text-primary-purple dark:text-purple-400 stroke-[2.5px]" />,
    unread: <span className="h-1.5 w-1.5 rounded-full bg-primary-blue animate-pulse" />,
    cyan: <Sparkles className="h-3 w-3 text-accent-cyan stroke-[2.5px]" />,
  };

  return (
    <span
      className={`${baseStyle} ${variants[variant]} ${glow ? 'shadow-[0_0_12px_rgba(124,58,237,0.15)]' : ''} ${className}`}
      {...props}
    >
      {icons[variant]}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
