'use client'

import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import UserSidebar from './UserSidebar'

interface UserPageLayoutProps {
  title: string
  subtitle?: string
  breadcrumbs?: Array<{
    label: string
    href: string
  }>
  action?: ReactNode
  children: ReactNode
  sidebarBalanceUpdate?: () => void
}

export default function UserPageLayout({
  title,
  subtitle,
  breadcrumbs,
  action,
  children,
  sidebarBalanceUpdate,
}: UserPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        action={action}
      />

      <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-5 lg:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="min-w-0 space-y-4">{children}</section>

          <aside className="lg:pt-0">
            <div className="hidden lg:block lg:sticky lg:top-[90px]">
              <UserSidebar
                onBalanceUpdate={sidebarBalanceUpdate}
                desktopSticky={false}
              />
            </div>

            <div className="lg:hidden">
              <UserSidebar onBalanceUpdate={sidebarBalanceUpdate} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
