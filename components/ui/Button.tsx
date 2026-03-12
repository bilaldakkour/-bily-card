import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
        secondary: 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border border-slate-700/50 shadow-lg shadow-slate-900/50 hover:from-slate-700 hover:to-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-slate-900/70 hover:scale-[1.02] active:scale-[0.98]',
        outline: 'border-2 border-white/20 bg-white/5 text-white backdrop-blur-sm shadow-lg hover:bg-white/10 hover:border-white/40 hover:shadow-xl hover:shadow-white/10 hover:scale-[1.02] active:scale-[0.98]',
        ghost: 'text-slate-300 hover:text-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 hover:scale-[1.02] active:scale-[0.98]',
        premium: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-slate-900 font-bold shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98] before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
        link: 'text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline hover:scale-[1.02] active:scale-[0.98]',
      },
      size: {
        sm: 'h-10 px-4 text-sm gap-2',
        default: 'h-12 px-6 text-sm gap-2',
        lg: 'h-14 px-8 text-base gap-3',
        xl: 'h-16 px-10 text-lg gap-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }