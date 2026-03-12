import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import ApiRateLimit from '@/lib/models/ApiRateLimit';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return req.ip || 'unknown';
}

export async function enforceRateLimit(
  req: NextRequest,
  keyPrefix: string,
  maxRequests: number,
  windowMs: number
): Promise<NextResponse | null> {
  await connectDB();

  const now = new Date();
  const nowMs = now.getTime();
  const key = `${keyPrefix}:${getClientIp(req)}`;
  const existing = (await ApiRateLimit.findOne({ key }).lean()) as
    | { resetAt: Date; count: number }
    | null;
  const nextResetAt = new Date(nowMs + windowMs);

  if (!existing || new Date(existing.resetAt).getTime() <= nowMs) {
    await ApiRateLimit.findOneAndUpdate(
      { key },
      {
        $set: {
          count: 1,
          resetAt: nextResetAt,
        },
      },
      { upsert: true }
    );
    return null;
  }

  const updated = (await ApiRateLimit.findOneAndUpdate(
    {
      key,
      resetAt: { $gt: now },
      count: { $lt: maxRequests },
    },
    {
      $inc: { count: 1 },
    },
    { new: true }
  ).lean()) as { resetAt: Date; count: number } | null;

  if (!updated) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(existing.resetAt).getTime() - nowMs) / 1000)
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      }
    );
  }

  return null;
}
