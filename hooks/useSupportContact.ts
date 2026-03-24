'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_SUPPORT_CONTACT } from '@/lib/supportContactConfig'
import { fetchSupportContactClient } from '@/lib/utils/clientDataCache'

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
        const data = await fetchSupportContactClient()
        if (cancelled) return
        setSupportContact({
          email: String(data?.email || DEFAULT_SUPPORT_CONTACT.email),
          phoneDisplay: String(
            data?.phoneDisplay || DEFAULT_SUPPORT_CONTACT.phoneDisplay
          ),
          phoneTel: String(data?.phoneTel || DEFAULT_SUPPORT_CONTACT.phoneTel),
          whatsappNumber: String(
            data?.whatsappNumber || DEFAULT_SUPPORT_CONTACT.whatsappNumber
          ),
          whatsappUrl: String(
            data?.whatsappUrl || DEFAULT_SUPPORT_CONTACT_STATE.whatsappUrl
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
