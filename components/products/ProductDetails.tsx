'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Share } from 'lucide-react'
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

export default function ProductDetails({ product, compact = false }: ProductDetailsProps) {
  const router = useRouter()
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
  const [quantityInput, setQuantityInput] = useState('1')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [productPercent, setProductPercent] = useState(0)
  const [userPercent, setUserPercent] = useState(0)

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

      return {
        label: labelPart?.trim() || source,
        display: source,
        price: Number.isFinite(parsedPrice) ? parsedPrice : safeProduct.price,
      }
    })
  }, [packageField?.options, safeProduct.price])

  const [selectedPackage, setSelectedPackage] = useState<string>('')

  const resolvedSelectedPackage = packageOptions.find((option) => option.display === selectedPackage) || packageOptions[0]
  const isPackageProduct = packageOptions.length > 0
  const isCountProduct = !isPackageProduct && Boolean(countField)

  const countMin = countField?.validation?.min ?? 1
  const countMax = countField?.validation?.max

  useEffect(() => {
    if (isCountProduct) {
      setQuantity(countMin)
      setQuantityInput(String(countMin))
    }
  }, [isCountProduct, countMin])

  useEffect(() => {
    setSelectedPackage('')
    setQuantity(1)
    setQuantityInput('1')
    setError('')
    setSuccess(false)
    setSuccessMessage('')
  }, [safeProduct.slug])

  const parsedInputQuantity = Number(quantityInput)
  const effectiveDisplayQuantity =
    Number.isFinite(parsedInputQuantity) && parsedInputQuantity > 0
      ? parsedInputQuantity
      : countMin

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

  const effectiveUnitPrice = Number(
    Math.max(0, unitPrice * (1 + (productPercent + userPercent) / 100)).toFixed(6)
  )

  const productDescription = safeProduct.description || ''
  const totalPrice = effectiveUnitPrice * (isCountProduct ? effectiveDisplayQuantity : 1)
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
      setError('Please enter a valid Player ID')
      return
    }

    if (quantity < 1) {
      setError('Quantity must be at least 1')
      return
    }

    if (isCountProduct) {
      if (!quantityInput.trim() || !Number.isFinite(parsedInputQuantity) || parsedInputQuantity < 1) {
        setError('Please enter a valid count')
        return
      }

      if (parsedInputQuantity < countMin) {
        setError(`Count must be at least ${countMin}`)
        return
      }

      if (typeof countMax === 'number' && parsedInputQuantity > countMax) {
        setError(`Count must be at most ${countMax}`)
        return
      }

      setQuantity(parsedInputQuantity)
    }

    if (!(safeProduct._id || safeProduct.id)) {
      setError('Product ID is missing')
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
          quantity: isCountProduct ? effectiveDisplayQuantity : 1,
          packageOption: isPackageProduct ? resolvedSelectedPackage?.display : undefined,
          total: totalPrice,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create order')
      }

      setShowConfirm(false)
      setSuccess(true)
      setSuccessMessage(`Order created successfully! Order ID: ${data.orderId}`)
      setPlayerId('')
      setQuantity(countMin)
      setQuantityInput(String(countMin))

      setTimeout(() => {
        setSuccess(false)
        setSuccessMessage('')
      }, 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
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
        alert('Link copied')
      }
    } catch (shareError) {
      console.error(shareError)
    }
  }

  if (compact) {
    return (
      <main className="text-white">
        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 sm:rounded-[26px] sm:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.08),transparent_30%)]" />
            <img
              src={safeProduct.image}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
            />

            <div className="relative z-10 space-y-4">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <div className="min-w-0">
                  {safeProduct.platform && (
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300">
                      {safeProduct.platform}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-1 rounded-full bg-amber-400" />
                    <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">{product.name}</h1>
                  </div>
                </div>
              </div>

              {descriptionText && (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3.5">
                  <p className="text-sm leading-7 text-slate-300">{descriptionText}</p>
                </div>
              )}

              <div className="space-y-3 rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4">
                {groupedChildren.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Available Options</p>
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
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Account Details</p>
                  <input
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    placeholder="Enter account ID"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.92] px-4 py-3 text-right text-slate-900 placeholder-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {isPackageProduct && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Choose Package</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {packageOptions.map((option) => {
                        const active = option.display === (resolvedSelectedPackage?.display || '')
                        return (
                          <button
                            key={option.display}
                            type="button"
                            onClick={() => setSelectedPackage(option.display)}
                            className={`rounded-2xl border px-3 py-3 text-left transition ${
                              active
                                ? 'border-cyan-400/50 bg-[linear-gradient(135deg,rgba(14,165,233,0.96),rgba(37,99,235,0.96))] text-white shadow-[0_12px_30px_rgba(37,99,235,0.2)]'
                                : 'border-white/10 bg-white/[0.08] text-slate-200 hover:border-white/15'
                            }`}
                          >
                            <div className="line-clamp-2 text-sm font-semibold">{option.label}</div>
                            <div className={`mt-1 text-xs ${active ? 'text-amber-50/85' : 'text-slate-400'}`}>
                              ${option.price.toFixed(2)}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {isCountProduct && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.88] px-4 py-3 text-center text-slate-800">
                        Count Based
                      </div>
                      <div
                        className="rounded-2xl border border-cyan-400/25 px-4 py-3 text-center font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.18)]"
                        style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.96), rgba(37,99,235,0.96))' }}
                      >
                        حسب الكمية
                      </div>
                    </div>

                    <input
                      type="number"
                      min={countMin}
                      max={countMax}
                      value={quantityInput}
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
                )}

                <div className="rounded-2xl border border-cyan-400/10 bg-cyan-500/[0.06] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Order Total</p>
                      <p className="mt-1 text-xs text-slate-400">All product information is shown clearly inside the popup.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white">${totalPrice.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">{safeProduct.deliveryTime || 'Instant delivery'}</p>
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
                  {successMessage || 'Order created successfully'}
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleShare}
                  className="rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 text-slate-200 transition-colors hover:bg-white/[0.14]"
                  title="Share this product"
                >
                  <Share className="h-5 w-5" />
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={loading}
                  className="flex-1 rounded-2xl px-6 py-3.5 font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.98), rgba(37,99,235,0.98))' }}
                >
                  {loading ? 'Processing...' : 'اشتر الآن'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8">
              <h2 className="mb-6 text-center text-2xl font-bold">Confirm Order</h2>

              <div className="mb-6 space-y-4">
                <div className="space-y-2 rounded-lg bg-slate-800/50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Product</span>
                    <span className="font-medium text-white">{safeProduct.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Quantity</span>
                    <span className="font-medium text-white">{isCountProduct ? effectiveDisplayQuantity : 1}</span>
                  </div>
                  {isPackageProduct && resolvedSelectedPackage && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Package</span>
                      <span className="font-medium text-white">{resolvedSelectedPackage.label}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Account</span>
                    <span className="font-medium text-white">{playerId}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-2">
                    <span className="font-semibold text-slate-300">Total</span>
                    <span className="text-lg font-bold text-cyan-400">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 font-semibold transition-colors hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="text-white">
      <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.24)] sm:p-5">
          <img
            src={safeProduct.image}
            alt={safeProduct.name}
            className="aspect-square w-full rounded-[22px] object-cover"
          />
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,32,0.92),rgba(4,10,22,0.98))] p-5 shadow-[0_24px_70px_rgba(2,6,23,0.24)] sm:p-6">
          {safeProduct.platform && (
            <p className="mb-2 text-xs uppercase tracking-[0.32em] text-cyan-300">
              {safeProduct.platform}
            </p>
          )}

          <h1 className="mb-3 text-2xl font-bold sm:text-3xl md:text-[2.4rem]">{product.name}</h1>

          <p className="mb-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            {safeProduct.fullDescription || product.fullDescription || productDescription}
          </p>

          <div className="mb-6 rounded-[22px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.24))] p-4 sm:p-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.26em] text-slate-400">Starting from</p>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold sm:text-4xl">${effectiveUnitPrice.toFixed(2)}</div>
              {safeProduct.startingPrice && safeProduct.startingPrice > safeProduct.price && (
                <div className="text-lg text-slate-500 line-through">
                  ${safeProduct.startingPrice.toFixed(2)}
                </div>
              )}
            </div>
            {safeProduct.deliveryTime && (
              <p className="mt-2 text-xs text-slate-400">Delivery: {safeProduct.deliveryTime}</p>
            )}
          </div>

          <div className="space-y-4">
            {groupedChildren.length > 1 && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Available Options</label>
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
                              {isPackageChild ? 'Package options' : isCountChild ? 'Count based' : 'Single option'}
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
              <label className="mb-2 block text-sm font-semibold text-slate-200">Player ID / Account</label>
              <input
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Enter your Player ID or Account"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {isPackageProduct && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Choose Package</label>
                <div className="grid grid-cols-2 gap-2">
                  {packageOptions.map((option) => {
                    const active = option.display === (resolvedSelectedPackage?.display || '')
                    return (
                      <button
                        key={option.display}
                        type="button"
                        onClick={() => setSelectedPackage(option.display)}
                        className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                          active
                            ? 'border-cyan-400/60 bg-cyan-500/12 text-cyan-100 shadow-[0_10px_30px_rgba(6,182,212,0.12)]'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="text-xs text-slate-400">Package</div>
                        <div className="truncate text-sm font-semibold">{option.label}</div>
                        <div className="mt-1 text-sm text-cyan-300">${option.price.toFixed(2)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {isCountProduct && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Count</label>
                <input
                  type="number"
                  min={countMin}
                  max={countMax}
                  value={quantityInput}
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
                    Allowed range: {countMin}{typeof countMax === 'number' ? ` - ${countMax}` : '+'}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Price:</span>
                <span className="text-2xl font-bold text-cyan-400">${totalPrice.toFixed(2)}</span>
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
              {successMessage || 'Order created successfully'}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleBuyNow}
              disabled={loading}
              className="flex-1 rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Buy Now'}
            </button>
            <button
              onClick={handleShare}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 transition-colors hover:bg-white/[0.08]"
              title="Share this product"
            >
              <Share className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-8">
            <h2 className="mb-6 text-center text-2xl font-bold">Confirm Order</h2>

            <div className="mb-6 space-y-4">
              <div className="space-y-2 rounded-lg bg-slate-800/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Product</span>
                  <span className="font-medium text-white">{safeProduct.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Quantity</span>
                  <span className="font-medium text-white">{isCountProduct ? effectiveDisplayQuantity : 1}</span>
                </div>
                {isPackageProduct && resolvedSelectedPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Package</span>
                    <span className="font-medium text-white">{resolvedSelectedPackage.label}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Account</span>
                  <span className="font-medium text-white">{playerId}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-white/10 pt-2">
                  <span className="font-semibold text-slate-300">Total</span>
                  <span className="text-lg font-bold text-cyan-400">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 font-semibold transition-colors hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Processing...' : (
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
