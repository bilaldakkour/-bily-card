import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import { JWTPayload } from '@/lib/types'
import User from '@/lib/models/User'
import UserProductDiscount from '@/lib/models/UserProductDiscount'

const clampDiscountPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return Number(value.toFixed(4))
}

async function getHandler(
  _req: NextRequest,
  _admin: JWTPayload,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const user = await User.findById(params.id).select('_id').lean()
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const rows = await UserProductDiscount.find({
      userId: String(params.id),
      isActive: true,
    })
      .select('productSlug discountPercent')
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        productSlug: String((row as any).productSlug || ''),
        discountPercent: Number((row as any).discountPercent || 0),
      })),
    })
  } catch (error) {
    console.error('Admin user product discounts GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user product discounts' },
      { status: 500 }
    )
  }
}

async function putHandler(
  req: NextRequest,
  admin: JWTPayload,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const entries = Array.isArray(body?.discounts) ? body.discounts : []

    await connectDB()

    const user = await User.findById(params.id).select('_id').lean()
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const normalized = entries
      .map((entry: any) => ({
        productSlug: String(entry?.productSlug || '').trim().toLowerCase(),
        discountPercent: clampDiscountPercent(Number(entry?.discountPercent || 0)),
      }))
      .filter((entry: any) => entry.productSlug && entry.discountPercent > 0)

    await UserProductDiscount.deleteMany({ userId: String(params.id) })

    if (normalized.length > 0) {
      await UserProductDiscount.insertMany(
        normalized.map((entry: any) => ({
          userId: String(params.id),
          productSlug: entry.productSlug,
          discountPercent: entry.discountPercent,
          isActive: true,
          updatedBy: admin.userId,
        }))
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User product discounts updated successfully',
      data: normalized,
    })
  } catch (error) {
    console.error('Admin user product discounts PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update user product discounts' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(req, (r, u) => getHandler(r, u, { params }))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(req, (r, u) => putHandler(r, u, { params }))
}

