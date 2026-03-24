'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
}

export function CopyButton({ value, label = 'Copy value', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timeout = window.setTimeout(() => {
      setCopied(false)
    }, 1600)

    return () => window.clearTimeout(timeout)
  }, [copied])

  const handleCopy = async () => {
    const normalizedValue = String(value || '').trim()
    if (!normalizedValue) return

    try {
      await navigator.clipboard.writeText(normalizedValue)
      setCopied(true)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = normalizedValue
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        void handleCopy()
      }}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200',
        className
      )}
      aria-label={label}
      title={copied ? 'Copied' : label}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}
