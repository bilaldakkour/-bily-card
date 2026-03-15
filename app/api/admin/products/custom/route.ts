import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/mongodb';
import { JWTPayload } from '@/lib/types';
import CustomProduct from '@/lib/models/CustomProduct';
import { normalizeProductProviderMode } from '@/lib/products/providerMode';

function slugify(input: string) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseMode(value: unknown): 'single' | 'package' | 'count' {
  const mode = String(value || 'single').toLowerCase();
  if (mode === 'package' || mode === 'count') return mode;
  return 'single';
}

function parseStockStatus(value: unknown): 'in_stock' | 'out_of_stock' | 'limited' {
  const status = String(value || 'in_stock').toLowerCase();
  if (status === 'out_of_stock' || status === 'limited') return status;
  return 'in_stock';
}

async function getHandler(_req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();

    const rows = await CustomProduct.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Custom products GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch custom products' },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest, _user: JWTPayload): Promise<NextResponse> {
  try {
    await connectDB();

    const body = await req.json();
    const name = String(body.name || '').trim();
    const slug = slugify(body.slug || body.name || '');
    const category = String(body.category || '').trim().toLowerCase();
    const image = String(body.image || '').trim();
    const shortDescription = String(body.shortDescription || '').trim();
    const fullDescription = String(body.fullDescription || '').trim();
    const price = Number(body.price || 0);
    const mode = parseMode(body.mode);

    if (!name || !slug || !category || !image || !shortDescription || !fullDescription) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid price' },
        { status: 400 }
      );
    }

    const packageOptionsRaw = Array.isArray(body.packageOptions) ? body.packageOptions : [];
    const packageOptions = packageOptionsRaw
      .map((row: any) => ({
        label: String(row?.label || '').trim(),
        price: Number(row?.price || 0),
        inStock: row?.inStock !== false,
      }))
      .filter((row: any) => row.label && Number.isFinite(row.price) && row.price >= 0);

    if (mode === 'package' && packageOptions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Package products require at least one package option' },
        { status: 400 }
      );
    }

    const countMin = Number(body.countMin || 1);
    const countMax = Number(body.countMax || 0);

    if (mode === 'count' && (!Number.isFinite(countMin) || countMin < 1)) {
      return NextResponse.json(
        { success: false, message: 'Count products require valid countMin' },
        { status: 400 }
      );
    }

    if (mode === 'count' && Number.isFinite(countMax) && countMax > 0 && countMax < countMin) {
      return NextResponse.json(
        { success: false, message: 'countMax must be greater than or equal to countMin' },
        { status: 400 }
      );
    }

    const tags = String(body.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const doc = await CustomProduct.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          slug,
          category,
          image,
          shortDescription,
          fullDescription,
          price,
          mode,
          packageOptions,
          countMin: mode === 'count' ? Math.max(1, countMin) : undefined,
          countMax:
            mode === 'count' && Number.isFinite(countMax) && countMax > 0
              ? countMax
              : undefined,
          active: body.active !== false,
          featured: body.featured === true,
          bestSeller: body.bestSeller === true,
          stockStatus: parseStockStatus(body.stockStatus),
          platform: String(body.platform || 'BilyCard').trim() || 'BilyCard',
          deliveryTime: String(body.deliveryTime || 'Instant').trim() || 'Instant',
          tags,
          providerMode: normalizeProductProviderMode(body.providerMode, 'manual'),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({
      success: true,
      message: 'Custom product saved successfully',
      data: doc,
    });
  } catch (error: any) {
    console.error('Custom products POST error:', error);

    if (String(error?.code || '') === '11000') {
      return NextResponse.json(
        { success: false, message: 'Slug already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to save custom product' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, getHandler);
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, postHandler);
}
