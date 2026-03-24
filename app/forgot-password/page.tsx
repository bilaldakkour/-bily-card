'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthShell from '@/components/shared/AuthShell'
import { Input } from '@/components/ui/Input'

type Step = 'request' | 'reset'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const requestResetCode = async () => {
    setLoading(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok || !data?.success) {
        setError(data?.message || 'Unable to send reset code.')
        return
      }

      setStep('reset')
      setNotice(data?.message || 'If this email exists, a reset code has been sent.')
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, password }),
      })

      const data = await response.json()

      if (!response.ok || !data?.success) {
        setError(data?.message || 'Unable to reset password.')
        return
      }

      router.push(`/login?email=${encodeURIComponent(email)}&reset=1`)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step === 'request') {
      await requestResetCode()
      return
    }

    await handleResetPassword(e)
  }

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Reset your customer password safely with a one-time code sent to your email."
      footer={
        <p className="text-center text-sm text-slate-400">
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
            Back to login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
            Email
          </label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>

        {step === 'request' ? (
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-sky-500 disabled:opacity-50"
          >
            {loading ? 'Sending Code...' : 'Send Reset Code'}
          </button>
        ) : (
          <>
            <div>
              <label htmlFor="code" className="mb-2 block text-sm font-medium text-slate-300">
                Reset Code
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
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                New Password
              </label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <Input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat new password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-sky-500 disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={requestResetCode}
              disabled={loading}
              className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-500/10 hover:text-cyan-100 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : 'Resend Code'}
            </button>
          </>
        )}

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
      </form>
    </AuthShell>
  )
}
