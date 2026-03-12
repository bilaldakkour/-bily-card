'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, ShoppingCart, Truck, Shield, Clock, Info } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { Badge } from './Badge'
import type { Product } from '@/lib/data'

interface ProductDetailsProps {
  product: Product;
  onAddToCart?: (productId: string, inputData: Record<string, string>) => void;
  onBuyNow?: (productId: string, inputData: Record<string, string>) => void;
}

export function ProductDetails({ product, onAddToCart, onBuyNow }: ProductDetailsProps) {
  const [inputData, setInputData] = useState<Record<string, string>>({})
  const [selectedPackage, setSelectedPackage] = useState('')

  const handleInputChange = (fieldName: string, value: string) => {
    setInputData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSubmit = (action: 'cart' | 'buy') => {
    const data = { ...inputData }
    if (selectedPackage) {
      data.package = selectedPackage
    }

    if (action === 'cart' && onAddToCart) {
      onAddToCart(product.id, data)
    } else if (action === 'buy' && onBuyNow) {
      onBuyNow(product.id, data)
    }
  }

  const renderInputField = (field: any) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      placeholder: field.placeholder,
      required: field.required,
      value: inputData[field.name] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        handleInputChange(field.name, e.target.value)
    }

    switch (field.type) {
      case 'select':
        return (
          <Select {...commonProps}>
            <option value="">Choose {field.label.toLowerCase()}</option>
            {field.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </Select>
        )
      case 'email':
        return <Input type="email" {...commonProps} />
      case 'number':
        return <Input type="number" {...commonProps} />
      default:
        return <Input type="text" {...commonProps} />
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      {/* Product Image */}
      <div className="space-y-6">
        <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-2xl border border-white/10 group">
          <Image
            src={product.image || "/games/pubg.jpg"}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Fallback */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="text-9xl opacity-20 group-hover:opacity-30 transition-opacity duration-300">🎮</div>
          </div>

          {/* Image overlay effects */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-transparent to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-3">
          {product.featured && <Badge variant="primary" className="px-4 py-2">Featured</Badge>}
          {product.bestSeller && <Badge variant="secondary" className="px-4 py-2">Best Seller</Badge>}
          <Badge variant={product.stockStatus === 'in_stock' ? 'success' : 'error'} className="px-4 py-2">
            {product.stockStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default" className="px-3 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-400 border-blue-500/20">
              {product.platform}
            </Badge>
            <Badge variant="default" className="px-3 py-1.5 text-xs font-bold bg-purple-500/10 text-purple-400 border-purple-500/20">
              {product.category}
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            {product.name}
          </h1>
          <p className="text-slate-400 text-xl leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 transition-colors duration-300 ${
                  i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-slate-400 font-medium">(4.8) • 1,234 reviews</span>
        </div>

        {/* Price */}
        <div className="flex items-center space-x-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-white/10">
          <div className="space-y-1">
            <span className="text-5xl font-black text-white leading-none">
              ${product.price.toFixed(2)}
            </span>
            {product.startingPrice && product.startingPrice > product.price && (
              <div className="flex items-center space-x-2">
                <span className="text-lg text-slate-500 line-through font-medium">
                  ${product.startingPrice.toFixed(2)}
                </span>
                <Badge variant="success" className="text-xs">
                  Save ${(product.startingPrice - product.price).toFixed(2)}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-white">Order Details</h3>
          </div>
          <div className="space-y-4">
            {product.inputFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label htmlFor={field.name} className="block text-sm font-semibold text-white">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {renderInputField(field)}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-6">
          <Button
            size="xl"
            className="w-full shadow-2xl hover:shadow-blue-500/30"
            onClick={() => handleSubmit('buy')}
          >
            <ShoppingCart className="h-6 w-6 mr-3" />
            Buy Now - ${product.price.toFixed(2)}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => handleSubmit('cart')}
          >
            Add to Cart
          </Button>
        </div>

        {/* Product Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/10">
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:bg-slate-800/30 transition-colors duration-300">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30">
              <Truck className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Instant Delivery</div>
              <div className="text-xs text-slate-400">{product.deliveryTime}</div>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:bg-slate-800/30 transition-colors duration-300">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Secure Payment</div>
              <div className="text-xs text-slate-400">SSL Protected</div>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:bg-slate-800/30 transition-colors duration-300">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">24/7 Support</div>
              <div className="text-xs text-slate-400">Always Available</div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="pt-6 border-t border-white/10">
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="default" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}