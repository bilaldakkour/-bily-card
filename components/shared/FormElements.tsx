import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

interface FormGroupProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ label, children, className = '' }: FormGroupProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-slate-200">{label}</label>}
      {children}
    </div>
  );
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-slate-500 ${className}`}
    />
  );
}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-slate-500 ${className}`}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-slate-500 ${className}`}
    />
  );
}

export function Badge({ className = '', children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={`inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 ${className}`}
    >
      {children}
    </span>
  );
}