import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 relative overflow-hidden group',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-slate-800 to-slate-900 text-slate-300 border border-slate-700/50 shadow-lg shadow-slate-900/50',
        primary: 'bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50',
        secondary: 'bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/50',
        success: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20',
        warning: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/20',
        error: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/20',
        premium: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }