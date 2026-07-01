/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'feature' | 'glass' | 'interactive' | 'glowing';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  ...props
}) => {
  const baseStyle = 'border rounded-md overflow-hidden transition-all duration-300';
  
  const variants = {
    default: 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-soft',
    
    // Feature card with a subtle top indigo/purple border and hover accent
    feature: 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 relative before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-primary-blue before:to-secondary-purple shadow-md',
    
    // Backdrop blur glass panel
    glass: 'glass-panel shadow-soft',
    
    // Interactive card that elevates, expands shadow and glows
    interactive: 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-soft cursor-pointer hover:shadow-lg hover:border-primary-purple/40 dark:hover:border-primary-purple/40 purple-glow purple-glow-hover',
    
    // Intense dark mode premium glowing card
    glowing: 'bg-slate-950/80 dark:bg-slate-900/90 border-transparent dark:border-slate-800 shadow-lg relative purple-glow',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  };

  // If the card is interactive, let's wrap or handle it with framer motion!
  if (variant === 'interactive') {
    return (
      <motion.div
        whileHover={{ y: -3, scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`${baseStyle} ${variants[variant]} ${className}`}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`px-5 py-4 border-b border-gray-100/80 dark:border-slate-800/60 flex flex-col gap-1.5 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3
      className={`text-title font-semibold text-gray-900 dark:text-gray-100 tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <p
      className={`text-caption text-gray-500 dark:text-slate-400 leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`px-5 py-4 bg-gray-50/40 dark:bg-slate-900/20 border-t border-gray-100/80 dark:border-slate-800/60 flex items-center justify-end gap-3 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
