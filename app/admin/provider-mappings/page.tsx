'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminProviderMappingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/provider-matrix')
  }, [router])

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 text-slate-200">
      <p className="text-sm">Provider Mappings moved to Provider Matrix.</p>
      <Link href="/admin/provider-matrix" className="mt-3 inline-block rounded-lg bg-cyan-600 px-3 py-2 text-xs text-white">
        Open Provider Matrix
      </Link>
    </div>
  )
}
