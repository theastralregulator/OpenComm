/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2.5 text-gray-500 hover:text-primary-purple dark:text-slate-400 dark:hover:text-purple-400 rounded-sm bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-soft cursor-pointer transition-all hover:border-primary-purple dark:hover:border-primary-purple focus-visible:ring-4 focus-visible:ring-primary-purple/25 focus-visible:outline-none overflow-hidden"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: 20, rotate: 40, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -20, rotate: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="flex items-center justify-center h-4.5 w-4.5"
        >
          {theme === 'dark' ? (
            <Sun className="h-4.5 w-4.5 text-amber-500 fill-amber-500/10" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-indigo-600 fill-indigo-600/10" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

export default ThemeToggle;
