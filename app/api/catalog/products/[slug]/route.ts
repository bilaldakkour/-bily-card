import { NextResponse } from 'next/server';
import { getCatalogDisplayProductBySlug } from '@/lib/data/catalogProducts';

export const revalidate = 60

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await getCatalogDisplayProductBySlug(params.slug);

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: product },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Catalog product fetch failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product details' },
      { status: 500 }
    );
  }
}
