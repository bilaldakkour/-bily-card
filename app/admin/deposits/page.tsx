'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth';

export default function AdminDepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [rejectingId, setRejectingId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  useEffect(() => {
    const token = getAdminTokenOptional();
    fetchDeposits(token, selectedStatus);
  }, [router]);

  useEffect(() => {
    const token = getAdminTokenOptional();
    fetchDeposits(token, selectedStatus);
  }, [selectedStatus]);

  const fetchDeposits = async (token: string, status = selectedStatus) => {
    try {
      setLoading(true);
      const limit = status === 'pending' ? 200 : 60;
      const res = await fetch(`/api/admin/deposits?status=${status}&limit=${limit}`, {
        headers: buildAdminAuthHeaders(token),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to fetch deposits');
      }
      setDeposits(data.deposits || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (depositId: string) => {
    const token = getAdminTokenOptional();
    if (!token) return;
    try {
      setActionLoadingId(depositId);
      const res = await fetch(`/api/admin/deposits/${depositId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to approve deposit');
      await fetchDeposits(token, selectedStatus);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId('');
    }
  };

  const handleReject = async (depositId: string) => {
    const token = getAdminTokenOptional();
    if (!token) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      setError('Please enter rejection reason');
      return;
    }

    try {
      setActionLoadingId(depositId);
      const res = await fetch(`/api/admin/deposits/${depositId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({ action: 'reject', reason }),
      });
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to reject deposit');
      setRejectingId('');
      setRejectionReason('');
      await fetchDeposits(token, selectedStatus);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deposit Management</h1>
          <p className="text-slate-400">Review and approve wallet top-up requests</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap gap-3">
        {['pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

        {loading ? (
          <div className="text-center text-gray-400">Loading deposits...</div>
        ) : (
          <>
            <div className="grid gap-4 md:hidden">
              {deposits.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-center text-slate-400">
                  No {selectedStatus} deposits
                </div>
              ) : (
                deposits.map((deposit) => (
                  <div key={deposit._id} className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{deposit.username}</p>
                        <p className="mt-1 break-all text-sm text-slate-400">{deposit.email}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded px-3 py-1 text-xs font-semibold ${
                          deposit.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : deposit.status === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {deposit.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-800/70 p-3">
                        <p className="text-xs text-slate-400">Amount</p>
                        <p className="mt-1 font-semibold text-white">${deposit.amount}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/70 p-3">
                        <p className="text-xs text-slate-400">Currency</p>
                        <p className="mt-1 text-slate-200">{deposit.currency}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/70 p-3">
                        <p className="text-xs text-slate-400">Method</p>
                        <p className="mt-1 text-slate-200">{deposit.paymentMethodName || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/70 p-3">
                        <p className="text-xs text-slate-400">Date</p>
                        <p className="mt-1 text-slate-200">{new Date(deposit.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-800/50 p-3 text-sm">
                      <p className="text-xs text-slate-400">Address</p>
                      <p className="mt-1 break-all text-slate-200">{deposit.paymentAddress || '-'}</p>
                    </div>

                    {deposit.proofImage ? (
                      <a
                        href={deposit.proofImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300"
                      >
                        View Proof
                      </a>
                    ) : null}

                    {deposit.status === 'pending' && (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleApprove(deposit._id)}
                            disabled={actionLoadingId === deposit._id}
                            className="rounded-xl bg-green-600 px-3 py-3 text-sm font-medium text-white disabled:opacity-60"
                          >
                            {actionLoadingId === deposit._id ? 'Working...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(rejectingId === deposit._id ? '' : deposit._id);
                              setRejectionReason('');
                              setError('');
                            }}
                            disabled={actionLoadingId === deposit._id}
                            className="rounded-xl bg-red-600 px-3 py-3 text-sm font-medium text-white disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>

                        {rejectingId === deposit._id && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Enter rejection reason"
                              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
                            />
                            <button
                              onClick={() => handleReject(deposit._id)}
                              disabled={actionLoadingId === deposit._id}
                              className="w-full rounded-xl bg-red-700 px-3 py-3 text-sm font-medium text-white disabled:opacity-60"
                            >
                              Confirm Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-purple-500/20 bg-slate-800/50 md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-purple-500/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-gray-300">ID</th>
                    <th className="px-6 py-4 text-left text-gray-300">Customer</th>
                    <th className="px-6 py-4 text-left text-gray-300">Email</th>
                    <th className="px-6 py-4 text-left text-gray-300">Amount</th>
                    <th className="px-6 py-4 text-left text-gray-300">Currency</th>
                    <th className="px-6 py-4 text-left text-gray-300">Method</th>
                    <th className="px-6 py-4 text-left text-gray-300">Address</th>
                    <th className="px-6 py-4 text-left text-gray-300">Proof</th>
                    <th className="px-6 py-4 text-left text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-gray-300">Date</th>
                    <th className="px-6 py-4 text-left text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-4 text-center text-gray-400">
                        No {selectedStatus} deposits
                      </td>
                    </tr>
                  ) : (
                    deposits.map((deposit) => (
                      <tr key={deposit._id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-6 py-4 text-gray-400 font-mono text-sm">{deposit._id.slice(-8)}</td>
                        <td className="px-6 py-4 text-white">{deposit.username}</td>
                        <td className="px-6 py-4 text-gray-400">{deposit.email}</td>
                        <td className="px-6 py-4 text-white font-semibold">${deposit.amount}</td>
                        <td className="px-6 py-4 text-gray-400">{deposit.currency}</td>
                        <td className="px-6 py-4 text-gray-300">{deposit.paymentMethodName || '-'}</td>
                        <td className="px-6 py-4 text-gray-400 max-w-[220px] truncate">{deposit.paymentAddress || '-'}</td>
                        <td className="px-6 py-4">
                          {deposit.proofImage ? (
                            <a
                              href={deposit.proofImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-300 hover:text-cyan-200"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded text-sm font-semibold ${
                              deposit.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : deposit.status === 'approved'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {deposit.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(deposit.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {deposit.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(deposit._id)}
                                disabled={actionLoadingId === deposit._id}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-60"
                              >
                                {actionLoadingId === deposit._id ? 'Working...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(rejectingId === deposit._id ? '' : deposit._id);
                                  setRejectionReason('');
                                  setError('');
                                }}
                                disabled={actionLoadingId === deposit._id}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </div>
                            {rejectingId === deposit._id && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Enter rejection reason"
                                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
                                />
                                <button
                                  onClick={() => handleReject(deposit._id)}
                                  disabled={actionLoadingId === deposit._id}
                                  className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm disabled:opacity-60"
                                >
                                  Confirm Reject
                                </button>
                              </div>
                            )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
    </div>
  );
}
