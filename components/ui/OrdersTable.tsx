import Link from 'next/link'
import { Eye, Package } from 'lucide-react'
import { Badge } from './Badge'
import { Button } from './Button'
import type { Order } from '@/lib/data'

interface OrdersTableProps {
  orders: Order[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'processing':
        return 'warning'
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'error'
      case 'refunded':
        return 'default'
      default:
        return 'default'
    }
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-12 text-center">
        <Package className="h-16 w-16 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No orders yet</h3>
        <p className="text-slate-400 mb-6">Your order history will appear here</p>
        <Link href="/products">
          <Button>Start Shopping</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-slate-900/50 border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr className="text-left">
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">Order</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">Product</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">Date</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">Amount</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-white">{order.orderNumber}</div>
                    <div className="text-sm text-slate-400">{order.paymentMethod}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={order.product.image}
                      alt={order.product.name}
                      className="w-10 h-10 rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div>
                      <div className="font-medium text-white">{order.product.name}</div>
                      <div className="text-sm text-slate-400">{order.product.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300">
                  {formatDate(order.date)}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={getStatusColor(order.status)} className="capitalize">
                    {order.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-white">${order.amount.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4">
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}