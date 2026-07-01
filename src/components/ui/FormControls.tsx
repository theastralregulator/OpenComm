/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                               SELECT CONTROL                               */
/* -------------------------------------------------------------------------- */

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  className = '',
  children,
  id,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-gray-700 dark:text-slate-300 tracking-wide uppercase font-mono">
          {label}
        </label>
      )}
      <div className="relative rounded-sm shadow-xs transition-all">
        <select
          id={selectId}
          className={`w-full appearance-none px-4 py-2.5 pr-10 text-sm bg-white dark:bg-slate-900 border text-gray-900 dark:text-gray-100 rounded-sm focus-visible:outline-none focus-visible:ring-4 transition-all cursor-pointer ${
            error
              ? 'border-danger focus-visible:border-danger focus-visible:ring-danger/20'
              : 'border-gray-200 dark:border-slate-800 focus-visible:border-primary-purple focus-visible:ring-primary-purple/20'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-slate-500">
          <ChevronDown className="h-4.5 w-4.5" />
        </div>
      </div>
      {error && (
        <span className="text-xs font-medium text-danger mt-0.5" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 leading-normal">
          {helperText}
        </span>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              CHECKBOX CONTROL                              */
/* -------------------------------------------------------------------------- */

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  className = '',
  id,
  checked,
  onChange,
  ...props
}) => {
  const generatedId = useId();
  const checkboxId = id || generatedId;

  return (
    <div className="flex flex-col gap-1 text-left">
      <label htmlFor={checkboxId} className="inline-flex items-center gap-3 cursor-pointer group select-none">
        <div className="relative">
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="sr-only"
            {...props}
          />
          <motion.div
            animate={{
              backgroundColor: checked ? 'var(--color-primary-purple)' : 'transparent',
              borderColor: checked ? 'var(--color-primary-purple)' : 'var(--border-ui)',
            }}
            transition={{ duration: 0.15 }}
            className={`h-5 w-5 rounded-sm border-2 flex items-center justify-center transition-colors group-hover:border-primary-purple focus-within:ring-4 focus-within:ring-primary-purple/20 ${className}`}
          >
            {checked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check className="h-3 w-3 text-white stroke-[4px]" />
              </motion.div>
            )}
          </motion.div>
        </div>
        {label && (
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {label}
          </span>
        )}
      </label>
      {error && (
        <span className="text-xs font-medium text-danger mt-1 pl-8" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                RADIO CONTROL                               */
/* -------------------------------------------------------------------------- */

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Radio: React.FC<RadioProps> = ({
  label,
  error,
  className = '',
  id,
  checked,
  onChange,
  ...props
}) => {
  const generatedId = useId();
  const radioId = id || generatedId;

  return (
    <div className="flex flex-col gap-1 text-left">
      <label htmlFor={radioId} className="inline-flex items-center gap-3 cursor-pointer group select-none">
        <div className="relative">
          <input
            id={radioId}
            type="radio"
            checked={checked}
            onChange={onChange}
            className="sr-only"
            {...props}
          />
          <motion.div
            animate={{
              borderColor: checked ? 'var(--color-primary-purple)' : 'var(--border-ui)',
            }}
            transition={{ duration: 0.15 }}
            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors group-hover:border-primary-purple ${className}`}
          >
            {checked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="h-2.5 w-2.5 rounded-full bg-primary-purple"
              />
            )}
          </motion.div>
        </div>
        {label && (
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {label}
          </span>
        )}
      </label>
      {error && (
        <span className="text-xs font-medium text-danger mt-1 pl-8" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               SWITCH CONTROL                               */
/* -------------------------------------------------------------------------- */

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id,
}) => {
  const generatedId = useId();
  const switchId = id || generatedId;

  return (
    <div className="flex items-center justify-between text-left select-none">
      <label htmlFor={switchId} className="flex items-center gap-3.5 cursor-pointer group">
        <button
          type="button"
          id={switchId}
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-purple/20 disabled:cursor-not-allowed disabled:opacity-40 ${
            checked ? 'bg-primary-purple' : 'bg-gray-200 dark:bg-slate-800'
          }`}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        {label && (
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {label}
          </span>
        )}
      </label>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                SLIDER CONTROL                              */
/* -------------------------------------------------------------------------- */

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  value: number;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  className = '',
  ...props
}) => {
  const percentage = ((value - Number(min)) / (Number(max) - Number(min))) * 100;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left select-none">
      <div className="flex justify-between items-center text-xs font-semibold text-gray-700 dark:text-slate-300 font-mono tracking-wide uppercase">
        {label && <span>{label}</span>}
        <span>{value}</span>
      </div>
      <div className="relative flex items-center h-5">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          className={`w-full h-1.5 rounded-full appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-purple/20 bg-gray-200 dark:bg-slate-800 accent-primary-purple ${className}`}
          style={{
            background: `linear-gradient(to right, var(--color-primary-purple) ${percentage}%, var(--border-ui) ${percentage}%)`,
          }}
          {...props}
        />
      </div>
    </div>
  );
};
