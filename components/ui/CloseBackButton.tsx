'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function CloseBackButton() {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push('/')
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(8,18,34,0.92),rgba(9,20,36,0.96))] text-white shadow-[0_14px_32px_rgba(2,6,23,0.34)] transition hover:border-cyan-300/35 hover:text-cyan-100"
      aria-label="رجوع"
    >
      <X className="h-5 w-5" />
    </button>
  )
}
