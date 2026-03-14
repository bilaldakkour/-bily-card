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
  showHeader?: boolean
  sidebarSticky?: boolean
  bodyClassName?: string
  fixedSidebarDesktop?: boolean
  maxWidthClass?: string
  fixedSidebarRightClass?: string
}

export default function UserPageLayout({
  title,
  subtitle,
  breadcrumbs,
  action,
  children,
  sidebarBalanceUpdate,
  showHeader = true,
  sidebarSticky = false,
  bodyClassName = '',
  fixedSidebarDesktop = false,
  maxWidthClass = 'max-w-[1480px]',
  fixedSidebarRightClass = 'lg:right-[max(1.5rem,calc((100vw-1480px)/2+1.5rem))]',
}: UserPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      {showHeader && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={breadcrumbs}
          action={action}
        />
      )}

      <div className={`mx-auto ${maxWidthClass} px-4 sm:px-5 lg:px-6 ${showHeader ? 'py-8' : 'pb-8 pt-3'} ${bodyClassName}`.trim()}>
        {fixedSidebarDesktop ? (
          <div className="relative">
            <section className="min-w-0 space-y-4 lg:pr-[372px]">{children}</section>

            <aside className="lg:contents">
              <div className={`hidden lg:block lg:fixed lg:top-[88px] lg:h-[calc(100vh-108px)] lg:w-[352px] ${fixedSidebarRightClass}`.trim()}>
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
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_352px] lg:items-start">
            <section className="min-w-0 space-y-4">{children}</section>

            <aside className="lg:w-[352px] lg:min-w-[352px] lg:self-start lg:pt-0">
              <div className={`hidden lg:block ${sidebarSticky ? 'lg:sticky lg:top-[88px]' : ''}`.trim()}>
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
        )}
      </div>
    </div>
  )
}
