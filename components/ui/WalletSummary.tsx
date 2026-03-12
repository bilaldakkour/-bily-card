import { Wallet, Plus, TrendingUp } from 'lucide-react'
import { Button } from './Button'
import { Badge } from './Badge'

interface WalletSummaryProps {
  balance: number;
  onAddFunds?: () => void;
}

export function WalletSummary({ balance, onAddFunds }: WalletSummaryProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Wallet Balance</h3>
            <p className="text-slate-400 text-sm">Available funds</p>
          </div>
        </div>
        <Badge variant="success" className="text-xs">
          Active
        </Badge>
      </div>

      <div className="mb-6">
        <div className="text-3xl font-bold text-white mb-1">
          ${balance.toFixed(2)}
        </div>
        <div className="flex items-center space-x-1 text-green-400 text-sm">
          <TrendingUp className="h-4 w-4" />
          <span>+12.5% this month</span>
        </div>
      </div>

      <Button onClick={onAddFunds} className="w-full" size="lg">
        <Plus className="h-4 w-4 mr-2" />
        Add Funds
      </Button>
    </div>
  )
}