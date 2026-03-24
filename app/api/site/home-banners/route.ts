import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import SystemSettings from '@/lib/models/SystemSettings'
import { resolveHomePromoSlides } from '@/lib/homePromoConfig'
import { readHomePromoCache, writeHomePromoCache } from '@/lib/homePromoCache'

export async function GET() {
  try {
    const cached = readHomePromoCache()
    if (cached) {
      return NextResponse.json(
        {
          success: true,
          data: { slides: cached },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
          },
        }
      )
    }

    await connectDB()
    const settings = await SystemSettings.findOne(
      {},
      { homePromoSlides: 1, homePromoUseDefaultFallback: 1 }
    ).lean()
    const useDefaultFallback = (settings as any)?.homePromoUseDefaultFallback !== false
    const slides = resolveHomePromoSlides((settings as any)?.homePromoSlides, useDefaultFallback)
    writeHomePromoCache(slides)

    return NextResponse.json(
      {
        success: true,
        data: { slides },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        },
      }
    )
  } catch {
    return NextResponse.json({
      success: true,
      data: { slides: resolveHomePromoSlides([]) },
    })
  }
}
