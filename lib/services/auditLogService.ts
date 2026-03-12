import AdminAuditLog from '@/lib/models/AdminAuditLog';

interface LogInput {
  adminUserId: string;
  action: string;
  targetType: 'user' | 'order' | 'deposit' | 'wallet' | 'system';
  targetId?: string;
  details?: Record<string, any>;
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
  } catch (error) {
    // Logging failures should never block business operations.
    console.error('Failed to write admin audit log:', error);
  }
}
