/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'modal' | 'bottom-sheet' | 'drawer';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  layout = 'modal',
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Determine animations based on layout
  const getMotionProps = () => {
    if (layout === 'bottom-sheet') {
      return {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring' as const, damping: 30, stiffness: 350 },
      };
    }
    if (layout === 'drawer') {
      return {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%' },
        transition: { type: 'spring' as const, damping: 35, stiffness: 300 },
      };
    }
    // Standard modular pop
    return {
      initial: { opacity: 0, scale: 0.95, y: 15 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 15 },
      transition: { type: 'spring' as const, damping: 25, stiffness: 450 },
    };
  };

  const layoutClasses = {
    modal: 'relative w-full bg-white dark:bg-slate-900 border border-gray-200/50 dark:border-slate-800 rounded-sm shadow-floating z-10 flex flex-col',
    
    'bottom-sheet': 'relative w-full bg-white dark:bg-slate-900 border-t border-gray-200/50 dark:border-slate-800 rounded-t-md shadow-floating z-10 flex flex-col max-h-[85vh]',
    
    drawer: 'relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-gray-200/50 dark:border-slate-800 shadow-floating z-10 flex flex-col',
  };

  const containerAlign = {
    modal: 'items-center justify-center p-4',
    'bottom-sheet': 'items-end justify-center p-0',
    drawer: 'items-center justify-end p-0',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex overflow-hidden ${containerAlign[layout]}`}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            {...getMotionProps()}
            className={`${layoutClasses[layout]} ${layout === 'modal' ? sizes[size] : ''}`}
          >
            {/* Grab handle for bottom sheet */}
            {layout === 'bottom-sheet' && (
              <div className="w-full flex justify-center py-2">
                <div className="w-12 h-1 bg-gray-200 dark:bg-slate-700 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100/80 dark:border-slate-800/60">
              <h3 className="text-title font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                {title || 'OpenComm Panel'}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors cursor-pointer hover:bg-gray-100/50 dark:hover:bg-slate-800/50"
                aria-label="Close"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
