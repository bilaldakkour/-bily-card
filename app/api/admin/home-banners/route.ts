import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import SystemSettings from '@/lib/models/SystemSettings'
import { JWTPayload } from '@/lib/types'
import {
  getDefaultHomePromoSlides,
  homePromoLimits,
  sanitizeHomePromoSlides,
} from '@/lib/homePromoConfig'
import { clearHomePromoCache } from '@/lib/homePromoCache'

async function handleGet(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  await connectDB()
  const settings = await SystemSettings.findOne({}, { homePromoSlides: 1, homePromoUseDefaultFallback: 1 }).lean()
  const slides = sanitizeHomePromoSlides((settings as any)?.homePromoSlides)
  const useDefaultFallback = (settings as any)?.homePromoUseDefaultFallback !== false

  return NextResponse.json({
    success: true,
    data: {
      slides,
      useDefaultFallback,
      defaults: getDefaultHomePromoSlides(),
      limits: homePromoLimits,
    },
  })
}

async function handlePut(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  await connectDB()
  const body = await req.json()
  const slides = sanitizeHomePromoSlides(body?.slides)
  const useDefaultFallback = body?.useDefaultFallback !== false

  const nextSlides = body?.resetToDefault ? [] : slides
  const totalPayloadSize = nextSlides.reduce((sum, slide) => sum + String(slide || '').length, 0)
  if (totalPayloadSize > 900_000) {
    return NextResponse.json(
      {
        success: false,
        message: 'Home banners payload is too large. Please upload smaller images (compressed).',
      },
      { status: 413 }
    )
  }

  await SystemSettings.findOneAndUpdate(
    {},
    { $set: { homePromoSlides: nextSlides, homePromoUseDefaultFallback: useDefaultFallback } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean()
  clearHomePromoCache()

  return NextResponse.json({
    success: true,
    message: 'Home banners updated successfully',
    data: {
      slides: nextSlides,
      useDefaultFallback,
      effectiveSlides: nextSlides.length > 0 ? nextSlides : useDefaultFallback ? getDefaultHomePromoSlides() : [],
      limits: homePromoLimits,
    },
  })
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handleGet)
}

export async function PUT(req: NextRequest) {
  return withAdminAuth(req, handlePut)
}
