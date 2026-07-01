/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white';
  fullPage?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  fullPage = false,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 stroke-[3.5]',
    md: 'h-8 w-8 stroke-[2.5]',
    lg: 'h-12 w-12 stroke-[2]',
    xl: 'h-16 w-16 stroke-[1.5]',
  };

  const colorClasses = {
    primary: 'text-primary-purple dark:text-purple-400',
    white: 'text-white',
  };

  const spinnerMarkup = (
    <div className="relative">
      <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[variant]}`} />
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4.5 select-none">
        <div className="relative p-6 rounded-md bg-slate-900 border border-slate-800 shadow-floating flex flex-col items-center justify-center gap-3.5">
          {spinnerMarkup}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-bold tracking-wider text-slate-100 font-mono uppercase">
              OpenComm
            </span>
            <span className="text-[10px] tracking-widest text-slate-400 font-mono uppercase">
              Establishing Node...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <div className="flex items-center justify-center p-2.5">{spinnerMarkup}</div>;
};

export default Spinner;
