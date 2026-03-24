'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Search, Shield, Sparkles, WalletCards, X } from 'lucide-react'
import {
  MobilePanel,
  MobileSectionHeading,
  mobileInputClass,
  mobilePrimaryButtonClass,
} from '@/components/shared/MobileDesignSystem'
import { CopyButton } from '@/components/ui/CopyButton'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { useLanguage } from '@/hooks/useLanguage'
import { fetchAuthUser, fetchUserActivitySnapshot } from '@/lib/utils/authClient'

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
  const { t, isRTL, language } = useLanguage()
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
  const pageCopy = {
    ar: {
      mobileTitle: t('wallet.title'),
      breadcrumbHome: 'الرئيسية',
      chooseMethod: 'يرجى اختيار طريقة دفع',
      heroDescription: 'رصيدك جاهز للإيداع والشراء من نفس الواجهة، مع تجربة أوضح ومظهر موحد على الديسكتوب.',
      paymentRails: 'طرق الدفع',
      recentActivity: 'آخر النشاطات',
      desktopFlow: 'مسار الإيداع على الديسكتوب',
      desktopTitle: 'واجهة محفظة أنظف',
      desktopDescription: 'اختر وسيلة الدفع المناسبة، وستظهر نفس نافذة الإيداع المرتبة مباشرة مع العنوان والرسوم ورفع الإيصال.',
      selectedMethod: 'الطريقة المختارة',
      chooseAMethod: 'اختر طريقة',
      minimum: 'الحد الأدنى',
      fee: 'الرسوم',
      depositEyebrow: 'إيداع',
      depositDescription: 'أضف رصيدك من نفس الصفحة مع اختيار الطريقة المناسبة لك.',
      paymentMethod: 'طريقة الدفع',
      quickDeposit: 'إيداع سريع',
      quickTipsTitle: 'إرشادات سريعة',
      quickTipsDescription: 'كل الطرق تفتح نفس النافذة المرتبة، مع نسخ العنوان واحتساب الرسوم ورفع الإيصال من نفس المكان.',
      chooseMethodStep: 'اختر الطريقة',
      copyAddressStep: 'انسخ عنوان الدفع',
      safeRequestStep: 'أرسل الطلب بأمان',
      depositHint: 'اضغط على أي طريقة دفع لفتح نافذة الإيداع الخاصة بها وإظهار العنوان والمبلغ والإيصال.',
      paymentAddress: 'عنوان الدفع',
      noAddress: 'لا يوجد عنوان دفع مجهز بعد',
      amountAfterFees: 'المبلغ بعد الرسوم',
      receiptOptional: 'إيصال المعاملة (اختياري)',
      uploadReceipt: 'انقر لرفع الإيصال',
      searchEyebrow: 'بحث',
      findActivity: 'ابحث في النشاط',
      searchDescription: 'ابحث عن العمليات حسب النوع أو المبلغ أو التاريخ.',
      searchPlaceholder: 'ابحث في العمليات أو المبلغ أو التاريخ...',
      activityEyebrow: 'النشاط',
      activityDescription: 'كل حركة في محفظتك، مع الرصيد المتبقي بعد كل خطوة.',
      noMatchingTransactions: 'لا توجد عمليات مطابقة.',
      depositMethod: 'طريقة الإيداع',
      modalDescription: (name: string) => `أكمل الإيداع عبر ${name} ثم أرسل الطلب من نفس النافذة.`,
      closeDepositPopup: 'إغلاق نافذة الإيداع',
      copyAddressLabel: (name: string) => `نسخ عنوان ${name}`,
      minBadge: (amount: number) => `الحد الأدنى $${amount.toFixed(2)}`,
      amountLabel: 'المبلغ',
      enterAmount: 'أدخل المبلغ',
    },
    en: {
      mobileTitle: t('wallet.title'),
      breadcrumbHome: 'Home',
      chooseMethod: 'Please choose a payment method',
      heroDescription: 'Your balance is ready for deposits and purchases from the same interface, with a cleaner and more unified layout.',
      paymentRails: 'Payment Rails',
      recentActivity: 'Recent Activity',
      desktopFlow: 'Desktop Deposit Flow',
      desktopTitle: 'Cleaner wallet view',
      desktopDescription: 'Choose the payment method that fits you, then use the same organized deposit popup with address, fees, and receipt upload.',
      selectedMethod: 'Selected Method',
      chooseAMethod: 'Choose a method',
      minimum: 'Minimum',
      fee: 'Fee',
      depositEyebrow: 'Deposit',
      depositDescription: 'Add funds from the same page using the payment method that suits you best.',
      paymentMethod: 'Payment Method',
      quickDeposit: 'Quick Deposit',
      quickTipsTitle: 'Quick Tips',
      quickTipsDescription: 'Every method opens the same organized popup, with address copying, fee calculation, and receipt upload in one place.',
      chooseMethodStep: 'Choose the method',
      copyAddressStep: 'Copy the payment address',
      safeRequestStep: 'Submit safely',
      depositHint: 'Tap any payment method to open its deposit popup and reveal the address, amount, and receipt upload.',
      paymentAddress: 'Payment Address',
      noAddress: 'No payment address configured yet',
      amountAfterFees: 'Amount After Fees',
      receiptOptional: 'Transaction Receipt (Optional)',
      uploadReceipt: 'Tap to upload the receipt',
      searchEyebrow: 'Search',
      findActivity: 'Find Activity',
      searchDescription: 'Search transactions by type, amount, or date.',
      searchPlaceholder: 'Search transactions, amount, date...',
      activityEyebrow: 'Activity',
      activityDescription: 'Every movement in your wallet, with the remaining balance after each step.',
      noMatchingTransactions: 'No matching transactions.',
      depositMethod: 'Deposit Method',
      modalDescription: (name: string) => `Complete the deposit through ${name}, then submit the request from the same popup.`,
      closeDepositPopup: 'Close deposit popup',
      copyAddressLabel: (name: string) => `Copy ${name} address`,
      minBadge: (amount: number) => `Min $${amount.toFixed(2)}`,
      amountLabel: 'Amount',
      enterAmount: 'Enter amount',
    },
    fr: {
      mobileTitle: 'Mon portefeuille',
      breadcrumbHome: 'Accueil',
      chooseMethod: 'Veuillez choisir une methode de paiement',
      heroDescription: 'Votre solde est pret pour les depots et les achats depuis la meme interface, avec une vue plus claire et unifiee.',
      paymentRails: 'Moyens de paiement',
      recentActivity: 'Activite recente',
      desktopFlow: 'Flux de depot desktop',
      desktopTitle: 'Vue portefeuille plus propre',
      desktopDescription: 'Choisissez la methode de paiement adaptee, puis utilisez la meme fenetre de depot avec adresse, frais et recu.',
      selectedMethod: 'Methode selectionnee',
      chooseAMethod: 'Choisir une methode',
      minimum: 'Minimum',
      fee: 'Frais',
      depositEyebrow: 'Depot',
      depositDescription: 'Ajoutez du solde depuis la meme page avec la methode de paiement qui vous convient.',
      paymentMethod: 'Methode de paiement',
      quickDeposit: 'Depot rapide',
      quickTipsTitle: 'Conseils rapides',
      quickTipsDescription: 'Chaque methode ouvre la meme fenetre organisee, avec copie de l adresse, calcul des frais et envoi du recu.',
      chooseMethodStep: 'Choisissez la methode',
      copyAddressStep: 'Copiez l adresse de paiement',
      safeRequestStep: 'Envoyez en securite',
      depositHint: 'Touchez une methode de paiement pour ouvrir sa fenetre de depot et afficher l adresse, le montant et le recu.',
      paymentAddress: 'Adresse de paiement',
      noAddress: 'Aucune adresse de paiement configuree',
      amountAfterFees: 'Montant apres frais',
      receiptOptional: 'Recu de transaction (optionnel)',
      uploadReceipt: 'Touchez pour televerser le recu',
      searchEyebrow: 'Recherche',
      findActivity: 'Rechercher une activite',
      searchDescription: 'Recherchez les transactions par type, montant ou date.',
      searchPlaceholder: 'Rechercher transactions, montant, date...',
      activityEyebrow: 'Activite',
      activityDescription: 'Tous les mouvements de votre portefeuille, avec le solde restant apres chaque etape.',
      noMatchingTransactions: 'Aucune transaction correspondante.',
      depositMethod: 'Methode de depot',
      modalDescription: (name: string) => `Terminez le depot via ${name}, puis envoyez la demande depuis la meme fenetre.`,
      closeDepositPopup: 'Fermer la fenetre de depot',
      copyAddressLabel: (name: string) => `Copier l adresse ${name}`,
      minBadge: (amount: number) => `Min $${amount.toFixed(2)}`,
      amountLabel: 'Montant',
      enterAmount: 'Saisir le montant',
    },
  }[language]

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

  const fetchWalletData = async (force = false) => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const [meData, activityData] = await Promise.all([
        fetchAuthUser(token, force),
        fetchUserActivitySnapshot(token, force),
      ])

      setBalance((meData as { walletBalance?: WalletBalance })?.walletBalance || { usd: 0 })
      setTxns(Array.isArray(activityData?.transactions) ? activityData.transactions : [])

      const methodsRes = await fetch('/api/wallet/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
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
      if (!localStorage.getItem('bilycard_token')) {
        router.push('/login')
        return
      }
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
      setMessage(pageCopy.chooseMethod)
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
        await fetchWalletData(true)
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
        mobileTitle={pageCopy.mobileTitle}
        subtitle={t('wallet.subtitle')}
        breadcrumbs={[
          { label: pageCopy.breadcrumbHome, href: '/' },
          { label: t('wallet.title'), href: '/wallet' },
        ]}
        sidebarBalanceUpdate={fetchWalletData}
        showHeader={false}
        fixedSidebarDesktop
        maxWidthClass="max-w-[1720px]"
        fixedSidebarRightClass="lg:right-6"
      >
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(290px,0.8fr)]">
          <div className="relative overflow-hidden rounded-[20px] border border-[#3a7bff]/22 bg-[linear-gradient(135deg,rgba(7,38,42,0.96),rgba(5,18,28,0.99))] p-3 shadow-[0_18px_44px_rgba(2,6,23,0.22)] sm:p-3.5 lg:p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.2),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_38%)]" />
            <div className="relative z-10">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200/90">
                {t('wallet.balanceUsd')}
              </p>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="text-right">
                  <div className="text-[1.7rem] font-black leading-none text-white sm:text-[2.05rem]">
                    ${balance.usd.toFixed(2)}
                  </div>
                  <p className="mt-1.5 max-w-2xl text-xs leading-5 text-emerald-50/80 sm:text-sm">
                    {pageCopy.heroDescription}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:min-w-[280px]">
                  <div className="rounded-[16px] border border-white/10 bg-white/[0.08] px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2 text-emerald-100">
                      <WalletCards className="h-4 w-4" />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-100/80">{pageCopy.paymentRails}</span>
                    </div>
                    <p className="mt-1.5 text-xl font-black text-white">{activePaymentMethodsCount}</p>
                  </div>

                  <div className="rounded-[16px] border border-white/10 bg-white/[0.08] px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2 text-cyan-100">
                      <Clock3 className="h-4 w-4" />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/80">{pageCopy.recentActivity}</span>
                    </div>
                    <p className="mt-1.5 text-xl font-black text-white">{txns.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MobilePanel tone="accent" className="hidden xl:block p-3.5">
            <div className="flex h-full flex-col justify-between">
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">{pageCopy.desktopFlow}</p>
                <h2 className="mt-1 text-2xl font-black text-white">{pageCopy.desktopTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {pageCopy.desktopDescription}
                </p>
              </div>

              <div className="mt-3.5 space-y-2 text-right">
                <div className="rounded-[14px] border border-white/10 bg-white/[0.05] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{pageCopy.selectedMethod}</p>
                  <p className="mt-1 text-base font-bold text-white">{selectedMethod?.name || pageCopy.chooseAMethod}</p>
                </div>
                <div className="rounded-[14px] border border-white/10 bg-white/[0.05] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{pageCopy.minimum}</p>
                  <p className="mt-1 text-base font-bold text-white">${Number(selectedMethod?.minAmount || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-[14px] border border-white/10 bg-white/[0.05] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{pageCopy.fee}</p>
                  <p className="mt-1 text-base font-bold text-white">{Number(selectedMethod?.feePercent || 0).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </MobilePanel>
        </div>

        <MobilePanel>
          <MobileSectionHeading
            eyebrow={pageCopy.depositEyebrow}
            title={t('wallet.addBalance')}
            description={pageCopy.depositDescription}
          />

          <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_250px]">
            <div>
            <p className="mb-2 text-xs font-medium text-slate-300 sm:text-sm">{pageCopy.paymentMethod}</p>
            <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-4">
              {paymentMethods.map((method) => {
                const active = method.key === selectedMethodKey
                return (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => handleMethodClick(method.key)}
                    className={`flex h-full flex-col rounded-[16px] border p-2 text-center transition sm:rounded-[18px] sm:p-2.5 lg:min-h-[148px] lg:rounded-[20px] lg:p-3 md:text-left ${
                      active
                        ? 'border-cyan-400/40 bg-cyan-500/10 shadow-[0_16px_34px_rgba(14,165,233,0.12)]'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.055]'
                    }`}
                  >
                    <div className="mb-1.5 flex flex-col items-center gap-1.5 sm:mb-2 md:flex-row md:items-start md:justify-between md:gap-2">
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2 md:items-start">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white shadow-[0_10px_24px_rgba(2,6,23,0.22)] sm:h-12 sm:w-12 sm:rounded-xl lg:h-14 lg:w-14">
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
                        {pageCopy.minBadge(Number(method.minAmount || 0))}
                      </span>
                    </div>
                    <p className="line-clamp-2 min-h-[1.8rem] text-[10px] font-semibold leading-4 text-white sm:min-h-0 sm:text-xs lg:text-sm">
                      {method.name}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400 sm:mt-1 sm:text-[11px]">
                      {pageCopy.fee}: {Number(method.feePercent || 0).toFixed(2)}%
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

            <div className="hidden xl:flex xl:flex-col xl:justify-between xl:rounded-[20px] xl:border xl:border-white/10 xl:bg-white/[0.04] xl:p-3.5">
              <div className="text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  {pageCopy.quickDeposit}
                </div>
                <h3 className="mt-2 text-base font-black text-white">{pageCopy.quickTipsTitle}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-400 sm:text-sm">
                  {pageCopy.quickTipsDescription}
                </p>
              </div>

              <div className="mt-2.5 space-y-2">
                <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2 text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold">{pageCopy.chooseMethodStep}</span>
                  </div>
                </div>
                <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2 text-slate-200">
                    <WalletCards className="h-4 w-4" />
                    <span className="text-sm font-semibold">{pageCopy.copyAddressStep}</span>
                  </div>
                </div>
                <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2 text-emerald-200">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-semibold">{pageCopy.safeRequestStep}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 rounded-[14px] border border-dashed border-white/12 bg-white/[0.03] px-3.5 py-3 text-center text-xs text-slate-300 sm:text-sm lg:text-right">
            {pageCopy.depositHint}
          </div>

          <form onSubmit={handleTopUp} className="hidden">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">{pageCopy.paymentAddress}</label>
                <div className="flex items-start gap-2 rounded-[18px] border border-white/10 bg-white/[0.035] px-3 py-2.5 text-xs text-slate-200 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                  <div className="min-w-0 flex-1 break-all">
                    {paymentAddress || pageCopy.noAddress}
                  </div>
                  {paymentAddress ? (
                    <CopyButton
                      value={paymentAddress}
                      label={pageCopy.copyAddressLabel(selectedMethod?.name || 'payment')}
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

            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">{pageCopy.amountAfterFees}</label>
                <div className="rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm text-slate-200 sm:rounded-2xl sm:px-4 sm:py-3">
                  ${amountAfterFee.toFixed(2)}
                  <span className="ml-2 text-[10px] text-slate-400 sm:text-[11px]">{pageCopy.fee}: {feePercent.toFixed(2)}%</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 sm:mb-2 sm:text-sm">{pageCopy.receiptOptional}</label>
                <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-white/[0.045] px-3 py-3 text-xs text-slate-300 hover:border-cyan-400/40 sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-sm">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleProofUpload(e.target.files?.[0])}
                  />
                  {proofName || pageCopy.uploadReceipt}
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
            eyebrow={pageCopy.searchEyebrow}
            title={pageCopy.findActivity}
            description={pageCopy.searchDescription}
          />

          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={pageCopy.searchPlaceholder}
              className={`${mobileInputClass} pl-10`}
            />
          </label>
        </MobilePanel>

        <MobilePanel tone="soft">
          <MobileSectionHeading
            eyebrow={pageCopy.activityEyebrow}
            title={t('wallet.txHistory')}
            description={pageCopy.activityDescription}
          />

          {txns.length === 0 ? (
            <div className="mt-2.5 rounded-[14px] border border-white/10 bg-white/[0.04] p-3.5 text-center sm:rounded-[18px] sm:p-4">
              <p className="text-slate-400">{t('wallet.noTx')}</p>
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className="mt-2.5 rounded-[14px] border border-white/10 bg-white/[0.04] p-3.5 text-center sm:rounded-[18px] sm:p-4">
              <p className="text-slate-400">{pageCopy.noMatchingTransactions}</p>
            </div>
          ) : (
            <div className="mt-2.5 space-y-2">
              {filteredTxns.map((txn) => (
                <div
                  key={txn._id}
                  className="flex flex-col gap-2 rounded-[14px] border border-white/8 bg-white/[0.04] p-2.5 sm:flex-row sm:items-start sm:justify-between sm:rounded-[16px] sm:p-3"
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
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/88 p-2.5 backdrop-blur-sm sm:items-center sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-deposit-modal-title"
          onClick={() => setIsPaymentModalOpen(false)}
        >
          <div
            className="w-full max-w-[21.75rem] overflow-hidden rounded-[18px] border border-[#3a7bff]/22 bg-[linear-gradient(180deg,rgba(6,18,34,0.98),rgba(4,10,22,0.99))] shadow-[0_30px_70px_rgba(2,6,23,0.5)] sm:max-w-[23rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2.5 border-b border-white/8 px-2.5 py-2.5 sm:px-3 sm:py-3">
              <div className="min-w-0 text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">{pageCopy.depositMethod}</p>
                <h2 id="wallet-deposit-modal-title" className="mt-1 text-[0.95rem] font-black text-white sm:text-base">
                  {selectedMethod.name}
                </h2>
                <p className="mt-1 text-[12px] leading-5 text-slate-400">
                  {pageCopy.modalDescription(selectedMethod.name)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300/20 bg-rose-400/[0.09] text-rose-100 shadow-[0_10px_24px_rgba(15,23,42,0.28)] transition hover:border-rose-300/34 hover:bg-rose-400/[0.16] hover:text-white"
                aria-label={pageCopy.closeDepositPopup}
              >
                <X className="h-4 w-4 stroke-[2.7]" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-2.5 py-2.5 sm:px-3 sm:py-3">
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
                      {pageCopy.minBadge(Number(selectedMethod.minAmount || 0))}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-slate-400">
                    {pageCopy.fee}: {Number(selectedMethod.feePercent || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              <form onSubmit={handleTopUp} className="space-y-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-300">{pageCopy.paymentAddress}</label>
                  <div className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm text-slate-200">
                    <div className="min-w-0 flex-1 break-all">
                      {paymentAddress || pageCopy.noAddress}
                    </div>
                    {paymentAddress ? (
                      <CopyButton
                        value={paymentAddress}
                        label={pageCopy.copyAddressLabel(selectedMethod.name)}
                        className="h-8.5 w-8.5 border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-400/25 hover:bg-cyan-500/10 hover:text-cyan-200"
                      />
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-300">{pageCopy.amountLabel}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className={mobileInputClass}
                    placeholder={pageCopy.enterAmount}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-300">{pageCopy.amountAfterFees}</label>
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm text-slate-200">
                    <span className="text-[1.15rem] font-bold text-white">${amountAfterFee.toFixed(2)}</span>
                    <span className="ml-2 text-xs text-slate-400">{pageCopy.fee}: {feePercent.toFixed(2)}%</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-300">{pageCopy.receiptOptional}</label>
                  <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-white/[0.045] px-3 py-2.5 text-sm text-slate-300 transition hover:border-cyan-400/40">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleProofUpload(e.target.files?.[0])}
                    />
                    {proofName || pageCopy.uploadReceipt}
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
