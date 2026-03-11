import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error';
  message: string;
  onDismiss: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onDismiss }) => (
  <div
    className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
      type === 'success'
        ? 'bg-green-50 text-green-800 border border-green-200'
        : 'bg-red-50 text-red-800 border border-red-200'
    }`}
  >
    {type === 'success' ? (
      <Check className="h-4 w-4 shrink-0" />
    ) : (
      <AlertCircle className="h-4 w-4 shrink-0" />
    )}
    <span className="flex-1">{message}</span>
    <button onClick={onDismiss} aria-label="Dismiss" className="text-current opacity-60 hover:opacity-100 ml-2">
      ✕
    </button>
  </div>
);
