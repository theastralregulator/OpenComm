/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = 'sm',
  showLabel = false,
  animated = true,
}) => {
  const heightClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
  };

  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left select-none">
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-gray-700 dark:text-slate-300 font-mono">
          <span>Processing state</span>
          <span>{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden ${heightClasses[size]}`}>
        {animated ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedValue}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            className="h-full bg-gradient-to-r from-primary-blue via-primary-purple to-secondary-purple rounded-full"
          />
        ) : (
          <div
            className="h-full bg-gradient-to-r from-primary-blue via-primary-purple to-secondary-purple rounded-full"
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
