'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Crown, Gem, Gift, ShieldCheck, Sparkles } from 'lucide-react'
import UserPageLayout from '@/components/shared/UserPageLayout'
import { MobilePanel, MobileSectionHeading } from '@/components/shared/MobileDesignSystem'
import { useLanguage } from '@/hooks/useLanguage'
import { fetchAuthUser } from '@/lib/utils/authClient'

type UserData = {
  walletBalance?: {
    usd?: number
  }
  displayName?: string
  username?: string
  name?: string
}

type LevelDef = {
  level: number
  min: number
  max: number
  titleAr: string
}

const LEVELS: LevelDef[] = [
  { level: 1, min: 0, max: 500, titleAr: 'بداية التاجر' },
  { level: 2, min: 500, max: 1500, titleAr: 'تاجر نشيط' },
  { level: 3, min: 1500, max: 6000, titleAr: 'تاجر متفوق' },
  { level: 4, min: 6000, max: 12000, titleAr: 'تاجر محترف' },
  { level: 5, min: 12000, max: 25000, titleAr: 'شريك بيلي كارد' },
]

const getLevelState = (balanceRaw: number) => {
  const balance = Number.isFinite(balanceRaw) ? Math.max(0, balanceRaw) : 0
  const current = LEVELS.find((lvl) => balance >= lvl.min && balance < lvl.max) || LEVELS[LEVELS.length - 1]
  const next = LEVELS.find((lvl) => lvl.level === current.level + 1) || null
  const segmentRange = Math.max(1, current.max - current.min)
  const rawProgress = ((balance - current.min) / segmentRange) * 100
  const progress = current.level === 5 ? Math.min(100, Math.max(0, rawProgress)) : Math.max(0, Math.min(100, rawProgress))
  const remainingToNext = next ? Math.max(0, next.min - balance) : 0

  return { current, next, progress, remainingToNext }
}

export default function LevelProgressPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem('bilycard_token')
      if (!token) {
        router.push('/login')
        return
      }
      try {
        const data = await fetchAuthUser(token)
        setUser((data as UserData) || null)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [router])

  const walletUsd = Number(user?.walletBalance?.usd || 0)
  const state = useMemo(() => getLevelState(walletUsd), [walletUsd])
  const progressValue = Math.round(state.progress)
  const levelName = state.current.titleAr
  const displayName = user?.displayName || user?.username || user?.name || 'عضو'

  if (loading) {
    return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">جاري التحميل...</main>
  }

  return (
    <UserPageLayout
      title={language === 'ar' ? 'تقدّم مستوى الحساب' : 'Account Level Progress'}
      mobileTitle={language === 'ar' ? 'تقدّم المستوى' : 'Level Progress'}
      mobileShellShowTopPanel={false}
      subtitle={language === 'ar' ? 'تابع مستواك الحالي والمزايا والحد المطلوب للمستوى التالي.' : 'Track your current level and next milestone.'}
      breadcrumbs={[
        { label: language === 'ar' ? 'الرئيسية' : 'Home', href: '/' },
        { label: language === 'ar' ? 'تقدّم المستوى' : 'Level Progress', href: '/level-progress' },
      ]}
      bodyClassName="pt-1 md:pt-2"
    >
      <MobilePanel tone="accent">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_230px] md:items-center">
          <div className="text-right">
            <span className="inline-flex rounded-full border border-cyan-300/28 bg-cyan-500/12 px-3 py-1 text-xs font-bold text-cyan-100">
              المستوى {state.current.level}
            </span>
            <h2 className="mt-2 text-2xl font-black text-white">{levelName}</h2>
            <p className="mt-1 text-sm text-slate-300">{displayName}</p>
          </div>
          <div className="rounded-[18px] border border-white/12 bg-white/[0.03] p-3 text-right">
            <p className="text-xs text-slate-400">الإنفاق الحالي</p>
            <p className="mt-1 text-3xl font-black text-white">${walletUsd.toFixed(2)}</p>
          </div>
        </div>
      </MobilePanel>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <MobilePanel tone="soft">
          <MobileSectionHeading
            eyebrow="Progress"
            title="تقدّمك"
            description={state.next ? `${progressValue}% نحو المستوى ${state.next.level}` : 'أنت في أعلى مستوى حالياً'}
          />

          <div className="mt-3">
            <div className="relative h-3 rounded-full bg-slate-800/90">
              <div
                className="h-3 rounded-full bg-[linear-gradient(90deg,#22d3ee,#3b82f6,#84cc16)]"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>${state.current.min.toLocaleString()}</span>
              <span>${state.current.max.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-2">
            {LEVELS.map((lvl) => (
              <div
                key={lvl.level}
                className={`rounded-xl border p-2 text-center ${
                  lvl.level <= state.current.level
                    ? 'border-cyan-300/24 bg-cyan-500/10 text-cyan-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-400'
                }`}
              >
                <Gem className="mx-auto h-4 w-4" />
                <p className="mt-1 text-[11px] font-semibold">L{lvl.level}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right">
            {state.next ? (
              <p className="text-sm text-slate-200">
                المتبقي للوصول إلى المستوى {state.next.level}:{' '}
                <span className="font-black text-cyan-300">${state.remainingToNext.toFixed(2)}</span>
              </p>
            ) : (
              <p className="text-sm text-emerald-300">ممتاز! وصلت إلى أعلى مستوى.</p>
            )}
          </div>
        </MobilePanel>

        <MobilePanel tone="soft">
          <h3 className="text-right text-lg font-black text-white">مزايا مميزة</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right">
              <Gift className="mb-1 h-5 w-5 text-amber-300" />
              <p className="text-sm font-semibold text-white">عروض حصرية</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right">
              <ShieldCheck className="mb-1 h-5 w-5 text-emerald-300" />
              <p className="text-sm font-semibold text-white">حماية أفضل</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right">
              <Sparkles className="mb-1 h-5 w-5 text-cyan-300" />
              <p className="text-sm font-semibold text-white">دعم أسرع</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-right">
              <Crown className="mb-1 h-5 w-5 text-yellow-300" />
              <p className="text-sm font-semibold text-white">أولوية أعلى</p>
            </div>
          </div>

          <Link
            href="/"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-cyan-300/24 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/16"
          >
            العودة إلى الرئيسية
          </Link>
        </MobilePanel>
      </div>
    </UserPageLayout>
  )
}
