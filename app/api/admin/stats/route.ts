import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';
import DepositRequest from '@/lib/models/DepositRequest';
import WalletTransaction from '@/lib/models/WalletTransaction';
import ManualOrder from '@/lib/models/ManualOrder';
import { JWTPayload } from '@/lib/types';
import mongoose from 'mongoose';

type PresetPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

type DateRange = {
  period: PresetPeriod;
  from: Date;
  to: Date;
};

type ProductBreakdown = {
  productName: string;
  sales: number;
  profit: number;
  ordersCount: number;
};

type UserBreakdown = {
  userId: string;
  label: string;
  revenue: number;
  profit: number;
  ordersCount: number;
};

type StatsPayload = {
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  rejectedOrders: number;
  pendingDeposits: number;
  totalSales: number;
  totalProfit: number;
  totalWalletBalance: number;
  manualOrdersCount: number;
  manualRevenue: number;
  manualCost: number;
  manualProfit: number;
  normalRevenue: number;
  normalCost: number;
  normalProfit: number;
  combinedRevenue: number;
  combinedCost: number;
  combinedTotalProfit: number;
  topProductsByProfit: ProductBreakdown[];
  topProductsBySales: ProductBreakdown[];
  topUsersByRevenue: UserBreakdown[];
  topUsersByProfit: UserBreakdown[];
  filters: {
    period: PresetPeriod;
    from: string;
    to: string;
  };
};

const STATS_CACHE_TTL_MS = 15 * 1000;
const statsCache = new Map<string, { expiresAt: number; data: StatsPayload }>();

function startOfUtcDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 23, 59, 59, 999));
}

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function resolveDateRange(req: NextRequest): DateRange {
  const { searchParams } = new URL(req.url);
  const periodParam = String(searchParams.get('period') || 'today').trim().toLowerCase();
  const fromParam = String(searchParams.get('from') || '').trim();
  const toParam = String(searchParams.get('to') || '').trim();

  const now = new Date();
  const todayStart = startOfUtcDay(now);

  let period: PresetPeriod = 'today';
  let from = todayStart;
  let to = now;

  if (periodParam === 'yesterday') {
    period = 'yesterday';
    const start = new Date(todayStart);
    start.setUTCDate(start.getUTCDate() - 1);
    from = start;
    to = endOfUtcDay(start);
  } else if (periodParam === 'this_week') {
    period = 'this_week';
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(todayStart);
    monday.setUTCDate(monday.getUTCDate() - diffToMonday);
    from = monday;
    to = now;
  } else if (periodParam === 'this_month') {
    period = 'this_month';
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    to = now;
  } else if (periodParam === 'custom') {
    const parsedFrom = parseDateOnly(fromParam);
    const parsedTo = parseDateOnly(toParam);
    if (parsedFrom && parsedTo) {
      period = 'custom';
      from = parsedFrom;
      to = endOfUtcDay(parsedTo);
    } else {
      period = 'this_month';
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      to = now;
    }
  }

  if (to.getTime() < from.getTime()) {
    const temp = from;
    from = to;
    to = endOfUtcDay(temp);
  }

  return { period, from, to };
}

