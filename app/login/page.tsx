'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/components/shared/AuthShell'
import { Input } from '@/components/ui/Input'
import { useLanguage } from '@/hooks/useLanguage'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
          <div className="text-white">Loading...</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const { t, isRTL } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationMode, setVerificationMode] = useState<'signup' | 'reauth'>('signup')
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromQuery = String(searchParams.get('email') || '').trim()
  const reauthRequested = searchParams.get('reauth') === '1'
  const resetRequested = searchParams.get('reset') === '1'

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery)
    }
  }, [emailFromQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setVerificationEmail('')

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
        if (data?.requiresVerification) {
          setVerificationEmail(String(data?.data?.email || email).trim())
          setVerificationMode(
            String(data?.verificationType || '').toLowerCase() === 'reauth' ? 'reauth' : 'signup'
          )
        }
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
          {reauthRequested && !error && (
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              For your security, this account needs a fresh email check before you can continue.
            </div>
          )}
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
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                {t('login.password')}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>

          {resetRequested && !error && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Password updated successfully. Sign in with your new password.
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {verificationEmail && (
            <Link
              href={`/verify-email?email=${encodeURIComponent(verificationEmail)}&mode=${verificationMode}`}
              className="block text-center text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              {verificationMode === 'reauth'
                ? 'Continue to sign-in verification'
                : 'Continue to email verification'}
            </Link>
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
