/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, success, helperText, className = '', id, rows = 4, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    const getBorderClass = () => {
      if (error) {
        return 'border-danger focus-visible:border-danger focus-visible:ring-danger/20';
      }
      if (success) {
        return 'border-success focus-visible:border-success focus-visible:ring-success/20';
      }
      return 'border-gray-200 dark:border-slate-800 focus-visible:border-primary-purple focus-visible:ring-primary-purple/20';
    };

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-semibold text-gray-700 dark:text-slate-300 tracking-wide uppercase font-mono"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-sm shadow-xs transition-all">
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full px-4 py-3 text-sm bg-white dark:bg-slate-900 border text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-sm focus-visible:outline-none focus-visible:ring-4 transition-all resize-y ${getBorderClass()} ${className}`}
            {...props}
          />
          
          {/* Subtle absolute corner indicators for error or success */}
          <div className="absolute right-3.5 top-3.5 pointer-events-none">
            {error && <AlertCircle className="h-4 w-4 text-danger animate-pulse" />}
            {success && !error && <CheckCircle2 className="h-4 w-4 text-success" />}
          </div>
        </div>

        {error && (
          <span id={errorId} className="text-xs font-medium text-danger flex items-center gap-1 mt-0.5" role="alert">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 leading-normal">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
