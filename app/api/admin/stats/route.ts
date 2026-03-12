import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';
import DepositRequest from '@/lib/models/DepositRequest';
import WalletTransaction from '@/lib/models/WalletTransaction';
import { JWTPayload } from '@/lib/types';

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
};

let statsCache: { expiresAt: number; data: StatsPayload } | null = null;
const STATS_CACHE_TTL_MS = 15 * 1000;

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    const now = Date.now();
    if (statsCache && statsCache.expiresAt > now) {
      return NextResponse.json({
        success: true,
        data: statsCache.data,
        cached: true,
      });
    }

    await connectDB();

    // Get stats
    const [
      totalUsers,
      totalOrders,
      pendingOrders,
      completedOrders,
      rejectedOrders,
      pendingDeposits,
      totalSalesResult,
      totalProfitResult,
      totalWalletBalanceResult,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: 'rejected' }),
      DepositRequest.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { status: 'completed' } },
        {
          $addFields: {
            computedProfit: {
              $ifNull: [
                '$grossProfit',
                {
                  $cond: [
                    { $gt: ['$baseUnitPrice', 0] },
                    {
                      $subtract: [
                        '$total',
                        {
                          $multiply: [
                            '$baseUnitPrice',
                            { $ifNull: ['$quantity', 1] }
                          ]
                        }
                      ]
                    },
                    0
                  ]
                }
              ]
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$computedProfit' } } }
      ]),
      WalletTransaction.aggregate([
        { $match: { type: 'deposit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
    ]);

    const totalSales = totalSalesResult[0]?.total || 0;
    const totalProfit = totalProfitResult[0]?.total || 0;
    const totalWalletBalance = totalWalletBalanceResult[0]?.total || 0;

    const statsData: StatsPayload = {
      totalUsers,
      totalOrders,
      pendingOrders,
      completedOrders,
      rejectedOrders,
      pendingDeposits,
      totalSales,
      totalProfit,
      totalWalletBalance,
    };

    statsCache = {
      expiresAt: now + STATS_CACHE_TTL_MS,
      data: statsData,
    };

    return NextResponse.json({
      success: true,
      data: statsData,
      cached: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, handler);
}