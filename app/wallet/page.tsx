'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutButton } from '@/components/shared';
import UserSidebar from '@/components/shared/UserSidebar';
import { useLanguage } from '@/hooks/useLanguage';

interface WalletBalance {
  usd: number;
  lbp: number;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

interface PaymentMethod {
  key: string;
  name: string;
  address: string;
  logoUrl: string;
  minAmount: number;
  feePercent: number;
  active: boolean;
}

export default function WalletPage() {
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const [balance, setBalance] = useState<WalletBalance>({ usd: 0, lbp: 0 });
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodKey, setSelectedMethodKey] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofName, setProofName] = useState('');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    const token = localStorage.getItem('bilycard_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (meRes.status === 401 || meRes.status === 403) {
        router.push('/login');
        return;
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.success && meData?.data?.walletBalance) {
          setBalance(meData.data.walletBalance);
        }
      }

      const txRes = await fetch('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (txRes.status === 401 || txRes.status === 403) {
        router.push('/login');
        return;
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData?.success) {
          setTxns(txData.transactions || []);
        }
      }

      const methodsRes = await fetch('/api/wallet/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (methodsRes.ok) {
        const methodsData = await methodsRes.json();
        if (methodsData?.success && Array.isArray(methodsData.data)) {
          setPaymentMethods(methodsData.data);
          if (!selectedMethodKey && methodsData.data[0]?.key) {
            setSelectedMethodKey(String(methodsData.data[0].key));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
      setMessage(t('wallet.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpLoading(true);
    setMessage('');

    const token = localStorage.getItem('bilycard_token');
    if (!token) return;

    const selectedMethod = paymentMethods.find((method) => method.key === selectedMethodKey);
    if (!selectedMethod) {
      setTopUpLoading(false);
      setMessage('Please choose a payment method');
      return;
    }

    if (!proofImage) {
      setTopUpLoading(false);
      setMessage('Please upload receipt image');
      return;
    }

    try {
      const res = await fetch('/api/wallet/deposit-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(topUpAmount),
          currency: 'USD',
          paymentMethodKey: selectedMethod.key,
          proofImage,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(t('wallet.depositSuccess'));
        setTopUpAmount('');
        setProofImage('');
        setProofName('');
        // Refresh balance after successful request
        await fetchWalletData();
      } else {
        setMessage(data.message || t('wallet.depositFailed'));
      }
    } catch (error) {
      setMessage(t('wallet.genericError'));
    } finally {
      setTopUpLoading(false);
    }
  };

  const selectedMethod = paymentMethods.find((method) => method.key === selectedMethodKey) || null;
  const parsedAmount = Number(topUpAmount || 0);
  const feePercent = Number(selectedMethod?.feePercent || 0);
  const amountAfterFee = Number.isFinite(parsedAmount)
    ? Math.max(0, parsedAmount - parsedAmount * (feePercent / 100))
    : 0;

  const handleProofUpload = (file: File | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      setProofImage(value);
      setProofName(file.name);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-white">{t('wallet.loading')}</div>
      </main>
    );
  }

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-7xl flex gap-8">
        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white">{t('wallet.title')}</h1>
            <p className="mt-2 text-slate-400">{t('wallet.subtitle')}</p>
          </div>

          {/* Balance Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{t('wallet.balanceUsd')}</p>
              <p className="text-3xl font-bold text-green-400">${balance.usd.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{t('wallet.balanceLbp')}</p>
              <p className="text-3xl font-bold text-blue-400">₾{balance.lbp.toFixed(0)}</p>
            </div>
          </div>

          {/* Top Up Form */}
          <div className="mb-8 rounded-lg border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">{t('wallet.addBalance')}</h2>

            <div className="mb-6">
              <p className="mb-3 text-sm font-medium text-slate-300">طريقة الدفع</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {paymentMethods.map((method) => {
                  const active = method.key === selectedMethodKey;
                  return (
                    <button
                      key={method.key}
                      type="button"
                      onClick={() => setSelectedMethodKey(method.key)}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? 'border-blue-400/60 bg-blue-500/10'
                          : 'border-white/10 bg-slate-800/80 hover:border-white/25'
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <img
                          src={method.logoUrl}
                          alt={method.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <span className="text-xs text-slate-400">${Number(method.minAmount || 0).toFixed(2)} min</span>
                      </div>
                      <p className="text-base font-semibold text-white">{method.name}</p>
                      <p className="mt-1 text-xs text-slate-400">Fee: {Number(method.feePercent || 0).toFixed(2)}%</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">عنوان الدفع</label>
                <div className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-slate-200">
                  {selectedMethod?.address || 'No payment address configured yet'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  {t('wallet.amount')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  placeholder={t('wallet.enterAmount')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">المبلغ بعد الرسوم</label>
                <div className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-slate-200">
                  ${amountAfterFee.toFixed(2)}
                  <span className="ml-2 text-xs text-slate-400">Fee: {feePercent.toFixed(2)}%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">إيصال المعاملة (اختياري)</label>
                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800 px-4 py-6 text-sm text-slate-300 hover:border-blue-400/40">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleProofUpload(e.target.files?.[0])}
                  />
                  {proofName || 'انقر لرفع الإيصال'}
                </label>
              </div>
              <button
                type="submit"
                disabled={topUpLoading}
                className="w-full rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {topUpLoading ? t('wallet.submitting') : t('wallet.requestDeposit')}
              </button>
            </form>
            {message && (
              <p className={`mt-4 text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </p>
            )}
          </div>

          {/* Transactions */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">{t('wallet.txHistory')}</h2>
            {txns.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-slate-900 p-8 text-center">
                <p className="text-slate-400">{t('wallet.noTx')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {txns.map((txn) => (
                  <div key={txn._id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium capitalize">{txn.type}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(txn.createdAt).toLocaleString()}
                        </p>
                        {txn.description && (
                          <p className="text-sm text-slate-400">{txn.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${txn.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {txn.amount > 0 ? '+' : ''}${txn.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-400">
                          {t('wallet.balanceAfter')}: ${txn.balanceAfter.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <UserSidebar onBalanceUpdate={fetchWalletData} />
      </div>
    </main>
  );
}