import { ReactNode } from 'react';
import Link from 'next/link';

export interface HeaderProps {
  title: string;
  showLogout?: boolean;
  navItems?: { label: string; href: string; active?: boolean }[];
  onLogout?: () => void;
  isAdmin?: boolean;
}

export function Header({
  title,
  showLogout = true,
  navItems = [],
  onLogout,
  isAdmin = false,
}: HeaderProps) {
  return (
    <nav className="bg-slate-900/50 border-b border-purple-500/20 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href={isAdmin ? '/admin' : '/'} className="text-2xl font-bold text-purple-400">
          {title}
        </Link>

        <div className="flex gap-4 items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors ${
                item.active
                  ? 'text-purple-400'
                  : 'text-gray-300 hover:text-purple-400'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {showLogout && onLogout && (
            <button
              onClick={onLogout}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
}

export function PageContainer({ children, maxWidth = '7xl' }: PageContainerProps) {
  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
  };

  return (
    <div className={`${widthClasses[maxWidth]} mx-auto px-4 py-12`}>
      {children}
    </div>
  );
}

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 ${className}`}>
      {children}
    </div>
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
    secondary: 'bg-slate-700/50 hover:bg-slate-600 text-gray-300',
    danger: 'bg-red-600 hover:bg-red-700',
    success: 'bg-green-600 hover:bg-green-700',
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${variantClasses[variant]} ${sizeClasses[size]} text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        props.className || ''
      }`}
    >
      {loading ? '...' : children}
    </button>
  );
}
