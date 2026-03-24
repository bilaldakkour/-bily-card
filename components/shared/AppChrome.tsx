'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/ui/Navbar'
import SessionExpiredToast from '@/components/ui/SessionExpiredToast'

interface AppChromeProps {
  children: React.ReactNode
}

export default function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname() || ''
  const isAdminRoute = pathname.startsWith('/admin')
  const isLegalPage = ['/about', '/privacy-policy', '/terms'].includes(pathname)
  const usesMobileUserShell =
    [
      '/',
      '/account',
      '/profile',
      '/wallet',
      '/orders',
      '/my-orders',
      '/my-favorites',
      '/notifications',
      '/contact',
      '/products',
    ].includes(pathname) ||
    pathname.startsWith('/products/') ||
    pathname.startsWith('/categories/')

  return (
    <>
      {!isAdminRoute && !isLegalPage && (
        usesMobileUserShell ? (
          <div className="hidden md:block">
            <Navbar />
          </div>
        ) : (
          <Navbar />
        )
      )}
      <SessionExpiredToast />
      <main
        className={
          isAdminRoute
            ? 'relative'
            : isLegalPage
              ? 'relative'
            : usesMobileUserShell
              ? 'relative md:pt-[84px]'
              : 'relative pt-[108px] md:pt-[84px]'
        }
      >
        {children}
      </main>
    </>
  )
}
