'use client'

import { useState } from 'react'
import MobileUserShell from '@/components/shared/MobileUserShell'
import { MobilePageBackdrop, MobilePanel, MobileSectionHeading, mobileInputClass, mobilePrimaryButtonClass } from '@/components/shared/MobileDesignSystem'

const packages = [
  { id: 1, name: '60 UC', price: '$0.95' },
  { id: 2, name: '325 UC', price: '$4.70' },
  { id: 3, name: '660 UC', price: '$9.40' },
  { id: 4, name: '1800 UC', price: '$23.92' },
  { id: 5, name: '3850 UC', price: '$47.52' },
  { id: 6, name: '8100 UC', price: '$94.99' },
  { id: 7, name: 'First Purchase Pack', price: '$0.99' },
  { id: 8, name: 'Weapon Materials Pack', price: '$2.99' },
  { id: 9, name: 'Mythic Emblem Pack', price: '$4.99' },
  { id: 10, name: 'Elite Pass LV1-50', price: '$5.99' },
  { id: 11, name: 'Elite Pass LV1-100', price: '$11.99' },
  { id: 12, name: 'Elite Pass LV1-100 Plus', price: '$27.50' },
  { id: 13, name: 'Prime 1 Month', price: '$0.99' },
  { id: 14, name: 'Prime 6 Months', price: '$5.99' },
  { id: 15, name: 'Prime 12 Months', price: '$11.99' },
  { id: 16, name: 'Prime Plus 1 Month', price: '$9.99' },
  { id: 17, name: 'Prime Plus 6 Months', price: '$59.99' },
  { id: 18, name: 'Prime Plus 12 Months', price: '$114.99' },
  { id: 19, name: 'Weekly Offer Pack 1', price: '$0.99' },
  { id: 20, name: 'Weekly Offer Pack 2', price: '$2.99' },
  { id: 21, name: 'Weekly Mythic Emblem Value Pack', price: '$3.99' },
]

export default function PubgPage() {
  const [selectedPackage, setSelectedPackage] = useState<(typeof packages)[0] | null>(null)
  const [playerId, setPlayerId] = useState('')

  return (
    <main className="relative min-h-screen bg-slate-950 px-3 py-3 text-white sm:px-5 lg:px-6">
      <div className="md:hidden">
        <MobilePageBackdrop />
      </div>

      <div className="mx-auto max-w-[1480px]">
        <div className="mb-4 md:hidden">
          <MobileUserShell title="PUBG Mobile" />
        </div>

        <MobilePanel className="p-3 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <MobilePanel className="p-4 sm:p-5" tone="soft">
              <MobileSectionHeading
                eyebrow="PUBG Mobile"
                title="Buy PUBG Products"
                description="Enter your Player ID and choose the package you want from the same clean mobile layout."
              />

              <div className="mt-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(26,40,72,0.4),rgba(10,17,32,0.7))] p-5 text-center">
                <div className="mb-4 text-5xl">PUBG</div>
                <h2 className="text-2xl font-bold">PUBG Mobile</h2>
                <p className="mt-2 text-sm text-slate-400">UC, Prime, Elite Pass and special packs</p>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Selected Product</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {selectedPackage
                    ? `${selectedPackage.name} - ${selectedPackage.price}`
                    : 'No package selected yet'}
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-slate-300">PUBG Player ID</label>
                <input
                  type="text"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  placeholder="Enter your PUBG Player ID"
                  className={mobileInputClass}
                />
              </div>

              <button
                className={`mt-5 w-full ${mobilePrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                disabled={!playerId || !selectedPackage}
              >
                Buy Now
              </button>
            </MobilePanel>

            <MobilePanel className="p-4 sm:p-5" tone="soft">
              <MobileSectionHeading
                eyebrow="Packages"
                title="Choose Package"
                description="All package options are grouped here so the page stays compact on mobile."
              />

              <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
                {packages.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id

                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      className={`rounded-[22px] border p-4 text-left transition ${
                        isSelected
                          ? 'border-cyan-400/50 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(37,99,235,0.22))] text-cyan-50 shadow-[0_12px_30px_rgba(37,99,235,0.16)]'
                          : 'border-white/10 bg-white/[0.04] text-slate-100 hover:border-cyan-400/30 hover:bg-white/[0.06]'
                      }`}
                    >
                      <p className="text-sm font-semibold">{pkg.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{pkg.price}</p>
                    </button>
                  )
                })}
              </div>
            </MobilePanel>
          </div>
        </MobilePanel>
      </div>
    </main>
  )
}
