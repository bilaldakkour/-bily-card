'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Headset, Share, ShieldCheck, Truck } from 'lucide-react'
import OrderDetailsModal, { type OrderDetailsItem } from '@/components/shared/OrderDetailsModal'
import { premiumBadgeBase, premiumBadgeTone } from '@/components/ui/badgeSystem'
import type { Product } from '@/lib/data'

interface ProductDetailsProps {
  product: Product
  compact?: boolean
}

const parsePriceFromPackageOption = (source: string, fallbackPrice: number): number => {
  const matches = source.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g)

  if (matches?.length) {
    const last = matches[matches.length - 1]
    const numeric = Number(last.replace(/[^0-9.]/g, ''))
    if (Number.isFinite(numeric)) return numeric
  }

  const looseMatch = source.match(/([0-9][0-9,]*(?:\.[0-9]+)?)/)
  if (looseMatch?.[1]) {
    const numeric = Number(looseMatch[1].replace(/,/g, ''))
    if (Number.isFinite(numeric)) return numeric
  }

  return fallbackPrice
}

const isPackageOptionOutOfStock = (source: string): boolean =>
  /out of stock/i.test(String(source || ''))

const cleanPackageOptionLabel = (source: string): string =>
  String(source || '')
    .replace(/\s*\(out of stock\)\s*/i, '')
    .trim()

