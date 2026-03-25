'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { ProductProviderMode } from '@/lib/products/providerMode';
import type { ProductProviderLink, ProductRoutingMode } from '@/lib/data/products';
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth';

type ProductMode = 'single' | 'package' | 'count';
type ProviderLinkFormRow = ProductProviderLink & { _uiKey: string };

interface PackageOption {
  key?: string;
  label: string;
  price: number;
  inStock: boolean;
  profitMarginPercent?: number;
  manualBaseCost?: number;
  roundingRule?: string;
  providerLinks?: ProductProviderLink[];
}

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  basePrice: number;
  productPercent: number;
  stockQuantity: number;
  stockStatus: string;
  saleEnabled?: boolean;
  providerMode?: ProductProviderMode;
  isCountProduct?: boolean;
}

interface ManageProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  image: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  costPrice?: number;
  platform: string;
  deliveryTime: string;
  stockQuantity: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  saleEnabled: boolean;
  tags: string[];
  featured: boolean;
  bestSeller: boolean;
  providerMode: ProductProviderMode;
  profitMarginPercent?: number;
  roundingRule?: string;
  routingMode?: ProductRoutingMode;
  providerLinks?: ProductProviderLink[];
  source: 'custom';
  mode: ProductMode;
  packageOptions: PackageOption[];
  countMin?: number;
  countMax?: number;
}

interface EditProductForm {
  catalogProductId?: string;
  slug: string;
  source: 'custom';
  name: string;
  category: string;
  image: string;
  shortDescription: string;
  fullDescription: string;
  price: string;
  costPrice: string;
  mode: ProductMode;
  packageLines: string;
  countMin: string;
  countMax: string;
  platform: string;
  deliveryTime: string;
  stockQuantity: string;
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  saleEnabled: boolean;
  tags: string;
  featured: boolean;
  bestSeller: boolean;
  providerMode: ProductProviderMode;
  profitMarginPercent: string;
  roundingRule: string;
  routingMode: ProductRoutingMode;
  providerLinks: ProviderLinkFormRow[];
}

interface PricingUser {
  _id: string;
  displayName: string;
  email: string;
  pricingPercent?: number;
}

interface CustomProductForm {
  name: string;
  slug: string;
  category: string;
  image: string;
  shortDescription: string;
  fullDescription: string;
  price: string;
  costPrice: string;
  mode: ProductMode;
  packageLines: string;
  countMin: string;
  countMax: string;
  platform: string;
  deliveryTime: string;
  stockQuantity: string;
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  saleEnabled: boolean;
  tags: string;
  providerMode: ProductProviderMode;
  profitMarginPercent: string;
  roundingRule: string;
  routingMode: ProductRoutingMode;
  providerLinks: ProviderLinkFormRow[];
}

const PROVIDER_MODE_OPTIONS: Array<{ value: ProductProviderMode; label: string; hint: string }> = [
  { value: 'primary', label: 'Primary API', hint: 'Use the current main API for this product.' },
  { value: 'manual', label: 'Manual / No API', hint: 'Keep orders local for manual processing only.' },
  { value: 'secondary', label: 'Secondary API', hint: 'Use the secondary API if it is configured.' },
];

const PROVIDER_MODE_LABELS: Record<ProductProviderMode, string> = {
  primary: 'Primary API',
  manual: 'Manual',
  secondary: 'Secondary API',
};

const PROVIDER_MODE_BADGES: Record<ProductProviderMode, string> = {
  primary: 'bg-cyan-600/20 text-cyan-200 border-cyan-400/30',
  manual: 'bg-amber-500/20 text-amber-100 border-amber-300/30',
  secondary: 'bg-violet-600/20 text-violet-100 border-violet-400/30',
};

const CATEGORY_OPTIONS = [
  { value: 'cards', label: 'Gift Cards (cards)' },
  { value: 'games', label: 'Games (games)' },
  { value: 'applications', label: 'Applications (applications)' },
  { value: 'wallets', label: 'Wallets (wallets)' },
  { value: 'balance', label: 'Balance / Topup (balance)' },
  { value: 'social-media', label: 'Social Media (social-media)' },
  { value: 'entertainment', label: 'Entertainment (entertainment)' },
  { value: 'accounts-subscriptions', label: 'Accounts & Subscriptions (accounts-subscriptions)' },
  { value: 'redemption-coupons', label: 'Redemption Coupons (redemption-coupons)' },
  { value: 'gift-cards', label: 'Legacy Gift Cards (gift-cards)' },
  { value: 'digital-services', label: 'Legacy Digital Services (digital-services)' },
];

const MODE_OPTIONS: Array<{ value: ProductMode; label: string; hint: string }> = [
  { value: 'single', label: 'Single', hint: 'One product with one fixed price.' },
  { value: 'package', label: 'Packages', hint: 'Multiple package options with separate prices.' },
  { value: 'count', label: 'Count', hint: 'Customer enters a count within your range.' },
];

const MODE_LABELS: Record<ProductMode, string> = {
  single: 'Single',
  package: 'Packages',
  count: 'Count',
};

const getDerivedStockStatus = (stockQuantityValue: string | number | null | undefined) =>
  Number(stockQuantityValue || 0) > 0 ? 'in_stock' : 'out_of_stock';

const getAdminAvailabilityLabel = (
  stockQuantityValue: string | number | null | undefined,
  saleEnabled: boolean
) => {
  if (!saleEnabled) return 'Closed';
  return Number(stockQuantityValue || 0) > 0 ? 'In Stock' : 'Out of Stock';
};

const getAdminAvailabilityBadgeClasses = (
  stockQuantityValue: string | number | null | undefined,
  saleEnabled: boolean
) => {
  if (!saleEnabled) return 'bg-amber-600 text-white';
  return Number(stockQuantityValue || 0) > 0
    ? 'bg-emerald-600 text-white'
    : 'bg-red-600 text-white';
};

const isManualCountPricingProduct = (product: Product) =>
  product.providerMode === 'manual' && product.isCountProduct === true;

const shouldShowManualPurchaseCost = (input: {
  source?: 'custom';
  providerMode?: ProductProviderMode;
  mode?: ProductMode;
}) =>
  input.source === 'custom' && input.providerMode === 'manual' && input.mode !== 'package';

const normalizeVariantKey = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim();

const normalizeStockQuantityInput = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

const parsePackageLines = (value: string) => {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelRaw, priceRaw, stockRaw] = line.split('|').map((part) => part.trim());
      const price = Number(priceRaw || 0);
      const label = String(labelRaw || '').trim();
      return {
        key: normalizeVariantKey(label),
        label,
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        inStock: String(stockRaw || 'in').toLowerCase() !== 'out',
      };
    })
    .filter((row) => row.label);
};

const formatPackageLines = (options: PackageOption[]) =>
  (Array.isArray(options) ? options : [])
    .map((option) => {
      const stockToken = option.inStock ? 'in' : 'out';
      return `${option.label}|${Number(option.price || 0)}|${stockToken}`;
    })
    .join('\n');

let providerLinkUiSeq = 0;
const nextProviderLinkUiKey = () => {
  providerLinkUiSeq += 1;
  return `plink-${providerLinkUiSeq}`;
};

const createEmptyProviderLink = (): ProviderLinkFormRow => ({
  _uiKey: nextProviderLinkUiKey(),
  providerCode: '',
  providerProductId: '',
  providerProductName: '',
  enabled: true,
  executionEnabled: true,
  priceSyncEnabled: true,
  priority: 100,
  priceSource: 'provider',
  manualCost: undefined,
  lastKnownCost: undefined,
  lastCost: undefined,
  providerAvailability: 'unknown',
  healthStatus: 'unknown',
  lastError: '',
  variantKey: '',
  fallbackEnabled: true,
});

