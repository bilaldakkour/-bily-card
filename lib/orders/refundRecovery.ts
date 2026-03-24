import mongoose from 'mongoose';
import Order from '@/lib/models/Order';
import Wallet from '@/lib/models/Wallet';
import WalletTransaction from '@/lib/models/WalletTransaction';
import { restoreManagedStockBySlug } from '@/lib/orders/managedStock';

type RefundRecoveryParams = {
  orderId: string;
  refundAmount: number;
  currency: 'USD' | 'LBP';
  nextStatus: 'refunded' | 'rejected';
  refundNote: string;
  approvedBy?: string;
  providerStatus?: string;
  providerResponse?: unknown;
  notes?: string;
  failureReason?: string;
};

export async function refundOrderAndRestoreStock(params: RefundRecoveryParams) {
  const refundAmount = Number(params.refundAmount || 0);
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new Error('Invalid refund amount');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(params.orderId).session(session);
    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.userId) {
      throw new Error('Order user is missing');
    }

    const balanceField = params.currency === 'LBP' ? 'balance_lbp' : 'balance_usd';
    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId: order.userId },
      {
        $setOnInsert: {
          userId: order.userId,
          ...(params.currency === 'LBP' ? { balance_usd: 0 } : { balance_lbp: 0 }),
        },
        $inc: { [balanceField]: refundAmount },
        $set: { lastUpdated: new Date() },
      },
      {
        new: true,
        upsert: true,
        session,
      }
    );

    if (!updatedWallet) {
      throw new Error('Wallet refund failed');
    }

    const balanceAfter = Number((updatedWallet as any)?.[balanceField] || 0);
    const balanceBefore = Number((balanceAfter - refundAmount).toFixed(6));

    await WalletTransaction.create(
      [
        {
          userId: order.userId,
          type: 'refund',
          amount: refundAmount,
          currency: params.currency,
          balanceBefore,
          balanceAfter,
          orderId: order._id,
          notes: params.refundNote,
          approvedBy: params.approvedBy || undefined,
        },
      ],
      { session }
    );

    const stockRestored = await restoreManagedStockBySlug({
      slug: String(order.productSlug || ''),
      quantity: Number(order.quantity || 0),
      session,
    });

    order.status = params.nextStatus;
    order.walletBalanceAfter = balanceAfter;

    if (typeof params.providerStatus === 'string') {
      order.providerStatus = params.providerStatus;
    }

    if (typeof params.providerResponse !== 'undefined') {
      order.providerResponse = params.providerResponse;
    }

    if (typeof params.notes === 'string') {
      order.notes = params.notes;
    }

    if (typeof params.failureReason === 'string') {
      order.failureReason = params.failureReason;
    }

    await order.save({ session });
    await session.commitTransaction();

    return {
      order,
      stockRestored,
      balanceBefore,
      balanceAfter,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
