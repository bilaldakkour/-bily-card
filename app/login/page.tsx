'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-lg p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6 text-white">{t('login.title')}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              {t('login.email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('login.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              {t('login.password')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            {loading ? t('login.loggingIn') : t('login.login')}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-300">
          {t('login.noAccount')}{' '}
          <a href="/register" className="text-blue-400 hover:text-blue-300">
            {t('login.register')}
          </a>
        </p>
      </div>
    </main>
  )
}