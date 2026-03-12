import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthUserCache, fetchAuthUser } from '@/lib/utils/authClient';

export interface AuthUser {
  userId: string;
  username: string;
  email?: string;
  displayName?: string;
  role: 'customer' | 'admin';
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem('bilycard_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('adminToken');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser = await fetchAuthUser(token);
      if (!currentUser) {
        localStorage.removeItem('bilycard_token');
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        setUser(null);
        setLoading(false);
        return;
      }

      setUser({
        userId: String(currentUser.id || currentUser._id || ''),
        username: String(currentUser.username || currentUser.displayName || ''),
        email: currentUser.email,
        displayName: currentUser.displayName,
        role: currentUser.role,
      });
    } catch (err: any) {
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginCustomer = useCallback(
    async (emailOrUsername: string, password: string) => {
      try {
        const identifier = String(emailOrUsername || '').trim();
        const payload = identifier.includes('@')
          ? { email: identifier, password }
          : { username: identifier, password };

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('bilycard_token', data.token);
        localStorage.setItem('token', data.token);
        const nextUser = data?.data?.user;
        setUser(
          nextUser
            ? {
                userId: String(nextUser.id || nextUser._id || ''),
                username: String(nextUser.username || nextUser.displayName || ''),
                email: nextUser.email,
                displayName: nextUser.displayName,
                role: nextUser.role,
              }
            : null
        );
        router.push('/customer/products');
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    const token =
      localStorage.getItem('bilycard_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('adminToken') ||
      undefined;
    clearAuthUserCache(token);
    localStorage.removeItem('bilycard_token');
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    setUser(null);
    router.push('/');
  }, [router]);

  return {
    user,
    loading,
    error,
    loginCustomer,
    logout,
    fetchCurrentUser,
  };
}
