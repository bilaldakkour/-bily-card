// Example customer message module
// This can be used to generate customer-facing messages without exposing internal data

export const CustomerMessages = {
  orderReceived: (productName: string, playerId: string) => ({
    title: 'Order Received',
    message: `Your order has been received successfully.\n\nProduct: ${productName}\nPlayer ID: ${playerId}\nStatus: Processing\n\nThank you for choosing Bily Card.`,
  }),

  orderProcessing: (productName: string, playerId: string, orderId: string) => ({
    title: 'Order Processing',
    message: `Your order is being processed.\n\nProduct: ${productName}\nPlayer ID: ${playerId}\nOrder ID: ${orderId}\nStatus: Processing\n\nThank you for choosing Bily Card.`,
  }),

  orderCompleted: (productName: string, playerId: string, quantity: number) => ({
    title: 'Order Completed',
    message: `Your order has been completed successfully!\n\nProduct: ${productName}\nQuantity: ${quantity}\nPlayer ID: ${playerId}\nStatus: Completed\n\nThank you for choosing Bily Card.`,
  }),

  orderFailed: (productName: string, playerId: string) => ({
    title: 'Order Failed',
    message: `Unfortunately, your order could not be completed.\n\nProduct: ${productName}\nPlayer ID: ${playerId}\n\nThe deducted amount has been refunded to your wallet. Please try again or contact support.\n\nThank you for choosing Bily Card.`,
  }),

  walletCharged: (amount: number, productName: string, balance: number) => ({
    title: 'Wallet Charged',
    message: `Your wallet has been charged.\n\nAmount: $${amount.toFixed(2)}\nProduct: ${productName}\nNew Balance: $${balance.toFixed(2)}\n\nThank you for choosing Bily Card.`,
  }),

  walletRefunded: (amount: number, reason: string, newBalance: number) => ({
    title: 'Wallet Refunded',
    message: `Your wallet has been refunded.\n\nAmount: $${amount.toFixed(2)}\nReason: ${reason}\nNew Balance: $${newBalance.toFixed(2)}\n\nThank you for choosing Bily Card.`,
  }),
};

// Admin message module (shows all internal data)
export const AdminMessages = {
  newOrder: (order: any) => ({
    title: 'New Order',
    data: {
      orderId: order.orderId,
      customerId: order.userId,
      customerName: order.customerName,
      customerUsername: order.customerUsername,
      productId: order.productId,
      productName: order.productName,
      gameName: order.gameName,
      playerId: order.playerId,
      quantity: order.quantity,
      costPrice: order.costPrice,
      sellingPrice: order.sellingPrice,
      profit: order.profit,
      currency: order.currency,
      status: order.orderStatus,
      createdAt: order.createdAt,
    },
  }),

  orderCompleted: (order: any) => ({
    title: 'Order Completed',
    data: {
      orderId: order.orderId,
      productName: order.productName,
      profit: order.profit,
      providerOrderId: order.providerOrderId,
      completedAt: new Date().toISOString(),
    },
  }),

  orderFailed: (order: any) => ({
    title: 'Order Failed',
    data: {
      orderId: order.orderId,
      productName: order.productName,
      failureReason: order.failureReason,
      retryCount: order.retryCount,
      failedAt: new Date().toISOString(),
    },
  }),

  walletAdjustment: (userId: string, adjustment: any) => ({
    title: 'Wallet Adjusted',
    data: {
      userId,
      amount: adjustment.amount,
      type: adjustment.type,
      balanceBefore: adjustment.balanceBefore,
      balanceAfter: adjustment.balanceAfter,
      approvedBy: adjustment.approvedBy,
      reason: adjustment.reason,
      adjustedAt: new Date().toISOString(),
    },
  }),

  syncFailed: (syncType: string, error: string) => ({
    title: 'Sync Failed',
    data: {
      syncType,
      error,
      failedAt: new Date().toISOString(),
      action: 'Check system logs and retry sync',
    },
  }),
};
