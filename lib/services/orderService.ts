import { connectDB } from '../db/mongodb';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { IOrder } from '../types';
import { generateOrderId } from '../utils/helpers';
import providerService from './providerService';
import telegramService from './telegramService';
import walletService from './walletService';
import googleSheetsService from './googleSheetsService';
import { ApiError } from '../utils/errors';

export class OrderService {
  async createOrder(
    userId: string,
    productId: string,
    playerId: string,
    quantity: number = 1
  ): Promise<IOrder> {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const product = await Product.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

    if (!product.activeStatus) {
      throw new ApiError(400, 'This product is currently inactive');
    }

    // Check for duplicate pending order
    const existingOrder = await Order.findOne({
      userId,
      productId,
      playerId,
      status: 'pending',
    });

    if (existingOrder) {
      throw new ApiError(
        400,
        'You have a pending order for this product'
      );
    }

    // Deduct wallet
    try {
      const totalPrice = product.sellingPrice * quantity;
      await walletService.deductBalance(
        userId,
        totalPrice,
        'USD',
        '', // temp orderId
        `Purchase: ${product.productName}`
      );
    } catch (error: any) {
      throw error;
    }

    // Create order record
    const orderId = generateOrderId();
    const order = new Order({
      orderId,
      userId,
      customerName: user.displayName,
      customerUsername: user.username,
      productId,
      productName: product.productName,
      playerId,
      quantity,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      profit: (product.sellingPrice - product.costPrice) * quantity,
      currency: 'USD',
      status: 'processing',
    });

    await order.save();

    // Send to provider
    try {
      const providerResponse = await providerService.createOrder({
        productId: product.providerProductId,
        playerId,
        quantity,
      });

      order.providerOrderId = providerResponse.orderId;
      order.providerResponse = providerResponse;
      order.status = 'completed';
    } catch (error: any) {
      order.status = 'failed';
      order.failureReason = error.message;

      // Refund wallet
      await walletService.refundBalance(
        userId,
        product.sellingPrice * quantity,
        'USD',
        orderId,
        'Provider service error'
      );
    }

    await order.save();

    // Log to Google Sheets
    try {
      await googleSheetsService.appendOrder(order as any);
    } catch (error) {
      console.error('Failed to sync order to Google Sheets');
    }

    // Send notifications
    await telegramService.sendAdminNotification('New Order', {
      orderId: order.orderId,
      customer: user.displayName,
      product: product.productName,
      playerId,
      status: order.status,
    });

    return order;
  }

  async getOrderStatus(orderId: string): Promise<IOrder> {
    await connectDB();

    const order = await Order.findOne({ orderId });
    if (!order) throw new ApiError(404, 'Order not found');

    return order;
  }

  async getUserOrders(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ orders: IOrder[]; total: number }> {
    await connectDB();

    const orders = (await Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()) as unknown as IOrder[];

    const total = await Order.countDocuments({ userId });

    return { orders, total };
  }

  async retryFailedOrder(orderId: string): Promise<IOrder> {
    await connectDB();

    const order = await Order.findOne({ orderId });
    if (!order) throw new ApiError(404, 'Order not found');

    if (order.status !== 'failed') {
      throw new ApiError(400, 'Only failed orders can be retried');
    }

    if (order.retryCount >= 3) {
      throw new ApiError(400, 'Maximum retry attempts reached');
    }

    try {
      const providerResponse = await providerService.createOrder({
        productId: order.productId as any,
        playerId: order.playerId,
        quantity: order.quantity,
      });

      order.providerOrderId = providerResponse.orderId;
      order.providerResponse = providerResponse;
      order.status = 'completed';
      order.retryCount += 1;
    } catch (error: any) {
      order.failureReason = error.message;
      order.retryCount += 1;
    }

    await order.save();
    return order;
  }
}

export default new OrderService();
