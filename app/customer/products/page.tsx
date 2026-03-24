'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

interface Product {
  _id: string;
  productName: string;
  gameName: string;
  sellingPrice: number;
  category: string;
}

export default function Products() {
  const { language, isRTL } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');

  const copy = {
    ar: {
      wallet: 'المحفظة',
      orders: 'الطلبات',
      logout: 'تسجيل الخروج',
      title: 'المنتجات المتاحة',
      loadFailed: 'فشل تحميل المنتجات',
      genericError: 'حدث خطأ',
      loading: 'جاري تحميل المنتجات...',
      buy: 'شراء',
    },
    en: {
      wallet: 'Wallet',
      orders: 'Orders',
      logout: 'Logout',
      title: 'Available Products',
      loadFailed: 'Failed to load products',
      genericError: 'An error occurred',
      loading: 'Loading products...',
      buy: 'Buy',
    },
    fr: {
      wallet: 'Portefeuille',
      orders: 'Commandes',
      logout: 'Déconnexion',
      title: 'Produits disponibles',
      loadFailed: 'Échec du chargement des produits',
      genericError: 'Une erreur est survenue',
      loading: 'Chargement des produits...',
      buy: 'Acheter',
    },
  }[language];

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const query = category ? `?category=${category}` : '';
      const res = await fetch(`/api/products${query}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.data.products);
      } else {
        setError(copy.loadFailed);
      }
    } catch (err) {
      setError(copy.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            Bily Card
          </Link>
          <div className="flex gap-4">
            <Link href="/customer/wallet" className="text-slate-300 hover:text-white">
              {copy.wallet}
            </Link>
            <Link href="/customer/orders" className="text-slate-300 hover:text-white">
              {copy.orders}
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
              className="text-slate-300 hover:text-white"
            >
              {copy.logout}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">{copy.title}</h1>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        {loading ? (
          <div className="text-slate-400">{copy.loading}</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((product) => (
              <div
                key={product._id}
                className="flex h-full flex-col justify-between rounded-[18px] border border-slate-700 bg-slate-800 p-2.5 transition hover:border-blue-500"
              >
                <h3 className="mb-1 line-clamp-2 min-h-[2.2rem] text-[11px] font-semibold text-white sm:text-sm">
                  {product.productName}
                </h3>
                <p className="mb-2 text-[10px] text-slate-400">{product.gameName}</p>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-sm font-bold text-blue-400">
                    ${product.sellingPrice}
                  </span>
                  <Link
                    href={`/customer/checkout/${product._id}`}
                    className="rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-700"
                  >
                    {copy.buy}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
