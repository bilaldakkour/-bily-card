import { useState, useCallback } from 'react';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async <T = any,>(
      url: string,
      options?: RequestInit
    ): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const token =
          localStorage.getItem('bilycard_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('adminToken');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (options?.headers) {
          Object.assign(headers, options.headers);
        }

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (err: any) {
        const errorMessage = err.message || 'An error occurred';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { request, loading, error };
}
