'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Order {
  _id: string;
  orderId: string;
  productName: string;
  playerId: string;
  quantity: number;
  sellingPrice: number;
  orderStatus: string;
  createdAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'failed':
        return 'bg-red-600';
      case 'pending':
        return 'bg-yellow-600';
      default:
        return 'bg-blue-600';
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-400">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            Bily Card
          </Link>
          <div className="flex gap-4">
            <Link href="/customer/products" className="text-slate-300 hover:text-white">
              Shop
            </Link>
            <Link href="/customer/wallet" className="text-slate-300 hover:text-white">
              Wallet
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
        <h1 className="text-4xl font-bold text-white mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No orders yet</p>
            <Link
              href="/customer/products"
              className="inline-block px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-white">Order ID</th>
                  <th className="px-6 py-3 text-left text-white">Product</th>
                  <th className="px-6 py-3 text-left text-white">Player ID</th>
                  <th className="px-6 py-3 text-left text-white">Amount</th>
                  <th className="px-6 py-3 text-left text-white">Status</th>
                  <th className="px-6 py-3 text-left text-white">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-3 text-slate-300">{order.orderId}</td>
                    <td className="px-6 py-3 text-slate-300">{order.productName}</td>
                    <td className="px-6 py-3 text-slate-300">{order.playerId}</td>
                    <td className="px-6 py-3 text-slate-300">
                      ${order.sellingPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getStatusBadgeColor(order.orderStatus)}`}
                      >
                        {order.orderStatus.charAt(0).toUpperCase() +
                          order.orderStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {new Date(order.createdAt).toLocaleDateString()}
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
