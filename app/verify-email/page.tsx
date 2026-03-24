'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AuthShell from '@/components/shared/AuthShell'
import { Input } from '@/components/ui/Input'

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="text-white">Loading...</div>
        </main>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  )
}

function VerifyEmailForm() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const mode = searchParams.get('mode') === 'reauth' ? 'reauth' : 'signup'
  const isReauth = mode === 'reauth'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, purpose: mode }),
      })

      if (response.ok) {
        router.push(`/login?email=${encodeURIComponent(email)}`)
      } else {
        const data = await response.json()
        setError(data.message || 'Verification failed')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError('Email is missing. Please register again.')
      return
    }

    setResending(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, purpose: mode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Unable to resend verification code')
        return
      }

      setNotice(data.message || 'A new verification code has been sent.')
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthShell
      title={isReauth ? 'Confirm Your Email' : 'Verify Your Email'}
      subtitle={
        isReauth
          ? 'To protect this account, enter the verification code we sent to your email before signing in again.'
          : 'Complete your account setup by entering the verification code we sent to your inbox.'
      }
      footer={
        <p className="text-center text-sm text-slate-400">
          We sent a verification code to <span className="font-semibold text-white">{email}</span>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="mb-2 block text-sm font-medium text-slate-300">
            Verification Code
          </label>
          <Input
            type="text"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="Enter 6-digit code"
          />
        </div>
        {notice && (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {notice}
          </div>
        )}
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
          {loading ? 'Verifying...' : isReauth ? 'Confirm Email' : 'Verify Email'}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || loading}
          className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-500/10 hover:text-cyan-100 disabled:opacity-50"
        >
          {resending ? 'Sending...' : 'Resend Verification Code'}
        </button>
        <p className="text-center text-xs text-slate-500">
          If the email does not appear, check Spam or Promotions in Gmail.
        </p>
      </form>
    </AuthShell>
  )
}
