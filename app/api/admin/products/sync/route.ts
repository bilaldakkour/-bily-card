import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import Product from '@/lib/models/Product';
import providerService from '@/lib/services/providerService';
import { JWTPayload } from '@/lib/types';
import { handleError } from '@/lib/utils/errors';

async function handler(
  req: NextRequest,
  user: JWTPayload
): Promise<NextResponse> {
  try {
    await connectDB();

    // Fetch from provider
    const providerProducts = await providerService.fetchProducts();

    if (!Array.isArray(providerProducts)) {
      return NextResponse.json(
        { success: false, message: 'Invalid provider response' },
        { status: 400 }
      );
    }

    let syncedCount = 0;
    let updatedCount = 0;

    for (const prod of providerProducts) {
      const existingProduct = await Product.findOne({
        providerProductId: prod.id,
      });

      if (existingProduct) {
        // Update existing
        existingProduct.productName = prod.name;
        existingProduct.costPrice = prod.costPrice;
        existingProduct.category = prod.category;
        await existingProduct.save();
        updatedCount++;
      } else {
        // Create new
        const newProduct = new Product({
          providerProductId: prod.id,
          productName: prod.name,
          gameName: prod.game,
          category: prod.category,
          costPrice: prod.costPrice,
          sellingPrice: prod.costPrice * 1.2, // 20% margin
          activeStatus: false, // Require admin approval
          isFeatured: false,
        });
        await newProduct.save();
        syncedCount++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Products synced successfully',
        data: {
          synced: syncedCount,
          updated: updatedCount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json(
      { success: false, message },
      { status: statusCode }
    );
  }
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, handler);
}
