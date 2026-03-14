'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Receipt,
  History,
  WalletCards,
  Package,
  Users,
  LogOut
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Deposits', href: '/admin/deposits', icon: CreditCard },
  { name: 'Payment Methods', href: '/admin/payment-methods', icon: WalletCards },
  { name: 'Transactions', href: '/admin/transactions', icon: Receipt },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Users', href: '/admin/users', icon: Users },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    window.location.href = '/admin/login'
  }

  return (
    <div className="hidden w-64 bg-slate-900 border-r border-slate-700 lg:flex lg:flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Bily Card Admin</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700">
        <Link
          href="/"
          className="mb-2 flex items-center w-full px-4 py-3 text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/15 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-3" />
          Back to Site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  )
}
