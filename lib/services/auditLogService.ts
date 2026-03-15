import AdminAuditLog from '@/lib/models/AdminAuditLog';
import { sendAdminNotification } from '@/lib/services/adminNotificationService';

interface LogInput {
  adminUserId: string;
  action: string;
  targetType: 'user' | 'order' | 'deposit' | 'wallet' | 'system';
  targetId?: string;
  details?: Record<string, any>;
}

function buildAuditNotification(input: LogInput) {
  const details = input.details || {};

  switch (input.action) {
    case 'order_approve':
      return {
        title: 'Admin Action - Order Approved',
        lines: [
          `Order ID: ${String(details.orderId || input.targetId || '-')}`,
          `Admin User ID: ${input.adminUserId}`,
        ],
      };
    case 'order_reject':
      return {
        title: 'Admin Action - Order Rejected',
        lines: [
          `Order ID: ${String(details.orderId || input.targetId || '-')}`,
          `Refund: ${String(details.refundAmount || '-')}`,
          `Currency: ${String(details.refundCurrency || 'USD')}`,
          `Admin User ID: ${input.adminUserId}`,
        ],
      };
    case 'deposit_approve':
      return {
        title: 'Admin Action - Deposit Approved',
        lines: [
          `Deposit ID: ${String(input.targetId || '-')}`,
          `Amount: ${String(details.amount || '-')}`,
          `Currency: ${String(details.currency || 'USD')}`,
          `User ID: ${String(details.userId || '-')}`,
        ],
      };
    case 'deposit_reject':
      return {
        title: 'Admin Action - Deposit Rejected',
        lines: [
          `Deposit ID: ${String(input.targetId || '-')}`,
          `Amount: ${String(details.amount || '-')}`,
          `Currency: ${String(details.currency || 'USD')}`,
          `Reason: ${String(details.reason || '-')}`,
        ],
      };
    case 'product_updated':
      return {
        title: 'Admin Action - Product Updated',
        lines: [
          `Product: ${String(input.targetId || '-')}`,
          `Source: ${String(details.source || '-')}`,
          `Fields: ${Array.isArray(details.fields) ? details.fields.join(', ') : '-'}`,
        ],
      };
    case 'product_deleted':
      return {
        title: 'Admin Action - Product Deleted',
        lines: [
          `Product: ${String(input.targetId || '-')}`,
          `Mode: ${String(details.mode || '-')}`,
        ],
      };
    default:
      return {
        title: `Admin Action - ${input.action}`,
        lines: [
          `Target Type: ${input.targetType}`,
          `Target ID: ${String(input.targetId || '-')}`,
          `Admin User ID: ${input.adminUserId}`,
        ],
      };
  }
}

export async function logAdminAction(input: LogInput) {
  try {
    await AdminAuditLog.create({
      adminUserId: input.adminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details || {},
    });

    await sendAdminNotification(buildAuditNotification(input));
  } catch (error) {
    // Logging failures should never block business operations.
    console.error('Failed to write admin audit log:', error);
  }
}
