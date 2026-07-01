/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useUserProfileRealTime } from '../../contexts/AuthContext';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  userId?: string;
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  shape?: 'circle' | 'squircle' | 'hexagon';
  ringVariant?: 'none' | 'gradient' | 'speaking' | 'premium';
}

export const Avatar: React.FC<AvatarProps> = ({
  userId,
  src,
  alt = 'User avatar',
  fallback,
  size = 'md',
  isOnline,
  shape = 'circle',
  ringVariant = 'none',
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const realTimeProfile = useUserProfileRealTime(userId);
  const resolvedSrc = realTimeProfile?.profilePhotoURL || realTimeProfile?.profileImage || realTimeProfile?.photoURL || src;
  const resolvedFallback = realTimeProfile?.displayName || fallback;

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-xl',
  };

  const statusDotSizes = {
    xs: 'h-1.5 w-1.5 border-1',
    sm: 'h-2.5 w-2.5 border-2',
    md: 'h-3 w-3 border-2',
    lg: 'h-3.5 w-3.5 border-2',
    xl: 'h-4 w-4 border-2',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    squircle: 'rounded-md',
    hexagon: 'clip-path-hex rounded-[10px]', // Custom clipping layout
  };

  const ringStyles = {
    none: 'p-0 ring-0',
    gradient: 'p-0.5 ring-2 ring-primary-purple',
    speaking: 'p-0.5 ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 animate-pulse',
    premium: 'p-0.5 ring-2 ring-gradient bg-gradient-to-tr from-primary-purple via-secondary-purple to-accent-blue',
  };

  // Build a beautiful consistent gradient fallback for names
  const getGradientFallback = (name: string) => {
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = charCodeSum % 4;
    const gradients = [
      'from-primary-blue to-accent-blue text-white',
      'from-primary-purple to-secondary-purple text-white',
      'from-primary-purple to-accent-cyan text-white',
      'from-secondary-purple to-accent-blue text-white',
    ];
    return gradients[index];
  };

  const initials = resolvedFallback
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isInteractive = props.onClick !== undefined;

  const content = (
    <div className={`relative inline-block flex-shrink-0 ${className}`} {...props}>
      <div className={`relative ${ringVariant !== 'none' ? ringStyles[ringVariant] : ''} ${shapeClasses[shape]}`}>
        <div
          className={`${sizeClasses[size]} ${shapeClasses[shape]} overflow-hidden flex items-center justify-center font-bold tracking-tight select-none border border-gray-100/50 dark:border-slate-800/80 bg-gradient-to-br ${getGradientFallback(resolvedFallback)}`}
        >
          {resolvedSrc && !hasError ? (
            <img
              src={resolvedSrc}
              alt={alt}
              referrerPolicy="no-referrer"
              onError={() => setHasError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials || '?'}</span>
          )}
        </div>
        
        {isOnline !== undefined && (
          <span
            className={`absolute bottom-0 right-0 rounded-full border-white dark:border-slate-900 ${
              statusDotSizes[size]
            } ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );

  if (isInteractive) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-purple rounded-full p-0 border-0 bg-transparent text-left cursor-pointer"
      >
        {content}
      </motion.button>
    );
  }

  return content;
};

export default Avatar;
