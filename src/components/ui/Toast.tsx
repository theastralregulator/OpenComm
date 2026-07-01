/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export const Toaster: React.FC = () => {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border border-gray-200/60 dark:border-slate-800 rounded-sm shadow-floating text-sm font-sans px-4 py-3.5',
      }}
    />
  );
};

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string | number) => toast.dismiss(id),
};

export default Toaster;
