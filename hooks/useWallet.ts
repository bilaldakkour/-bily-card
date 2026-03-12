import { useState, useCallback, useEffect } from 'react';

export interface Wallet {
  balance_usd: number;
  balance_lbp: number;
  lastUpdated: string;
}

export interface WalletTransaction {
  _id: string;
  userId: string;
  type: 'deposit' | 'purchase' | 'refund' | 'manual_adjustment';
  amount: number;
  currency: 'USD' | 'LBP';
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  orderId?: string;
  createdAt: string;
}

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchWallet = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet');
      }

      const data = await response.json();
      setWallet(data.wallet);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchTransactionHistory = useCallback(
    async (limit: number = 20, offset: number = 0) => {
      if (!token) return;

      try {
        const response = await fetch(
          `/api/wallet/history?limit=${limit}&offset=${offset}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();
        setTransactions(data.transactions);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [token]
  );

  const requestDeposit = useCallback(
    async (amount: number, currency: 'USD' | 'LBP') => {
      if (!token) throw new Error('Not authenticated');

      try {
        const response = await fetch('/api/wallet/deposit-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount, currency }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to create deposit request');
        }

        const data = await response.json();
        return data.data;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [token]
  );

  return {
    wallet,
    transactions,
    loading,
    error,
    fetchWallet,
    fetchTransactionHistory,
    requestDeposit,
  };
}
