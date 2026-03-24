import type mongoose from 'mongoose';
import CustomProduct from '@/lib/models/CustomProduct';
import ProductOverride from '@/lib/models/ProductOverride';

function buildManagedStockUpdatePipeline(quantityDelta: number) {
  const safeDelta = Math.max(0, Math.floor(Math.abs(Number(quantityDelta) || 0)));

  if (safeDelta === 0) {
    return [
      {
        $set: {
          stockQuantity: '$stockQuantity',
        },
      },
      {
        $set: {
          stockStatus: {
            $cond: [{ $gt: ['$stockQuantity', 0] }, 'in_stock', 'out_of_stock'],
          },
        },
      },
    ];
  }

  const quantityExpression =
    quantityDelta >= 0
      ? { $add: ['$stockQuantity', safeDelta] }
      : { $subtract: ['$stockQuantity', safeDelta] };

  return [
    {
      $set: {
        stockQuantity: quantityExpression,
      },
    },
    {
      $set: {
        stockStatus: {
          $cond: [{ $gt: ['$stockQuantity', 0] }, 'in_stock', 'out_of_stock'],
        },
      },
    },
  ];
}

export async function restoreManagedStockBySlug(params: {
  slug?: string | null;
  quantity: number;
  session?: mongoose.ClientSession;
}) {
  const normalizedSlug = String(params.slug || '').trim().toLowerCase();
  const restoreQuantity = Math.max(0, Math.floor(Number(params.quantity) || 0));

  if (!normalizedSlug || restoreQuantity <= 0) {
    return false;
  }

  const customProduct = await CustomProduct.findOneAndUpdate(
    {
      slug: normalizedSlug,
      stockQuantity: { $exists: true },
    },
    buildManagedStockUpdatePipeline(restoreQuantity),
    {
      new: true,
      ...(params.session ? { session: params.session } : {}),
    }
  )
    .select('slug')
    .lean();

  if (customProduct) {
    return true;
  }

  const overrideProduct = await ProductOverride.findOneAndUpdate(
    {
      slug: normalizedSlug,
      stockQuantity: { $exists: true },
    },
    buildManagedStockUpdatePipeline(restoreQuantity),
    {
      new: true,
      ...(params.session ? { session: params.session } : {}),
    }
  )
    .select('slug')
    .lean();

  return Boolean(overrideProduct);
}