const normalizeProviderLinks = (
  value: Array<ProductProviderLink | ProviderLinkFormRow> | undefined | null
) => {
  if (!Array.isArray(value)) return [];
  const rows: ProviderLinkFormRow[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const providerCode = String(raw?.providerCode || '').trim().toLowerCase();
    const providerProductId = String(raw?.providerProductId || '').trim();
    if (!providerCode || !providerProductId) continue;
    const key = `${providerCode}|${providerProductId.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      _uiKey: String((raw as ProviderLinkFormRow)?._uiKey || '').trim() || nextProviderLinkUiKey(),
      providerCode,
      providerProductId,
      providerProductName: String(raw?.providerProductName || '').trim() || undefined,
      enabled: raw?.enabled !== false,
      executionEnabled: raw?.executionEnabled !== false,
      priceSyncEnabled: raw?.priceSyncEnabled !== false,
      priority: Number.isFinite(Number(raw?.priority)) ? Number(raw?.priority) : 100,
      priceSource: raw?.priceSource === 'manual' ? 'manual' : 'provider',
      manualCost: Number.isFinite(Number(raw?.manualCost)) ? Number(raw?.manualCost) : undefined,
      lastKnownCost: Number.isFinite(Number(raw?.lastKnownCost)) ? Number(raw?.lastKnownCost) : undefined,
      lastCost: Number.isFinite(Number(raw?.lastCost)) ? Number(raw?.lastCost) : undefined,
      providerAvailability:
        raw?.providerAvailability === 'available'
          ? 'available'
          : raw?.providerAvailability === 'unavailable'
            ? 'unavailable'
            : 'unknown',
      healthStatus:
        raw?.healthStatus === 'healthy'
          ? 'healthy'
          : raw?.healthStatus === 'degraded'
            ? 'degraded'
            : raw?.healthStatus === 'unhealthy'
              ? 'unhealthy'
              : 'unknown',
      fallbackEnabled: raw?.fallbackEnabled !== false,
      lastError: String(raw?.lastError || '').trim() || undefined,
      variantKey: String(raw?.variantKey || '').trim().toLowerCase() || undefined,
      lastSyncAt: raw?.lastSyncAt,
    });
  }
  return rows;
};

const serializeProviderLinks = (value: ProviderLinkFormRow[] | undefined | null): ProductProviderLink[] =>
  normalizeProviderLinks(value).map(({ _uiKey, ...row }) => row);

const roundByRule = (value: number, rule?: string) => {
  const v = Number(value || 0);
  if (!Number.isFinite(v) || v <= 0) return 0;
  const r = String(rule || 'none').toLowerCase();
  if (r === 'ceil_0_01') return Number((Math.ceil(v * 100) / 100).toFixed(6));
  if (r === 'round_0_01') return Number((Math.round(v * 100) / 100).toFixed(6));
  if (r === 'ceil_0_1') return Number((Math.ceil(v * 10) / 10).toFixed(6));
  if (r === 'round_0_1') return Number((Math.round(v * 10) / 10).toFixed(6));
  if (r === 'ceil_1') return Number(Math.ceil(v).toFixed(6));
  if (r === 'round_1') return Number(Math.round(v).toFixed(6));
  return Number(v.toFixed(6));
};

const computeVariantPreview = (input: {
  links: ProductProviderLink[];
  routingMode: ProductRoutingMode;
  profitMarginPercent: number;
  customerDiscountPercent: number;
  roundingRule?: string;
  productCost?: number;
  variantKey?: string;
  providerQuote?: {
    unitCost?: number;
    cost?: number;
    providerCode?: string;
    providerProductId?: string;
    raw?: unknown;
  } | null;
}) => {
  const candidates = (Array.isArray(input.links) ? input.links : [])
    .filter((link) => {
      if (link.enabled === false) return false;
      if (link.executionEnabled === false) return false;
      if (String(link.providerAvailability || '').toLowerCase() === 'unavailable') return false;
      if (String(link.healthStatus || '').toLowerCase() === 'unhealthy') return false;
      const cost =
        link.priceSource === 'manual' && Number(link.manualCost || 0) > 0
          ? Number(link.manualCost || 0)
          : Number(link.lastCost ?? link.lastKnownCost ?? 0);
      return Number.isFinite(cost) && cost > 0;
    })
    .map((link) => ({
      link,
      cost:
        link.priceSource === 'manual' && Number(link.manualCost || 0) > 0
          ? Number(link.manualCost || 0)
          : Number(link.lastCost ?? link.lastKnownCost ?? 0),
      priority: Number.isFinite(Number(link.priority)) ? Number(link.priority) : 100,
    }));

  const providerQuoteUnitCost = Number(input.providerQuote?.unitCost ?? 0);
  const providerQuoteCost = Number(input.providerQuote?.cost ?? 0);
  const productCost = Number(input.productCost ?? 0);
  const fallbackCost =
    (Number.isFinite(providerQuoteUnitCost) && providerQuoteUnitCost > 0 ? providerQuoteUnitCost : 0) ||
    (Number.isFinite(providerQuoteCost) && providerQuoteCost > 0 ? providerQuoteCost : 0) ||
    (Number.isFinite(productCost) && productCost > 0 ? productCost : 0) ||
    0;

  if (!candidates.length && !(fallbackCost > 0)) {
    return {
      cheapestProvider: null as string | null,
      cheapestCost: null as number | null,
      sellBeforeDiscount: null as number | null,
      finalPrice: null as number | null,
      fallbackOrder: [] as string[],
    };
  }

  candidates.sort((a, b) => {
    if (input.routingMode === 'priority') {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.cost - b.cost;
    }
    if (a.cost !== b.cost) return a.cost - b.cost;
    return a.priority - b.priority;
  });

  const cheapest = candidates.length ? candidates[0] : null;
  const cheapestCostValue = cheapest ? cheapest.cost : fallbackCost;
  const margin = Number.isFinite(Number(input.profitMarginPercent))
    ? Number(input.profitMarginPercent)
    : 0;
  const discount = Number.isFinite(Number(input.customerDiscountPercent))
    ? Number(input.customerDiscountPercent)
    : 0;
  const sellBeforeDiscount = Number((cheapestCostValue * (1 + margin / 100)).toFixed(6));
  const final = roundByRule(
    sellBeforeDiscount * (1 - discount / 100),
    input.roundingRule || 'none'
  );

  const providerCodeFromQuote = String(input.providerQuote?.providerCode || '').trim();
  const providerIdFromQuote = String(input.providerQuote?.providerProductId || '').trim();
  const cheapestProviderText =
    cheapest
      ? `${String(cheapest.link.providerCode || '')}:${String(cheapest.link.providerProductId || '')}`
      : providerCodeFromQuote || providerIdFromQuote
        ? `${providerCodeFromQuote}:${providerIdFromQuote}`
        : null;

  console.log('PRICE DEBUG:', {
    providerProductId:
      providerIdFromQuote ||
      (cheapest ? String(cheapest.link.providerProductId || '') : ''),
    variantKey: String(input.variantKey || '').trim() || '__default__',
    cost: cheapestCostValue,
    providerQuote: input.providerQuote || null,
  });

  return {
    cheapestProvider: cheapestProviderText,
    cheapestCost: Number(cheapestCostValue.toFixed(6)),
    sellBeforeDiscount,
    finalPrice: final,
    fallbackOrder: candidates.map(
      (row) => `${String(row.link.providerCode || '')}:${String(row.link.providerProductId || '')}`
    ),
  };
};

const buildUcPubgDailyCardLinks = (input: {
  slug: string;
  name: string;
  catalogProductId?: string;
  packageLines: string;
  existingLinks: ProviderLinkFormRow[];
}) => {
  if (String(input.slug || '').trim().toLowerCase() !== 'uc-pubg') {
    return normalizeProviderLinks(input.existingLinks);
  }

  const existing = normalizeProviderLinks(input.existingLinks);
  if (existing.length > 0) return existing;

  const providerProductId = String(input.catalogProductId || '').trim();
  if (!providerProductId) return existing;

  const timestamp = new Date().toISOString();
  return parsePackageLines(input.packageLines).map((pkg) => ({
    _uiKey: nextProviderLinkUiKey(),
    providerCode: 'dailycard',
    providerProductId,
    providerProductName: `${String(input.name || 'UC PUBG').trim()} - ${pkg.label}`,
    enabled: true,
    executionEnabled: true,
    priceSyncEnabled: true,
    priority: 100,
    priceSource: 'provider' as const,
    lastCost: Number(pkg.price || 0),
    lastKnownCost: Number(pkg.price || 0),
    providerAvailability: 'available' as const,
    healthStatus: 'healthy' as const,
    variantKey: String(pkg.key || '').trim() || undefined,
    fallbackEnabled: true,
    lastError: '',
    lastSyncAt: timestamp,
  }));
};

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [manageProducts, setManageProducts] = useState<ManageProduct[]>([]);
  const [manageSearch, setManageSearch] = useState('');
  const [pricingSearch, setPricingSearch] = useState('');
  const [users, setUsers] = useState<PricingUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [editingProductSlug, setEditingProductSlug] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteSavingSlug, setDeleteSavingSlug] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditProductForm | null>(null);
  const [percentInputs, setPercentInputs] = useState<Record<string, string>>({});
  const [customSaving, setCustomSaving] = useState(false);
  const [customForm, setCustomForm] = useState<CustomProductForm>({
    name: '',
    slug: '',
    category: 'games',
    image: '',
    shortDescription: '',
      fullDescription: '',
      price: '0',
      costPrice: '',
      mode: 'single',
    packageLines: '',
    countMin: '1',
    countMax: '',
    platform: 'BilyCard',
    deliveryTime: 'Instant',
    stockQuantity: '0',
    stockStatus: 'out_of_stock',
    saleEnabled: true,
    tags: '',
    providerMode: 'manual',
    profitMarginPercent: '',
    roundingRule: 'none',
    routingMode: 'cheapest',
    providerLinks: [],
  });

  useEffect(() => {
    fetchProducts();
    fetchManageProducts();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = getAdminTokenOptional();
      const res = await fetch('/api/admin/users?limit=200', {
        headers: buildAdminAuthHeaders(token),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedUser = users.find((u) => u._id === selectedUserId) || null;
  const selectedUserPercent = Number(selectedUser?.pricingPercent || 0);

  const formatPrice = (value: number) => {
    const safe = Number(value || 0);
    if (!Number.isFinite(safe)) return '$0.00';
    if (safe >= 1) return `$${safe.toFixed(2)}`;
    if (safe >= 0.01) return `$${safe.toFixed(4)}`;
    return `$${safe.toFixed(6)}`;
  };

  const [editVariantProviderQuotes, setEditVariantProviderQuotes] = useState<
    Record<
      string,
      {
        unitCost?: number;
        cost?: number;
        providerCode?: string;
        providerProductId?: string;
        raw?: unknown;
      }
    >
  >({});

  const editPreviewFetchSignature = useMemo(() => {
    if (!editForm) return '';
    const links = normalizeProviderLinks(editForm.providerLinks).map((link) => ({
      providerCode: String(link.providerCode || '').trim().toLowerCase(),
      providerProductId: String(link.providerProductId || '').trim(),
      variantKey: normalizeVariantKey(link.variantKey || ''),
      enabled: link.enabled !== false,
      executionEnabled: link.executionEnabled !== false,
    }));
    const packages =
      editForm.mode === 'package'
        ? parsePackageLines(editForm.packageLines).map((row) => ({
            label: row.label,
            key: row.key,
          }))
        : [{ label: 'default', key: '__default__' }];
    return JSON.stringify({
      slug: String(editForm.slug || '').trim().toLowerCase(),
      providerMode: String(editForm.providerMode || 'primary').trim().toLowerCase(),
      mode: editForm.mode,
      routingMode: editForm.routingMode,
      links,
      packages,
    });
  }, [editForm]);

  useEffect(() => {
    if (!editForm) {
      setEditVariantProviderQuotes({});
      return;
    }
    if (String(editForm.providerMode || '').toLowerCase() === 'manual') {
      setEditVariantProviderQuotes({});
      return;
    }

    const slug = String(editForm.slug || '').trim().toLowerCase();
    if (!slug) {
      setEditVariantProviderQuotes({});
      return;
    }

    const links = normalizeProviderLinks(editForm.providerLinks);
    const variants =
      editForm.mode === 'package'
        ? parsePackageLines(editForm.packageLines).map((row) => ({
            label: row.label,
            key: normalizeVariantKey(row.label),
          }))
        : [{ label: 'default', key: '__default__' }];

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const token = getAdminTokenOptional();
        const headers = buildAdminAuthHeaders(token);
        const entries = await Promise.all(
          variants.map(async (variant) => {
            const query =
              variant.label === 'default'
                ? `slug=${encodeURIComponent(slug)}`
                : `slug=${encodeURIComponent(slug)}&packageOption=${encodeURIComponent(variant.label)}`;
            const res = await fetch(`/api/pricing/effective?${query}`, {
              headers,
              cache: 'no-store',
            });
            if (!res.ok) return [variant.key, null] as const;
            const json = await res.json();
            const payload = json?.data || {};
            const resolvedUnitCost = Number(payload?.cheapestCost ?? payload?.basePrice ?? 0);
            const unitCost = Number.isFinite(resolvedUnitCost) && resolvedUnitCost > 0 ? resolvedUnitCost : 0;
            const providerCode = String(payload?.cheapestProviderCode || '').trim().toLowerCase();
            const scopedLinks = links.filter((link) => {
              const lk = normalizeVariantKey(link.variantKey || '');
              if (!lk) return variant.key === '__default__';
              return lk === variant.key;
            });
            const activeLinks = scopedLinks.length ? scopedLinks : links;
            const providerProductId =
              (providerCode
                ? String(
                    activeLinks.find(
                      (link) => String(link.providerCode || '').trim().toLowerCase() === providerCode
                    )?.providerProductId || ''
                  ).trim()
                : '') ||
              String(activeLinks[0]?.providerProductId || '').trim();
            const providerQuote =
              unitCost > 0
                ? {
                    unitCost,
                    cost: unitCost,
                    providerCode: providerCode || undefined,
                    providerProductId: providerProductId || undefined,
                    raw: payload,
                  }
                : null;

            console.log('PRICE DEBUG:', {
              providerProductId,
              variantKey: variant.key || '__default__',
              cost: unitCost,
              providerQuote,
            });

            return [variant.key, providerQuote] as const;
          })
        );

        if (cancelled) return;
        const next: Record<string, { unitCost?: number; cost?: number; providerCode?: string; providerProductId?: string; raw?: unknown }> = {};
        for (const [key, quote] of entries) {
          if (!quote) continue;
          next[key] = quote;
        }
        setEditVariantProviderQuotes(next);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load provider quotes for preview:', error);
          setEditVariantProviderQuotes({});
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [editPreviewFetchSignature, editForm]);

  const editVariantPreviews = useMemo(() => {
    if (!editForm) return [];
    const links = normalizeProviderLinks(editForm.providerLinks);
    const margin = Number(editForm.profitMarginPercent || 0);
    const variants =
      editForm.mode === 'package'
        ? parsePackageLines(editForm.packageLines).map((row) => ({
            label: row.label,
            price: Number(row.price || 0),
          }))
        : [{ label: 'default', price: Number(editForm.costPrice || editForm.price || 0) }];

    return variants.map((variant) => {
      const label = variant.label;
      const key = label === 'default' ? '__default__' : normalizeVariantKey(label);
      const scopedLinks = links.filter((link) => {
        const lk = normalizeVariantKey(link.variantKey || '');
        if (!lk) return key === '__default__';
        return lk === key;
      });
      const resolvedLinks = scopedLinks.length ? scopedLinks : links;
      return {
        variantLabel: label,
        ...computeVariantPreview({
          links: resolvedLinks,
          routingMode: editForm.routingMode,
          profitMarginPercent: margin,
          customerDiscountPercent: selectedUserPercent,
          roundingRule: editForm.roundingRule,
          productCost: Number.isFinite(Number(variant.price)) ? Number(variant.price) : 0,
          variantKey: key,
          providerQuote: editVariantProviderQuotes[key] || null,
        }),
      };
    });
  }, [editForm, selectedUserPercent, editVariantProviderQuotes]);

  const customVariantPreviews = useMemo(() => {
    const links = normalizeProviderLinks(customForm.providerLinks);
    const margin = Number(customForm.profitMarginPercent || 0);
    const variants =
      customForm.mode === 'package'
        ? parsePackageLines(customForm.packageLines).map((row) => row.label)
        : ['default'];

    return variants.map((label) => {
      const key = label === 'default' ? '__default__' : normalizeVariantKey(label);
      const scopedLinks = links.filter((link) => {
        const lk = normalizeVariantKey(link.variantKey || '');
        if (!lk) return key === '__default__';
        return lk === key;
      });
      const resolvedLinks = scopedLinks.length ? scopedLinks : links;
      return {
        variantLabel: label,
        ...computeVariantPreview({
          links: resolvedLinks,
          routingMode: customForm.routingMode,
          profitMarginPercent: margin,
          customerDiscountPercent: selectedUserPercent,
          roundingRule: customForm.roundingRule,
        }),
      };
    });
  }, [customForm, selectedUserPercent]);

  const editPackageRows = useMemo(() => {
    if (!editForm || editForm.mode !== 'package') return [];
    const links = normalizeProviderLinks(editForm.providerLinks);
    return parsePackageLines(editForm.packageLines).map((pkg) => {
      const key = String(pkg.key || '').trim();
      const match =
        links.find((link) => normalizeVariantKey(link.variantKey || '') === key) || null;
      return {
        ...pkg,
        link: match,
      };
    });
  }, [editForm]);

  const updateEditPackageLink = (
    packageKey: string,
    updater: (current: ProviderLinkFormRow) => ProviderLinkFormRow
  ) => {
    setEditForm((prev) => {
      if (!prev) return prev;
      const targetKey = normalizeVariantKey(packageKey);
      if (!targetKey) return prev;
      const links = normalizeProviderLinks(prev.providerLinks);
      const idx = links.findIndex((link) => normalizeVariantKey(link.variantKey || '') === targetKey);
      const baseRow =
        idx >= 0
          ? links[idx]
          : {
              ...createEmptyProviderLink(),
              providerCode: 'dailycard',
              providerProductId: String(prev.catalogProductId || '').trim(),
              variantKey: targetKey,
              lastSyncAt: new Date().toISOString(),
            };
      const nextRow = updater(baseRow);
      if (idx >= 0) {
        links[idx] = nextRow;
      } else {
        links.push(nextRow);
      }
      return {
        ...prev,
        providerLinks: links,
      };
    });
  };

  const filteredManageProducts = useMemo(() => {
    const q = manageSearch.trim().toLowerCase();
    if (!q) return manageProducts;

    return manageProducts.filter((product) => {
      return (
        String(product.name || '').toLowerCase().includes(q) ||
        String(product.slug || '').toLowerCase().includes(q) ||
        String(product.category || '').toLowerCase().includes(q) ||
        String(product.source || '').toLowerCase().includes(q) ||
        String(product.providerMode || '').toLowerCase().includes(q)
      );
    });
  }, [manageProducts, manageSearch]);

  const filteredPricingProducts = useMemo(() => {
    const q = pricingSearch.trim().toLowerCase();
    if (!q) return products;

    return products.filter((product) => {
      return (
        String(product.name || '').toLowerCase().includes(q) ||
        String(product.slug || '').toLowerCase().includes(q) ||
        String(product.category || '').toLowerCase().includes(q)
      );
    });
  }, [pricingSearch, products]);

  const getFinalPreviewPrice = (product: Product) => {
    if (isManualCountPricingProduct(product)) {
      return Number(product.basePrice || 0);
    }

    const productPercent = Number(percentInputs[product.slug] ?? product.productPercent ?? 0);
    const totalPercent = productPercent - selectedUserPercent;
    const next = Number(product.basePrice) * (1 + totalPercent / 100);
    return Number(Math.max(0, next).toFixed(6));
  };

  const fetchProducts = async () => {
    try {
      const token = getAdminTokenOptional();
      const res = await fetch('/api/admin/pricing/products', {
        headers: buildAdminAuthHeaders(token),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
        const nextInputs: Record<string, string> = {};
        for (const product of data.data as Product[]) {
          nextInputs[product.slug] = String(Number(product.productPercent || 0));
        }
        setPercentInputs(nextInputs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManageProducts = async () => {
    try {
      const token = getAdminTokenOptional();
      const res = await fetch('/api/admin/products/manage', {
        headers: buildAdminAuthHeaders(token),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setManageProducts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditProduct = (product: ManageProduct) => {
    const packageLines = formatPackageLines(product.packageOptions || []);
    const initialLinks = buildUcPubgDailyCardLinks({
      slug: product.slug,
      name: product.name,
      catalogProductId: product.id,
      packageLines,
      existingLinks: normalizeProviderLinks(product.providerLinks),
    });

    setEditingProductSlug(product.slug);
    setEditForm({
      catalogProductId: product.id,
      slug: product.slug,
      source: product.source,
      name: product.name,
      category: product.category,
      image: product.image,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      price: String(Number(product.price || 0)),
      costPrice:
        typeof product.costPrice === 'number' && Number.isFinite(product.costPrice)
          ? String(product.costPrice)
          : '',
      mode: product.mode || 'single',
      packageLines,
      countMin: String(product.countMin ?? 1),
      countMax: typeof product.countMax === 'number' ? String(product.countMax) : '',
      platform: product.platform || 'BilyCard',
      deliveryTime: product.deliveryTime || 'Instant',
      stockQuantity: String(normalizeStockQuantityInput(product.stockQuantity)),
      stockStatus: getDerivedStockStatus(product.stockQuantity),
      saleEnabled: product.saleEnabled !== false,
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      featured: Boolean(product.featured),
      bestSeller: Boolean(product.bestSeller),
      providerMode: product.providerMode || 'primary',
      profitMarginPercent:
        Number.isFinite(Number((product as any).profitMarginPercent))
          ? String(Number((product as any).profitMarginPercent))
          : '',
      roundingRule: String((product as any).roundingRule || 'none'),
      routingMode: product.routingMode === 'priority' ? 'priority' : 'cheapest',
      providerLinks: initialLinks,
    });
  };

  const handleSaveProductDetails = async () => {
    if (!editForm) return;

    setEditSaving(true);
    try {
      const token = getAdminTokenOptional();
      const stockQuantity = normalizeStockQuantityInput(editForm.stockQuantity);
      const packageOptions = parsePackageLines(editForm.packageLines);
      const res = await fetch('/api/admin/products/manage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({
          slug: editForm.slug,
          name: editForm.name,
          category: editForm.category,
          image: editForm.image,
          shortDescription: editForm.shortDescription,
          fullDescription: editForm.fullDescription,
          price: Number(editForm.price || 0),
          costPrice: editForm.costPrice,
          mode: editForm.mode,
          packageOptions,
          countMin: Number(editForm.countMin || 1),
          countMax: Number(editForm.countMax || 0),
          platform: editForm.platform,
          deliveryTime: editForm.deliveryTime,
          stockQuantity,
          stockStatus: getDerivedStockStatus(stockQuantity),
          saleEnabled: editForm.saleEnabled,
          tags: editForm.tags,
          featured: editForm.featured,
          bestSeller: editForm.bestSeller,
          providerMode: editForm.providerMode,
          profitMarginPercent: Number(editForm.profitMarginPercent || 0),
          roundingRule: editForm.roundingRule || 'none',
          routingMode: editForm.routingMode,
          providerLinks: serializeProviderLinks(editForm.providerLinks),
        }),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update product');
      }

      alert('Product updated successfully');
      setEditingProductSlug(null);
      setEditForm(null);
      await Promise.all([fetchManageProducts(), fetchProducts()]);
    } catch (err: any) {
      alert(err?.message || 'Failed to update product');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteProduct = async (slug: string, name: string) => {
    const confirmed = window.confirm(
      `Delete product "${name}"? This will hide/delete it from the catalog.`
    );
    if (!confirmed) return;

    setDeleteSavingSlug(slug);
    try {
      const token = getAdminTokenOptional();
      const res = await fetch('/api/admin/products/manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({ slug }),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete product');
      }

      alert('Product deleted successfully');
      if (editingProductSlug === slug) {
        setEditingProductSlug(null);
        setEditForm(null);
      }
      await Promise.all([fetchManageProducts(), fetchProducts()]);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete product');
    } finally {
      setDeleteSavingSlug(null);
    }
  };

  const handleSavePercent = async (slug: string) => {
    setSavingSlug(slug);
    try {
      const token = getAdminTokenOptional();
      const percent = Number(percentInputs[slug] || 0);
      const res = await fetch('/api/admin/pricing/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({ slug, percent }),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (data.success) {
        alert('Product percentage updated');
        fetchProducts();
      }
    } catch (err) {
      alert('Update failed');
    } finally {
      setSavingSlug(null);
    }
  };

  const handleCreateCustomProduct = async () => {
    setCustomSaving(true);
    try {
      const token = getAdminTokenOptional();
      const packageOptions = parsePackageLines(customForm.packageLines);
      const stockQuantity = normalizeStockQuantityInput(customForm.stockQuantity);

      const payload = {
        name: customForm.name,
        slug: customForm.slug,
        category: customForm.category,
        image: customForm.image,
        shortDescription: customForm.shortDescription,
        fullDescription: customForm.fullDescription,
        price: Number(customForm.price || 0),
        costPrice: customForm.costPrice,
        mode: customForm.mode,
        packageOptions,
        countMin: Number(customForm.countMin || 1),
        countMax: Number(customForm.countMax || 0),
        platform: customForm.platform,
        deliveryTime: customForm.deliveryTime,
        stockQuantity,
        stockStatus: getDerivedStockStatus(stockQuantity),
        saleEnabled: customForm.saleEnabled,
        tags: customForm.tags,
        providerMode: customForm.providerMode,
        profitMarginPercent: Number(customForm.profitMarginPercent || 0),
        roundingRule: customForm.roundingRule || 'none',
        routingMode: customForm.routingMode,
        providerLinks: serializeProviderLinks(customForm.providerLinks),
      };

      const res = await fetch('/api/admin/products/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify(payload),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save custom product');
      }

      alert('Custom product saved successfully');
      setCustomForm((prev) => ({
        ...prev,
        name: '',
        slug: '',
        image: '',
        shortDescription: '',
        fullDescription: '',
        price: '0',
        costPrice: '',
        packageLines: '',
        stockQuantity: '0',
        stockStatus: 'out_of_stock',
        saleEnabled: true,
        providerMode: 'manual',
        profitMarginPercent: '',
        roundingRule: 'none',
        routingMode: 'cheapest',
        providerLinks: [],
      }));
      await Promise.all([fetchManageProducts(), fetchProducts()]);
    } catch (err: any) {
      alert(err?.message || 'Failed to save custom product');
    } finally {
      setCustomSaving(false);
    }
  };

  return (
    <main className="bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 hidden border-b border-slate-700 bg-slate-900/50 backdrop-blur lg:block">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/admin" className="text-2xl font-bold text-white">
            Bily Card Admin
          </Link>
          <div className="flex gap-4">
            <Link href="/admin" className="text-slate-300 hover:text-white">
              Dashboard
            </Link>
            <Link href="/admin/orders" className="text-slate-300 hover:text-white">
              Orders
            </Link>
            <Link href="/admin/users" className="text-slate-300 hover:text-white">
              Users
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Products Control Center</h1>
        </div>

        <div className="mb-6 rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Manual Products (Edit/Delete)</h2>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={manageSearch}
              onChange={(e) => setManageSearch(e.target.value)}
              placeholder="Search by name, slug, category..."
              className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder-slate-400 sm:max-w-md"
            />
            <span className="text-xs text-slate-400">
              Showing {filteredManageProducts.length} of {manageProducts.length}
            </span>
          </div>

          <div className="grid gap-4 md:hidden">
            {filteredManageProducts.map((product) => (
              <div key={product.slug} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{product.category}</p>
                    <p className="mt-1 text-sm text-emerald-300">{formatPrice(Number(product.price || 0))}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      product.source === 'custom' ? 'bg-emerald-700 text-emerald-100' : 'bg-blue-700 text-blue-100'
                    }`}
                  >
                    {product.source}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${PROVIDER_MODE_BADGES[product.providerMode]}`}
                  >
                    {PROVIDER_MODE_LABELS[product.providerMode]}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    {MODE_LABELS[product.mode]}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getAdminAvailabilityBadgeClasses(
                      product.stockQuantity,
                      product.saleEnabled
                    )}`}
                  >
                    {getAdminAvailabilityLabel(product.stockQuantity, product.saleEnabled)}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    Qty: {normalizeStockQuantityInput(product.stockQuantity)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEditProduct(product)}
                    className="rounded-xl bg-amber-600 px-3 py-3 text-sm text-white hover:bg-amber-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.slug, product.name)}
                    disabled={deleteSavingSlug === product.slug}
                    className="rounded-xl bg-rose-600 px-3 py-3 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deleteSavingSlug === product.slug ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}

            {filteredManageProducts.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-center text-sm text-slate-400">
                No products match your search.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded border border-white/10 md:block">
            <table className="min-w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-white">Name</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Category</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Source</th>
                  <th className="px-4 py-3 text-left text-sm text-white">API Mode</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Price</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Stock Qty</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Status</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredManageProducts.map((product) => (
                  <tr key={product.slug} className="hover:bg-slate-800/70">
                    <td className="px-4 py-3 text-sm text-slate-200">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          product.source === 'custom'
                            ? 'bg-emerald-700 text-emerald-100'
                            : 'bg-blue-700 text-blue-100'
                        }`}
                      >
                        {product.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${PROVIDER_MODE_BADGES[product.providerMode]}`}
                      >
                        {PROVIDER_MODE_LABELS[product.providerMode]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200">{formatPrice(Number(product.price || 0))}</td>
                    <td className="px-4 py-3 text-sm text-slate-200">{normalizeStockQuantityInput(product.stockQuantity)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${getAdminAvailabilityBadgeClasses(
                          product.stockQuantity,
                          product.saleEnabled
                        )}`}
                      >
                        {getAdminAvailabilityLabel(product.stockQuantity, product.saleEnabled)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditProduct(product)}
                          className="rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.slug, product.name)}
                          disabled={deleteSavingSlug === product.slug}
                          className="rounded bg-rose-600 px-3 py-1 text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {deleteSavingSlug === product.slug ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredManageProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">
                      No products match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {editingProductSlug && editForm && (
            <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 pt-10">
              <div className="w-full max-w-4xl rounded border border-white/10 bg-slate-900 p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Edit Product: {editForm.slug}</h3>
                  <button
                    onClick={() => {
                      setEditingProductSlug(null);
                      setEditForm(null);
                    }}
                    className="rounded bg-slate-700 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-600"
                  >
                    Close
                  </button>
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  Choose whether this product uses the main API, stays manual, or switches to the secondary API.
                </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Name
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    placeholder="Name"
                    className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm((prev) => (prev ? { ...prev, category: e.target.value } : prev))}
                      className="w-full appearance-none rounded border border-white/10 bg-slate-800 px-3 py-2 pr-9 text-white"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>
                <input
                  value={editForm.image}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, image: e.target.value } : prev))}
                  placeholder="Image URL (leave empty for default)"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Sale Price
                  </label>
                  <input
                    value={editForm.price}
                    onChange={(e) => setEditForm((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                    type="number"
                    min="0"
                    step="any"
                    placeholder={editForm.mode === 'count' ? 'Sale price per unit' : 'Sale price'}
                    className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                  />
                </div>
                {shouldShowManualPurchaseCost(editForm) && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Purchase Cost
                    </label>
                    <input
                      value={editForm.costPrice}
                      onChange={(e) => setEditForm((prev) => (prev ? { ...prev, costPrice: e.target.value } : prev))}
                      type="number"
                      min="0"
                      step="any"
                      placeholder={editForm.mode === 'count' ? 'Purchase cost per unit' : 'Purchase cost'}
                      className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Used for profit only. Customer pricing keeps using the sale price above.
                    </p>
                  </div>
                )}
                <input
                  value={editForm.platform}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, platform: e.target.value } : prev))}
                  placeholder="Platform"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
                <input
                  value={editForm.deliveryTime}
                  onChange={(e) =>
                    setEditForm((prev) => (prev ? { ...prev, deliveryTime: e.target.value } : prev))
                  }
                  placeholder="Delivery time"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Stock Quantity
                  </label>
                  <input
                    value={editForm.stockQuantity}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              stockQuantity: e.target.value,
                              stockStatus: getDerivedStockStatus(e.target.value),
                            }
                          : prev
                      )
                    }
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Stock Quantity"
                    className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Status
                  </label>
                  <div className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                    <span
                      className={
                        !editForm.saleEnabled
                          ? 'text-amber-300'
                          : Number(editForm.stockQuantity || 0) > 0
                            ? 'text-emerald-300'
                            : 'text-red-300'
                      }
                    >
                      {getAdminAvailabilityLabel(editForm.stockQuantity, editForm.saleEnabled)}
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={editForm.saleEnabled}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, saleEnabled: e.target.checked } : prev))
                    }
                  />
                  Open Product
                </label>
                <div className="relative">
                  <select
                    value={editForm.providerMode}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              providerMode: e.target.value as ProductProviderMode,
                            }
                          : prev
                      )
                    }
                    className="w-full appearance-none rounded border border-white/10 bg-slate-800 px-3 py-2 pr-9 text-white"
                  >
                    {PROVIDER_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                </div>
                <input
                  value={editForm.profitMarginPercent}
                  onChange={(e) =>
                    setEditForm((prev) => (prev ? { ...prev, profitMarginPercent: e.target.value } : prev))
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Profit margin %"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
                <select
                  value={editForm.roundingRule}
                  onChange={(e) =>
                    setEditForm((prev) => (prev ? { ...prev, roundingRule: e.target.value } : prev))
                  }
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                >
                  <option value="none">No rounding</option>
                  <option value="round_0_01">Round 0.01</option>
                  <option value="ceil_0_01">Ceil 0.01</option>
                  <option value="round_0_1">Round 0.1</option>
                  <option value="ceil_0_1">Ceil 0.1</option>
                  <option value="round_1">Round 1</option>
                  <option value="ceil_1">Ceil 1</option>
                </select>
                <input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, tags: e.target.value } : prev))}
                  placeholder="Tags (comma separated)"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </div>

              <div className="mt-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-3">
                <div className="mb-3 flex flex-col gap-2 rounded border border-cyan-400/20 bg-slate-900/60 p-3 text-xs text-cyan-100 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    Manage provider links directly from this control center.
                    <div className="mt-1 text-cyan-100/80">Current links: {editForm.providerLinks.length}</div>
                  </div>
                  {editForm.slug === 'uc-pubg' && editForm.mode === 'package' && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            providerLinks: buildUcPubgDailyCardLinks({
                              slug: prev.slug,
                              name: prev.name,
                              catalogProductId: prev.catalogProductId,
                              packageLines: prev.packageLines,
                              existingLinks: prev.providerLinks,
                            }),
                          };
                        })
                      }
                      className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-600"
                    >
                      Auto-map UC PUBG packages to DailyCard
                    </button>
                  )}
                </div>
                {editForm.mode === 'package' && Boolean(editPackageRows.length) && (
                  <div className="mb-3 rounded border border-white/10 bg-slate-900/60 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
                      Package Provider Mapping
                    </p>
                    <div className="space-y-2">
                      {editPackageRows.map((pkg) => (
                        <div
                          key={pkg.key || pkg.label}
                          className="rounded border border-white/10 bg-slate-950/60 p-2"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-semibold text-white">{pkg.label}</span>
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                              {pkg.key || '-'}
                            </span>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            <input
                              value={pkg.link?.providerCode || 'dailycard'}
                              onChange={(e) =>
                                updateEditPackageLink(pkg.key, (current) => ({
                                  ...current,
                                  providerCode: e.target.value,
                                  variantKey: pkg.key,
                                }))
                              }
                              placeholder="provider code"
                              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                            />
                            <input
                              value={pkg.link?.providerProductId || editForm.catalogProductId || ''}
                              onChange={(e) =>
                                updateEditPackageLink(pkg.key, (current) => ({
                                  ...current,
                                  providerProductId: e.target.value,
                                  variantKey: pkg.key,
                                }))
                              }
                              placeholder="provider product id"
                              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                            />
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={pkg.link?.lastCost ?? pkg.price}
                              onChange={(e) =>
                                updateEditPackageLink(pkg.key, (current) => ({
                                  ...current,
                                  lastCost: Number(e.target.value || 0),
                                  lastKnownCost: Number(e.target.value || 0),
                                  variantKey: pkg.key,
                                }))
                              }
                              placeholder="last cost"
                              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                            />
                            <select
                              value={pkg.link?.priceSource === 'manual' ? 'manual' : 'provider'}
                              onChange={(e) =>
                                updateEditPackageLink(pkg.key, (current) => ({
                                  ...current,
                                  priceSource: e.target.value === 'manual' ? 'manual' : 'provider',
                                  variantKey: pkg.key,
                                }))
                              }
                              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                            >
                              <option value="provider">Provider Cost</option>
                              <option value="manual">Manual Cost</option>
                            </select>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-200">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={pkg.link?.enabled !== false}
                                onChange={(e) =>
                                  updateEditPackageLink(pkg.key, (current) => ({
                                    ...current,
                                    enabled: e.target.checked,
                                    variantKey: pkg.key,
                                  }))
                                }
                              />
                              Enabled
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={pkg.link?.executionEnabled !== false}
                                onChange={(e) =>
                                  updateEditPackageLink(pkg.key, (current) => ({
                                    ...current,
                                    executionEnabled: e.target.checked,
                                    variantKey: pkg.key,
                                  }))
                                }
                              />
                              Execution
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={pkg.link?.priceSyncEnabled !== false}
                                onChange={(e) =>
                                  updateEditPackageLink(pkg.key, (current) => ({
                                    ...current,
                                    priceSyncEnabled: e.target.checked,
                                    variantKey: pkg.key,
                                  }))
                                }
                              />
                              Price Sync
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={pkg.link?.fallbackEnabled !== false}
                                onChange={(e) =>
                                  updateEditPackageLink(pkg.key, (current) => ({
                                    ...current,
                                    fallbackEnabled: e.target.checked,
                                    variantKey: pkg.key,
                                  }))
                                }
                              />
                              Fallback
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <details className="rounded border border-white/10 bg-slate-900/40 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-200">
                    Advanced provider links editor
                  </summary>
                  <div className="mt-3">
                <div className="mb-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Routing Mode
                    </label>
                    <select
                      value={editForm.routingMode}
                      onChange={(e) =>
                        setEditForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                routingMode: e.target.value === 'priority' ? 'priority' : 'cheapest',
                              }
                            : prev
                        )
                      }
                      className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    >
                      <option value="cheapest">Cheapest (effective cost)</option>
                      <option value="priority">Priority</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm((prev) =>
                          prev
                            ? { ...prev, providerLinks: [...prev.providerLinks, createEmptyProviderLink()] }
                            : prev
                        )
                      }
                      className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                    >
                      + Add Provider Link
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {editForm.providerLinks.map((row, idx) => (
                    <div key={row._uiKey || `plink-edit-${idx}`} className="rounded border border-white/10 bg-slate-900/70 p-3">
                      <div className="grid gap-2 md:grid-cols-6">
                        <input
                          value={row.providerCode || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx ? { ...item, providerCode: e.target.value } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="provider code (dailycard/go4card)"
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                        <input
                          value={row.providerProductId || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx ? { ...item, providerProductId: e.target.value } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="provider product id"
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                        <input
                          value={row.providerProductName || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx ? { ...item, providerProductName: e.target.value } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="provider product name"
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                        <input
                          type="number"
                          value={Number(row.priority || 100)}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx ? { ...item, priority: Number(e.target.value || 100) } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="priority"
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                        <select
                          value={row.priceSource === 'manual' ? 'manual' : 'provider'}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx
                                        ? { ...item, priceSource: e.target.value === 'manual' ? 'manual' : 'provider' }
                                        : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        >
                          <option value="provider">Provider cost</option>
                          <option value="manual">Manual cost</option>
                        </select>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.manualCost ?? ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx ? { ...item, manualCost: Number(e.target.value || 0) } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="manual cost"
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                        <input
                          value={row.variantKey || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx ? { ...item, variantKey: e.target.value } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="variant key (optional)"
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.lastCost ?? row.lastKnownCost ?? ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            lastCost: Number(e.target.value || 0),
                                            lastKnownCost: Number(e.target.value || 0),
                                          }
                                        : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="last cost"
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                        <select
                          value={row.healthStatus || 'unknown'}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx ? { ...item, healthStatus: e.target.value as any } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        >
                          <option value="unknown">Health: Unknown</option>
                          <option value="healthy">Health: Healthy</option>
                          <option value="degraded">Health: Degraded</option>
                          <option value="unhealthy">Health: Unhealthy</option>
                        </select>
                        <input
                          value={row.lastError || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.map((item, i) =>
                                      i === idx ? { ...item, lastError: e.target.value } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          placeholder="last error"
                          className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={row.enabled !== false}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      providerLinks: prev.providerLinks.map((item, i) =>
                                        i === idx ? { ...item, enabled: e.target.checked } : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                          Enabled
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={row.executionEnabled !== false}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      providerLinks: prev.providerLinks.map((item, i) =>
                                        i === idx ? { ...item, executionEnabled: e.target.checked } : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                          Execution
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={row.priceSyncEnabled !== false}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      providerLinks: prev.providerLinks.map((item, i) =>
                                        i === idx ? { ...item, priceSyncEnabled: e.target.checked } : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                          Price Sync
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={row.fallbackEnabled !== false}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      providerLinks: prev.providerLinks.map((item, i) =>
                                        i === idx ? { ...item, fallbackEnabled: e.target.checked } : item
                                      ),
                                    }
                                  : prev
                              )
                            }
                          />
                          Fallback
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    providerLinks: prev.providerLinks.filter((_, i) => i !== idx),
                                  }
                                : prev
                            )
                          }
                          className="rounded bg-rose-700 px-2 py-1 text-xs text-white hover:bg-rose-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {!editForm.providerLinks.length && (
                    <p className="text-xs text-slate-400">
                      No provider links yet. Add 1/2/3 providers here. Old mapping remains fallback-safe.
                    </p>
                  )}
                </div>
                  </div>
                </details>
              </div>

              <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-950/20 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                  Final Price Preview (per variant)
                </p>
                <div className="space-y-2 text-xs">
                  {editVariantPreviews.map((row) => (
                    <div key={row.variantLabel} className="rounded border border-white/10 bg-slate-900/60 p-2">
                      <div className="mb-1 font-semibold text-white">{row.variantLabel}</div>
                      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-slate-200">
                        <div>Cheapest: {row.cheapestProvider || '-'}</div>
                        <div>Cost: {row.cheapestCost != null ? formatPrice(row.cheapestCost) : '-'}</div>
                        <div>Margin: {Number(editForm.profitMarginPercent || 0).toFixed(2)}%</div>
                        <div>Discount: {selectedUserPercent.toFixed(2)}%</div>
                        <div>Before discount: {row.sellBeforeDiscount != null ? formatPrice(row.sellBeforeDiscount) : '-'}</div>
                        <div>Final: {row.finalPrice != null ? formatPrice(row.finalPrice) : '-'}</div>
                      </div>
                      <div className="mt-1 text-slate-400">
                        Fallback order: {row.fallbackOrder.length ? row.fallbackOrder.join(' -> ') : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editForm.source === 'custom' && (
                <div className="mt-3 grid gap-3 rounded border border-white/10 bg-slate-950/40 p-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Product Mode
                    </label>
                    <div className="relative">
                      <select
                        value={editForm.mode}
                        onChange={(e) =>
                          setEditForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  mode: e.target.value as ProductMode,
                                }
                              : prev
                          )
                        }
                        className="w-full appearance-none rounded border border-white/10 bg-slate-800 px-3 py-2 pr-9 text-white"
                      >
                        {MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {MODE_OPTIONS.find((option) => option.value === editForm.mode)?.hint}
                    </p>
                  </div>

                  {editForm.mode === 'count' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                          Count Min
                        </label>
                        <input
                          value={editForm.countMin}
                          onChange={(e) => setEditForm((prev) => (prev ? { ...prev, countMin: e.target.value } : prev))}
                          type="number"
                          min="1"
                          className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                          Count Max
                        </label>
                        <input
                          value={editForm.countMax}
                          onChange={(e) => setEditForm((prev) => (prev ? { ...prev, countMax: e.target.value } : prev))}
                          type="number"
                          min="1"
                          placeholder="Optional"
                          className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                        />
                      </div>
                    </>
                  )}

                  {editForm.mode === 'package' && (
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Package Lines
                      </label>
                      <textarea
                        value={editForm.packageLines}
                        onChange={(e) =>
                          setEditForm((prev) => (prev ? { ...prev, packageLines: e.target.value } : prev))
                        }
                        rows={4}
                        placeholder={'Example:\n60 UC|0.92|in\n325 UC|4.99|out'}
                        className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                      />
                      <p className="mt-1 text-xs text-slate-400">Format each line as: label|price|in or out</p>
                    </div>
                  )}
                </div>
              )}

              <textarea
                value={editForm.shortDescription}
                onChange={(e) =>
                  setEditForm((prev) => (prev ? { ...prev, shortDescription: e.target.value } : prev))
                }
                placeholder="Short description"
                className="mt-3 w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                rows={2}
              />

              <textarea
                value={editForm.fullDescription}
                onChange={(e) =>
                  setEditForm((prev) => (prev ? { ...prev, fullDescription: e.target.value } : prev))
                }
                placeholder="Full description"
                className="mt-3 w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                rows={3}
              />

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editForm.featured}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, featured: e.target.checked } : prev))
                    }
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editForm.bestSeller}
                    onChange={(e) =>
                      setEditForm((prev) => (prev ? { ...prev, bestSeller: e.target.checked } : prev))
                    }
                  />
                  Best Seller
                </label>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSaveProductDetails}
                  disabled={editSaving}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditingProductSlug(null);
                    setEditForm(null);
                  }}
                  className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Add Custom Product (Not in BilyCard)</h2>
          <p className="mb-4 text-xs text-slate-400">
            New custom products default to manual mode, but you can switch them to the main or secondary API if needed.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={customForm.name}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Name"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            <input
              value={customForm.slug}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="Slug (optional)"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            <select
              value={customForm.category}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, category: e.target.value }))}
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={customForm.image}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, image: e.target.value }))}
              placeholder="Image URL"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Sale Price
              </label>
              <input
                value={customForm.price}
                onChange={(e) => setCustomForm((prev) => ({ ...prev, price: e.target.value }))}
                type="number"
                min="0"
                step="any"
                placeholder={customForm.mode === 'count' ? 'Sale price per unit' : 'Sale price'}
                className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
              />
            </div>
            {shouldShowManualPurchaseCost({ source: 'custom', providerMode: customForm.providerMode, mode: customForm.mode }) && (
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Purchase Cost
                </label>
                <input
                  value={customForm.costPrice}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, costPrice: e.target.value }))}
                  type="number"
                  min="0"
                  step="any"
                  placeholder={customForm.mode === 'count' ? 'Purchase cost per unit' : 'Purchase cost'}
                  className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Used for profit only. Customer pricing keeps using the sale price above.
                </p>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Product Mode
              </label>
              <select
                value={customForm.mode}
                onChange={(e) =>
                  setCustomForm((prev) => ({
                    ...prev,
                    mode: e.target.value as ProductMode,
                  }))
                }
                className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                {MODE_OPTIONS.find((option) => option.value === customForm.mode)?.hint}
              </p>
            </div>
            <input
              value={customForm.platform}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, platform: e.target.value }))}
              placeholder="Platform"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            <input
              value={customForm.deliveryTime}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, deliveryTime: e.target.value }))}
              placeholder="Delivery time"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Stock Quantity
              </label>
              <input
                value={customForm.stockQuantity}
                onChange={(e) =>
                  setCustomForm((prev) => ({
                    ...prev,
                    stockQuantity: e.target.value,
                    stockStatus: getDerivedStockStatus(e.target.value),
                  }))
                }
                type="number"
                min="0"
                step="1"
                placeholder="Stock Quantity"
                className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Status
              </label>
              <div className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                <span
                  className={
                    !customForm.saleEnabled
                      ? 'text-amber-300'
                      : Number(customForm.stockQuantity || 0) > 0
                        ? 'text-emerald-300'
                        : 'text-red-300'
                  }
                >
                  {getAdminAvailabilityLabel(customForm.stockQuantity, customForm.saleEnabled)}
                </span>
              </div>
            </div>
            <label className="flex items-center gap-2 rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={customForm.saleEnabled}
                onChange={(e) =>
                  setCustomForm((prev) => ({
                    ...prev,
                    saleEnabled: e.target.checked,
                  }))
                }
              />
              Open Product
            </label>
            <select
              value={customForm.providerMode}
              onChange={(e) =>
                setCustomForm((prev) => ({
                  ...prev,
                  providerMode: e.target.value as ProductProviderMode,
                }))
              }
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              {PROVIDER_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={customForm.routingMode}
              onChange={(e) =>
                setCustomForm((prev) => ({
                  ...prev,
                  routingMode: e.target.value === 'priority' ? 'priority' : 'cheapest',
                }))
              }
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="cheapest">Routing: Cheapest</option>
              <option value="priority">Routing: Priority</option>
            </select>
            <input
              value={customForm.profitMarginPercent}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, profitMarginPercent: e.target.value }))}
              type="number"
              min="0"
              step="0.01"
              placeholder="Profit margin %"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            <select
              value={customForm.roundingRule}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, roundingRule: e.target.value }))}
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="none">No rounding</option>
              <option value="round_0_01">Round 0.01</option>
              <option value="ceil_0_01">Ceil 0.01</option>
              <option value="round_0_1">Round 0.1</option>
              <option value="ceil_0_1">Ceil 0.1</option>
              <option value="round_1">Round 1</option>
              <option value="ceil_1">Ceil 1</option>
            </select>
            <input
              value={customForm.tags}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="Tags (comma separated)"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            {customForm.mode === 'count' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Count Min
                  </label>
                  <input
                    value={customForm.countMin}
                    onChange={(e) => setCustomForm((prev) => ({ ...prev, countMin: e.target.value }))}
                    type="number"
                    min="1"
                    placeholder="Count min"
                    className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Count Max
                  </label>
                  <input
                    value={customForm.countMax}
                    onChange={(e) => setCustomForm((prev) => ({ ...prev, countMax: e.target.value }))}
                    type="number"
                    min="1"
                    placeholder="Optional"
                    className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-3">
            <div className="mb-3 rounded border border-cyan-400/20 bg-slate-900/60 p-3 text-xs text-cyan-100">
              Provider links are managed directly here after you save the product.
            </div>
            <details className="rounded border border-white/10 bg-slate-900/40 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-200">
                Advanced provider links editor
              </summary>
              <div className="mt-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-cyan-100">Provider Links</p>
              <button
                type="button"
                onClick={() =>
                  setCustomForm((prev) => ({
                    ...prev,
                    providerLinks: [...prev.providerLinks, createEmptyProviderLink()],
                  }))
                }
                className="rounded bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700"
              >
                + Add Provider Link
              </button>
            </div>
            <div className="space-y-2">
              {customForm.providerLinks.map((row, idx) => (
                <div key={row._uiKey || `plink-custom-${idx}`} className="rounded border border-white/10 bg-slate-900/70 p-3">
                  <div className="grid gap-2 md:grid-cols-6">
                    <input
                      value={row.providerCode || ''}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx ? { ...item, providerCode: e.target.value } : item
                          ),
                        }))
                      }
                      placeholder="provider code"
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <input
                      value={row.providerProductId || ''}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx ? { ...item, providerProductId: e.target.value } : item
                          ),
                        }))
                      }
                      placeholder="provider product id"
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <input
                      value={row.providerProductName || ''}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx ? { ...item, providerProductName: e.target.value } : item
                          ),
                        }))
                      }
                      placeholder="provider product name"
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <input
                      type="number"
                      value={Number(row.priority || 100)}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx ? { ...item, priority: Number(e.target.value || 100) } : item
                          ),
                        }))
                      }
                      placeholder="priority"
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <select
                      value={row.priceSource === 'manual' ? 'manual' : 'provider'}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx
                              ? { ...item, priceSource: e.target.value === 'manual' ? 'manual' : 'provider' }
                              : item
                          ),
                        }))
                      }
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    >
                      <option value="provider">Provider cost</option>
                      <option value="manual">Manual cost</option>
                    </select>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={row.manualCost ?? ''}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx ? { ...item, manualCost: Number(e.target.value || 0) } : item
                          ),
                        }))
                      }
                      placeholder="manual cost"
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <input
                      value={row.variantKey || ''}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx ? { ...item, variantKey: e.target.value } : item
                          ),
                        }))
                      }
                      placeholder="variant key (optional)"
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={row.lastCost ?? row.lastKnownCost ?? ''}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  lastCost: Number(e.target.value || 0),
                                  lastKnownCost: Number(e.target.value || 0),
                                }
                              : item
                          ),
                        }))
                      }
                      placeholder="last cost"
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <select
                      value={row.healthStatus || 'unknown'}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx ? { ...item, healthStatus: e.target.value as any } : item
                          ),
                        }))
                      }
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    >
                      <option value="unknown">Health: Unknown</option>
                      <option value="healthy">Health: Healthy</option>
                      <option value="degraded">Health: Degraded</option>
                      <option value="unhealthy">Health: Unhealthy</option>
                    </select>
                    <input
                      value={row.lastError || ''}
                      onChange={(e) =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.map((item, i) =>
                            i === idx ? { ...item, lastError: e.target.value } : item
                          ),
                        }))
                      }
                      placeholder="last error"
                      className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={row.enabled !== false}
                        onChange={(e) =>
                          setCustomForm((prev) => ({
                            ...prev,
                            providerLinks: prev.providerLinks.map((item, i) =>
                              i === idx ? { ...item, enabled: e.target.checked } : item
                            ),
                          }))
                        }
                      />
                      Enabled
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={row.executionEnabled !== false}
                        onChange={(e) =>
                          setCustomForm((prev) => ({
                            ...prev,
                            providerLinks: prev.providerLinks.map((item, i) =>
                              i === idx ? { ...item, executionEnabled: e.target.checked } : item
                            ),
                          }))
                        }
                      />
                      Execution
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={row.priceSyncEnabled !== false}
                        onChange={(e) =>
                          setCustomForm((prev) => ({
                            ...prev,
                            providerLinks: prev.providerLinks.map((item, i) =>
                              i === idx ? { ...item, priceSyncEnabled: e.target.checked } : item
                            ),
                          }))
                        }
                      />
                      Price Sync
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={row.fallbackEnabled !== false}
                        onChange={(e) =>
                          setCustomForm((prev) => ({
                            ...prev,
                            providerLinks: prev.providerLinks.map((item, i) =>
                              i === idx ? { ...item, fallbackEnabled: e.target.checked } : item
                            ),
                          }))
                        }
                      />
                      Fallback
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomForm((prev) => ({
                          ...prev,
                          providerLinks: prev.providerLinks.filter((_, i) => i !== idx),
                        }))
                      }
                      className="rounded bg-rose-700 px-2 py-1 text-xs text-white hover:bg-rose-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {!customForm.providerLinks.length && (
                <p className="text-xs text-slate-400">No provider links yet.</p>
              )}
            </div>
              </div>
            </details>
          </div>

          <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-950/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              Final Price Preview (per variant)
            </p>
            <div className="space-y-2 text-xs">
              {customVariantPreviews.map((row) => (
                <div key={row.variantLabel} className="rounded border border-white/10 bg-slate-900/60 p-2">
                  <div className="mb-1 font-semibold text-white">{row.variantLabel}</div>
                  <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-slate-200">
                    <div>Cheapest: {row.cheapestProvider || '-'}</div>
                    <div>Cost: {row.cheapestCost != null ? formatPrice(row.cheapestCost) : '-'}</div>
                    <div>Margin: {Number(customForm.profitMarginPercent || 0).toFixed(2)}%</div>
                    <div>Discount: {selectedUserPercent.toFixed(2)}%</div>
                    <div>Before discount: {row.sellBeforeDiscount != null ? formatPrice(row.sellBeforeDiscount) : '-'}</div>
                    <div>Final: {row.finalPrice != null ? formatPrice(row.finalPrice) : '-'}</div>
                  </div>
                  <div className="mt-1 text-slate-400">
                    Fallback order: {row.fallbackOrder.length ? row.fallbackOrder.join(' -> ') : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <textarea
            value={customForm.shortDescription}
            onChange={(e) => setCustomForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
            placeholder="Short description"
            className="mt-3 w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            rows={2}
          />
          <textarea
            value={customForm.fullDescription}
            onChange={(e) => setCustomForm((prev) => ({ ...prev, fullDescription: e.target.value }))}
            placeholder="Full description"
            className="mt-3 w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            rows={3}
          />

          {customForm.mode === 'package' && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Package Lines
              </label>
              <textarea
                value={customForm.packageLines}
                onChange={(e) => setCustomForm((prev) => ({ ...prev, packageLines: e.target.value }))}
                placeholder={'Example:\n60 UC|0.92|in\n325 UC|4.99|out'}
                className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                rows={4}
              />
              <p className="mt-1 text-xs text-slate-400">Format each line as: label|price|in or out</p>
            </div>
          )}

          <div className="mt-3">
            <button
              onClick={handleCreateCustomProduct}
              disabled={customSaving}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {customSaving ? 'Saving...' : 'Save Custom Product'}
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <p className="mb-3 text-sm text-slate-300">
            Pricing preview: Final price = Base Price + Product % + User %
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm text-slate-300">Search product:</label>
              <input
                type="text"
                value={pricingSearch}
                onChange={(e) => setPricingSearch(e.target.value)}
                placeholder="Search by name, slug, or category"
                className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 sm:w-[320px]"
              />
              <span className="text-xs text-slate-400">
                Showing {filteredPricingProducts.length} of {products.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm text-slate-300">Preview for user:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="max-w-md rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="">No user override (0%)</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.displayName} ({user.email}) - {Number(user.pricingPercent || 0)}%
                </option>
              ))}
            </select>
            <span className="text-xs text-cyan-300">
              Selected user %: {selectedUserPercent.toFixed(2)}%
            </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400">Loading...</div>
        ) : (
          <>
          <div className="space-y-4 md:hidden">
            {filteredPricingProducts.map((product) => (
              <div key={product.id} className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{product.name}</p>
                    <p className="text-sm text-slate-400">{product.category}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs text-white ${getAdminAvailabilityBadgeClasses(
                      product.stockQuantity,
                      product.saleEnabled !== false
                    )}`}
                  >
                    {getAdminAvailabilityLabel(product.stockQuantity, product.saleEnabled !== false)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Base Price</p>
                    <p className="mt-1 text-slate-200">{formatPrice(product.basePrice)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Final Preview</p>
                    <p className="mt-1 font-semibold text-emerald-300">{formatPrice(getFinalPreviewPrice(product))}</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/70 p-3">
                    <p className="text-xs text-slate-400">Stock Qty</p>
                    <p className="mt-1 text-slate-200">{normalizeStockQuantityInput(product.stockQuantity)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Product Percent</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={percentInputs[product.slug] ?? String(Number(product.productPercent || 0))}
                      onChange={(e) =>
                        setPercentInputs((prev) => ({ ...prev, [product.slug]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-white"
                    />
                    <button
                      onClick={() => handleSavePercent(product.slug)}
                      disabled={savingSlug === product.slug}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingSlug === product.slug ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-slate-700 bg-slate-800 md:block">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-white">Name</th>
                  <th className="px-6 py-3 text-left text-white">Category</th>
                  <th className="px-6 py-3 text-left text-white">Base Price</th>
                  <th className="px-6 py-3 text-left text-white">Product %</th>
                  <th className="px-6 py-3 text-left text-white">User %</th>
                  <th className="px-6 py-3 text-left text-white">Final Preview</th>
                  <th className="px-6 py-3 text-left text-white">Stock Qty</th>
                  <th className="px-6 py-3 text-left text-white">Status</th>
                  <th className="px-6 py-3 text-left text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredPricingProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-3 text-slate-300">
                      {product.name}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {product.category}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {formatPrice(product.basePrice)}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      <input
                        type="number"
                        value={percentInputs[product.slug] ?? String(Number(product.productPercent || 0))}
                        onChange={(e) =>
                          setPercentInputs((prev) => ({ ...prev, [product.slug]: e.target.value }))
                        }
                        className="w-24 rounded border border-white/10 bg-slate-800 px-2 py-1 text-white"
                      />
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {selectedUserPercent.toFixed(2)}%
                    </td>
                    <td className="px-6 py-3 font-semibold text-emerald-300">
                      {formatPrice(getFinalPreviewPrice(product))}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {normalizeStockQuantityInput(product.stockQuantity)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-white text-sm ${getAdminAvailabilityBadgeClasses(
                          product.stockQuantity,
                          product.saleEnabled !== false
                        )}`}
                      >
                        {getAdminAvailabilityLabel(product.stockQuantity, product.saleEnabled !== false)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleSavePercent(product.slug)}
                        disabled={savingSlug === product.slug}
                        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {savingSlug === product.slug ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPricingProducts.length === 0 && (
            <div className="rounded-lg border border-white/10 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No pricing products match your search.
            </div>
          )}
          </>
        )}
      </div>
    </main>
  );
}
