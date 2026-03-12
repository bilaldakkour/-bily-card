'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  basePrice: number;
  productPercent: number;
  stockStatus: string;
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
  platform: string;
  deliveryTime: string;
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  tags: string[];
  featured: boolean;
  bestSeller: boolean;
  source: 'custom' | 'provider';
}

interface EditProductForm {
  slug: string;
  name: string;
  category: string;
  image: string;
  shortDescription: string;
  fullDescription: string;
  price: string;
  platform: string;
  deliveryTime: string;
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  tags: string;
  featured: boolean;
  bestSeller: boolean;
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
  mode: 'single' | 'package' | 'count';
  packageLines: string;
  countMin: string;
  countMax: string;
  platform: string;
  deliveryTime: string;
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  tags: string;
}

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

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [manageProducts, setManageProducts] = useState<ManageProduct[]>([]);
  const [manageSearch, setManageSearch] = useState('');
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
    mode: 'single',
    packageLines: '',
    countMin: '1',
    countMax: '',
    platform: 'BilyCard',
    deliveryTime: 'Instant',
    stockStatus: 'in_stock',
    tags: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchManageProducts();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/users?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
        String(product.source || '').toLowerCase().includes(q)
      );
    });
  }, [manageProducts, manageSearch]);

  const getFinalPreviewPrice = (product: Product) => {
    const productPercent = Number(percentInputs[product.slug] ?? product.productPercent ?? 0);
    const totalPercent = productPercent + selectedUserPercent;
    const next = Number(product.basePrice) * (1 + totalPercent / 100);
    return Number(Math.max(0, next).toFixed(6));
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/pricing/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/products/manage', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      name: product.name,
      category: product.category,
      image: product.image,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      price: String(Number(product.price || 0)),
      platform: product.platform || 'BilyCard',
      deliveryTime: product.deliveryTime || 'Instant',
      stockStatus: product.stockStatus || 'in_stock',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      featured: Boolean(product.featured),
      bestSeller: Boolean(product.bestSeller),
    });
  };

  const handleSaveProductDetails = async () => {
    if (!editForm) return;

    setEditSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/products/manage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: editForm.slug,
          name: editForm.name,
          category: editForm.category,
          image: editForm.image,
          shortDescription: editForm.shortDescription,
          fullDescription: editForm.fullDescription,
          price: Number(editForm.price || 0),
          platform: editForm.platform,
          deliveryTime: editForm.deliveryTime,
          stockStatus: editForm.stockStatus,
          tags: editForm.tags,
          featured: editForm.featured,
          bestSeller: editForm.bestSeller,
        }),
      });

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
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/products/manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug }),
      });

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
      const token = localStorage.getItem('adminToken');
      const percent = Number(percentInputs[slug] || 0);
      const res = await fetch('/api/admin/pricing/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug, percent }),
      });

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

  const handleCreateCustomProduct = async () => {
    setCustomSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const packageOptions = parsePackageLines(customForm.packageLines);

      const payload = {
        name: customForm.name,
        slug: customForm.slug,
        category: customForm.category,
        image: customForm.image,
        shortDescription: customForm.shortDescription,
        fullDescription: customForm.fullDescription,
        price: Number(customForm.price || 0),
        mode: customForm.mode,
        packageOptions,
        countMin: Number(customForm.countMin || 1),
        countMax: Number(customForm.countMax || 0),
        platform: customForm.platform,
        deliveryTime: customForm.deliveryTime,
        stockStatus: customForm.stockStatus,
        tags: customForm.tags,
      };

      const res = await fetch('/api/admin/products/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

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
        packageLines: '',
      }));
      fetchProducts();
    } catch (err: any) {
      alert(err?.message || 'Failed to save custom product');
    } finally {
      setCustomSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
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

          <div className="overflow-x-auto rounded border border-white/10">
            <table className="min-w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-white">Name</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Category</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Source</th>
                  <th className="px-4 py-3 text-left text-sm text-white">Price</th>
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
                    <td className="px-4 py-3 text-sm text-slate-200">{formatPrice(Number(product.price || 0))}</td>
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
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
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
                  placeholder="Image URL"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
                <input
                  value={editForm.price}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder="Price"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
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
                <select
                  value={editForm.stockStatus}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            stockStatus: e.target.value as 'in_stock' | 'out_of_stock' | 'limited',
                          }
                        : prev
                    )
                  }
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                >
                  <option value="in_stock">In stock</option>
                  <option value="limited">Limited</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
                <input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((prev) => (prev ? { ...prev, tags: e.target.value } : prev))}
                  placeholder="Tags (comma separated)"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </div>

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
          <h2 className="mb-4 text-xl font-semibold text-white">Add Custom Product (Not in DailyCard)</h2>
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
            <input
              value={customForm.price}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, price: e.target.value }))}
              type="number"
              min="0"
              step="0.000001"
              placeholder="Base price"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            <select
              value={customForm.mode}
              onChange={(e) =>
                setCustomForm((prev) => ({
                  ...prev,
                  mode: e.target.value as 'single' | 'package' | 'count',
                }))
              }
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="single">Single</option>
              <option value="package">Package</option>
              <option value="count">Count</option>
            </select>
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
            <select
              value={customForm.stockStatus}
              onChange={(e) =>
                setCustomForm((prev) => ({
                  ...prev,
                  stockStatus: e.target.value as 'in_stock' | 'out_of_stock' | 'limited',
                }))
              }
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            >
              <option value="in_stock">In stock</option>
              <option value="limited">Limited</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
            <input
              value={customForm.tags}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="Tags (comma separated)"
              className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
            />
            {customForm.mode === 'count' && (
              <>
                <input
                  value={customForm.countMin}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, countMin: e.target.value }))}
                  type="number"
                  min="1"
                  placeholder="Count min"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
                <input
                  value={customForm.countMax}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, countMax: e.target.value }))}
                  type="number"
                  min="1"
                  placeholder="Count max (optional)"
                  className="rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
                />
              </>
            )}
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
            <textarea
              value={customForm.packageLines}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, packageLines: e.target.value }))}
              placeholder={'Package lines: label|price|in|out\nExample: 60 UC|0.92|in'}
              className="mt-3 w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-white"
              rows={4}
            />
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

        {loading ? (
          <div className="text-slate-400">Loading...</div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-white">Name</th>
                  <th className="px-6 py-3 text-left text-white">Category</th>
                  <th className="px-6 py-3 text-left text-white">Base Price</th>
                  <th className="px-6 py-3 text-left text-white">Product %</th>
                  <th className="px-6 py-3 text-left text-white">User %</th>
                  <th className="px-6 py-3 text-left text-white">Final Preview</th>
                  <th className="px-6 py-3 text-left text-white">Status</th>
                  <th className="px-6 py-3 text-left text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {products.map((product) => (
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
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-white text-sm ${
                          product.stockStatus === 'out_of_stock'
                            ? 'bg-red-600'
                            : product.stockStatus === 'limited'
                            ? 'bg-amber-600'
                            : 'bg-green-600'
                        }`}
                      >
                        {product.stockStatus}
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
        )}
      </div>
    </main>
  );
}
