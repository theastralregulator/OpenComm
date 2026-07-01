import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, X } from 'lucide-react';

export function PWAReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[OpenComm PWA] SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('[OpenComm PWA] SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide">
      <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-2xl rounded-2xl p-4 w-80 max-w-[calc(100vw-3rem)]">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Update Available</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                A new version of OpenComm is available. Update now?
              </p>
            </div>
          </div>
          <button 
            onClick={close}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 -mt-1 -mr-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => updateServiceWorker(true)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-colors"
          >
            Update Now
          </button>
          <button
            onClick={close}
            className="flex-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold py-2 rounded-xl transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
