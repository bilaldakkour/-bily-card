import { normalizeProductProviderMode, type ProductProviderMode } from '@/lib/products/providerMode';

type InputFieldLike = {
  name?: string | null;
  type?: string | null;
};

type ManualCountPricingCandidate = {
  providerMode?: ProductProviderMode | string | null;
  inputFields?: InputFieldLike[] | null;
};

type DecimalParts = {
  negative: boolean;
  digits: bigint;
  scale: number;
};

function expandExponentialNotation(value: string): string {
  const trimmed = String(value || '').trim();
  if (!/[eE]/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
  if (!match) return trimmed;

  const [, sign = '', integerPart = '0', fractionPart = '', exponentRaw = '0'] = match;
  const exponent = Number(exponentRaw);

  if (!Number.isInteger(exponent)) return trimmed;

  const digits = `${integerPart}${fractionPart}`.replace(/^0+/, '') || '0';
  const decimalIndex = integerPart.length;
  const shiftedIndex = decimalIndex + exponent;

  if (shiftedIndex <= 0) {
    return `${sign}0.${'0'.repeat(Math.abs(shiftedIndex))}${digits}`;
  }

  if (shiftedIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(shiftedIndex - digits.length)}`;
  }

  return `${sign}${digits.slice(0, shiftedIndex)}.${digits.slice(shiftedIndex)}`;
}

function normalizeDecimalInput(value: number | string): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '0';
    return expandExponentialNotation(value.toString());
  }

  const trimmed = String(value || '').trim();
  if (!trimmed) return '0';
  return expandExponentialNotation(trimmed);
}

function parseDecimalParts(value: number | string): DecimalParts {
  const normalized = normalizeDecimalInput(value);
  const negative = normalized.startsWith('-');
  const unsigned = normalized.replace(/^[+-]/, '');

  if (!/^\d*(?:\.\d*)?$/.test(unsigned)) {
    return {
      negative: false,
      digits: BigInt(0),
      scale: 0,
    };
  }

  const [rawInteger = '0', rawFraction = ''] = unsigned.split('.');
  const integerPart = rawInteger.replace(/^0+(?=\d)/, '') || '0';
  const fractionPart = rawFraction.replace(/[^0-9]/g, '');
  const digitsText = `${integerPart}${fractionPart}`.replace(/^0+/, '') || '0';

  return {
    negative,
    digits: BigInt(digitsText),
    scale: fractionPart.length,
  };
}

function formatDecimalFromParts(value: bigint, scale: number): string {
  const negative = value < BigInt(0);
  const unsigned = (negative ? -value : value).toString();

  if (scale <= 0) {
    return `${negative ? '-' : ''}${unsigned}`;
  }

  const padded = unsigned.padStart(scale + 1, '0');
  const integerPart = padded.slice(0, -scale) || '0';
  const fractionPart = padded.slice(-scale).replace(/0+$/, '');

  if (!fractionPart) {
    return `${negative ? '-' : ''}${integerPart}`;
  }

  return `${negative ? '-' : ''}${integerPart}.${fractionPart}`;
}

function multiplyDecimalValues(left: number | string, right: number | string): string {
  const leftParts = parseDecimalParts(left);
  const rightParts = parseDecimalParts(right);
  const combinedScale = leftParts.scale + rightParts.scale;
  const sign =
    leftParts.negative === rightParts.negative ? BigInt(1) : BigInt(-1);
  const product = leftParts.digits * rightParts.digits * sign;

  return formatDecimalFromParts(product, combinedScale);
}

function roundDecimalValue(value: number | string, decimals: number): number {
  const safeDecimals = Math.max(0, Math.floor(Number(decimals) || 0));
  const parts = parseDecimalParts(value);

  if (parts.scale <= safeDecimals) {
    const signedValue = parts.negative ? -parts.digits : parts.digits;
    return Number(formatDecimalFromParts(signedValue, parts.scale));
  }

  const scaleDelta = parts.scale - safeDecimals;
  const divisor = BigInt(10) ** BigInt(scaleDelta);
  const remainder = parts.digits % divisor;
  let roundedDigits = parts.digits / divisor;

  if (remainder * BigInt(2) >= divisor) {
    roundedDigits += BigInt(1);
  }

  const signedValue = parts.negative ? -roundedDigits : roundedDigits;
  return Number(formatDecimalFromParts(signedValue, safeDecimals));
}

export function isManualCountProduct(product?: ManualCountPricingCandidate | null): boolean {
  if (!product) return false;

  const providerMode = normalizeProductProviderMode(product.providerMode, 'primary');
  if (providerMode !== 'manual') return false;

  const inputFields = Array.isArray(product.inputFields) ? product.inputFields : [];
  return inputFields.some(
    (field) =>
      String(field?.name || '').trim().toLowerCase() === 'count' &&
      String(field?.type || '').trim().toLowerCase() === 'number'
  );
}

export function calculateManualCountTotal(quantity: number | string, unitPrice: number | string): number {
  return Number(multiplyDecimalValues(quantity, unitPrice));
}

export function calculateManualCountTotalRounded(
  quantity: number | string,
  unitPrice: number | string,
  decimals = 6
): number {
  return roundDecimalValue(multiplyDecimalValues(quantity, unitPrice), decimals);
}

function normalizeManualMarginPercent(value: number | string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (parsed > 1000) return 1000;
  return parsed;
}

export function calculateManualInternalCostTotal(
  saleTotal: number | string,
  productPercent: number | string,
  decimals = 6
): number {
  const sale = Number(saleTotal || 0);
  const percent = normalizeManualMarginPercent(productPercent);

  if (!Number.isFinite(sale) || sale <= 0 || percent <= 0) {
    return Number(Number.isFinite(sale) ? sale.toFixed(decimals) : 0);
  }

  const ratio = 1 + percent / 100;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return Number(sale.toFixed(decimals));
  }

  return Number((sale / ratio).toFixed(decimals));
}

export function calculateManualInternalProfitTotal(
  saleTotal: number | string,
  productPercent: number | string,
  decimals = 6
): number {
  const sale = Number(saleTotal || 0);
  const costTotal = calculateManualInternalCostTotal(sale, productPercent, decimals);

  if (!Number.isFinite(sale) || sale <= 0) {
    return 0;
  }

  return Number((sale - costTotal).toFixed(decimals));
}

export function calculateManualInternalCostUnitPrice(
  saleUnitPrice: number | string,
  productPercent: number | string,
  decimals = 12
): number {
  const sale = Number(saleUnitPrice || 0);
  const percent = normalizeManualMarginPercent(productPercent);

  if (!Number.isFinite(sale) || sale <= 0 || percent <= 0) {
    return Number(Number.isFinite(sale) ? sale.toFixed(decimals) : 0);
  }

  const ratio = 1 + percent / 100;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return Number(sale.toFixed(decimals));
  }

  return Number((sale / ratio).toFixed(decimals));
}
