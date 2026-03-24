import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import ProviderProductReview from '@/lib/models/ProviderProductReview'
import ProductProviderMapping from '@/lib/models/ProductProviderMapping'
import CustomProduct from '@/lib/models/CustomProduct'
import { JWTPayload } from '@/lib/types'
import { buildUniqueSlugBase } from '@/lib/providers/classification'

function normalizeText(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

async function getHandler(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const classification = normalizeText(searchParams.get('classification') || '')
  const reviewStatus = normalizeText(searchParams.get('reviewStatus') || '')
  const q = normalizeText(searchParams.get('q') || '')
  const limit = Math.max(20, Math.min(500, Number(searchParams.get('limit') || 200)))

  const query: any = {}
  if (classification) query.classification = classification
  if (reviewStatus) query.reviewStatus = reviewStatus
  if (q) {
    query.$or = [
      { providerProductName: { $regex: q, $options: 'i' } },
      { providerProductId: { $regex: q, $options: 'i' } },
      { suggestedInternalSlug: { $regex: q, $options: 'i' } },
    ]
  }

  const rows = await ProviderProductReview.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()

  const totalsRaw = await ProviderProductReview.aggregate([
    { $group: { _id: '$classification', count: { $sum: 1 } } },
  ])
  const totals = Object.fromEntries(
    totalsRaw.map((row: any) => [String(row?._id || 'unknown'), Number(row?.count || 0)])
  )

  return NextResponse.json({
    success: true,
    data: {
      rows,
      totals,
    },
  })
}

async function postHandler(req: NextRequest, admin: JWTPayload) {
  await connectDB()
  const body = await req.json()
  const action = normalizeText(body?.action || '')
  const providerSlot = normalizeText(body?.providerSlot || 'secondary')
  const minConfidence = Math.max(0, Math.min(1, Number(body?.minConfidence ?? 0.88)))

  if (action === 'bulk_link_shared') {
    const explicitSlot =
      providerSlot === 'primary' || providerSlot === 'secondary' ? providerSlot : 'secondary'
    const baseQuery: any = {
      providerSlot: explicitSlot,
      reviewStatus: { $nin: ['ignored', 'linked', 'created'] },
      suggestedInternalSlug: { $exists: true, $ne: '' },
    }

    // Pass 1: strict exact matches.
    let rows = await ProviderProductReview.find({
      ...baseQuery,
      classification: 'matched_to_existing',
    }).limit(2000)

    let mode: 'strict_matched' | 'fallback_ambiguous' = 'strict_matched'

    // Pass 2 fallback: if strict returns nothing, allow high-confidence ambiguous rows.
    if (!rows.length) {
      rows = await ProviderProductReview.find({
        ...baseQuery,
        classification: 'ambiguous_candidates',
      }).limit(2000)
      mode = 'fallback_ambiguous'
    }

    // Final fallback: broaden to all slots in case queue rows belong to primary.
    if (!rows.length) {
      rows = await ProviderProductReview.find({
        reviewStatus: { $nin: ['ignored', 'linked', 'created'] },
        suggestedInternalSlug: { $exists: true, $ne: '' },
        classification: { $in: ['matched_to_existing', 'ambiguous_candidates'] },
      })
        .sort({ confidence: -1, updatedAt: -1 })
        .limit(2000)
      mode = 'fallback_ambiguous'
    }

    let linked = 0
    const failed: Array<{ id: string; reason: string }> = []

    for (const row of rows) {
      try {
        const internalSlug = normalizeText(row.suggestedInternalSlug || '')
        if (!internalSlug) continue

        await ProductProviderMapping.findOneAndUpdate(
          {
            internalSlug,
            providerSlot: row.providerSlot,
            providerProductId: row.providerProductId,
          },
          {
            $set: {
              internalSlug,
              providerSlot: row.providerSlot,
              providerProductId: row.providerProductId,
              providerProductName: row.providerProductName,
              active: row.classification !== 'invalid_or_unusable',
              fallbackEnabled: row.classification !== 'invalid_or_unusable',
              stockStatus: normalizeText((row.rawSnapshot as any)?.stockStatus || 'unknown'),
              metadata: {
                ...((row.rawSnapshot as any)?.metadata || {}),
                classification: row.classification,
                classificationConfidence: row.confidence,
              },
              updatedBy: admin.userId,
            },
            $setOnInsert: {
              priority: row.providerSlot === 'primary' ? 100 : 200,
              currency: 'USD',
            },
          },
          { upsert: true }
        )

        row.reviewStatus = 'linked'
        row.updatedBy = admin.userId
        await row.save()
        linked += 1
      } catch (error: any) {
        failed.push({
          id: String(row?._id || ''),
          reason: String(error?.message || 'failed_to_link'),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        scanned: rows.length,
        linked,
        failed: failed.length,
        failedSamples: failed.slice(0, 20),
        providerSlot: explicitSlot,
        minConfidence,
        mode,
      },
    })
  }

  const id = normalizeText(body?.id || '')
  if (!id) {
    return NextResponse.json({ success: false, message: 'id is required' }, { status: 400 })
  }

  const row = await ProviderProductReview.findById(id)
  if (!row) {
    return NextResponse.json({ success: false, message: 'review row not found' }, { status: 404 })
  }

  if (action === 'ignore') {
    row.reviewStatus = 'ignored'
    row.updatedBy = admin.userId
    await row.save()
    return NextResponse.json({ success: true, data: row })
  }

  if (action === 'mark_review_needed') {
    row.reviewStatus = 'pending_review'
    row.updatedBy = admin.userId
    await row.save()
    return NextResponse.json({ success: true, data: row })
  }

  if (action === 'link_to_existing') {
    const internalSlug = normalizeText(body?.internalSlug || row.suggestedInternalSlug || '')
    if (!internalSlug) {
      return NextResponse.json({ success: false, message: 'internalSlug is required' }, { status: 400 })
    }
    await ProductProviderMapping.findOneAndUpdate(
      {
        internalSlug,
        providerSlot: row.providerSlot,
        providerProductId: row.providerProductId,
      },
      {
        $set: {
          internalSlug,
          providerSlot: row.providerSlot,
          providerProductId: row.providerProductId,
          providerProductName: row.providerProductName,
          active: row.classification !== 'invalid_or_unusable',
          fallbackEnabled: row.classification !== 'invalid_or_unusable',
          stockStatus: normalizeText((row.rawSnapshot as any)?.stockStatus || 'unknown'),
          metadata: {
            ...((row.rawSnapshot as any)?.metadata || {}),
            classification: row.classification,
            classificationConfidence: row.confidence,
          },
          updatedBy: admin.userId,
        },
        $setOnInsert: {
          priority: row.providerSlot === 'primary' ? 100 : 200,
          currency: 'USD',
        },
      },
      { upsert: true }
    )

    row.reviewStatus = 'linked'
    row.updatedBy = admin.userId
    await row.save()
    return NextResponse.json({ success: true, data: row })
  }

  if (action === 'create_as_new') {
    const name = String(row.providerProductName || '').trim()
    const category = normalizeText(row.providerCategory || 'general') || 'general'
    const cost = Number((row.rawSnapshot as any)?.cost || 0)
    if (!name || !(cost > 0)) {
      return NextResponse.json(
        { success: false, message: 'cannot create product from invalid review row' },
        { status: 400 }
      )
    }

    const baseSlug = buildUniqueSlugBase({
      providerName: name,
      providerProductId: String(row.providerProductId || ''),
    })
    let slug = baseSlug
    let i = 1
    while (await CustomProduct.exists({ slug })) {
      i += 1
      slug = `${baseSlug}-${i}`.slice(0, 95)
    }

    const mode = row.requirements?.quantityRule?.mode === 'range'
      ? 'count'
      : row.requirements?.quantityRule?.mode === 'list'
        ? 'package'
        : 'single'

    const packageValues = Array.isArray(row.requirements?.quantityRule?.values)
      ? row.requirements?.quantityRule?.values
      : []
    const packageOptions =
      mode === 'package'
        ? packageValues.map((value: any) => ({
            label: String(value),
            price: Number((cost * Number(value || 1) * 1.2).toFixed(6)),
            inStock: normalizeText((row.rawSnapshot as any)?.stockStatus) !== 'out_of_stock',
          }))
        : []

    await CustomProduct.create({
      name,
      slug,
      shortDescription: name,
      fullDescription: name,
      price: Number((cost * 1.2).toFixed(6)),
      costPrice: cost,
      category,
      image: String((row.rawSnapshot as any)?.metadata?.image || '/placeholder.png'),
      mode,
      packageOptions,
      countMin: mode === 'count' ? Number(row.requirements?.quantityRule?.min || 1) : undefined,
      countMax: mode === 'count' ? Number(row.requirements?.quantityRule?.max || 1000) : undefined,
      active: row.classification !== 'invalid_or_unusable',
      featured: false,
      bestSeller: false,
      stockQuantity: normalizeText((row.rawSnapshot as any)?.stockStatus) === 'out_of_stock' ? 0 : 100,
      stockStatus: normalizeText((row.rawSnapshot as any)?.stockStatus) === 'out_of_stock' ? 'out_of_stock' : 'in_stock',
      saleEnabled: normalizeText((row.rawSnapshot as any)?.stockStatus) !== 'out_of_stock',
      platform: 'BilyCard',
      deliveryTime: 'Instant',
      tags: ['secondary-provider'],
      providerMode: row.providerSlot,
    })

    await ProductProviderMapping.findOneAndUpdate(
      { internalSlug: slug, providerSlot: row.providerSlot, providerProductId: row.providerProductId },
      {
        $set: {
          internalSlug: slug,
          providerSlot: row.providerSlot,
          providerProductId: row.providerProductId,
          providerProductName: row.providerProductName,
          active: true,
          fallbackEnabled: true,
          stockStatus: normalizeText((row.rawSnapshot as any)?.stockStatus || 'unknown'),
          metadata: {
            ...((row.rawSnapshot as any)?.metadata || {}),
            classification: row.classification,
            classificationConfidence: row.confidence,
          },
          updatedBy: admin.userId,
        },
        $setOnInsert: {
          priority: row.providerSlot === 'primary' ? 100 : 200,
          currency: 'USD',
          lastSyncedCost: Number((row.rawSnapshot as any)?.cost || 0),
        },
      },
      { upsert: true }
    )

    row.reviewStatus = 'created'
    row.suggestedInternalSlug = slug
    row.updatedBy = admin.userId
    await row.save()
    return NextResponse.json({ success: true, data: row })
  }

  return NextResponse.json({ success: false, message: 'unsupported action' }, { status: 400 })
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, () => getHandler(req))
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, (r, u) => postHandler(r, u))
}
