import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import dbConnect from '@/lib/mongodb';
import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { JWTPayload } from '@/lib/types';

async function handler(req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const action = String(searchParams.get('action') || 'all');
    const targetType = String(searchParams.get('targetType') || 'all');
    const search = String(searchParams.get('search') || '').trim();
    const from = String(searchParams.get('from') || '').trim();
    const to = String(searchParams.get('to') || '').trim();
    const format = String(searchParams.get('format') || 'json').toLowerCase();
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 50)));
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (action !== 'all') {
      query.action = action;
    }

    if (targetType !== 'all') {
      query.targetType = targetType;
    }

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { targetId: { $regex: search, $options: 'i' } },
        { 'details.notes': { $regex: search, $options: 'i' } },
        { 'details.reason': { $regex: search, $options: 'i' } },
      ];
    }

    if (from || to) {
      query.createdAt = {};

      if (from) {
        const fromDate = new Date(from);
        if (!Number.isNaN(fromDate.getTime())) {
          query.createdAt.$gte = fromDate;
        }
      }

      if (to) {
        const toDate = new Date(to);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = toDate;
        }
      }

      if (Object.keys(query.createdAt).length === 0) {
        delete query.createdAt;
      }
    }

    if (format === 'csv') {
      const exportLimit = Math.max(1, Math.min(5000, Number(searchParams.get('exportLimit') || 2000)));
      const rows = await AdminAuditLog.find(query)
        .populate('adminUserId', 'displayName email username')
        .sort({ createdAt: -1 })
        .limit(exportLimit)
        .lean();

      const toCsvField = (value: unknown) => {
        const stringValue = String(value ?? '');
        return `"${stringValue.replace(/"/g, '""')}"`;
      };

      const header = [
        'createdAt',
        'adminName',
        'adminEmail',
        'action',
        'targetType',
        'targetId',
        'details',
      ];

      const lines = rows.map((log: any) => {
        const adminName =
          log?.adminUserId?.displayName || log?.adminUserId?.username || 'Admin';
        const adminEmail = log?.adminUserId?.email || '';

        return [
          toCsvField(new Date(log.createdAt).toISOString()),
          toCsvField(adminName),
          toCsvField(adminEmail),
          toCsvField(log.action),
          toCsvField(log.targetType),
          toCsvField(log.targetId || ''),
          toCsvField(JSON.stringify(log.details || {})),
        ].join(',');
      });

      const csv = [header.join(','), ...lines].join('\n');
      const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=${filename}`,
        },
      });
    }

    const logs = await AdminAuditLog.find(query)
      .populate('adminUserId', 'displayName email username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AdminAuditLog.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler);
}
