'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { ProductProviderMode } from '@/lib/products/providerMode';
import type { ProductProviderLink, ProductRoutingMode } from '@/lib/data/products';
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth';

type ProductMode = 'single' | 'package' | 'count';

interface PackageOption {
  label: string;
  price: number;
  inStock: boolean;
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
  routingMode?: ProductRoutingMode;
  providerLinks?: ProductProviderLink[];
  source: 'custom' | 'provider';
  mode: ProductMode;
  packageOptions: PackageOption[];
  countMin?: number;
  countMax?: number;
}

interface EditProductForm {
  slug: string;
  source: 'custom' | 'provider';
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
  routingMode: ProductRoutingMode;
  providerLinks: ProductProviderLink[];
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
  routingMode: ProductRoutingMode;
  providerLinks: ProductProviderLink[];
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
  source?: 'custom' | 'provider';
  providerMode?: ProductProviderMode;
  mode?: ProductMode;
}) =>
  input.source === 'custom' && input.providerMode === 'manual' && input.mode !== 'package';

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
      return {
        label: labelRaw,
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

const createEmptyProviderLink = (): ProductProviderLink => ({
  providerCode: '',
  providerProductId: '',
  providerProductName: '',
  enabled: true,
  priority: 100,
  priceSource: 'provider',
  manualCost: undefined,
  lastKnownCost: undefined,
  providerAvailability: 'unknown',
  fallbackEnabled: true,
});

const normalizeProviderLinks = (value: ProductProviderLink[] | undefined | null) => {
  if (!Array.isArray(value)) return [];
  const rows: ProductProviderLink[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const providerCode = String(raw?.providerCode || '').trim().toLowerCase();
    const providerProductId = String(raw?.providerProductId || '').trim();
    if (!providerCode || !providerProductId) continue;
    const key = `${providerCode}|${providerProductId.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      providerCode,
      providerProductId,
      providerProductName: String(raw?.providerProductName || '').trim() || undefined,
      enabled: raw?.enabled !== false,
      priority: Number.isFinite(Number(raw?.priority)) ? Number(raw?.priority) : 100,
      priceSource: raw?.priceSource === 'manual' ? 'manual' : 'provider',
      manualCost: Number.isFinite(Number(raw?.manualCost)) ? Number(raw?.manualCost) : undefined,
      lastKnownCost: Number.isFinite(Number(raw?.lastKnownCost)) ? Number(raw?.lastKnownCost) : undefined,
      providerAvailability:
        raw?.providerAvailability === 'available'
          ? 'available'
          : raw?.providerAvailability === 'unavailable'
            ? 'unavailable'
            : 'unknown',
      fallbackEnabled: raw?.fallbackEnabled !== false,
      lastSyncAt: raw?.lastSyncAt,
    });
  }
  return rows;
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
    setEditingProductSlug(product.slug);
    setEditForm({
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
      packageLines: formatPackageLines(product.packageOptions || []),
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
      routingMode: product.routingMode === 'priority' ? 'priority' : 'cheapest',
      providerLinks: normalizeProviderLinks(product.providerLinks),
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
          routingMode: editForm.routingMode,
          providerLinks: normalizeProviderLinks(editForm.providerLinks),
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
        routingMode: customForm.routingMode,
        providerLinks: normalizeProviderLinks(customForm.providerLinks),
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
          <h1 className="text-4xl font-bold text-white">Products Pricing Dashboard</h1>
        </div>

        <div className="mb-6 rounded-lg border border-white/10 bg-slate-900/60 p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Manage Products (Edit/Delete)</h2>

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
                  value={editForm.tags}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, tags: e.target.value } : prev))}
                  placeholder="Tags (comma separated)"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </div>

              <div className="mt-3 rounded border border-cyan-500/30 bg-cyan-950/20 p-3">
                <div className="mb-3 flex flex-col gap-2 rounded border border-cyan-400/20 bg-slate-900/60 p-3 text-xs text-cyan-100 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    Provider links are managed mainly from Provider Matrix.
                    <div className="mt-1 text-cyan-100/80">Current links: {editForm.providerLinks.length}</div>
                  </div>
                  <Link
                    href={`/admin/provider-matrix?slug=${encodeURIComponent(editForm.slug || '')}`}
                    className="rounded bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700"
                  >
                    Manage in Provider Matrix
                  </Link>
                </div>
                <details className="rounded border border-white/10 bg-slate-900/40 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-200">
                    Advanced manual edit (fallback only)
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
                    <div key={`${row.providerCode}-${row.providerProductId}-${idx}`} className="rounded border border-white/10 bg-slate-900/70 p-3">
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
              Provider links here are advanced fallback only. Save product first, then manage from Provider Matrix.
            </div>
            <details className="rounded border border-white/10 bg-slate-900/40 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-200">
                Advanced manual edit (fallback only)
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
                <div key={`${row.providerCode}-${row.providerProductId}-${idx}`} className="rounded border border-white/10 bg-slate-900/70 p-3">
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
