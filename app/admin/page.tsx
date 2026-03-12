'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Stats {
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  rejectedOrders: number;
  pendingDeposits: number;
  totalSales: number;
  totalProfit: number;
  totalWalletBalance: number;
}

interface RecentOrder {
  _id: string;
  orderId: string;
  productName: string;
  price: number;
  status: string;
  createdAt: string;
  userId: {
    displayName: string;
    email: string;
  } | null;
}

interface RecentDeposit {
  _id: string;
  username: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<RecentDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin token missing. Please login again.');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const statsPromise = fetch('/api/admin/stats', { headers }).then((res) => res.json());
      const ordersPromise = fetch('/api/admin/orders?limit=5', { headers }).then((res) => res.json());
      const depositsPromise = fetch('/api/admin/deposits?status=pending&limit=5', { headers }).then((res) => res.json());

      const statsData = await statsPromise;

      if (statsData.success) {
        setStats(statsData.data);
      }

      // Unblock page render as soon as core stats are ready.
      setLoading(false);

      void ordersPromise.then((ordersData) => {
        if (ordersData?.success) {
          setRecentOrders(ordersData.data);
        }
      });

      void depositsPromise.then((depositsData) => {
        if (depositsData?.success) {
          setRecentDeposits(depositsData.deposits);
        }
      });
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-400">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Welcome to Bily Card Admin Panel</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Total Orders</h3>
            <p className="text-3xl font-bold text-white">{stats.totalOrders}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Pending Orders</h3>
            <p className="text-3xl font-bold text-yellow-400">{stats.pendingOrders}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Completed Orders</h3>
            <p className="text-3xl font-bold text-green-400">{stats.completedOrders}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Rejected Orders</h3>
            <p className="text-3xl font-bold text-red-400">{stats.rejectedOrders}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Pending Deposits</h3>
            <p className="text-3xl font-bold text-blue-400">{stats.pendingDeposits}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Total Sales</h3>
            <p className="text-3xl font-bold text-green-400">${stats.totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Total Profit</h3>
            <p className="text-3xl font-bold text-emerald-300">${Number(stats.totalProfit || 0).toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-slate-400 text-sm mb-2">Wallet Balance Added</h3>
            <p className="text-3xl font-bold text-purple-400">${stats.totalWalletBalance.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-slate-400">No recent orders</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order._id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-b-0">
                  <div>
                    <p className="text-white font-medium">{order.orderId}</p>
                    <p className="text-slate-400 text-sm">{order.userId?.displayName || 'Unknown user'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">${order.price.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      order.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Deposits */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Deposits</h2>
          {recentDeposits.length === 0 ? (
            <p className="text-slate-400">No recent deposits</p>
          ) : (
            <div className="space-y-3">
              {recentDeposits.map((deposit) => (
                <div key={deposit._id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-b-0">
                  <div>
                    <p className="text-white font-medium">{deposit.username}</p>
                    <p className="text-slate-400 text-sm">{deposit.amount} {deposit.currency}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded ${
                      deposit.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      deposit.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      deposit.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {deposit.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
