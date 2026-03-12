import { startDailycardPriceSyncScheduler } from '@/lib/services/dailycardPriceSyncScheduler'

export async function register() {
  startDailycardPriceSyncScheduler()
}
