/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, helperText, className = '', id, type = 'text', leftIcon, rightIcon, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    // State classes
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
            htmlFor={inputId}
            className="text-xs font-semibold text-gray-700 dark:text-slate-300 tracking-wide uppercase font-mono"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center rounded-sm shadow-xs group transition-all">
          {leftIcon && (
            <div className="absolute left-3.5 text-gray-400 dark:text-slate-500 pointer-events-none flex items-center justify-center transition-colors group-focus-within:text-primary-purple">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-sm focus-visible:outline-none focus-visible:ring-4 transition-all ${getBorderClass()} ${
              leftIcon ? 'pl-11' : ''
            } ${rightIcon || error || success ? 'pr-11' : ''} ${className}`}
            {...props}
          />

          {/* Right indicators */}
          <div className="absolute right-3.5 flex items-center gap-1.5 pointer-events-none">
            {error && <AlertCircle className="h-4.5 w-4.5 text-danger animate-pulse" />}
            {success && !error && <CheckCircle2 className="h-4.5 w-4.5 text-success" />}
            {rightIcon && !error && !success && (
              <div className="text-gray-400 dark:text-slate-500 group-focus-within:text-primary-purple transition-colors">
                {rightIcon}
              </div>
            )}
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

Input.displayName = 'Input';
export default Input;
