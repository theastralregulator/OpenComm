/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  className = '',
  ...props
}) => {
  // Use a premium sliding linear-gradient shimmer effect
  const baseClasses = 'relative overflow-hidden bg-gray-200 dark:bg-slate-800 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent';
  
  const variantClasses = {
    text: 'h-4 w-full rounded-xs',
    circular: 'rounded-full',
    rectangular: 'rounded-sm',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
};

export const SkeletonFeedItem: React.FC = () => {
  return (
    <div className="p-6 border border-gray-100 dark:border-slate-800/80 rounded-sm bg-white dark:bg-slate-900 shadow-soft flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton variant="text" className="h-4 w-1/3" />
          <Skeleton variant="text" className="h-3 w-1/4" />
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <Skeleton variant="text" className="h-4 w-full" />
        <Skeleton variant="text" className="h-4 w-5/6" />
        <Skeleton variant="text" className="h-4 w-2/3" />
      </div>
      <div className="flex items-center justify-between border-t border-gray-50 dark:border-slate-800/50 pt-4 mt-2">
        <Skeleton variant="rectangular" className="h-8 w-20" />
        <Skeleton variant="rectangular" className="h-8 w-20" />
      </div>
    </div>
  );
};

export default Skeleton;
