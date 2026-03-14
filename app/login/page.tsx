'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthShell from '@/components/shared/AuthShell'
import { Input } from '@/components/ui/Input'
import { useLanguage } from '@/hooks/useLanguage'

export default function LoginPage() {
  const { t, isRTL } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('bilycard_token', data.token)

        localStorage.setItem(
          'bilycard_user_email',
          data?.data?.email || data?.user?.email || email
        )

        localStorage.setItem(
          'bilycard_user_name',
          data?.data?.displayName ||
            data?.data?.username ||
            data?.user?.displayName ||
            data?.user?.username ||
            email.split('@')[0]
        )

        window.dispatchEvent(new Event('bilycard-auth-changed'))
        router.push('/products')
      } else {
        setError(data.message || t('login.failed'))
      }
    } catch (err) {
      setError(t('login.error'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <AuthShell
        title={t('login.title')}
        subtitle="Access your account to manage wallet, orders, and saved products with the same premium storefront experience."
        footer={
          <p className="text-center text-sm text-slate-400">
            {t('login.noAccount')}{' '}
            <Link href="/register" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
              {t('login.register')}
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
              {t('login.email')}
            </label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('login.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
              {t('login.password')}
            </label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-sky-500 disabled:opacity-50"
          >
            {loading ? t('login.loggingIn') : t('login.login')}
          </button>
        </form>
      </AuthShell>
    </div>
  )
}
