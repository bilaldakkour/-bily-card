import type { ISupportContactSettings } from '@/lib/types'

export const DEFAULT_SUPPORT_CONTACT: ISupportContactSettings = {
  email: 'support@bilycard.com',
  phoneDisplay: '+961 71 985 887',
  phoneTel: '+96171985887',
  whatsappNumber: '96171985887',
}

function normalizeString(value: unknown) {
  return String(value || '').trim()
}

function normalizeWhatsappNumber(value: unknown) {
  return normalizeString(value).replace(/[^\d]/g, '')
}

export function sanitizeSupportContact(input: unknown): ISupportContactSettings {
  const raw = (input || {}) as Partial<ISupportContactSettings>

  const phoneDisplay = normalizeString(raw.phoneDisplay) || DEFAULT_SUPPORT_CONTACT.phoneDisplay
  const phoneTel = normalizeString(raw.phoneTel) || DEFAULT_SUPPORT_CONTACT.phoneTel
  const whatsappNumber =
    normalizeWhatsappNumber(raw.whatsappNumber) || DEFAULT_SUPPORT_CONTACT.whatsappNumber

  return {
    email: normalizeString(raw.email) || DEFAULT_SUPPORT_CONTACT.email,
    phoneDisplay,
    phoneTel,
    whatsappNumber,
  }
}

export function getWhatsappUrl(contact: ISupportContactSettings) {
  return `https://wa.me/${contact.whatsappNumber}`
}
