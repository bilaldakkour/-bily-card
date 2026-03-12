import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import { JWTPayload } from '@/lib/types';
import { getCatalogProducts } from '@/lib/data/catalogProducts';
import CustomProduct from '@/lib/models/CustomProduct';
import ProductOverride from '@/lib/models/ProductOverride';
import { logAdminAction } from '@/lib/services/auditLogService';

function parseStockStatus(value: unknown): 'in_stock' | 'out_of_stock' | 'limited' {
  const status = String(value || 'in_stock').toLowerCase();
  if (status === 'out_of_stock' || status === 'limited') return status;
  return 'in_stock';
}

async function getHandler(_req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();

    const products = await getCatalogProducts();
    const customRows = await CustomProduct.find({ active: true }).select('slug').lean();
    const customSlugSet = new Set(customRows.map((row) => String((row as any).slug || '').toLowerCase()));

    const data = products.map((product) => {
      const slug = String(product.slug || '').toLowerCase();
      return {
        id: product.id,
        slug,
        name: product.name,
        category: product.category,
        image: product.image,
        shortDescription: product.shortDescription,
        fullDescription: product.fullDescription,
        price: Number(product.price || 0),
        platform: product.platform,
        deliveryTime: product.deliveryTime,
        stockStatus: product.stockStatus,
        tags: Array.isArray(product.tags) ? product.tags : [],
        featured: Boolean(product.featured),
        bestSeller: Boolean(product.bestSeller),
        source: customSlugSet.has(slug) ? 'custom' : 'provider',
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin manage products GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load products' },
      { status: 500 }
    );
  }
}

async function putHandler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();
    const body = await req.json();

    const slug = String(body?.slug || '').trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Missing slug' }, { status: 400 });
    }

    const name = String(body?.name || '').trim();
    const category = String(body?.category || '').trim().toLowerCase();
    const image = String(body?.image || '').trim();
    const shortDescription = String(body?.shortDescription || '').trim();
    const fullDescription = String(body?.fullDescription || '').trim();
    const platform = String(body?.platform || '').trim();
    const deliveryTime = String(body?.deliveryTime || '').trim();
    const price = Number(body?.price || 0);

    if (!name || !category || !image || !shortDescription || !fullDescription) {
      return NextResponse.json(
        { success: false, message: 'Name, category, image, and descriptions are required' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid price' },
        { status: 400 }
      );
    }

    const tags = String(body?.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const patch = {
      name,
      category,
      image,
      shortDescription,
      fullDescription,
      price,
      platform,
      deliveryTime,
      stockStatus: parseStockStatus(body?.stockStatus),
      tags,
      featured: body?.featured === true,
      bestSeller: body?.bestSeller === true,
      active: true,
    };

    const custom = await CustomProduct.findOne({ slug });

    if (custom) {
      custom.name = patch.name;
      custom.category = patch.category;
      custom.image = patch.image;
      custom.shortDescription = patch.shortDescription;
      custom.fullDescription = patch.fullDescription;
      custom.price = patch.price;
      custom.platform = patch.platform || 'BilyCard';
      custom.deliveryTime = patch.deliveryTime || 'Instant';
      custom.stockStatus = patch.stockStatus;
      custom.tags = patch.tags;
      custom.featured = patch.featured;
      custom.bestSeller = patch.bestSeller;
      custom.active = true;
      await custom.save();
    } else {
      await ProductOverride.findOneAndUpdate(
        { slug },
        {
          $set: {
            slug,
            active: true,
            name: patch.name,
            category: patch.category,
            image: patch.image,
            shortDescription: patch.shortDescription,
            fullDescription: patch.fullDescription,
            price: patch.price,
            platform: patch.platform,
            deliveryTime: patch.deliveryTime,
            stockStatus: patch.stockStatus,
            tags: patch.tags,
            featured: patch.featured,
            bestSeller: patch.bestSeller,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    await logAdminAction({
      adminUserId: String(user.userId),
      action: 'product_updated',
      targetType: 'system',
      targetId: slug,
      details: {
        slug,
        source: custom ? 'custom' : 'provider',
        fields: ['name', 'category', 'image', 'shortDescription', 'fullDescription', 'price'],
      },
    });

    return NextResponse.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Admin manage products PUT error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update product' },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: NextRequest, user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();
    const body = await req.json();
    const slug = String(body?.slug || '').trim().toLowerCase();

    if (!slug) {
      return NextResponse.json({ success: false, message: 'Missing slug' }, { status: 400 });
    }

    const custom = await CustomProduct.findOne({ slug });

    if (custom) {
      await CustomProduct.deleteOne({ slug });
    } else {
      await ProductOverride.findOneAndUpdate(
        { slug },
        { $set: { slug, active: false } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    await logAdminAction({
      adminUserId: String(user.userId),
      action: 'product_deleted',
      targetType: 'system',
      targetId: slug,
      details: {
        slug,
        mode: custom ? 'hard-delete-custom' : 'soft-delete-provider',
      },
    });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Admin manage products DELETE error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, getHandler);
}

export async function PUT(req: NextRequest) {
  return withAdminAuth(req, putHandler);
}

export async function DELETE(req: NextRequest) {
  return withAdminAuth(req, deleteHandler);
}
