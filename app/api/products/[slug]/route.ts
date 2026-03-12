import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Product } from '@/models/Product'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    await dbConnect()
    const product = await Product.findOne({ slug: params.slug, active: true })
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 })
  }
}