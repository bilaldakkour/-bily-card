'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Wallet {
  balance_usd: number;
  balance_lbp: number;
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
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
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

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">My Wallet</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-lg bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-700">
            <p className="text-slate-400 text-sm mb-2">USD Balance</p>
            <h2 className="text-4xl font-bold text-white">
              ${wallet?.balance_usd.toFixed(2)}
            </h2>
          </div>

          <div className="p-6 rounded-lg bg-gradient-to-br from-purple-900 to-slate-900 border border-purple-700">
            <p className="text-slate-400 text-sm mb-2">LBP Balance</p>
            <h2 className="text-4xl font-bold text-white">
              ل.ل {wallet?.balance_lbp.toLocaleString()}
            </h2>
          </div>
        </div>

        {!showDepositForm ? (
          <button
            onClick={() => setShowDepositForm(true)}
            className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition"
          >
            Add Funds
          </button>
        ) : (
          <div className="max-w-md p-6 rounded-lg bg-slate-800 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-4">Add Funds</h3>

            <input
              type="number"
              placeholder="Amount (USD)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white mb-4"
              step="0.01"
              min="0"
            />

            <div className="flex gap-2">
              <button
                onClick={handleDeposit}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
              >
                Request Deposit
              </button>
              <button
                onClick={() => setShowDepositForm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Transactions</h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
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
