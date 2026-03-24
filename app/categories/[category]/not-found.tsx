import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="h-24 w-24 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">Category Not Found</h1>
          <p className="text-slate-400 max-w-md">
            The category you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Link href="/products">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Browse All Products
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
