import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import User from '@/lib/models/User'
import { JWTPayload } from '@/lib/types'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function handler(req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const q = String(searchParams.get('q') || '').trim()
    const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') || 8)))

    if (!q) {
      return NextResponse.json({ success: true, data: [] })
    }

    const regex = new RegExp(escapeRegex(q), 'i')
    const results: any[] = []
    const seen = new Set<string>()

    const pushUnique = (row: any) => {
      const id = String(row?._id || '')
      if (!id || seen.has(id)) return
      seen.add(id)
      results.push(row)
    }

    if (mongoose.Types.ObjectId.isValid(q)) {
      const exact = await User.findById(q)
        .select('_id displayName username email phoneNumber')
        .lean()
      if (exact) pushUnique(exact)
    }

    const primaryMatches = await User.find({
      $or: [
        { displayName: { $regex: regex } },
        { username: { $regex: regex } },
        { email: { $regex: regex } },
        { phoneNumber: { $regex: regex } },
      ],
    })
      .select('_id displayName username email phoneNumber')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    for (const row of primaryMatches as any[]) {
      pushUnique(row)
      if (results.length >= limit) break
    }

    if (results.length < limit && /^[a-f0-9]{4,24}$/i.test(q)) {
      const idPrefixMatches = await User.aggregate([
        {
          $project: {
            _id: 1,
            displayName: 1,
            username: 1,
            email: 1,
            phoneNumber: 1,
            userIdStr: { $toString: '$_id' },
          },
        },
        {
          $match: {
            userIdStr: { $regex: `^${escapeRegex(q)}`, $options: 'i' },
          },
        },
        { $limit: limit },
      ])

      for (const row of idPrefixMatches) {
        pushUnique(row)
        if (results.length >= limit) break
      }
    }

    const payload = results.slice(0, limit).map((row) => ({
      _id: String(row?._id || ''),
      displayName: String(row?.displayName || ''),
      username: String(row?.username || ''),
      email: String(row?.email || ''),
      phoneNumber: String(row?.phoneNumber || ''),
    }))

    return NextResponse.json({ success: true, data: payload })
  } catch (error) {
    console.error('Admin user search error:', error)
    return NextResponse.json({ success: false, message: 'Failed to search users' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler)
}
