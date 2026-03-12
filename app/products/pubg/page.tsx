"use client";

import { useState } from "react";

const packages = [
  { id: 1, name: "60 UC", price: "$0.95" },
  { id: 2, name: "325 UC", price: "$4.70" },
  { id: 3, name: "660 UC", price: "$9.40" },
  { id: 4, name: "1800 UC", price: "$23.92" },
  { id: 5, name: "3850 UC", price: "$47.52" },
  { id: 6, name: "8100 UC", price: "$94.99" },

  { id: 7, name: "First Purchase Pack", price: "$0.99" },
  { id: 8, name: "Weapon Materials Pack", price: "$2.99" },
  { id: 9, name: "Mythic Emblem Pack", price: "$4.99" },

  { id: 10, name: "Elite Pass LV1-50", price: "$5.99" },
  { id: 11, name: "Elite Pass LV1-100", price: "$11.99" },
  { id: 12, name: "Elite Pass LV1-100 Plus", price: "$27.50" },

  { id: 13, name: "Prime 1 Month", price: "$0.99" },
  { id: 14, name: "Prime 6 Months", price: "$5.99" },
  { id: 15, name: "Prime 12 Months", price: "$11.99" },

  { id: 16, name: "Prime Plus 1 Month", price: "$9.99" },
  { id: 17, name: "Prime Plus 6 Months", price: "$59.99" },
  { id: 18, name: "Prime Plus 12 Months", price: "$114.99" },

  { id: 19, name: "Weekly Offer Pack 1", price: "$0.99" },
  { id: 20, name: "Weekly Offer Pack 2", price: "$2.99" },
  { id: 21, name: "Weekly Mythic Emblem Value Pack", price: "$3.99" },
];

export default function PubgPage() {
  const [selectedPackage, setSelectedPackage] = useState<(typeof packages)[0] | null>(null);
  const [playerId, setPlayerId] = useState("");

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
            PUBG Mobile
          </p>
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">Buy PUBG Products</h1>
          <p className="text-slate-300">
            Enter your Player ID and choose the package you want.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-xl">
            <div className="rounded-2xl bg-slate-800 p-6 text-center">
              <div className="mb-4 text-6xl">🎮</div>
              <h2 className="text-2xl font-bold">PUBG Mobile</h2>
              <p className="mt-2 text-sm text-slate-400">
                UC, Prime, Elite Pass and special packs
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Selected Product</p>
              <p className="mt-2 text-lg font-semibold">
                {selectedPackage
                  ? `${selectedPackage.name} - ${selectedPackage.price}`
                  : "No package selected yet"}
              </p>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                PUBG Player ID
              </label>
              <input
                type="text"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Enter your PUBG Player ID"
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <button
              className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!playerId || !selectedPackage}
            >
              Buy Now
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-xl">
            <p className="mb-4 text-sm font-medium text-slate-300">Choose Package</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;

                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-600/20"
                        : "border-white/10 bg-slate-800 hover:border-blue-500 hover:bg-slate-700"
                    }`}
                  >
                    <p className="text-base font-semibold">{pkg.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{pkg.price}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}