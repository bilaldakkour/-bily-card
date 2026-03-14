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
      {!isAdminRoute && (
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