function toNum(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cacheKeyForRange(range: DateRange) {
  return `${range.period}|${range.from.toISOString()}|${range.to.toISOString()}`;
}

function buildOrderCostExpression() {
  return {
    $cond: [
      { $gt: [{ $ifNull: ['$providerTotalCost', 0] }, 0] },
      { $ifNull: ['$providerTotalCost', 0] },
      {
        $cond: [
          { $gt: [{ $ifNull: ['$baseUnitPrice', 0] }, 0] },
          {
            $multiply: [
              { $ifNull: ['$baseUnitPrice', 0] },
              { $ifNull: ['$quantity', 1] },
            ],
          },
          0,
        ],
      },
    ],
  };
}

function mergeProductBreakdowns(normalRows: any[], manualRows: any[]) {
  const merged = new Map<string, ProductBreakdown>();

  for (const row of normalRows) {
    const name = String(row?._id || '').trim() || 'Unknown Product';
    const current = merged.get(name) || { productName: name, sales: 0, profit: 0, ordersCount: 0 };
    current.sales += toNum(row?.sales);
    current.profit += toNum(row?.profit);
    current.ordersCount += toNum(row?.ordersCount);
    merged.set(name, current);
  }

  for (const row of manualRows) {
    const name = String(row?._id || '').trim() || 'Unknown Product';
    const current = merged.get(name) || { productName: name, sales: 0, profit: 0, ordersCount: 0 };
    current.sales += toNum(row?.sales);
    current.profit += toNum(row?.profit);
    current.ordersCount += toNum(row?.ordersCount);
    merged.set(name, current);
  }

  const rows = Array.from(merged.values()).map((row) => ({
    ...row,
    sales: Number(row.sales.toFixed(2)),
    profit: Number(row.profit.toFixed(2)),
    ordersCount: Number(row.ordersCount),
  }));

  const topByProfit = [...rows]
    .sort((a, b) => b.profit - a.profit || b.sales - a.sales)
    .slice(0, 5);

  const topBySales = [...rows]
    .sort((a, b) => b.sales - a.sales || b.profit - a.profit)
    .slice(0, 5);

  return {
    topByProfit,
    topBySales,
  };
}

async function mergeUserBreakdowns(normalRows: any[], manualRows: any[]) {
  const merged = new Map<string, { userId: string; revenue: number; profit: number; ordersCount: number; fromOrderUser: boolean }>();

  for (const row of normalRows) {
    const userId = String(row?._id || '').trim();
    if (!userId) continue;
    const current = merged.get(userId) || { userId, revenue: 0, profit: 0, ordersCount: 0, fromOrderUser: false };
    current.revenue += toNum(row?.revenue);
    current.profit += toNum(row?.profit);
    current.ordersCount += toNum(row?.ordersCount);
    current.fromOrderUser = true;
    merged.set(userId, current);
  }

  for (const row of manualRows) {
    const userId = String(row?._id || '').trim();
    if (!userId) continue;
    const current = merged.get(userId) || { userId, revenue: 0, profit: 0, ordersCount: 0, fromOrderUser: false };
    current.revenue += toNum(row?.revenue);
    current.profit += toNum(row?.profit);
    current.ordersCount += toNum(row?.ordersCount);
    merged.set(userId, current);
  }

  const baseRows = Array.from(merged.values()).map((row) => ({
    ...row,
    revenue: Number(row.revenue.toFixed(2)),
    profit: Number(row.profit.toFixed(2)),
    ordersCount: Number(row.ordersCount),
  }));

  const topUsersByRevenueBase = [...baseRows]
    .sort((a, b) => b.revenue - a.revenue || b.profit - a.profit)
    .slice(0, 5);

  const topUsersByProfitBase = [...baseRows]
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue)
    .slice(0, 5);

  const idsForLookup = Array.from(
    new Set(
      [...topUsersByRevenueBase, ...topUsersByProfitBase]
        .filter((row) => row.fromOrderUser && mongoose.Types.ObjectId.isValid(row.userId))
        .map((row) => row.userId)
    )
  );

  let usersById = new Map<string, { displayName?: string; email?: string }>();
  if (idsForLookup.length > 0) {
    const users = await User.find({ _id: { $in: idsForLookup } })
      .select('displayName email')
      .lean();

    usersById = new Map(
      (users as any[]).map((user) => [String(user?._id || ''), { displayName: user?.displayName, email: user?.email }])
    );
  }

  const mapOutput = (row: { userId: string; revenue: number; profit: number; ordersCount: number }): UserBreakdown => {
    const known = usersById.get(row.userId);
    const label = known?.displayName || known?.email || row.userId;
    return {
      userId: row.userId,
      label,
      revenue: row.revenue,
      profit: row.profit,
      ordersCount: row.ordersCount,
    };
  };

  return {
    topUsersByRevenue: topUsersByRevenueBase.map(mapOutput),
    topUsersByProfit: topUsersByProfitBase.map(mapOutput),
  };
}

