'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!res.ok) throw new Error('Order not found');
        const data = await res.json();
        setOrder(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">{error || 'Order not found'}</p>
          <Link href="/customer/orders" className="text-purple-400 hover:text-purple-300">
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <nav className="bg-slate-900/50 border-b border-purple-500/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-purple-400">
            Bily Card
          </Link>
          <Link href="/customer/orders" className="text-gray-300 hover:text-purple-400">
            ← Back to Orders
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Order Header */}
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{order.orderId}</h1>
              <p className="text-gray-400">Order Details</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Order Date</p>
              <p className="text-white font-semibold">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Product</p>
              <p className="text-white font-semibold">{order.productName}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Amount</p>
              <p className="text-white font-semibold">${order.amount}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Quantity</p>
              <p className="text-white font-semibold">{order.quantity}</p>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Product Information</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-gray-400 text-sm mb-2">Game</p>
              <p className="text-white text-lg font-semibold">{order.gameName}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Product</p>
              <p className="text-white text-lg font-semibold">{order.productName}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Player ID</p>
              <p className="text-white font-mono">{order.playerId}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Price per Unit</p>
              <p className="text-green-400 text-lg font-semibold">${order.amount}</p>
            </div>
          </div>
        </div>

        {/* Order Status Timeline */}
        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Order Timeline</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-green-400 mb-2"></div>
                <div className="w-1 h-12 bg-slate-600"></div>
              </div>
              <div>
                <p className="text-green-400 font-semibold">Order Created</p>
                <p className="text-gray-400 text-sm">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rounded-full ${
                    order.status === 'completed' || order.status === 'failed'
                      ? 'bg-cyan-400'
                      : 'bg-slate-600'
                  } mb-2`}
                ></div>
                <div className="w-1 h-12 bg-slate-600"></div>
              </div>
              <div>
                <p
                  className={
                    order.status === 'completed' || order.status === 'failed'
                      ? 'text-cyan-400 font-semibold'
                      : 'text-gray-400'
                  }
                >
                  {order.status === 'processing' || order.status === 'pending'
                    ? 'Processing'
                    : 'Order ' + order.status}
                </p>
                <p className="text-gray-400 text-sm">Pending</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rounded-full ${
                    order.status === 'completed' ? 'bg-green-400' : 'bg-slate-600'
                  }`}
                ></div>
              </div>
              <div>
                <p className={order.status === 'completed' ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                  {order.status === 'completed' ? 'Delivered' : 'Not Delivered'}
                </p>
                {order.completedAt && (
                  <p className="text-gray-400 text-sm">
                    {new Date(order.completedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Info */}
        {order.failureReason && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6 mb-8">
            <h3 className="text-red-400 font-semibold mb-2">Order Error</h3>
            <p className="text-red-300">{order.failureReason}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            href="/customer/orders"
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            ← Back to Orders
          </Link>
          {order.status === 'failed' && (
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
              Retry Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
