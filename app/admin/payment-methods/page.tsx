'use client'

import { useEffect, useState } from 'react'

type PaymentMethod = {
  key: string
  name: string
  address: string
  logoUrl: string
  minAmount: number
  feePercent: number
  active: boolean
}

function toKey(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateUniqueKey(base: string, existing: Set<string>): string {
  const normalizedBase = toKey(base) || `method-${Date.now().toString(36)}`
  if (!existing.has(normalizedBase)) return normalizedBase

  let counter = 2
  while (existing.has(`${normalizedBase}-${counter}`)) {
    counter += 1
  }

  return `${normalizedBase}-${counter}`
}

function createEmptyMethod(existingKeys: Set<string>): PaymentMethod {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

  const key = generateUniqueKey(`method-${randomPart}`, existingKeys)

  return {
    key,
    name: '',
    address: '',
    logoUrl: '',
    minAmount: 0,
    feePercent: 0,
    active: true,
  }
}

export default function AdminPaymentMethodsPage() {
  const [token, setToken] = useState('')
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken') || ''
    setToken(storedToken)

    if (!storedToken) {
      window.location.href = '/admin/login'
      return
    }

    const loadMethods = async () => {
      try {
        const res = await fetch('/api/admin/payment-methods', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
          cache: 'no-store',
        })

        const data = await res.json()
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || 'Failed to load payment methods')
        }

        setMethods(Array.isArray(data?.data) ? data.data : [])
      } catch (error: any) {
        setMessage(error?.message || 'Failed to load payment methods')
      } finally {
        setLoading(false)
      }
    }

    void loadMethods()
  }, [])

  const updateMethod = (index: number, field: keyof PaymentMethod, value: string | boolean) => {
    setMethods((prev) =>
      prev.map((method, idx) => {
        if (idx !== index) return method

        if (field === 'active') {
          return { ...method, active: Boolean(value) }
        }

        if (field === 'minAmount' || field === 'feePercent') {
          return { ...method, [field]: Number(value) || 0 }
        }

        return { ...method, [field]: String(value) }
      })
    )
  }

  const addMethod = () => {
    setMethods((prev) => {
      const existingKeys = new Set(prev.map((item) => toKey(item.key)).filter(Boolean))
      return [...prev, createEmptyMethod(existingKeys)]
    })
    setMessage('New payment method added. Fill the fields and click Save Changes.')
  }

  const removeMethod = (index: number) => {
    setMethods((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage('')

      const usedKeys = new Set<string>()
      const normalizedMethods = methods.map((method, index) => {
        const rawKey = toKey(method.key) || toKey(method.name) || `method-${Date.now().toString(36)}-${index + 1}`
        const uniqueKey = generateUniqueKey(rawKey, usedKeys)
        usedKeys.add(uniqueKey)

        return {
          ...method,
          key: uniqueKey,
        }
      })

      const res = await fetch('/api/admin/payment-methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethods: normalizedMethods }),
      })

      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to save payment methods')
      }

      setMethods(Array.isArray(data?.data) ? data.data : methods)
      setMessage('Saved successfully')
    } catch (error: any) {
      setMessage(error?.message || 'Failed to save payment methods')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-slate-300">Loading payment methods...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
          <p className="text-slate-400">Control logos, addresses and fees shown in wallet top-up.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addMethod}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
          >
            Add Payment Method
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      )}

      <div className="grid gap-4">
        {methods.map((method, index) => (
          <div key={`${method.key}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {method.name || `Payment Method ${index + 1}`}
              </h2>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={method.active}
                    onChange={(e) => updateMethod(index, 'active', e.target.checked)}
                  />
                  Active
                </label>

                <button
                  type="button"
                  onClick={() => removeMethod(index)}
                  className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                Key
                <input
                  value={method.key}
                  onChange={(e) => updateMethod(index, 'key', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </label>

              <label className="text-sm text-slate-300">
                Name
                <input
                  value={method.name}
                  onChange={(e) => updateMethod(index, 'name', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </label>

              <label className="text-sm text-slate-300">
                Logo URL
                <input
                  value={method.logoUrl}
                  onChange={(e) => updateMethod(index, 'logoUrl', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </label>

              <label className="text-sm text-slate-300 md:col-span-2">
                Payment Address
                <input
                  value={method.address}
                  onChange={(e) => updateMethod(index, 'address', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </label>

              <label className="text-sm text-slate-300">
                Min Amount (USD)
                <input
                  type="number"
                  step="0.01"
                  value={method.minAmount}
                  onChange={(e) => updateMethod(index, 'minAmount', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </label>

              <label className="text-sm text-slate-300">
                Fee (%)
                <input
                  type="number"
                  step="0.01"
                  value={method.feePercent}
                  onChange={(e) => updateMethod(index, 'feePercent', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
