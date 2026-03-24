import { NextResponse } from 'next/server';
import {
  getCatalogDisplayProducts,
  toProductListItem,
} from '@/lib/data/catalogProducts';
import { normalizeCategory } from '@/lib/data/catalogNormalization';

export const revalidate = 60

export async function GET() {
  try {
    const products = await getCatalogDisplayProducts();
    const data = products.map((product) => ({
      ...toProductListItem(product),
      category: normalizeCategory(product),
    }));

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Catalog products list fetch failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products list' },
      { status: 500 }
    );
  }
}
