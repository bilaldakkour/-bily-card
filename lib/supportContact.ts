import { connectDB } from '@/lib/db/mongodb'
import SystemSettings from '@/lib/models/SystemSettings'
import type { ISupportContactSettings } from '@/lib/types'
import {
  DEFAULT_SUPPORT_CONTACT,
  getWhatsappUrl,
  sanitizeSupportContact,
} from '@/lib/supportContactConfig'

export { DEFAULT_SUPPORT_CONTACT, getWhatsappUrl, sanitizeSupportContact }

export async function getSupportContactSettings(): Promise<ISupportContactSettings> {
  await connectDB()

  const settings = await SystemSettings.findOne({}, { supportContact: 1 }).lean()
  return sanitizeSupportContact((settings as { supportContact?: ISupportContactSettings } | null)?.supportContact)
}
