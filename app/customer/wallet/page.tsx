'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Wallet {
  balance_usd: number;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setWallet(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/wallet/deposit-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          currency: 'USD',
        }),
      });
      if (res.ok) {
        setDepositAmount('');
        setShowDepositForm(false);
        alert('Deposit request created. Awaiting admin approval.');
        fetchWallet();
      }
    } catch (err) {
      alert('Failed to create deposit request');
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-400">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-white">
            Bily Card
          </Link>
          <div className="flex gap-4">
            <Link href="/customer/products" className="text-slate-300 hover:text-white">
              Shop
            </Link>
            <Link href="/customer/orders" className="text-slate-300 hover:text-white">
              Orders
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
              className="text-slate-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-8 text-4xl font-bold text-white">My Wallet</h1>

        <div className="mb-8 grid grid-cols-1 gap-6">
          <div className="rounded-lg border border-blue-700 bg-gradient-to-br from-blue-900 to-slate-900 p-6">
            <p className="mb-2 text-sm text-slate-400">USD Balance</p>
            <h2 className="text-4xl font-bold text-white">
              ${wallet?.balance_usd.toFixed(2)}
            </h2>
          </div>
        </div>

        {!showDepositForm ? (
          <button
            onClick={() => setShowDepositForm(true)}
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Add Funds
          </button>
        ) : (
          <div className="max-w-md rounded-lg border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Add Funds</h3>

            <input
              type="number"
              placeholder="Amount (USD)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white"
              step="0.01"
              min="0"
            />

            <div className="flex gap-2">
              <button
                onClick={handleDeposit}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
              >
                Request Deposit
              </button>
              <button
                onClick={() => setShowDepositForm(false)}
                className="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-white transition hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-12">
          <h2 className="mb-4 text-2xl font-bold text-white">Recent Transactions</h2>
          <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-white">Type</th>
                  <th className="px-6 py-3 text-left text-white">Amount</th>
                  <th className="px-6 py-3 text-left text-white">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-700/50">
                  <td className="px-6 py-3 text-slate-400">No transactions yet</td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
