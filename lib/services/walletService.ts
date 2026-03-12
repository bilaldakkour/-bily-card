import { connectDB } from '../db/mongodb';
import Order from '../models/Order';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import { IOrder, IWallet, IWalletTransaction } from '../types';
import { generateOrderId, generateTransactionId } from '../utils/helpers';
import { ApiError } from '../utils/errors';

export class WalletService {
  private getBalanceKey(currency: 'USD' | 'LBP') {
    return `balance_${currency.toLowerCase()}` as 'balance_usd' | 'balance_lbp';
  }

  private sanitizeAmount(amount: number) {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed === 0) {
      throw new ApiError(400, 'Invalid amount');
    }
    if (Math.abs(parsed) > 10_000_000) {
      throw new ApiError(400, 'Amount exceeds allowed limit');
    }
    return parsed;
  }

  async getWallet(userId: string): Promise<any> {
    await connectDB();

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance_usd: 0,
        balance_lbp: 0,
      });
      await wallet.save();
    }

    return wallet;
  }

  async deductBalance(
    userId: string,
    amount: number,
    currency: 'USD' | 'LBP',
    orderId: string,
    notes?: string
  ): Promise<IWalletTransaction> {
    await connectDB();

    const parsedAmount = this.sanitizeAmount(amount);
    if (parsedAmount < 0) {
      throw new ApiError(400, 'Invalid amount');
    }

    await this.getWallet(userId);
    const balanceKey = this.getBalanceKey(currency);

    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        userId,
        [balanceKey]: { $gte: parsedAmount },
      },
      {
        $inc: { [balanceKey]: -parsedAmount },
        $set: { lastUpdated: new Date() },
      },
      { new: true }
    );

    if (!updatedWallet) {
      const wallet = await Wallet.findOne({ userId }).lean();
      const currentBalance = Number((wallet as any)?.[balanceKey] || 0);
      throw new ApiError(
        400,
        'Insufficient wallet balance',
        { required: parsedAmount, available: currentBalance }
      );
    }

    const balanceAfter = Number((updatedWallet as any)[balanceKey] || 0);
    const balanceBefore = Number((balanceAfter + parsedAmount).toFixed(6));

    // Log transaction
    const transaction = new WalletTransaction({
      userId,
      type: 'purchase',
      amount: parsedAmount,
      currency,
      balanceBefore,
      balanceAfter,
      orderId,
      notes,
    });

    await transaction.save();
    return transaction;
  }

  async refundBalance(
    userId: string,
    amount: number,
    currency: 'USD' | 'LBP',
    orderId: string,
    reason: string
  ): Promise<IWalletTransaction> {
    await connectDB();

    const parsedAmount = this.sanitizeAmount(amount);
    if (parsedAmount < 0) {
      throw new ApiError(400, 'Invalid amount');
    }

    await this.getWallet(userId);
    const balanceKey = this.getBalanceKey(currency);
    const currentWallet = await Wallet.findOne({ userId }).select(balanceKey).lean();
    const balanceBefore = Number((currentWallet as any)?.[balanceKey] || 0);

    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: { [balanceKey]: parsedAmount },
        $set: { lastUpdated: new Date() },
      },
      { new: true }
    );

    const balanceAfter = Number((updatedWallet as any)?.[balanceKey] || balanceBefore + parsedAmount);

    // Log transaction
    const transaction = new WalletTransaction({
      userId,
      type: 'refund',
      amount: parsedAmount,
      currency,
      balanceBefore,
      balanceAfter,
      orderId,
      notes: `Refund: ${reason}`,
    });

    await transaction.save();
    return transaction;
  }

  async addBalance(
    userId: string,
    amount: number,
    currency: 'USD' | 'LBP',
    notes?: string,
    approvedBy?: string
  ): Promise<IWalletTransaction> {
    await connectDB();

    const parsedAmount = this.sanitizeAmount(amount);
    await this.getWallet(userId);

    const balanceKey = this.getBalanceKey(currency);
    const currentWallet = await Wallet.findOne({ userId }).select(balanceKey).lean();
    const balanceBefore = Number((currentWallet as any)?.[balanceKey] || 0);

    const query: Record<string, any> = { userId };
    if (parsedAmount < 0) {
      query[balanceKey] = { $gte: Math.abs(parsedAmount) };
    }

    const updatedWallet = await Wallet.findOneAndUpdate(
      query,
      {
        $inc: { [balanceKey]: parsedAmount },
        $set: { lastUpdated: new Date() },
      },
      { new: true }
    );

    if (!updatedWallet) {
      throw new ApiError(400, 'Insufficient wallet balance');
    }

    const balanceAfter = Number((updatedWallet as any)[balanceKey] || 0);

    const transaction = new WalletTransaction({
      userId,
      type: parsedAmount >= 0 ? 'deposit' : 'manual_adjustment',
      amount: Math.abs(parsedAmount),
      currency,
      balanceBefore,
      balanceAfter,
      notes,
      approvedBy,
    });

    await transaction.save();
    return transaction;
  }

  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: IWalletTransaction[]; total: number }> {
    await connectDB();

    const transactions = (await WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()) as unknown as IWalletTransaction[];

    const total = await WalletTransaction.countDocuments({ userId });

    return { transactions, total };
  }
}

export default new WalletService();
