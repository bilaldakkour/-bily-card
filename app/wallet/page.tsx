'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'

interface WalletBalance {
  usd: number
  lbp: number
}

interface Transaction {
  _id: string
  type: string
  amount: number
  balanceAfter: number
  description?: string
  createdAt: string
}

interface PaymentMethod {
  key: string
  name: string
  address: string
  logoUrl: string
  minAmount: number
  feePercent: number
  active: boolean
}

export default function WalletPage() {
  const { t, isRTL } = useLanguage()
  const router = useRouter()
  const [balance, setBalance] = useState<WalletBalance>({ usd: 0, lbp: 0 })
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'error' | ''>('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedMethodKey, setSelectedMethodKey] = useState('')
  const [proofImage, setProofImage] = useState('')
  const [proofName, setProofName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fallbackLogos: Record<string, string> = {
    'whish-money': '/payment-methods/whish-money.png',
    'omt-wallet': '/payment-methods/OMT.jpg',
    'usdt-trc20': '/payment-methods/usdt.png',
    'usdt-bep20': '/payment-methods/usdt-bep20.png',
    'orange-money': '/payment-methods/orange-money.png',
    orange: '/payment-methods/orange-money.png',
    omt: '/payment-methods/OMT.jpg',
    whish: '/payment-methods/whish-money.png',
  }

  const networkBadgeMap: Record<string, { label: string; className: string }> = {
    'usdt-trc20': {
      label: 'TRC20',
      className: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-300',
    },
    'usdt-bep20': {
      label: 'BEP20',
      className: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
    },
  }

  const resolvePaymentMethodImage = (method: PaymentMethod) => {
    const key = String(method.key || '').toLowerCase()
    const name = String(method.name || '').toLowerCase()

    if (fallbackLogos[key]) return fallbackLogos[key]
    if (name.includes('orange')) return '/payment-methods/orange-money.png'
    if (name.includes('whish')) return '/payment-methods/whish-money.png'
    if (name.includes('omt')) return '/payment-methods/OMT.jpg'
    if (name.includes('trc20')) return '/payment-methods/usdt.png'
    if (name.includes('bep20')) return '/payment-methods/usdt-bep20.png'

    return method.logoUrl || '/payment-methods/usdt.png'
  }

  useEffect(() => {
    void fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (meRes.status === 401 || meRes.status === 403) {
        router.push('/login')
        return
      }

      if (meRes.ok) {
        const meData = await meRes.json()
        if (meData?.success && meData?.data?.walletBalance) {
          setBalance(meData.data.walletBalance)
        }
      }

      const txRes = await fetch('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (txRes.status === 401 || txRes.status === 403) {
        router.push('/login')
        return
      }

      if (txRes.ok) {
        const txData = await txRes.json()
        if (txData?.success) {
          setTxns(txData.transactions || [])
        }
      }

      const methodsRes = await fetch('/api/wallet/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (methodsRes.ok) {
        const methodsData = await methodsRes.json()
        if (methodsData?.success && Array.isArray(methodsData.data)) {
          setPaymentMethods(methodsData.data)
          if (!selectedMethodKey && methodsData.data[0]?.key) {
            setSelectedMethodKey(String(methodsData.data[0].key))
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallet data:', error)
      setMessage(t('wallet.loadError'))
      setMessageTone('error')
    } finally {
      setLoading(false)
    }
  }

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setTopUpLoading(true)
    setMessage('')
    setMessageTone('')

    const token = localStorage.getItem('bilycard_token')
    if (!token) return

    const selectedMethod = paymentMethods.find((method) => method.key === selectedMethodKey)
    if (!selectedMethod) {
      setTopUpLoading(false)
      setMessage('Please choose a payment method')
      setMessageTone('error')
      return
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
          proofImage: proofImage || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage(t('wallet.depositSuccess'))
        setMessageTone('success')
        setTopUpAmount('')
        setProofImage('')
        setProofName('')
        await fetchWalletData()
      } else {
        setMessage(data.message || t('wallet.depositFailed'))
        setMessageTone('error')
      }
    } catch (error) {
      setMessage(t('wallet.genericError'))
      setMessageTone('error')
    } finally {
      setTopUpLoading(false)
    }
  }

  const selectedMethod = paymentMethods.find((method) => method.key === selectedMethodKey) || null
  const parsedAmount = Number(topUpAmount || 0)
  const feePercent = Number(selectedMethod?.feePercent || 0)
  const amountAfterFee = Number.isFinite(parsedAmount)
    ? Math.max(0, parsedAmount - parsedAmount * (feePercent / 100))
    : 0
  const filteredTxns = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return txns

    return txns.filter((txn) =>
      [
        txn.type,
        txn.description || '',
        txn.createdAt,
        String(txn.amount),
        String(txn.balanceAfter),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [txns, searchTerm])

  const handleProofUpload = (file: File | undefined) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      setProofImage(value)
      setProofName(file.name)
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-white">{t('wallet.loading')}</div>
      </main>
    )
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <UserPageLayout
        title={t('wallet.title')}
        mobileTitle="المحفظة"
        subtitle={t('wallet.subtitle')}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: t('wallet.title'), href: '/wallet' },
        ]}
        sidebarBalanceUpdate={fetchWalletData}
        showHeader={false}
        fixedSidebarDesktop
        maxWidthClass="max-w-[1720px]"
        fixedSidebarRightClass="lg:right-6"
      >
        <div className="grid gap-2.5 md:grid-cols-2">
          <div className="rounded-[20px] border border-emerald-400/15 bg-emerald-500/10 p-3 shadow-[0_16px_40px_rgba(2,6,23,0.18)] sm:rounded-[24px] sm:p-4 sm:shadow-[0_20px_56px_rgba(2,6,23,0.2)]">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">{t('wallet.balanceUsd')}</p>
            <p className="mt-1.5 text-xl font-bold text-white sm:mt-2 sm:text-2xl">${balance.usd.toFixed(2)}</p>
          </div>
          <div className="rounded-[20px] border border-sky-400/15 bg-sky-500/10 p-3 shadow-[0_16px_40px_rgba(2,6,23,0.18)] sm:rounded-[24px] sm:p-4 sm:shadow-[0_20px_56px_rgba(2,6,23,0.2)]">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-300">{t('wallet.balanceLbp')}</p>
            <p className="mt-1.5 text-xl font-bold text-white sm:mt-2 sm:text-2xl">LBP {balance.lbp.toFixed(0)}</p>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-3.5 shadow-[0_18px_50px_rgba(2,6,23,0.2)] sm:rounded-[28px] sm:p-5 sm:shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
          <div className="mb-3 sm:mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Deposit
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">{t('wallet.addBalance')}</h2>
          </div>

          <div className="mb-5">
            <p className="mb-3 text-sm font-medium text-slate-300">طريقة الدفع</p>
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              {paymentMethods.map((method) => {
                const active = method.key === selectedMethodKey
                return (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => setSelectedMethodKey(method.key)}
                    className={`rounded-[18px] border p-2.5 text-left transition sm:rounded-[22px] sm:p-3.5 ${
                      active
                        ? 'border-cyan-400/50 bg-cyan-500/10'
                        : 'border-white/10 bg-white/[0.035] hover:border-white/25'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_10px_24px_rgba(2,6,23,0.22)] sm:h-16 sm:w-16">
                          <img
                            src={resolvePaymentMethodImage(method)}
                            alt={method.name}
                            className="h-full w-full object-contain"
                            onError={(event) => {
                              const target = event.currentTarget
                              const fallback = resolvePaymentMethodImage(method)
                              if (target.src.endsWith(fallback)) return
                              target.src = fallback
                            }}
                          />
                        </div>
                        {networkBadgeMap[method.key] && (
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${networkBadgeMap[method.key].className}`}
                          >
                            {networkBadgeMap[method.key].label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 sm:text-[11px]">
                        ${Number(method.minAmount || 0).toFixed(2)} min
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white sm:text-sm">{method.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400 sm:mt-1 sm:text-[11px]">
                      Fee: {Number(method.feePercent || 0).toFixed(2)}%
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleTopUp} className="space-y-3">
            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">عنوان الدفع</label>
                <div className="break-all rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2.5 text-xs text-slate-200 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                  {selectedMethod?.address || 'No payment address configured yet'}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">
                  {t('wallet.amount')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none sm:rounded-2xl sm:px-4 sm:py-3"
                  placeholder={t('wallet.enterAmount')}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">المبلغ بعد الرسوم</label>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm text-slate-200 sm:rounded-2xl sm:px-4 sm:py-3">
                  ${amountAfterFee.toFixed(2)}
                  <span className="ml-2 text-[10px] text-slate-400 sm:text-[11px]">Fee: {feePercent.toFixed(2)}%</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">إيصال المعاملة (اختياري)</label>
                <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-white/[0.035] px-3 py-3 text-xs text-slate-300 hover:border-cyan-400/40 sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-sm">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleProofUpload(e.target.files?.[0])}
                  />
                  {proofName || 'انقر لرفع الإيصال'}
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={topUpLoading}
              className="w-full rounded-[18px] bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 sm:rounded-2xl sm:px-6 sm:py-3"
            >
              {topUpLoading ? t('wallet.submitting') : t('wallet.requestDeposit')}
            </button>
          </form>

          {message && (
            <p className={`mt-4 text-sm ${messageTone === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-3.5 shadow-[0_18px_50px_rgba(2,6,23,0.2)] sm:rounded-[28px] sm:p-5 sm:shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
          <div className="mb-3 sm:mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Search
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">Find Activity</h2>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions, amount, date..."
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.035] py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none sm:rounded-2xl sm:py-3 sm:pl-11 sm:pr-4"
            />
          </label>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-3.5 shadow-[0_18px_50px_rgba(2,6,23,0.2)] sm:rounded-[28px] sm:p-5 sm:shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
          <div className="mb-3 sm:mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Activity
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">{t('wallet.txHistory')}</h2>
          </div>

          {txns.length === 0 ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-6 text-center sm:rounded-[24px] sm:p-8">
              <p className="text-slate-400">{t('wallet.noTx')}</p>
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className="rounded-[20px] border border-white/10 bg-white/[0.035] p-6 text-center sm:rounded-[24px] sm:p-8">
              <p className="text-slate-400">No matching transactions.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTxns.map((txn) => (
                <div
                  key={txn._id}
                  className="flex flex-col gap-2.5 rounded-[18px] border border-white/8 bg-white/[0.035] p-3 sm:flex-row sm:items-start sm:justify-between sm:rounded-[22px] sm:p-4"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize text-white">{txn.type}</p>
                    <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">{new Date(txn.createdAt).toLocaleString()}</p>
                    {txn.description && (
                      <p className="mt-1 text-xs text-slate-400 sm:text-sm">{txn.description}</p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className={`text-sm font-semibold ${txn.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {txn.amount > 0 ? '+' : ''}${txn.amount.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t('wallet.balanceAfter')}: ${txn.balanceAfter.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </UserPageLayout>
    </div>
  )
}
