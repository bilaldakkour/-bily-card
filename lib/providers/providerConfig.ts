export type ProviderSlot = 'primary' | 'secondary';

export interface ProviderApiConfig {
  slot: ProviderSlot;
  label: string;
  base: string;
  key: string;
  secret: string;
  enabled: boolean;
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = String(value || '').trim();
    if (trimmed) return trimmed;
  }

  return '';
}

export function getProviderApiConfig(slot: ProviderSlot = 'primary'): ProviderApiConfig {
  const primaryBase = firstNonEmpty(
    process.env.DAILYCARD_API_BASE,
    process.env.PROVIDER_API_URL,
    'https://dailycard.shop/UAPI/api-keys'
  );

  if (slot === 'secondary') {
    const key = firstNonEmpty(
      process.env.SECONDARY_PROVIDER_API_KEY,
      process.env.PROVIDER_API_KEY_2,
      process.env.DAILYCARD_API_KEY_2
    );
    const secret = firstNonEmpty(
      process.env.SECONDARY_PROVIDER_API_SECRET,
      process.env.PROVIDER_API_SECRET_2,
      process.env.DAILYCARD_API_SECRET_2
    );
    const base = firstNonEmpty(
      process.env.SECONDARY_PROVIDER_API_BASE,
      process.env.SECONDARY_PROVIDER_API_URL,
      process.env.PROVIDER_API_URL_2,
      process.env.DAILYCARD_API_BASE_2,
      primaryBase
    );

    return {
      slot,
      label: 'Secondary API',
      base,
      key,
      secret,
      enabled: Boolean(key && secret),
    };
  }

  const key = firstNonEmpty(process.env.DAILYCARD_API_KEY, process.env.PROVIDER_API_KEY);
  const secret = firstNonEmpty(process.env.DAILYCARD_API_SECRET, process.env.PROVIDER_API_SECRET);

  return {
    slot,
    label: 'Primary API',
    base: primaryBase,
    key,
    secret,
    enabled: Boolean(key && secret),
  };
}

export function providerHeaders(config: ProviderApiConfig) {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': config.key,
    'X-API-Secret': config.secret,
  };
}
