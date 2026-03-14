import type { Product } from './products';
import { classifyCatalogProduct } from './catalogTaxonomy';
import { getCatalogCurationRule } from './catalogCuration';

export type CatalogDisplayProduct = Product & {
  groupKey: string;
  groupSlug: string;
  childCount: number;
  childSlugs: string[];
  groupChildren: Product[];
  isGroupedParent: boolean;
};

const VARIANT_TOKENS = new Set([
  'unit',
  'units',
  'counter',
  'counters',
  'count',
  'counts',
  'package',
  'packages',
  'pkg',
  'code',
  'codes',
  'card',
  'cards',
  'month',
  'months',
  'year',
  'years',
  'week',
  'weeks',
  'day',
  'days',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'followers',
  'likes',
  'views',
  'view',
  'coins',
  'coin',
  'diamonds',
  'diamond',
  'gems',
  'gem',
  'uc',
  'cp',
  'vip',
  'prime',
  'pass',
  'gold',
  'elite',
]);

const GENERIC_TOKENS = new Set([
  'product',
  'products',
  'digital',
  'services',
  'service',
  'bilycard',
]);

const GENERIC_SLUG_PATTERNS = [/^product$/u, /^pkg$/u];

const tokenize = (value: string) =>
  String(value || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const isNumericToken = (token: string) => /^\d+$/u.test(token);

const isGenericToken = (token: string) =>
  GENERIC_TOKENS.has(token) || GENERIC_SLUG_PATTERNS.some((pattern) => pattern.test(token));

function trimVariantTail(tokens: string[]): string[] {
  const next = [...tokens];

  while (next.length > 1) {
    const tail = next[next.length - 1];
    if (VARIANT_TOKENS.has(tail) || isNumericToken(tail)) {
      next.pop();
      continue;
    }
    break;
  }

  return next;
}

function buildBaseTokens(source: string, fallbackLength = 2): string[] {
  const tokens = trimVariantTail(tokenize(source)).filter((token) => !isGenericToken(token));

  if (!tokens.length) return [];

  if (tokens.length <= fallbackLength) return tokens;

  return tokens;
}

function getSlugBaseTokens(product: Product): string[] {
  const rawTokens = buildBaseTokens(product.slug, 3);
  const filtered = rawTokens.filter((token) => !isNumericToken(token));

  if (!filtered.length) return [];

  return filtered;
}

function getNameBaseTokens(product: Product): string[] {
  const rawTokens = buildBaseTokens(product.name, 3);

  if (!rawTokens.length) return [];

  const stableTokens = rawTokens.filter((token, index) => {
    if (index === 0) return true;
    return !VARIANT_TOKENS.has(token) || rawTokens.length === 1;
  });

  return stableTokens.length ? stableTokens : rawTokens;
}

function deriveGroupTokens(product: Product): string[] {
  const slugTokens = getSlugBaseTokens(product);

  if (slugTokens.length && !slugTokens.every((token) => isGenericToken(token))) {
    return slugTokens;
  }

  const nameTokens = getNameBaseTokens(product);
  if (nameTokens.length) return nameTokens;

  return tokenize(product.slug || product.name).slice(0, 3);
}

function toTitleCase(token: string): string {
  if (token.toUpperCase() === token && token.length <= 5) return token;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function deriveDisplayName(product: Product, groupTokens: string[]): string {
  if (!groupTokens.length) return product.name;

  const cleanedNameTokens = trimVariantTail(tokenize(product.name)).filter((token) => !isGenericToken(token));
  const cleanedName = cleanedNameTokens.join(' ').trim();
  const groupLabel = groupTokens.map(toTitleCase).join(' ').trim();

  if (!cleanedName) return groupLabel || product.name;

  if (cleanedName.startsWith(groupTokens.join(' '))) {
    return cleanedName
      .split(' ')
      .slice(0, groupTokens.length)
      .map(toTitleCase)
      .join(' ');
  }

  return groupLabel || product.name;
}

function getModeScore(product: Product): number {
  const hasPackage = product.inputFields?.some((field) => field.name === 'package' && field.type === 'select');
  const hasCount = product.inputFields?.some((field) => field.name === 'count' && field.type === 'number');

  if (hasPackage) return 3;
  if (hasCount) return 2;
  return 1;
}

function getPrimaryProduct(products: Product[], preferredSlug?: string): Product {
  if (preferredSlug) {
    const preferred = products.find((product) => String(product.slug).toLowerCase() === preferredSlug.toLowerCase());
    if (preferred) return preferred;
  }

  return [...products].sort((a, b) => {
    const scoreA =
      (a.bestSeller ? 40 : 0) +
      (a.featured ? 20 : 0) +
      (a.stockStatus === 'in_stock' ? 10 : a.stockStatus === 'limited' ? 5 : 0) +
      getModeScore(a);
    const scoreB =
      (b.bestSeller ? 40 : 0) +
      (b.featured ? 20 : 0) +
      (b.stockStatus === 'in_stock' ? 10 : b.stockStatus === 'limited' ? 5 : 0) +
      getModeScore(b);

    if (scoreA !== scoreB) return scoreB - scoreA;
    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return a.slug.localeCompare(b.slug);
  })[0];
}

function getGroupStockStatus(products: Product[]): Product['stockStatus'] {
  if (products.some((product) => product.stockStatus === 'in_stock')) return 'in_stock';
  if (products.some((product) => product.stockStatus === 'limited')) return 'limited';
  return 'out_of_stock';
}

export function groupCatalogProducts(products: Product[]): CatalogDisplayProduct[] {
  const groups = new Map<string, Product[]>();

  for (const product of products) {
    const normalizedCategory = classifyCatalogProduct(product).category;
    const curated = getCatalogCurationRule(product);
    const groupTokens = deriveGroupTokens(product);
    const fallbackToken = tokenize(product.slug || product.name).slice(0, 3).join('-') || product.slug;
    const groupBase = curated.group?.key || groupTokens.join('-') || fallbackToken;
    const groupKey = `${normalizedCategory}:${groupBase}`;
    const bucket = groups.get(groupKey) || [];
    bucket.push(product);
    groups.set(groupKey, bucket);
  }

  return Array.from(groups.entries())
    .map(([groupKey, children]) => {
      const curatedGroup = children
        .map((child) => getCatalogCurationRule(child).group)
        .find(Boolean);
      const primary = getPrimaryProduct(children, curatedGroup?.preferredSlug);
      const groupTokens = deriveGroupTokens(primary);
      const priceList = children
        .map((child) => Number(child.startingPrice ?? child.price))
        .filter((price) => Number.isFinite(price) && price >= 0);
      const normalizedChildren = [...children].sort((a, b) => a.name.localeCompare(b.name));
      const groupDisplayName =
        curatedGroup?.name || (normalizedChildren.length > 1 ? deriveDisplayName(primary, groupTokens) : primary.name);

      return {
        ...primary,
        name: groupDisplayName || primary.name,
        price: priceList.length ? Math.min(...priceList) : primary.price,
        startingPrice: priceList.length ? Math.min(...priceList) : primary.startingPrice,
        stockStatus: getGroupStockStatus(children),
        featured: children.some((child) => child.featured),
        bestSeller: children.some((child) => child.bestSeller),
        groupKey,
        groupSlug: primary.slug,
        slug: primary.slug,
        childCount: normalizedChildren.length,
        childSlugs: normalizedChildren.map((child) => child.slug),
        groupChildren: normalizedChildren,
        isGroupedParent: normalizedChildren.length > 1,
      } satisfies CatalogDisplayProduct;
    })
    .sort((a, b) => {
      if (a.bestSeller !== b.bestSeller) return a.bestSeller ? -1 : 1;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function findGroupedProductBySlug(
  products: Product[],
  slug: string
): CatalogDisplayProduct | undefined {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug) return undefined;

  return groupCatalogProducts(products).find((product) => {
    if (product.slug === normalizedSlug) return true;
    return product.childSlugs.some((childSlug) => String(childSlug).toLowerCase() === normalizedSlug);
  });
}
