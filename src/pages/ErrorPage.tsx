/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface ErrorPageProps {
  title?: string;
  description?: string;
  statusCode?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  title = 'Page not found',
  description = 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
  statusCode = '404',
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-visual-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-slate-950">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
        <span className="text-8xl font-black text-gray-200 dark:text-slate-800 tracking-widest select-none font-mono">
          {statusCode}
        </span>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            <span>Home Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
export default ErrorPage;