export default function ProductDetails({ product, compact = false }: ProductDetailsProps) {
  const router = useRouter()
  const applyMarkup = (basePrice: number, productPct: number, userPct: number) =>
    Number(Math.max(0, Number(basePrice || 0) * (1 + (Number(productPct || 0) - Number(userPct || 0)) / 100)).toFixed(6))

  const groupedChildren = useMemo(
    () => (Array.isArray(product.groupChildren) && product.groupChildren.length ? product.groupChildren : [product]),
    [product]
  )
  const [selectedChildSlug, setSelectedChildSlug] = useState(groupedChildren[0]?.slug || product.slug)

  const safeProduct = useMemo(
    () =>
      (groupedChildren.find((child) => child.slug === selectedChildSlug) || groupedChildren[0] || product) as Product & {
        _id?: string
        id?: string
        description?: string
        shortDescription?: string
        fullDescription?: string
        platform?: string
        startingPrice?: number
        deliveryTime?: string
      },
    [groupedChildren, product, selectedChildSlug]
  )

  const [playerId, setPlayerId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [quantityInput, setQuantityInput] = useState('')
  const [countMode, setCountMode] = useState<'count' | 'budget'>('count')
  const [budgetInput, setBudgetInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [shareNotice, setShareNotice] = useState('')
  const [productPercent, setProductPercent] = useState(0)
  const [userPercent, setUserPercent] = useState(0)
  const [createdOrderDetails, setCreatedOrderDetails] = useState<OrderDetailsItem | null>(null)

  useEffect(() => {
    setSelectedChildSlug(groupedChildren[0]?.slug || product.slug)
  }, [groupedChildren, product.slug])

  const packageField = useMemo(
    () => safeProduct.inputFields?.find((field) => field.type === 'select' && field.name === 'package'),
    [safeProduct.inputFields]
  )

  const countField = useMemo(
    () => safeProduct.inputFields?.find((field) => field.type === 'number' && field.name === 'count'),
    [safeProduct.inputFields]
  )

  const packageOptions = useMemo(() => {
    if (!packageField?.options?.length) return []

    return packageField.options.map((raw) => {
      const source = String(raw)
      const [labelPart] = source.split(' - ')
      const parsedPrice = parsePriceFromPackageOption(source, safeProduct.price)
      const inStock = !isPackageOptionOutOfStock(source)

      return {
        label: cleanPackageOptionLabel(labelPart?.trim() || source),
        display: source,
        price: Number.isFinite(parsedPrice) ? parsedPrice : safeProduct.price,
        inStock,
      }
    })
  }, [packageField?.options, safeProduct.price])

  const pricedPackageOptions = useMemo(
    () =>
      packageOptions.map((option) => ({
        ...option,
        effectivePrice: applyMarkup(option.price, productPercent, userPercent),
      })),
    [packageOptions, productPercent, userPercent]
  )

  const [selectedPackage, setSelectedPackage] = useState<string>('')

  const firstAvailablePackage = useMemo(
    () => pricedPackageOptions.find((option) => option.inStock) || null,
    [pricedPackageOptions]
  )

  const resolvedSelectedPackage =
    pricedPackageOptions.find((option) => option.display === selectedPackage) || firstAvailablePackage || pricedPackageOptions[0]
  const isPackageProduct = pricedPackageOptions.length > 0
  const isCountProduct = !isPackageProduct && Boolean(countField)
  const hasAvailablePackageOptions = !isPackageProduct || pricedPackageOptions.some((option) => option.inStock)
  const selectedPackageInStock = !isPackageProduct || Boolean(resolvedSelectedPackage?.inStock)

  const countMin = countField?.validation?.min ?? 1
  const countMax = countField?.validation?.max

  useEffect(() => {
    if (isCountProduct) {
      setQuantity(countMin)
      setQuantityInput('')
      setCountMode('count')
      setBudgetInput('')
    }
  }, [isCountProduct, countMin])

  useEffect(() => {
    setSelectedPackage('')
    setQuantity(1)
    setQuantityInput('')
    setCountMode('count')
    setBudgetInput('')
    setError('')
    setSuccess(false)
    setSuccessMessage('')
    setCreatedOrderDetails(null)
  }, [safeProduct.slug])

  useEffect(() => {
    if (!isPackageProduct) return

    if (resolvedSelectedPackage?.inStock && selectedPackage === resolvedSelectedPackage.display) {
      return
    }

    setSelectedPackage(firstAvailablePackage?.display || '')
  }, [
    firstAvailablePackage,
    isPackageProduct,
    resolvedSelectedPackage?.display,
    resolvedSelectedPackage?.inStock,
    selectedPackage,
  ])

  useEffect(() => {
    if (!shareNotice) return

    const timeout = window.setTimeout(() => {
      setShareNotice('')
    }, 2400)

    return () => window.clearTimeout(timeout)
  }, [shareNotice])

  const parsedInputQuantity = Number(quantityInput)
  const effectiveDisplayQuantity =
    Number.isFinite(parsedInputQuantity) && parsedInputQuantity > 0
      ? parsedInputQuantity
      : 0
  const parsedBudgetValue = Number(budgetInput)

  const unitPrice = isPackageProduct
    ? (resolvedSelectedPackage?.price ?? safeProduct.price)
    : safeProduct.price

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')

    const loadPricing = async () => {
      try {
        const slug = encodeURIComponent(String(safeProduct.slug || ''))
        const res = await fetch(`/api/pricing/effective?slug=${slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
        })

        const data = await res.json()
        if (!res.ok || !data?.success) return

        setProductPercent(Number(data.data?.productPercent || 0))
        setUserPercent(Number(data.data?.userPercent || 0))
      } catch {
        setProductPercent(0)
        setUserPercent(0)
      }
    }

    void loadPricing()
  }, [safeProduct.slug])

  const effectiveUnitPrice = applyMarkup(unitPrice, productPercent, userPercent)
  const isInstantDelivery =
    String(safeProduct.deliveryTime || '').toLowerCase().includes('instant') ||
    String(safeProduct.deliveryTime || '').toLowerCase().includes('auto')

  const productDescription = safeProduct.description || ''
  const rawBudgetQuantity =
    Number.isFinite(parsedBudgetValue) && parsedBudgetValue > 0 && effectiveUnitPrice > 0
      ? Math.floor(parsedBudgetValue / effectiveUnitPrice)
      : 0
  const budgetBasedQuantity = typeof countMax === 'number'
    ? Math.min(rawBudgetQuantity, countMax)
    : rawBudgetQuantity
  const resolvedCountQuantity =
    isCountProduct && countMode === 'budget' ? budgetBasedQuantity : effectiveDisplayQuantity
  const totalPrice = effectiveUnitPrice * (isCountProduct ? resolvedCountQuantity : 1)
  const descriptionText =
    safeProduct.shortDescription ||
    safeProduct.fullDescription ||
    product.fullDescription ||
    productDescription ||
    ''

  const handleBuyNow = () => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    if (playerId.trim().length < 3) {
      setError('يرجى إدخال معرف لاعب صحيح')
      return
    }

    if (quantity < 1) {
      setError('يجب أن تكون الكمية 1 على الأقل')
      return
    }

    if (isPackageProduct) {
      if (!hasAvailablePackageOptions) {
        setError('هذا المنتج غير متوفر حالياً.')
        return
      }

      if (!resolvedSelectedPackage || !resolvedSelectedPackage.inStock) {
        setError('يرجى اختيار باقة متاحة.')
        return
      }
    }

    if (isCountProduct) {
      if (countMode === 'count') {
        if (!quantityInput.trim() || !Number.isFinite(parsedInputQuantity) || parsedInputQuantity < 1) {
          setError('يرجى إدخال عدد صحيح')
          return
        }

        if (parsedInputQuantity < countMin) {
          setError(`يجب أن يكون العدد على الأقل ${countMin}`)
          return
        }

        if (typeof countMax === 'number' && parsedInputQuantity > countMax) {
          setError(`يجب ألا يتجاوز العدد ${countMax}`)
          return
        }

        setQuantity(parsedInputQuantity)
      } else {
        if (!budgetInput.trim() || !Number.isFinite(parsedBudgetValue) || parsedBudgetValue <= 0) {
          setError('يرجى إدخال مبلغ صحيح')
          return
        }

        if (budgetBasedQuantity < countMin) {
          setError(`المبلغ لا يكفي للحد الأدنى (${countMin})`)
          return
        }

        setQuantity(budgetBasedQuantity)
      }
    }

    if (!(safeProduct._id || safeProduct.id)) {
      setError('معرف المنتج غير متوفر')
      return
    }

    setError('')
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      setShowConfirm(false)
      router.push('/login')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: safeProduct._id || safeProduct.id,
          slug: safeProduct.slug,
          name: safeProduct.name,
          price: unitPrice,
          playerId: playerId.trim(),
          packageOption: isPackageProduct ? resolvedSelectedPackage?.display : undefined,
          quantity: isCountProduct ? resolvedCountQuantity : 1,
          total: totalPrice,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'تعذر إنشاء الطلب')
      }

      setShowConfirm(false)
      setSuccess(true)
      setSuccessMessage(`تم إنشاء الطلب بنجاح! Order ID: ${data.orderId}`)
      setCreatedOrderDetails(
        data?.data?.order || {
          _id: String(data.orderId || `${safeProduct.slug}-${Date.now()}`),
          orderId: String(data.orderId || ''),
          productName: safeProduct.name,
          productSlug: safeProduct.slug,
          productImage: safeProduct.image,
          playerId: playerId.trim(),
          quantity: isCountProduct ? resolvedCountQuantity : 1,
          price: effectiveUnitPrice,
          total: totalPrice,
          status: 'pending',
          providerStatus: String(data.providerStatus || 'pending'),
          selectedPackageOption: isPackageProduct
            ? resolvedSelectedPackage?.label || resolvedSelectedPackage?.display || ''
            : '',
          createdAt: new Date().toISOString(),
          notes: String(data.message || 'تم إنشاء الطلب بنجاح'),
        }
      )
      setPlayerId('')
      setQuantity(countMin)
      setQuantityInput('')
      setCountMode('count')
      setBudgetInput('')

      setTimeout(() => {
        setSuccess(false)
        setSuccessMessage('')
      }, 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء الطلب')
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: safeProduct.name,
          text: descriptionText,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        setShareNotice('تم نسخ الرابط بنجاح.')
      }
    } catch (shareError) {
      console.error(shareError)
    }
  }

  if (compact) {
    return (
      <main className="text-white">
        <div className="mx-auto max-w-[44rem]">
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-3 sm:rounded-[24px] sm:p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.08),transparent_30%)]" />
            <img
              src={safeProduct.image}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
            />

            <div className="relative z-10 space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                <div className="min-w-0">
                  {safeProduct.platform && (
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300">
                      {safeProduct.platform}
                    </p>
                  )}
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className={`${premiumBadgeBase} ${hasAvailablePackageOptions ? premiumBadgeTone.available : 'border-rose-300/24 bg-rose-500/12 text-rose-100'}`}>
                      {hasAvailablePackageOptions ? 'متوفر' : 'غير متوفر'}
                    </span>
                    <span className={`${premiumBadgeBase} ${premiumBadgeTone.instant}`}>
                      {isInstantDelivery ? 'فوري' : 'سريع'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="h-7 w-1 rounded-full bg-amber-400" />
                    <h1 className="text-lg font-bold leading-tight text-white sm:text-xl">{safeProduct.name}</h1>
                  </div>
                </div>
              </div>

              {descriptionText && (
                <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-xs leading-6 text-slate-300 sm:text-sm">{descriptionText}</p>
                </div>
              )}

              <div className="space-y-2.5 rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-3">
                {groupedChildren.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">الخيارات المتاحة</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {groupedChildren.map((child) => {
                        const active = child.slug === safeProduct.slug
                        return (
                          <button
                            key={child.slug}
                            type="button"
                            onClick={() => setSelectedChildSlug(child.slug)}
                            className={`rounded-2xl border px-3 py-3 text-left transition ${
                              active
                                ? 'border-cyan-400/50 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(37,99,235,0.2))] text-cyan-50 shadow-[0_12px_30px_rgba(37,99,235,0.16)]'
                                : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/15'
                            }`}
                          >
                            <div className="truncate text-sm font-semibold">{child.name}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">بيانات الحساب</p>
                  <input
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    placeholder="أدخل معرف الحساب"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.92] px-4 py-3 text-right text-slate-900 placeholder-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {isPackageProduct && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">اختر الباقة</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {pricedPackageOptions.map((option) => {
                        const active = option.display === (resolvedSelectedPackage?.display || '')
                        return (
                      <button
                            key={option.display}
                            type="button"
                            onClick={() => {
                              if (!option.inStock) return
                              setSelectedPackage(option.display)
                            }}
                            disabled={!option.inStock}
                            className={`rounded-2xl border px-3 py-3 text-left transition ${
                              active
                                ? 'border-cyan-400/50 bg-[linear-gradient(135deg,rgba(14,165,233,0.96),rgba(37,99,235,0.96))] text-white shadow-[0_12px_30px_rgba(37,99,235,0.2)]'
                                : option.inStock
                                  ? 'border-white/10 bg-white/[0.08] text-slate-200 hover:border-white/15'
                                  : 'cursor-not-allowed border-red-400/20 bg-red-500/[0.08] text-slate-500 opacity-70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="line-clamp-2 text-sm font-semibold">{option.label}</div>
                              {!option.inStock && (
                                <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">
                                  غير متاح
                                </span>
                              )}
                            </div>
                            <div className={`mt-1 text-[11px] ${active ? 'text-amber-50/85' : option.inStock ? 'text-slate-400' : 'text-red-200/70'}`}>
                              ${option.effectivePrice.toFixed(2)}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {!hasAvailablePackageOptions && (
                      <p className="text-sm text-red-300">
                        كل الباقات غير متوفرة حالياً لهذا المنتج.
                      </p>
                    )}
                  </div>
                )}

                {isCountProduct && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCountMode('count')}
                        className={`rounded-2xl border px-4 py-3 text-center transition ${
                          countMode === 'count'
                            ? 'border-cyan-400/25 font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.18)]'
                            : 'border-white/10 bg-white/[0.88] text-slate-800'
                        }`}
                        style={countMode === 'count' ? { background: 'linear-gradient(135deg, rgba(14,165,233,0.96), rgba(37,99,235,0.96))' } : undefined}
                      >
                        يعتمد على العدد
                      </button>
                      <button
                        type="button"
                        onClick={() => setCountMode('budget')}
                        className={`rounded-2xl border px-4 py-3 text-center transition ${
                          countMode === 'budget'
                            ? 'border-cyan-400/25 font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.18)]'
                            : 'border-white/10 bg-white/[0.88] text-slate-800'
                        }`}
                        style={countMode === 'budget' ? { background: 'linear-gradient(135deg, rgba(14,165,233,0.96), rgba(37,99,235,0.96))' } : undefined}
                      >
                        حسب السعر
                      </button>
                    </div>

                    {countMode === 'count' ? (
                      <>
                        <input
                          type="number"
                          min={countMin}
                          max={countMax}
                          value={quantityInput}
                          placeholder={`الحد الأدنى ${countMin}`}
                          onChange={(e) => {
                            const next = e.target.value
                            if (next === '') {
                              setQuantityInput('')
                              return
                            }

                            if (/^\d+$/.test(next)) {
                              setQuantityInput(next)
                            }
                          }}
                          onBlur={() => {
                            if (!quantityInput.trim()) return
                            let next = Number(quantityInput)
                            if (!Number.isFinite(next) || next < 1) {
                              setQuantityInput(String(countMin))
                              return
                            }
                            if (next < countMin) next = countMin
                            if (typeof countMax === 'number' && next > countMax) next = countMax
                            setQuantityInput(String(next))
                          }}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.95] px-4 py-3 text-right text-slate-900 focus:border-cyan-400 focus:outline-none"
                        />

                        {(typeof countMax === 'number' || countMin > 1) && (
                          <p className="text-right text-xs text-slate-400">
                            الكمية ({countMin}{typeof countMax === 'number' ? ` - ${countMax}` : '+'})
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          min={1}
                          step="any"
                          value={budgetInput}
                          onChange={(e) => {
                            const next = e.target.value
                            if (next === '') {
                              setBudgetInput('')
                              return
                            }
                            if (/^\d*\.?\d*$/.test(next)) {
                              setBudgetInput(next)
                            }
                          }}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.95] px-4 py-3 text-right text-slate-900 focus:border-cyan-400 focus:outline-none"
                          placeholder="أدخل المبلغ"
                        />
                        <p className="text-right text-xs text-slate-400">
                          هذا المبلغ يعطيك {budgetBasedQuantity || 0} وحدة تقريباً
                        </p>
                      </>
                    )}
                  </>
                )}

                <div className="rounded-2xl border border-cyan-400/10 bg-cyan-500/[0.06] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">إجمالي الطلب</p>
                      <p className="mt-1 text-xs text-slate-400">كل تفاصيل المنتج واضحة داخل النافذة.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-white">${totalPrice.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">{safeProduct.deliveryTime || 'تسليم فوري'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {successMessage || 'تم إنشاء الطلب بنجاح'}
                </div>
              )}

              {shareNotice && (
                <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
                  {shareNotice}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleShare}
                  className="rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2.5 text-slate-200 transition-colors hover:bg-white/[0.14]"
                  title="مشاركة المنتج"
                >
                  <Share className="h-4 w-4" />
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={loading || !hasAvailablePackageOptions}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.98), rgba(37,99,235,0.98))' }}
                >
                  {loading ? 'جاري المعالجة...' : 'اشحن الآن'}
                </button>
              </div>

              <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">لماذا تختارنا</p>
                <div className="mt-2 grid gap-1.5 text-xs text-slate-200 sm:grid-cols-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/18 bg-cyan-500/10 px-2 py-1">
                    <Truck className="h-3 w-3 text-cyan-200" />
                    تسليم فوري
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/18 bg-emerald-500/10 px-2 py-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-200" />
                    دفع آمن
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/18 bg-sky-500/10 px-2 py-1">
                    <Headset className="h-3 w-3 text-sky-200" />
                    دعم سريع
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compact-confirm-order-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8">
              <h2 id="compact-confirm-order-title" className="mb-6 text-center text-2xl font-bold">
                تأكيد الطلب
              </h2>

              <div className="mb-6 space-y-4">
                <div className="space-y-2 rounded-lg bg-slate-800/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">المنتج</span>
                    <span className="font-medium text-white">{safeProduct.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">الكمية</span>
                    <span className="font-medium text-white">{isCountProduct ? resolvedCountQuantity : 1}</span>
                  </div>
                  {isPackageProduct && resolvedSelectedPackage && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">الباقة</span>
                      <span className="font-medium text-white">{resolvedSelectedPackage.label}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">الحساب</span>
                    <span className="font-medium text-white">{playerId}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-2">
                    <span className="font-semibold text-slate-300">الإجمالي</span>
                    <span className="text-lg font-bold text-cyan-400">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 font-semibold transition-colors hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || !hasAvailablePackageOptions || !selectedPackageInStock}
                  className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'جاري المعالجة...' : (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      تأكيد
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <OrderDetailsModal
          order={createdOrderDetails}
          open={Boolean(createdOrderDetails)}
          onClose={() => setCreatedOrderDetails(null)}
        />
      </main>
    )
  }

  return (
    <main className="text-white">
      <div className="mx-auto grid max-w-[70rem] gap-3.5 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
        <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] p-3 shadow-[0_20px_50px_rgba(2,6,23,0.22)] sm:p-4">
          <img
            src={safeProduct.image}
            alt={safeProduct.name}
            className="aspect-[4/3] max-h-[360px] w-full rounded-[16px] object-cover"
          />
        </div>

        <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,32,0.92),rgba(4,10,22,0.98))] p-4 shadow-[0_20px_50px_rgba(2,6,23,0.22)] sm:p-5">
          {safeProduct.platform && (
            <p className="mb-2 text-xs uppercase tracking-[0.32em] text-cyan-300">
              {safeProduct.platform}
            </p>
          )}

          <h1 className="mb-2.5 text-xl font-bold sm:text-2xl md:text-[1.9rem]">{safeProduct.name}</h1>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`${premiumBadgeBase} ${hasAvailablePackageOptions ? premiumBadgeTone.available : 'border-rose-300/24 bg-rose-500/12 text-rose-100'}`}>
              {hasAvailablePackageOptions ? 'متوفر' : 'غير متوفر'}
            </span>
            <span className={`${premiumBadgeBase} ${premiumBadgeTone.instant}`}>
              {isInstantDelivery ? 'فوري' : 'سريع'}
            </span>
          </div>

          <p className="mb-4 max-w-3xl text-sm leading-6 text-slate-300">
            {safeProduct.fullDescription || product.fullDescription || productDescription}
          </p>

          <div className="mb-4 rounded-[18px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.24))] p-3.5 sm:p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-400">يبدأ من</p>
            <div className="flex items-baseline gap-3">
              <div className="text-2xl font-bold sm:text-3xl">${effectiveUnitPrice.toFixed(2)}</div>
              {safeProduct.startingPrice && safeProduct.startingPrice > safeProduct.price && (
                <div className="text-lg text-slate-500 line-through">
                  ${safeProduct.startingPrice.toFixed(2)}
                </div>
              )}
            </div>
            {safeProduct.deliveryTime && (
              <p className="mt-2 text-xs text-slate-400">التسليم: {safeProduct.deliveryTime}</p>
            )}
          </div>

          <div className="space-y-3">
            {groupedChildren.length > 1 && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">الخيارات المتاحة</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {groupedChildren.map((child) => {
                    const active = child.slug === safeProduct.slug
                    const isPackageChild = child.inputFields?.some(
                      (field) => field.name === 'package' && field.type === 'select'
                    )
                    const isCountChild = child.inputFields?.some(
                      (field) => field.name === 'count' && field.type === 'number'
                    )

                    return (
                      <button
                        key={child.slug}
                        type="button"
                        onClick={() => setSelectedChildSlug(child.slug)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? 'border-cyan-400/60 bg-cyan-500/12 text-cyan-100 shadow-[0_10px_30px_rgba(6,182,212,0.12)]'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{child.name}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {isPackageChild ? 'خيارات الباقات' : isCountChild ? 'حسب العدد' : 'خيار فردي'}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-cyan-300">
                            ${Number(child.startingPrice ?? child.price).toFixed(2)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">معرف اللاعب / الحساب</label>
              <input
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="أدخل معرف اللاعب أو الحساب"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {isPackageProduct && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">اختر الباقة</label>
                <div className="grid grid-cols-2 gap-2">
                  {pricedPackageOptions.map((option) => {
                    const active = option.display === (resolvedSelectedPackage?.display || '')
                    return (
                      <button
                        key={option.display}
                        type="button"
                        onClick={() => {
                          if (!option.inStock) return
                          setSelectedPackage(option.display)
                        }}
                        disabled={!option.inStock}
                        className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                          active
                            ? 'border-cyan-400/60 bg-cyan-500/12 text-cyan-100 shadow-[0_10px_30px_rgba(6,182,212,0.12)]'
                            : option.inStock
                              ? 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-500/40'
                              : 'cursor-not-allowed border-red-400/20 bg-red-500/[0.08] text-slate-500 opacity-70'
                        }`}
                      >
                        <div className={`text-xs ${option.inStock ? 'text-slate-400' : 'text-red-200/70'}`}>الباقة</div>
                        <div className="truncate text-sm font-semibold">{option.label}</div>
                        <div className={`mt-1 text-sm ${option.inStock ? 'text-cyan-300' : 'text-red-200/80'}`}>
                          ${option.effectivePrice.toFixed(2)}
                        </div>
                        {!option.inStock && (
                          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-red-200">
                            غير متوفر
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {!hasAvailablePackageOptions && (
                  <p className="mt-2 text-sm text-red-300">
                    كل الباقات غير متوفرة حالياً لهذا المنتج.
                  </p>
                )}
              </div>
            )}

            {isCountProduct && (
              <div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCountMode('count')}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      countMode === 'count'
                        ? 'border-cyan-400/60 bg-cyan-500/12 font-semibold text-cyan-100'
                        : 'border-white/10 bg-white/[0.03] text-slate-300'
                    }`}
                  >
                    يعتمد على العدد
                  </button>
                  <button
                    type="button"
                    onClick={() => setCountMode('budget')}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      countMode === 'budget'
                        ? 'border-cyan-400/60 bg-cyan-500/12 font-semibold text-cyan-100'
                        : 'border-white/10 bg-white/[0.03] text-slate-300'
                    }`}
                  >
                    حسب السعر
                  </button>
                </div>

                {countMode === 'count' ? (
                  <>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">العدد</label>
                    <input
                      type="number"
                      min={countMin}
                      max={countMax}
                      value={quantityInput}
                      placeholder={`الحد الأدنى ${countMin}`}
                      onChange={(e) => {
                        const next = e.target.value
                        if (next === '') {
                          setQuantityInput('')
                          return
                        }
                        if (/^\d+$/.test(next)) {
                          setQuantityInput(next)
                        }
                      }}
                      onBlur={() => {
                        if (!quantityInput.trim()) return
                        let next = Number(quantityInput)
                        if (!Number.isFinite(next) || next < 1) {
                          setQuantityInput(String(countMin))
                          return
                        }
                        if (next < countMin) next = countMin
                        if (typeof countMax === 'number' && next > countMax) next = countMax
                        setQuantityInput(String(next))
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                    />
                    {(typeof countMax === 'number' || countMin > 1) && (
                      <p className="mt-2 text-xs text-slate-400">
                        النطاق المسموح: {countMin}{typeof countMax === 'number' ? ` - ${countMax}` : '+'}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">السعر</label>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={budgetInput}
                      onChange={(e) => {
                        const next = e.target.value
                        if (next === '') {
                          setBudgetInput('')
                          return
                        }
                        if (/^\d*\.?\d*$/.test(next)) {
                          setBudgetInput(next)
                        }
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                      placeholder="أدخل المبلغ"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      بهذا المبلغ تحصل على {budgetBasedQuantity || 0} وحدة تقريباً
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3.5 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">السعر الإجمالي:</span>
                <span className="text-xl font-bold text-cyan-400">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {successMessage || 'تم إنشاء الطلب بنجاح'}
            </div>
          )}

          {shareNotice && (
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
              {shareNotice}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleBuyNow}
              disabled={loading || !hasAvailablePackageOptions}
              className="flex-1 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'جاري المعالجة...' : hasAvailablePackageOptions ? 'اشترِ الآن' : 'غير متوفر حالياً'}
            </button>
            <button
              onClick={handleShare}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.08]"
              title="مشاركة المنتج"
            >
              <Share className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">لماذا تختارنا</p>
            <div className="mt-2 grid gap-1.5 text-xs text-slate-200 sm:grid-cols-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/18 bg-cyan-500/10 px-2 py-1">
                <Truck className="h-3 w-3 text-cyan-200" />
                تسليم فوري
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/18 bg-emerald-500/10 px-2 py-1">
                <ShieldCheck className="h-3 w-3 text-emerald-200" />
                دفع آمن
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/18 bg-sky-500/10 px-2 py-1">
                <Headset className="h-3 w-3 text-sky-200" />
                دعم سريع
              </span>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-order-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8">
            <h2 id="confirm-order-title" className="mb-6 text-center text-2xl font-bold">
              تأكيد الطلب
            </h2>

            <div className="mb-6 space-y-4">
              <div className="space-y-2 rounded-lg bg-slate-800/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">المنتج</span>
                  <span className="font-medium text-white">{safeProduct.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">الكمية</span>
                  <span className="font-medium text-white">{isCountProduct ? resolvedCountQuantity : 1}</span>
                </div>
                {isPackageProduct && resolvedSelectedPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">الباقة</span>
                    <span className="font-medium text-white">{resolvedSelectedPackage.label}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">الحساب</span>
                  <span className="font-medium text-white">{playerId}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-white/10 pt-2">
                  <span className="font-semibold text-slate-300">الإجمالي</span>
                  <span className="text-lg font-bold text-cyan-400">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 font-semibold transition-colors hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !hasAvailablePackageOptions || !selectedPackageInStock}
                className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'جاري المعالجة...' : (
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    تأكيد
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <OrderDetailsModal
        order={createdOrderDetails}
        open={Boolean(createdOrderDetails)}
        onClose={() => setCreatedOrderDetails(null)}
      />
    </main>
  )
}

