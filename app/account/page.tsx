'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Loader2, LockKeyhole } from 'lucide-react'
import { LogoutButton } from '@/components/shared'
import UserPageLayout from '@/components/shared/UserPageLayout'
import {
  MobileMetricTile,
  MobilePanel,
  MobileSectionHeading,
  mobileInputClass,
  mobilePrimaryButtonClass,
  mobileSecondaryButtonClass,
} from '@/components/shared/MobileDesignSystem'
import { useLanguage } from '@/hooks/useLanguage'
import { fetchAuthUser } from '@/lib/utils/authClient'

interface WalletBalance {
  usd: number
}

interface UserData {
  displayName: string
  email: string
  walletBalance: WalletBalance
  role: string
}

export default function AccountPage() {
  const { t, isRTL, language } = useLanguage()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    fetchAuthUser(token)
      .then((userData) => {
        setUser((userData as UserData) || null)
      })
      .catch(() => {
        router.push('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-white">{t('account.loading')}</div>
      </main>
    )
  }

  if (!user) return null

  const pageCopy = {
    ar: {
      mobileTitle: '\u062d\u0633\u0627\u0628\u064a',
      overviewEyebrow: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629',
      overviewTitle: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062d\u0633\u0627\u0628',
      overviewDescription: '\u0645\u0644\u062e\u0635 \u0633\u0631\u064a\u0639 \u0644\u062d\u0633\u0627\u0628\u0643 \u0648\u0631\u0635\u064a\u062f\u0643 \u0648\u0622\u062e\u0631 \u0646\u0634\u0627\u0637\u0627\u062a\u0643.',
      roleLabel: '\u0627\u0644\u062f\u0648\u0631',
      usdOnlyWallet: '\u0645\u062d\u0641\u0638\u0629 USD \u0641\u0642\u0637',
      recentEyebrow: '\u0622\u062e\u0631 \u0627\u0644\u0646\u0634\u0627\u0637\u0627\u062a',
      recentDescription: '\u0637\u0644\u0628\u0627\u062a\u0643 \u0627\u0644\u0623\u062d\u062f\u062b \u0636\u0645\u0646 \u0639\u0631\u0636 \u0645\u062e\u062a\u0635\u0631 \u0648\u0645\u0646\u0627\u0633\u0628 \u0644\u0644\u0647\u0627\u062a\u0641.',
      breadcrumbHome: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
      securityEyebrow: '\u0627\u0644\u0623\u0645\u0627\u0646',
      securityTitle: '\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
      securityDescription: '\u062d\u062f\u0651\u062b \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062d\u0633\u0627\u0628\u0643 \u0628\u0623\u0645\u0627\u0646 \u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629.',
      currentPasswordLabel: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629',
      currentPasswordPlaceholder: '\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629',
      newPasswordLabel: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629',
      newPasswordPlaceholder: '\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629',
      confirmPasswordLabel: '\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629',
      confirmPasswordPlaceholder: '\u0623\u0639\u062f \u0625\u062f\u062e\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629',
      passwordHintTitle: '\u0642\u0628\u0644 \u0627\u0644\u062d\u0641\u0638',
      passwordHintBody: '\u0627\u0633\u062a\u062e\u062f\u0645 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062c\u062f\u064a\u062f\u0629 \u0644\u0627 \u062a\u0642\u0644 \u0639\u0646 6 \u0623\u062d\u0631\u0641 \u0648\u0644\u0627 \u062a\u0639\u064a\u062f \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.',
      savePassword: '\u062d\u0641\u0638 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629',
      savingPassword: '\u062c\u0627\u0631\u064d \u0627\u0644\u062d\u0641\u0638...',
      clearPasswordForm: '\u0645\u0633\u062d',
      fillAllPasswordFields: '\u064a\u0631\u062c\u0649 \u062a\u0639\u0628\u0626\u0629 \u062c\u0645\u064a\u0639 \u062d\u0642\u0648\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.',
      passwordTooShort: '\u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 6 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.',
      passwordMismatch: '\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u063a\u064a\u0631 \u0645\u0637\u0627\u0628\u0642.',
      passwordSameAsCurrent: '\u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0645\u062e\u062a\u0644\u0641\u0629 \u0639\u0646 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.',
    },
    en: {
      mobileTitle: t('account.title'),
      overviewEyebrow: 'Account Overview',
      overviewTitle: 'Account Dashboard',
      overviewDescription: 'A quick summary of your account, balance, and latest activity.',
      roleLabel: 'Role',
      usdOnlyWallet: 'USD-only wallet',
      recentEyebrow: 'Recent Activity',
      recentDescription: 'Your latest orders in a compact layout that fits mobile.',
      breadcrumbHome: t('sidebar.home'),
      securityEyebrow: 'Security',
      securityTitle: 'Change Password',
      securityDescription: 'Update your account password safely from this page.',
      currentPasswordLabel: 'Current Password',
      currentPasswordPlaceholder: 'Enter your current password',
      newPasswordLabel: 'New Password',
      newPasswordPlaceholder: 'Enter your new password',
      confirmPasswordLabel: 'Confirm New Password',
      confirmPasswordPlaceholder: 'Repeat your new password',
      passwordHintTitle: 'Before you save',
      passwordHintBody: 'Use a new password with at least 6 characters and do not reuse your current one.',
      savePassword: 'Save New Password',
      savingPassword: 'Saving...',
      clearPasswordForm: 'Clear',
      fillAllPasswordFields: 'Please fill in all password fields.',
      passwordTooShort: 'New password must be at least 6 characters.',
      passwordMismatch: 'New password confirmation does not match.',
      passwordSameAsCurrent: 'New password must be different from your current password.',
    },
    fr: {
      mobileTitle: 'Mon compte',
      overviewEyebrow: 'Vue du compte',
      overviewTitle: 'Tableau du compte',
      overviewDescription: 'Un resume rapide de votre compte, de votre solde et de votre activite recente.',
      roleLabel: 'Role',
      usdOnlyWallet: 'Portefeuille USD uniquement',
      recentEyebrow: 'Activite recente',
      recentDescription: 'Vos dernieres commandes dans une vue compacte adaptee au mobile.',
      breadcrumbHome: 'Accueil',
      securityEyebrow: 'Securite',
      securityTitle: 'Change Password',
      securityDescription: 'Update your account password safely from this page.',
      currentPasswordLabel: 'Current Password',
      currentPasswordPlaceholder: 'Enter your current password',
      newPasswordLabel: 'New Password',
      newPasswordPlaceholder: 'Enter your new password',
      confirmPasswordLabel: 'Confirm New Password',
      confirmPasswordPlaceholder: 'Repeat your new password',
      passwordHintTitle: 'Before you save',
      passwordHintBody: 'Use a new password with at least 6 characters and do not reuse your current one.',
      savePassword: 'Save New Password',
      savingPassword: 'Saving...',
      clearPasswordForm: 'Clear',
      fillAllPasswordFields: 'Please fill in all password fields.',
      passwordTooShort: 'New password must be at least 6 characters.',
      passwordMismatch: 'New password confirmation does not match.',
      passwordSameAsCurrent: 'New password must be different from your current password.',
    },
  }[language]

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setPasswordError('')
    setPasswordSuccess('')
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    const { currentPassword, newPassword, confirmPassword } = passwordForm

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(pageCopy.fillAllPasswordFields)
      return
    }

    if (newPassword.length < 6) {
      setPasswordError(pageCopy.passwordTooShort)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(pageCopy.passwordMismatch)
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError(pageCopy.passwordSameAsCurrent)
      return
    }

    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      setPasswordSubmitting(true)

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.success) {
        setPasswordError(payload?.message || 'Unable to change password right now.')
        return
      }

      setPasswordSuccess(payload?.message || 'Password changed successfully.')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch {
      setPasswordError('Unable to change password right now.')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <UserPageLayout
        title={t('account.title')}
        mobileTitle={pageCopy.mobileTitle}
        subtitle={t('account.subtitle')}
        breadcrumbs={[
          { label: pageCopy.breadcrumbHome, href: '/' },
          { label: t('account.title'), href: '/account' },
        ]}
      >
        <MobilePanel>
          <MobileSectionHeading
            eyebrow={pageCopy.overviewEyebrow}
            title={pageCopy.overviewTitle}
            description={pageCopy.overviewDescription}
            action={
              <Link href="/wallet" className={mobilePrimaryButtonClass}>
                {t('account.topUpWallet')}
              </Link>
            }
          />

          <div className="mt-4 grid gap-2.5 md:grid-cols-3">
            <MobileMetricTile label={t('account.name')} value={user.displayName} hint={user.email} />
            <MobileMetricTile label={t('account.walletUsd')} value={`$${user.walletBalance.usd.toFixed(2)}`} />
            <MobileMetricTile label={pageCopy.roleLabel} value={user.role} hint={pageCopy.usdOnlyWallet} />
          </div>
        </MobilePanel>

        <section id="change-password" className="scroll-mt-24">
          <MobilePanel tone="soft">
            <MobileSectionHeading
              eyebrow={pageCopy.securityEyebrow}
              title={pageCopy.securityTitle}
              description={pageCopy.securityDescription}
            />

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
              <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                {passwordError ? (
                  <div
                    className="rounded-[20px] border border-rose-300/18 bg-rose-500/10 px-4 py-3 text-right"
                    aria-live="polite"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
                      <p className="text-sm leading-6 text-rose-100">{passwordError}</p>
                    </div>
                  </div>
                ) : null}

                {passwordSuccess ? (
                  <div
                    className="rounded-[20px] border border-emerald-300/18 bg-emerald-500/10 px-4 py-3 text-right"
                    aria-live="polite"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                      <p className="text-sm leading-6 text-emerald-100">{passwordSuccess}</p>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-200">
                      {pageCopy.currentPasswordLabel}
                    </span>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: event.target.value,
                        }))
                      }
                      placeholder={pageCopy.currentPasswordPlaceholder}
                      className={mobileInputClass}
                      autoComplete="current-password"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">
                      {pageCopy.newPasswordLabel}
                    </span>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: event.target.value,
                        }))
                      }
                      placeholder={pageCopy.newPasswordPlaceholder}
                      className={mobileInputClass}
                      autoComplete="new-password"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">
                      {pageCopy.confirmPasswordLabel}
                    </span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value,
                        }))
                      }
                      placeholder={pageCopy.confirmPasswordPlaceholder}
                      className={mobileInputClass}
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    className={`${mobilePrimaryButtonClass} ${passwordSubmitting ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    {passwordSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {pageCopy.savingPassword}
                      </span>
                    ) : (
                      pageCopy.savePassword
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetPasswordForm}
                    disabled={passwordSubmitting}
                    className={`${mobileSecondaryButtonClass} ${passwordSubmitting ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    {pageCopy.clearPasswordForm}
                  </button>
                </div>
              </form>

              <div className="rounded-[22px] border border-cyan-400/14 bg-cyan-500/8 p-4 text-right">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{pageCopy.passwordHintTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{pageCopy.passwordHintBody}</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-cyan-400/18 bg-cyan-500/12 text-cyan-200">
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
          </MobilePanel>
        </section>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-[18px] border border-cyan-400/16 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/16"
          >
            {t('account.continueShopping')}
          </Link>
          <LogoutButton />
        </div>
      </UserPageLayout>
    </div>
  )
}
