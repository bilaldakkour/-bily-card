import { User, Mail, Phone, Calendar, ShoppingBag, DollarSign } from 'lucide-react'
import { Badge } from './Badge'
import type { UserProfile } from '@/lib/data'

interface ProfileCardProps {
  profile: UserProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
          <User className="h-8 w-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{profile.displayName}</h3>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant={profile.isVerified ? 'success' : 'default'}>
              {profile.isVerified ? 'Verified' : 'Unverified'}
            </Badge>
            <span className="text-slate-400 text-sm">
              Member since {formatDate(profile.joinDate)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center space-x-3">
          <Mail className="h-5 w-5 text-slate-400" />
          <span className="text-slate-300">{profile.email}</span>
        </div>
        {profile.phone && (
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-slate-400" />
            <span className="text-slate-300">{profile.phone}</span>
          </div>
        )}
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-slate-400" />
          <span className="text-slate-300">Last login: {formatDate(profile.lastLogin)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <ShoppingBag className="h-4 w-4 text-blue-400" />
            <span className="text-2xl font-bold text-white">{profile.stats.totalOrders}</span>
          </div>
          <p className="text-xs text-slate-400">Total Orders</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="text-2xl font-bold text-white">${profile.stats.totalSpent.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400">Total Spent</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-sm text-slate-400">
          Favorite category: <span className="text-blue-400 font-medium">{profile.stats.favoriteCategory}</span>
        </p>
      </div>
    </div>
  )
}