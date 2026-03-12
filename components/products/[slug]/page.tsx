import { notFound } from 'next/navigation'
import { products } from '@/lib/data'
import ProductDetails from '@/components/products/ProductDetails'

interface ProductPageProps {
  params: {
    slug: string
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  const product = products.find((p) => p.slug === params.slug)

  if (!product) {
    notFound()
  }

  return <ProductDetails product={product} />
}