'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Product {
  _id: string;
  productName: string;
  gameName: string;
  sellingPrice: number;
  category: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');

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
        setError('Failed to load products');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            Bily Card
          </Link>
          <div className="flex gap-4">
            <Link href="/customer/wallet" className="text-slate-300 hover:text-white">
              Wallet
            </Link>
            <Link href="/customer/orders" className="text-slate-300 hover:text-white">
              Orders
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
              className="text-slate-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">Available Products</h1>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        {loading ? (
          <div className="text-slate-400">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product._id}
                className="p-6 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500 transition"
              >
                <h3 className="text-xl font-semibold text-white mb-2">
                  {product.productName}
                </h3>
                <p className="text-slate-400 text-sm mb-4">{product.gameName}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-400">
                    ${product.sellingPrice}
                  </span>
                  <Link
                    href={`/customer/checkout/${product._id}`}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                  >
                    Buy
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
