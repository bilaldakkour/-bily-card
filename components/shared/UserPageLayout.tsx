'use client'

import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { MobilePageBackdrop } from './MobileDesignSystem'
import MobileUserShell from './MobileUserShell'
import UserSidebar from './UserSidebar'

interface UserPageLayoutProps {
  title: string
  mobileTitle?: string
  mobileShellShowTopPanel?: boolean
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
  mobileTitle,
  mobileShellShowTopPanel = true,
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
      <div className="relative isolate">
        <div className="md:hidden">
          <MobilePageBackdrop />
        </div>

        <div className="md:hidden">
          <div className="mx-auto max-w-[1480px] px-4 pb-0 pt-1 sm:px-5">
            <MobileUserShell title={mobileTitle || title} showTopPanel={mobileShellShowTopPanel} />
          </div>
        </div>

        {showHeader && (
          <div className="hidden md:block">
            <PageHeader
              title={title}
              subtitle={subtitle}
              breadcrumbs={breadcrumbs}
              action={action}
            />
          </div>
        )}

        <div className={`relative mx-auto ${maxWidthClass} px-4 sm:px-5 lg:px-6 ${showHeader ? 'py-3 md:py-4' : 'pb-[4.5rem] pt-0 md:pb-4 md:pt-2'} ${bodyClassName}`.trim()}>
          {fixedSidebarDesktop ? (
            <div className="relative">
              <section className="min-w-0 space-y-1.5 md:space-y-2 lg:pr-[372px]">{children}</section>

              <aside className="lg:contents">
                <div className={`hidden lg:block lg:fixed lg:top-[88px] lg:h-[calc(100vh-108px)] lg:w-[352px] ${fixedSidebarRightClass}`.trim()}>
                  <UserSidebar
                    onBalanceUpdate={sidebarBalanceUpdate}
                    desktopSticky={false}
                  />
                </div>

              </aside>
            </div>
          ) : (
            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_352px] lg:items-start">
              <section className="min-w-0 space-y-1.5 md:space-y-2">{children}</section>

              <aside className="lg:w-[352px] lg:min-w-[352px] lg:self-start lg:pt-0">
                <div className={`hidden lg:block ${sidebarSticky ? 'lg:sticky lg:top-[88px]' : ''}`.trim()}>
                  <UserSidebar
                    onBalanceUpdate={sidebarBalanceUpdate}
                    desktopSticky={false}
                  />
                </div>

              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
