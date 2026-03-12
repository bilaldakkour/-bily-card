import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { Product } from '@/models/Product'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const products = await Product.find({ active: true }).sort({ featured: -1, createdAt: -1 })
    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}