async function handler(
  req: NextRequest,
  _user: JWTPayload
): Promise<NextResponse> {
  try {
    const range = resolveDateRange(req);
    const cacheKey = cacheKeyForRange(range);
    const now = Date.now();

    const cached = statsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    await connectDB();

    const dateMatch = { createdAt: { $gte: range.from, $lte: range.to } };

    const orderBaseMatch = { ...dateMatch };
    const orderCompletedMatch = { ...dateMatch, status: 'completed' };

    const manualBaseMatch = {
      ...dateMatch,
      source: 'manual',
      isManual: true,
      isVisibleToCustomer: false,
    };
    const manualCompletedMatch = { ...manualBaseMatch, status: 'completed' };

    const orderCostExpression = buildOrderCostExpression();

    const [
      totalUsers,
      totalOrders,
      pendingOrders,
      completedOrders,
      rejectedOrders,
      manualOrdersCount,
      pendingDeposits,
      totalWalletBalanceResult,
      normalFinancialAgg,
      manualFinancialAgg,
      normalProductsAgg,
      manualProductsAgg,
      normalUsersAgg,
      manualUsersAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(orderBaseMatch),
      Order.countDocuments({ ...orderBaseMatch, status: 'pending' }),
      Order.countDocuments({ ...orderBaseMatch, status: 'completed' }),
      Order.countDocuments({ ...orderBaseMatch, status: 'rejected' }),
      ManualOrder.countDocuments(manualBaseMatch),
      DepositRequest.countDocuments({ status: 'pending' }),
      WalletTransaction.aggregate([
        { $match: { type: 'deposit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Order.aggregate([
        { $match: orderCompletedMatch },
        {
          $addFields: {
            computedCost: orderCostExpression,
            computedProfit: {
              $ifNull: [
                '$grossProfit',
                {
                  $subtract: [
                    { $ifNull: ['$total', 0] },
                    orderCostExpression,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: { $ifNull: ['$total', 0] } },
            cost: { $sum: '$computedCost' },
            profit: { $sum: '$computedProfit' },
            ordersCount: { $sum: 1 },
          },
        },
      ]),
      ManualOrder.aggregate([
        { $match: manualCompletedMatch },
        {
          $group: {
            _id: null,
            revenue: { $sum: { $ifNull: ['$totalSale', 0] } },
            cost: { $sum: { $ifNull: ['$totalCost', 0] } },
            profit: {
              $sum: {
                $ifNull: [
                  '$totalProfit',
                  {
                    $subtract: [
                      { $ifNull: ['$totalSale', 0] },
                      { $ifNull: ['$totalCost', 0] },
                    ],
                  },
                ],
              },
            },
            ordersCount: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: orderCompletedMatch },
        {
          $addFields: {
            computedCost: orderCostExpression,
            computedProfit: {
              $ifNull: [
                '$grossProfit',
                {
                  $subtract: [
                    { $ifNull: ['$total', 0] },
                    orderCostExpression,
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$productName', 'Unknown Product'] },
            sales: { $sum: { $ifNull: ['$total', 0] } },
            profit: { $sum: '$computedProfit' },
            ordersCount: { $sum: 1 },
          },
        },
      ]),
      ManualOrder.aggregate([
        { $match: manualCompletedMatch },
        {
          $group: {
            _id: { $ifNull: ['$productName', 'Unknown Product'] },
            sales: { $sum: { $ifNull: ['$totalSale', 0] } },
            profit: {
              $sum: {
                $ifNull: [
                  '$totalProfit',
                  {
                    $subtract: [
                      { $ifNull: ['$totalSale', 0] },
                      { $ifNull: ['$totalCost', 0] },
                    ],
                  },
                ],
              },
            },
            ordersCount: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: orderCompletedMatch },
        {
          $addFields: {
            computedCost: orderCostExpression,
            userKey: { $toString: '$userId' },
          },
        },
        {
          $group: {
            _id: '$userKey',
            revenue: { $sum: { $ifNull: ['$total', 0] } },
            profit: {
              $sum: {
                $ifNull: [
                  '$grossProfit',
                  {
                    $subtract: [
                      { $ifNull: ['$total', 0] },
                      '$computedCost',
                    ],
                  },
                ],
              },
            },
            ordersCount: { $sum: 1 },
          },
        },
        { $match: { _id: { $nin: ['', 'null', 'undefined'] } } },
      ]),
      ManualOrder.aggregate([
        { $match: manualCompletedMatch },
        {
          $group: {
            _id: { $ifNull: ['$userId', ''] },
            revenue: { $sum: { $ifNull: ['$totalSale', 0] } },
            profit: {
              $sum: {
                $ifNull: [
                  '$totalProfit',
                  {
                    $subtract: [
                      { $ifNull: ['$totalSale', 0] },
                      { $ifNull: ['$totalCost', 0] },
                    ],
                  },
                ],
              },
            },
            ordersCount: { $sum: 1 },
          },
        },
        { $match: { _id: { $nin: ['', 'null', 'undefined'] } } },
      ]),
    ]);

    const normalRevenue = toNum(normalFinancialAgg?.[0]?.revenue);
    const normalCost = toNum(normalFinancialAgg?.[0]?.cost);
    const normalProfit = toNum(normalFinancialAgg?.[0]?.profit);

    const manualRevenue = toNum(manualFinancialAgg?.[0]?.revenue);
    const manualCost = toNum(manualFinancialAgg?.[0]?.cost);
    const manualProfit = toNum(manualFinancialAgg?.[0]?.profit);

    const combinedRevenue = normalRevenue + manualRevenue;
    const combinedCost = normalCost + manualCost;
    const combinedTotalProfit = normalProfit + manualProfit;

    const totalWalletBalance = toNum(totalWalletBalanceResult?.[0]?.total);

    const productBreakdown = mergeProductBreakdowns(normalProductsAgg as any[], manualProductsAgg as any[]);
    const userBreakdown = await mergeUserBreakdowns(normalUsersAgg as any[], manualUsersAgg as any[]);

    const statsData: StatsPayload = {
      totalUsers,
      totalOrders,
      pendingOrders,
      completedOrders,
      rejectedOrders,
      pendingDeposits,
      totalSales: normalRevenue,
      totalProfit: normalProfit,
      totalWalletBalance,
      manualOrdersCount,
      manualRevenue,
      manualCost,
      manualProfit,
      normalRevenue,
      normalCost,
      normalProfit,
      combinedRevenue,
      combinedCost,
      combinedTotalProfit,
      topProductsByProfit: productBreakdown.topByProfit,
      topProductsBySales: productBreakdown.topBySales,
      topUsersByRevenue: userBreakdown.topUsersByRevenue,
      topUsersByProfit: userBreakdown.topUsersByProfit,
      filters: {
        period: range.period,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
    };

    statsCache.set(cacheKey, {
      expiresAt: now + STATS_CACHE_TTL_MS,
      data: statsData,
    });

    if (statsCache.size > 30) {
      const first = statsCache.keys().next();
      if (!first.done) statsCache.delete(first.value);
    }

    return NextResponse.json({
      success: true,
      data: statsData,
      cached: false,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler);
}
