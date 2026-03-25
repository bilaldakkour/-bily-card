import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import { runDailycardAutoMapping } from '@/lib/providers/autoMapping/dailycardAutoMapper'

async function postHandler(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json().catch(() => ({}))
    const mode = String(body?.mode || 'dry_run').toLowerCase() === 'apply' ? 'apply' : 'dry_run'
    const targets = Array.isArray(body?.targets)
      ? body.targets.map((row: any) => String(row || '').trim()).filter(Boolean)
      : undefined

    const result = await runDailycardAutoMapping({
      mode,
      targets,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('DailyCard auto-map route failed:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to execute DailyCard auto-map' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, async () => postHandler(req))
}
