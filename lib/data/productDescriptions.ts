import { classifyCatalogProduct } from './catalogTaxonomy';
import type { Product } from './products';

const GENERIC_DESCRIPTION_PATTERNS = [
  'package-based digital product with instant delivery',
  'count-based digital product with instant delivery',
  'choose a package and get instant digital delivery',
];

const TRUST_SIGNAL_PATTERN = /\b(bily\s*card|secure|safe|fast|instant|delivery|checkout|trusted|reliable|minutes|email)\b/i;
const BRAND_PATTERN = /\bbily\s*card\b/i;

const CATEGORY_COPY: Record<string, { label: string; action: string }> = {
  cards: { label: 'digital card or code', action: 'Get' },
  applications: { label: 'app package or digital service', action: 'Order' },
  games: { label: 'game top-up or package', action: 'Top up' },
  wallets: { label: 'wallet balance or transfer', action: 'Add' },
  balance: { label: 'balance top-up', action: 'Add' },
  'social-media': { label: 'social media package', action: 'Order' },
  entertainment: { label: 'entertainment subscription', action: 'Activate' },
  'accounts-subscriptions': { label: 'account or subscription package', action: 'Activate' },
  'redemption-coupons': { label: 'coupon or activation code', action: 'Redeem' },
};

function normalizeText(value: string | undefined | null): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isGenericDescription(value: string | undefined | null): boolean {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return true;

  return GENERIC_DESCRIPTION_PATTERNS.some(
    (pattern) => normalized === pattern || normalized.includes(pattern)
  );
}

function hasPackageField(product: Product): boolean {
  return Boolean(
    product.inputFields?.some((field) => field.type === 'select' && field.name === 'package')
  );
}

function hasCountField(product: Product): boolean {
  return Boolean(
    product.inputFields?.some((field) => field.type === 'number' && field.name === 'count')
  );
}

function getCategoryCopy(product: Product) {
  const categoryId = classifyCatalogProduct(product).category;
  return CATEGORY_COPY[categoryId] || { label: 'digital product', action: 'Order' };
}

function buildShortDescription(product: Product): string {
  const { action } = getCategoryCopy(product);

  if (hasPackageField(product)) {
    return `${action} ${product.name} through Bily Card with clear package choices, secure checkout, and fast digital delivery.`;
  }

  if (hasCountField(product)) {
    return `${action} ${product.name} through Bily Card with flexible quantity selection, secure checkout, and fast processing.`;
  }

  return `${action} ${product.name} through Bily Card with fast delivery, secure checkout, and a smooth order flow.`;
}

function buildLeadSentence(product: Product): string {
  const { action, label } = getCategoryCopy(product);

  if (hasPackageField(product)) {
    return `${action} ${product.name} through Bily Card and choose the package that fits your needs with clear pricing and a reliable checkout flow.`;
  }

  if (hasCountField(product)) {
    return `${action} ${product.name} through Bily Card as a flexible ${label} with quantity-based ordering and straightforward pricing.`;
  }

  return `${action} ${product.name} through Bily Card for a smooth ${label} purchase with clear steps and dependable processing.`;
}

function buildModeSentence(product: Product): string {
  if (hasPackageField(product)) {
    return 'Pick the package that matches your use case and complete your order in a few simple steps.';
  }

  if (hasCountField(product)) {
    return 'Set the quantity you need and place your order with a clear, flexible checkout experience.';
  }

  return 'The order flow is kept simple so you can complete your purchase quickly and confidently.';
}

function buildBrandSentence(): string {
  return 'Bily Card focuses on speed, secure checkout, and a reliable digital buying experience from start to finish.';
}

function buildDeliverySentence(product: Product): string {
  const deliveryTime = normalizeText(product.deliveryTime);

  if (product.stockStatus === 'out_of_stock') {
    return 'Availability may vary for this item, and fulfillment resumes as soon as stock is available again.';
  }

  if (product.stockStatus === 'limited') {
    return deliveryTime
      ? `Fulfillment is handled as quickly as possible based on current availability, with an expected turnaround of ${deliveryTime}.`
      : 'Fulfillment is handled as quickly as possible based on current availability.';
  }

  if (!deliveryTime) {
    return 'Delivery is processed quickly after payment confirmation.';
  }

  if (/email/i.test(deliveryTime)) {
    return 'Delivery is processed quickly after payment confirmation using the details provided with your order.';
  }

  if (/instant/i.test(deliveryTime)) {
    return 'Delivery is processed quickly after payment confirmation, typically within a short time.';
  }

  return `Expected delivery time: ${deliveryTime}.`;
}

function joinUniqueSentences(parts: Array<string | undefined>): string {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    const normalized = normalizeText(part);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result.join(' ');
}

export function enrichProductDescriptions<T extends Product>(product: T): T {
  const shortDescription = normalizeText(product.shortDescription);
  const fullDescription = normalizeText(product.fullDescription);
  const generatedShort = buildShortDescription(product);
  const generatedLead = buildLeadSentence(product);
  const combinedSource = `${shortDescription} ${fullDescription}`.trim();

  const nextShortDescription = isGenericDescription(shortDescription)
    ? generatedShort
    : shortDescription;

  let nextFullDescription = fullDescription;

  if (isGenericDescription(fullDescription)) {
    nextFullDescription = joinUniqueSentences([
      generatedLead,
      buildModeSentence(product),
      buildBrandSentence(),
      buildDeliverySentence(product),
    ]);
  } else {
    const additions: string[] = [];

    if (!BRAND_PATTERN.test(combinedSource)) {
      additions.push(buildBrandSentence());
    }

    if (!TRUST_SIGNAL_PATTERN.test(fullDescription)) {
      additions.push(buildDeliverySentence(product));
    }

    if (hasPackageField(product) && !/\bpackage|packages\b/i.test(combinedSource)) {
      additions.push(buildModeSentence(product));
    }

    if (hasCountField(product) && !/\bcount|quantity\b/i.test(combinedSource)) {
      additions.push(buildModeSentence(product));
    }

    nextFullDescription = joinUniqueSentences([fullDescription, ...additions]);
  }

  return {
    ...product,
    shortDescription: nextShortDescription,
    fullDescription: nextFullDescription,
  };
}
