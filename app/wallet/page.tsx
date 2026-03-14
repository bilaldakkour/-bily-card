'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Search, Shield, Sparkles, WalletCards, X } from 'lucide-react'
import {
  MobileMetricTile,
  MobilePanel,
  MobileSectionHeading,
  mobileInputClass,
  mobilePrimaryButtonClass,
} from '@/components/shared/MobileDesignSystem'
import { CopyButton } from '@/components/ui/CopyButton'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'

interface WalletBalance {
  usd: number
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
  const [balance, setBalance] = useState<WalletBalance>({ usd: 0 })
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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

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

  useEffect(() => {
    if (!isPaymentModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isPaymentModalOpen])

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
        setIsPaymentModalOpen(false)
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
  const paymentAddress = String(selectedMethod?.address || '').trim()
  const parsedAmount = Number(topUpAmount || 0)
  const feePercent = Number(selectedMethod?.feePercent || 0)
  const amountAfterFee = Number.isFinite(parsedAmount)
    ? Math.max(0, parsedAmount - parsedAmount * (feePercent / 100))
    : 0
  const activePaymentMethodsCount = paymentMethods.filter((method) => method.active).length || paymentMethods.length
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

  const handleMethodClick = (methodKey: string) => {
    setSelectedMethodKey(methodKey)
    setTopUpAmount('')
    setProofImage('')
    setProofName('')
    setMessage('')
    setMessageTone('')
    setIsPaymentModalOpen(true)
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
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
          <div className="relative overflow-hidden rounded-[28px] border border-emerald-400/16 bg-[linear-gradient(135deg,rgba(7,38,42,0.96),rgba(5,18,28,0.99))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.24)] sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.2),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_38%)]" />
            <div className="relative z-10">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200/90">
                {t('wallet.balanceUsd')}
              </p>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="text-right">
                  <div className="text-[2rem] font-black leading-none text-white sm:text-[2.4rem]">
                    ${balance.usd.toFixed(2)}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                    رصيدك جاهز للإيداع والشراء من نفس الواجهة، مع تجربة أوضح ومظهر موحّد على الديسكتوب.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:min-w-[280px]">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.08] px-3.5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-emerald-100">
                      <WalletCards className="h-4.5 w-4.5" />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-100/80">Payment Rails</span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-white">{activePaymentMethodsCount}</p>
                  </div>

                  <div className="rounded-[20px] border border-white/10 bg-white/[0.08] px-3.5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-cyan-100">
                      <Clock3 className="h-4.5 w-4.5" />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/80">Recent Activity</span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-white">{txns.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MobilePanel tone="accent" className="hidden xl:block">
            <div className="flex h-full flex-col justify-between">
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">Desktop Deposit Flow</p>
                <h2 className="mt-1 text-2xl font-black text-white">واجهة محفظة أنظف</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  اختر وسيلة الدفع المناسبة، وستظهر نفس نافذة الإيداع المرتبة مباشرة مع العنوان والرسوم ورفع الإيصال.
                </p>
              </div>

              <div className="mt-5 space-y-2.5 text-right">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Selected Method</p>
                  <p className="mt-1 text-base font-bold text-white">{selectedMethod?.name || 'Choose a method'}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Minimum</p>
                  <p className="mt-1 text-base font-bold text-white">${Number(selectedMethod?.minAmount || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Fee</p>
                  <p className="mt-1 text-base font-bold text-white">{Number(selectedMethod?.feePercent || 0).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </MobilePanel>
        </div>

        <MobilePanel>
          <MobileSectionHeading
            eyebrow="Deposit"
            title={t('wallet.addBalance')}
            description="أضف رصيدك من نفس الصفحة مع اختيار الطريقة المناسبة لك."
          />

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div>
            <p className="mb-3 text-sm font-medium text-slate-300">طريقة الدفع</p>
            <div className="grid grid-cols-3 gap-2.5 xl:grid-cols-4">
              {paymentMethods.map((method) => {
                const active = method.key === selectedMethodKey
                return (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => handleMethodClick(method.key)}
                    className={`flex h-full flex-col rounded-[20px] border p-2.5 text-center transition sm:rounded-[22px] sm:p-3.5 lg:min-h-[190px] lg:rounded-[24px] lg:p-4 md:text-left ${
                      active
                        ? 'border-cyan-400/40 bg-cyan-500/10 shadow-[0_16px_34px_rgba(14,165,233,0.12)]'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.055]'
                    }`}
                  >
                    <div className="mb-2 flex flex-col items-center gap-2 sm:mb-3 md:flex-row md:items-start md:justify-between md:gap-3">
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2 md:items-start">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white shadow-[0_10px_24px_rgba(2,6,23,0.22)] sm:h-16 sm:w-16 sm:rounded-2xl lg:h-[4.6rem] lg:w-[4.6rem]">
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
                            className={`inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${networkBadgeMap[method.key].className}`}
                          >
                            {networkBadgeMap[method.key].label}
                          </span>
                        )}
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-400 sm:text-[11px]">
                        ${Number(method.minAmount || 0).toFixed(2)} min
                      </span>
                    </div>
                    <p className="line-clamp-2 min-h-[2rem] text-[11px] font-semibold leading-4 text-white sm:min-h-0 sm:text-sm lg:text-[0.95rem]">
                      {method.name}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400 sm:mt-1 sm:text-[11px]">
                      Fee: {Number(method.feePercent || 0).toFixed(2)}%
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

            <div className="hidden xl:flex xl:flex-col xl:justify-between xl:rounded-[24px] xl:border xl:border-white/10 xl:bg-white/[0.04] xl:p-4">
              <div className="text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Quick Deposit
                </div>
                <h3 className="mt-3 text-lg font-black text-white">إرشادات سريعة</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  كل الطرق تفتح نفس النافذة المرتبة، مع نسخ العنوان واحتساب الرسوم ورفع الإيصال من نفس المكان.
                </p>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold">اختر الطريقة</span>
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 text-slate-200">
                    <WalletCards className="h-4 w-4" />
                    <span className="text-sm font-semibold">انسخ عنوان الدفع</span>
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 text-emerald-200">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-semibold">أرسل الطلب بأمان</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-center text-sm text-slate-300 lg:text-right">
            اضغط على أي طريقة دفع لفتح نافذة الإيداع الخاصة بها وإظهار العنوان والمبلغ والإيصال.
          </div>

          <form onSubmit={handleTopUp} className="hidden">
            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">عنوان الدفع</label>
                <div className="flex items-start gap-2 rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2.5 text-xs text-slate-200 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                  <div className="min-w-0 flex-1 break-all">
                    {paymentAddress || 'No payment address configured yet'}
                  </div>
                  {paymentAddress ? (
                    <CopyButton
                      value={paymentAddress}
                      label={`Copy ${selectedMethod?.name || 'payment'} address`}
                      className="h-7 w-7 border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-400/25 hover:bg-cyan-500/10 hover:text-cyan-200"
                    />
                  ) : null}
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
                  className={mobileInputClass}
                  placeholder={t('wallet.enterAmount')}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">المبلغ بعد الرسوم</label>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm text-slate-200 sm:rounded-2xl sm:px-4 sm:py-3">
                  ${amountAfterFee.toFixed(2)}
                  <span className="ml-2 text-[10px] text-slate-400 sm:text-[11px]">Fee: {feePercent.toFixed(2)}%</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">إيصال المعاملة (اختياري)</label>
                <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-white/[0.045] px-3 py-3 text-xs text-slate-300 hover:border-cyan-400/40 sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-sm">
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
              className={`w-full ${mobilePrimaryButtonClass} disabled:opacity-50`}
            >
              {topUpLoading ? t('wallet.submitting') : t('wallet.requestDeposit')}
            </button>
          </form>

          {message && !isPaymentModalOpen && (
            <p className={`mt-4 text-sm ${messageTone === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
        </MobilePanel>

        <MobilePanel tone="soft">
          <MobileSectionHeading
            eyebrow="Search"
            title="Find Activity"
            description="Search transactions by type, amount, or date."
          />

          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions, amount, date..."
              className={`${mobileInputClass} pl-10`}
            />
          </label>
        </MobilePanel>

        <MobilePanel tone="soft">
          <MobileSectionHeading
            eyebrow="Activity"
            title={t('wallet.txHistory')}
            description="Every movement in your wallet, with the remaining balance after each step."
          />

          {txns.length === 0 ? (
            <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-center sm:rounded-[24px] sm:p-8">
              <p className="text-slate-400">{t('wallet.noTx')}</p>
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-center sm:rounded-[24px] sm:p-8">
              <p className="text-slate-400">No matching transactions.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {filteredTxns.map((txn) => (
                <div
                  key={txn._id}
                  className="flex flex-col gap-2.5 rounded-[18px] border border-white/8 bg-white/[0.04] p-3 sm:flex-row sm:items-start sm:justify-between sm:rounded-[22px] sm:p-4"
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
        </MobilePanel>
      </UserPageLayout>

      {isPaymentModalOpen && selectedMethod ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/88 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-deposit-modal-title"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            className="w-full max-w-[22.75rem] overflow-hidden rounded-[24px] border border-cyan-400/12 bg-[linear-gradient(180deg,rgba(6,18,34,0.98),rgba(4,10,22,0.99))] shadow-[0_34px_90px_rgba(2,6,23,0.52)] sm:max-w-[24rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2.5 border-b border-white/8 px-3 py-3 sm:px-3.5 sm:py-3.5">
              <div className="min-w-0 text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">Deposit Method</p>
                <h2 id="wallet-deposit-modal-title" className="mt-1 text-[1.02rem] font-black text-white sm:text-lg">
                  {selectedMethod.name}
                </h2>
                <p className="mt-1 text-[12px] leading-5 text-slate-400">
                  أكمل الإيداع عبر {selectedMethod.name} ثم أرسل الطلب من نفس النافذة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-300/20 bg-rose-400/[0.09] text-rose-100 shadow-[0_10px_24px_rgba(15,23,42,0.28)] transition hover:border-rose-300/34 hover:bg-rose-400/[0.16] hover:text-white"
                aria-label="Close deposit popup"
              >
                <X className="h-5 w-5 stroke-[2.7]" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-3 py-3 sm:px-3.5 sm:py-3.5">
              <div className="mb-3 flex items-center gap-2.5 rounded-[18px] border border-white/10 bg-white/[0.04] p-2.5">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[16px] border border-white/10 bg-white shadow-[0_12px_28px_rgba(2,6,23,0.24)]">
                  <img
                    src={resolvePaymentMethodImage(selectedMethod)}
                    alt={selectedMethod.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {networkBadgeMap[selectedMethod.key] ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${networkBadgeMap[selectedMethod.key].className}`}
                      >
                        {networkBadgeMap[selectedMethod.key].label}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-slate-300">
                      Min ${Number(selectedMethod.minAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-slate-400">
                    Fee: {Number(selectedMethod.feePercent || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              <form onSubmit={handleTopUp} className="space-y-2.5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-300">عنوان الدفع</label>
                  <div className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm text-slate-200">
                    <div className="min-w-0 flex-1 break-all">
                      {paymentAddress || 'No payment address configured yet'}
                    </div>
                    {paymentAddress ? (
                      <CopyButton
                        value={paymentAddress}
                        label={`Copy ${selectedMethod.name} address`}
                        className="h-8.5 w-8.5 border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-400/25 hover:bg-cyan-500/10 hover:text-cyan-200"
                      />
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-300">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className={mobileInputClass}
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-300">المبلغ بعد الرسوم</label>
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm text-slate-200">
                    <span className="text-[1.35rem] font-bold text-white">${amountAfterFee.toFixed(2)}</span>
                    <span className="ml-2 text-xs text-slate-400">Fee: {feePercent.toFixed(2)}%</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-300">إيصال المعاملة (اختياري)</label>
                  <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-white/[0.045] px-3 py-2.5 text-sm text-slate-300 transition hover:border-cyan-400/40">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleProofUpload(e.target.files?.[0])}
                    />
                    {proofName || 'انقر لرفع الإيصال'}
                  </label>
                </div>

                {message ? (
                  <p className={`text-sm ${messageTone === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={topUpLoading}
                  className={`w-full ${mobilePrimaryButtonClass} disabled:opacity-50`}
                >
                  {topUpLoading ? t('wallet.submitting') : t('wallet.requestDeposit')}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
