'use client'

import Link from 'next/link'
import { Flame, Smartphone, Gamepad2, Monitor, Music, Play } from 'lucide-react'

const games = [
  {
    name: 'Free Fire',
    icon: Flame,
    href: '/categories/freefire',
    color: 'from-orange-500 to-red-600'
  },
  {
    name: 'PUBG Mobile',
    icon: Gamepad2,
    href: '/categories/pubg',
    color: 'from-blue-500 to-purple-600'
  },
  {
    name: 'Mobile Legends',
    icon: Smartphone,
    href: '/categories/mobile-legends',
    color: 'from-yellow-500 to-orange-600'
  },
  {
    name: 'Steam',
    icon: Gamepad2,
    href: '/categories/steam',
    color: 'from-cyan-500 to-blue-600'
  },
  {
    name: 'TikTok',
    icon: Music,
    href: '/categories/tiktok',
    color: 'from-pink-500 to-purple-600'
  },
  {
    name: 'Google Play',
    icon: Play,
    href: '/categories/google-play',
    color: 'from-green-500 to-blue-600'
  },
  {
    name: 'PlayStation',
    icon: Monitor,
    href: '/categories/playstation',
    color: 'from-indigo-500 to-purple-600'
  }
]

export default function PopularGamesSection() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Popular Games</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Choose from our most popular gaming platforms and top-up instantly
          </p>
        </div>

        <div className="flex space-x-4 overflow-x-auto pb-3 scrollbar-hide">
          {games.map((game) => {
            const Icon = game.icon
            return (
              <Link
                key={game.name}
                href={game.href}
                className="group flex-shrink-0 w-28"
              >
                <div className="relative rounded-xl bg-slate-900 border border-white/10 p-4 text-center transition-all duration-300 hover:scale-105 hover:border-white/20 hover:shadow-xl hover:shadow-blue-500/10">
                  <div className={`mx-auto mb-2 h-10 w-10 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{game.name}</h3>

                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${game.color} opacity-0 blur-xl transition-opacity group-hover:opacity-20`}></div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}