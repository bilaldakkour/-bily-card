import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <svg
          className="w-full h-full text-purple-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      {message && <p className="text-gray-400 text-sm">{message}</p>}
    </div>
  );
}

export interface ErrorBoxProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export function ErrorBox({ title = 'Error', message, onDismiss }: ErrorBoxProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div>
          {title && <h3 className="text-red-400 font-semibold mb-1">{title}</h3>}
          <p className="text-red-300 text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-300 ml-2"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export interface SuccessBoxProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export function SuccessBox({ title = 'Success', message, onDismiss }: SuccessBoxProps) {
  return (
    <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div>
          {title && <h3 className="text-green-400 font-semibold mb-1">{title}</h3>}
          <p className="text-green-300 text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-400 hover:text-green-300 ml-2"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
