import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react'
import { Badge } from './Badge'
import type { WalletTransaction } from '@/lib/data'

interface WalletTransactionsProps {
  transactions: WalletTransaction[];
}

export function WalletTransactions({ transactions }: WalletTransactionsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: WalletTransaction['status']) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'pending':
        return 'warning'
      case 'failed':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <div className="rounded-2xl bg-slate-900/50 border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
        <p className="text-slate-400 text-sm">Your wallet activity</p>
      </div>

      <div className="divide-y divide-white/5">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="p-6 hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  transaction.type === 'credit'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {transaction.type === 'credit' ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>

                <div>
                  <div className="font-medium text-white">{transaction.description}</div>
                  <div className="text-sm text-slate-400">{formatDate(transaction.date)}</div>
                </div>
              </div>

              <div className="text-right">
                <div className={`font-semibold ${
                  transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400">
                  Balance: ${transaction.balance.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Badge variant={getStatusColor(transaction.status)} className="text-xs capitalize">
                {transaction.status}
              </Badge>
              {transaction.reference && (
                <span className="text-xs text-slate-500">{transaction.reference}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {transactions.length === 0 && (
        <div className="p-12 text-center">
          <Clock className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No transactions yet</h3>
          <p className="text-slate-400">Your transaction history will appear here</p>
        </div>
      )}
    </div>
  )
}