/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass' | 'premium';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center text-button font-medium rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none';
  
  const variants = {
    // Royal Blue to Indigo Gradient with sharp borders
    primary: 'bg-gradient-to-r from-primary-blue to-primary-purple text-white shadow-sm hover:from-primary-blue/90 hover:to-primary-purple/90 focus-visible:outline-primary-blue',
    
    // Sleek premium modern surface
    secondary: 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/80 focus-visible:outline-slate-500 shadow-xs',
    
    // Thin border minimal layout
    outline: 'border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 bg-transparent hover:bg-gray-50/50 dark:hover:bg-slate-800/30 focus-visible:outline-slate-500',
    
    // Floating with no borders
    ghost: 'text-gray-700 dark:text-slate-300 hover:bg-gray-100/50 dark:hover:bg-slate-800/40 focus-visible:outline-slate-500',
    
    // High contrast red
    danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger shadow-sm',
    
    // Elegant luxury glass button
    glass: 'glass-panel text-gray-900 dark:text-white border border-white/20 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/5 focus-visible:outline-primary-purple shadow-sm',
    
    // Moving animated premium metal look
    premium: 'bg-gradient-to-r from-primary-purple via-secondary-purple to-primary-blue text-white shadow-md hover:brightness-110 focus-visible:outline-secondary-purple purple-glow',
  };

  const sizes = {
    xs: 'px-2 py-1 text-[10px] gap-1 rounded-xs',
    sm: 'px-3.5 py-1.5 text-xs gap-1.5 rounded-sm',
    md: 'px-5 py-2.5 text-sm gap-2 rounded-md',
    lg: 'px-6 py-3 text-base gap-2.5 rounded-lg',
  };

  return (
    <motion.button
      whileHover={disabled || isLoading ? undefined : { scale: 1.015, y: -0.5 }}
      whileTap={disabled || isLoading ? undefined : { scale: 0.985, y: 0.5 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...(props as any)}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin h-4 w-4 text-current" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default Button;
