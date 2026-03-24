import { type ProviderSlot } from '@/lib/providers/providerConfig';
import { getProviderAdapterBySlotAndKey } from '@/lib/providers/registry';
import {
  mapNormalizedOrderStatusToLocal,
  mapProviderOrderStatus,
} from '@/lib/providers/statusMapping';

type ProviderSyncOrder = {
  orderId?: string | null;
  providerOrderId?: string | null;
  providerResponse?: Record<string, unknown> | null;
  providerStatus?: string | null;
  providerSlot?: string | null;
  status?: string | null;
};

export function mapProviderStatusToLocal(status?: string, providerKey?: string | null) {
  return mapNormalizedOrderStatusToLocal(
    mapProviderOrderStatus(String(providerKey || ''), status || 'pending')
  );
}

export function normalizeOrderProviderSlot(value: unknown): ProviderSlot | 'manual' {
  if (value === 'secondary') return 'secondary';
  if (value === 'manual') return 'manual';
  return 'primary';
}

export function hasProviderSyncReference(order: ProviderSyncOrder) {
  return Boolean(
    order.providerOrderId ||
      order.providerResponse?.transaction_id ||
      order.providerResponse?.order_id
  );
}

export async function fetchProviderOrderStatus(order: {
  providerSlot: ProviderSlot;
  providerKey?: string | null;
  orderId: string;
  providerOrderId?: string;
  providerResponse?: Record<string, unknown>;
}) {
  const adapter = getProviderAdapterBySlotAndKey({
    slot: order.providerSlot,
    key: order.providerKey,
  });
  if (!adapter || !adapter.isAvailable()) {
    return null;
  }

  return adapter.getOrderStatus({
    clientOrderId: order.orderId,
    providerOrderId: order.providerOrderId,
    providerResponse: order.providerResponse,
  });
}

export async function resolveProviderOrderSync(order: ProviderSyncOrder) {
  const providerSlot = normalizeOrderProviderSlot(order.providerSlot);
  const needsSync = ['pending', 'processing'].includes(String(order.status || '').toLowerCase());

  if (!needsSync || providerSlot === 'manual' || !hasProviderSyncReference(order)) {
    return null;
  }

  const providerKey = String(order.providerResponse?._providerAdapter || '').trim().toLowerCase() || null;

  const statusPayload = await fetchProviderOrderStatus({
    providerSlot,
    providerKey,
    orderId: String(order.orderId || ''),
    providerOrderId: String(order.providerOrderId || '') || undefined,
    providerResponse: order.providerResponse || undefined,
  });

  if (!statusPayload) {
    return null;
  }

  const providerStatus = String(
    (statusPayload as any)?.rawStatus ||
      (statusPayload as any)?.status ||
      (statusPayload as any)?.order_status ||
      (statusPayload as any)?.data?.status ||
      (statusPayload as any)?.details?.status ||
      order.providerStatus ||
      'pending'
  ).toLowerCase();

  const normalized = mapProviderOrderStatus(String(providerKey || ''), providerStatus);

  return {
    providerSlot,
    providerStatus,
    mappedStatus: mapNormalizedOrderStatusToLocal(normalized),
    statusPayload: (statusPayload as any)?.rawResponse || statusPayload,
  };
}
