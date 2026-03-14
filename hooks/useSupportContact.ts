'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_SUPPORT_CONTACT } from '@/lib/supportContactConfig'

export type SupportContactState = typeof DEFAULT_SUPPORT_CONTACT & {
  whatsappUrl: string
}

const DEFAULT_SUPPORT_CONTACT_STATE: SupportContactState = {
  ...DEFAULT_SUPPORT_CONTACT,
  whatsappUrl: `https://wa.me/${DEFAULT_SUPPORT_CONTACT.whatsappNumber}`,
}

export function useSupportContact() {
  const [supportContact, setSupportContact] = useState<SupportContactState>(
    DEFAULT_SUPPORT_CONTACT_STATE
  )

  useEffect(() => {
    let cancelled = false

    const loadSupportContact = async () => {
      try {
        const res = await fetch('/api/support-contact', { cache: 'no-store' })
        const data = await res.json()

        if (!res.ok || !data?.success || cancelled) return

        setSupportContact({
          email: String(data.data?.email || DEFAULT_SUPPORT_CONTACT.email),
          phoneDisplay: String(
            data.data?.phoneDisplay || DEFAULT_SUPPORT_CONTACT.phoneDisplay
          ),
          phoneTel: String(data.data?.phoneTel || DEFAULT_SUPPORT_CONTACT.phoneTel),
          whatsappNumber: String(
            data.data?.whatsappNumber || DEFAULT_SUPPORT_CONTACT.whatsappNumber
          ),
          whatsappUrl: String(
            data.data?.whatsappUrl || DEFAULT_SUPPORT_CONTACT_STATE.whatsappUrl
          ),
        })
      } catch {
        // Keep defaults if support contact loading fails.
      }
    }

    void loadSupportContact()

    return () => {
      cancelled = true
    }
  }, [])

  return supportContact
}
