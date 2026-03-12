j# Code Citations

## License: MIT
https://github.com/araj00/Ecommerce-full-Stack/blob/8f680de85d4fe3d5e783cdcac46cfeb9246f3854/server/models/productModel.js

```
FILE: /app/products/[slug]/page.tsx
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  price: number
  category: string
  image?: string
  active: boolean
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params?.slug as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState('')

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      setError('Product not found')
      return
    }

    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/products/${slug}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch product')
        }
        
        const data = await response.json()
        
        if (!data.success || !data.data) {
          throw new Error('Product not found')
        }
        
        setProduct(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-xl">
            <p className="text-center text-slate-300">Loading product...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-xl">
            <h1 className="mb-4 text-2xl font-bold text-red-400">Error</h1>
            <p className="mb-6 text-slate-300">{error || 'Product not found'}</p>
            <Link
              href="/products"
              className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '1234567890'
  const whatsappMessage = encodeURIComponent(
    `Hi! I want to order ${product.name} (${product.category}). My Player ID is: ${playerId || '[Player ID not provided]'}`
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/products"
          className="mb-8 inline-block rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600"
        >
          ← Back to Products
        </Link>

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-xl">
          {product.image && (
            <img
              src={product.image}
              alt={product.name}
              className="mb-6 h-64 w-full rounded-lg object-cover"
            />
          )}

          <div className="mb-8">
            <h1 className="mb-4 text-4xl font-bold text-white">{product.name}</h1>
            <p className="mb-4 text-lg text-slate-300">{product.description}</p>

            <div className="mb-6 flex items-center gap-6">
              <div>
                <p className="text-sm text-slate-400">Category</p>
                <p className="text-lg font-semibold text-white">{product.category}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Price</p>
                <p className="text-3xl font-bold text-green-400">${product.price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-8">
            <div>
              <label htmlFor="playerId" className="mb-2 block text-sm font-medium text-white">
                Player ID / Game Account ID
              </label>
              <input
                id="playerId"
                type="text"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Enter your Player ID"
                className="w-full rounded-lg border border-white/20 bg-slate-800 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-2 text-xs text-slate-400">
                This is the unique identifier for your game account. Double-check this before ordering.
              </p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-green-600 px-6 py-4 text-center text-lg font-semibold text-white transition hover:bg-green-700"
            >
              💬 Order via WhatsApp
            </a>

            <p className="text-center text-xs text-slate-400">
              Click the button above to complete your order via WhatsApp
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

FILE: /.env.example
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bily-card?retryWrites=true&w=majority
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=1234567890
ADMIN_EMAIL=admin@bilycard.com
ADMIN_PASSWORD=changeme123
```

FILE: /scripts/seedProducts.js
```javascript
const mongoose = require('mongoose')
require('dotenv').config()

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  category: { type: String, required: true },
  providerProductId: { type: String },
  active: { type: Boolean, default: true },
  featured
```


## License: MIT
https://github.com/araj00/Ecommerce-full-Stack/blob/8f680de85d4fe3d5e783cdcac46cfeb9246f3854/server/models/productModel.js

```
FILE: /app/products/[slug]/page.tsx
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  price: number
  category: string
  image?: string
  active: boolean
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params?.slug as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState('')

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      setError('Product not found')
      return
    }

    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/products/${slug}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch product')
        }
        
        const data = await response.json()
        
        if (!data.success || !data.data) {
          throw new Error('Product not found')
        }
        
        setProduct(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slug])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-xl">
            <p className="text-center text-slate-300">Loading product...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-xl">
            <h1 className="mb-4 text-2xl font-bold text-red-400">Error</h1>
            <p className="mb-6 text-slate-300">{error || 'Product not found'}</p>
            <Link
              href="/products"
              className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '1234567890'
  const whatsappMessage = encodeURIComponent(
    `Hi! I want to order ${product.name} (${product.category}). My Player ID is: ${playerId || '[Player ID not provided]'}`
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/products"
          className="mb-8 inline-block rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600"
        >
          ← Back to Products
        </Link>

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-xl">
          {product.image && (
            <img
              src={product.image}
              alt={product.name}
              className="mb-6 h-64 w-full rounded-lg object-cover"
            />
          )}

          <div className="mb-8">
            <h1 className="mb-4 text-4xl font-bold text-white">{product.name}</h1>
            <p className="mb-4 text-lg text-slate-300">{product.description}</p>

            <div className="mb-6 flex items-center gap-6">
              <div>
                <p className="text-sm text-slate-400">Category</p>
                <p className="text-lg font-semibold text-white">{product.category}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Price</p>
                <p className="text-3xl font-bold text-green-400">${product.price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-8">
            <div>
              <label htmlFor="playerId" className="mb-2 block text-sm font-medium text-white">
                Player ID / Game Account ID
              </label>
              <input
                id="playerId"
                type="text"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Enter your Player ID"
                className="w-full rounded-lg border border-white/20 bg-slate-800 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-2 text-xs text-slate-400">
                This is the unique identifier for your game account. Double-check this before ordering.
              </p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-green-600 px-6 py-4 text-center text-lg font-semibold text-white transition hover:bg-green-700"
            >
              💬 Order via WhatsApp
            </a>

            <p className="text-center text-xs text-slate-400">
              Click the button above to complete your order via WhatsApp
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

FILE: /.env.example
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bily-card?retryWrites=true&w=majority
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=1234567890
ADMIN_EMAIL=admin@bilycard.com
ADMIN_PASSWORD=changeme123
```

FILE: /scripts/seedProducts.js
```javascript
const mongoose = require('mongoose')
require('dotenv').config()

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  category: { type: String, required: true },
  providerProductId: { type: String },
  active: { type: Boolean, default: true },
  featured
```

