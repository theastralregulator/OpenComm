/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
  isConfirmLoading?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  isConfirmLoading = false,
}) => {
  const icons = {
    info: <Info className="h-6 w-6 text-primary-blue animate-pulse" />,
    warning: <AlertCircle className="h-6 w-6 text-warning animate-bounce" />,
    danger: <AlertCircle className="h-6 w-6 text-danger animate-pulse" />,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-5 text-left">
        <div className="flex gap-4">
          <div className="flex-shrink-0 p-2.5 rounded-sm bg-gray-50 dark:bg-slate-850/40 border border-gray-100/50 dark:border-slate-800">
            {icons[type]}
          </div>
          <div className="flex flex-col gap-1 flex-1 justify-center">
            <p className="text-body text-gray-600 dark:text-slate-300 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 border-t border-gray-50 dark:border-slate-800/40 pt-4 mt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isConfirmLoading}>
            {cancelText}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isConfirmLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default Dialog;
