import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import ProductProviderMatrix from '@/lib/models/ProductProviderMatrix'
import ProductProviderMapping from '@/lib/models/ProductProviderMapping'
import ProviderProductReview from '@/lib/models/ProviderProductReview'
import CustomProduct from '@/lib/models/CustomProduct'
import { getCatalogProducts } from '@/lib/data/catalogProducts'
import { getProviderAdapters } from '@/lib/providers/registry'
import { JWTPayload } from '@/lib/types'

function n(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function toNum(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: unknown) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
}

function jaccard(tokensA: string[], tokensB: string[]) {
  if (!tokensA.length || !tokensB.length) return 0
  const a = new Set(tokensA)
  const b = new Set(tokensB)
  let intersection = 0
  for (const token of a) if (b.has(token)) intersection += 1
  const union = new Set([...a, ...b]).size
  return union > 0 ? intersection / union : 0
}

function scoreNameSimilarity(a: unknown, b: unknown) {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.93
  return Number((jaccard(tokenize(na), tokenize(nb)) * 0.9).toFixed(4))
}

function normalizeRoutes(input: any[]): any[] {
  const rows = Array.isArray(input) ? input : []
  const out: any[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const providerKey = n(row?.providerKey)
    const providerProductId = String(row?.providerProductId || '').trim()
    if (!providerKey || !providerProductId) continue
    const dedupe = `${providerKey}|${providerProductId.toLowerCase()}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)
    out.push({
      providerKey,
      providerProductId,
      providerProductName: String(row?.providerProductName || '').trim() || undefined,
      active: row?.active !== false,
      fallbackEnabled: row?.fallbackEnabled !== false,
      priority: toNum(row?.priority, 100),
      fixedUnitCost: toNum(row?.fixedUnitCost, 0) > 0 ? toNum(row?.fixedUnitCost, 0) : undefined,
      metadata:
        typeof row?.metadata === 'object' && row?.metadata
          ? row.metadata
          : undefined,
    })
  }
  return out
}

function extractNumericTokens(value: unknown) {
  const matches = String(value || '').match(/\d+(?:\.\d+)?/g)
  if (!matches) return []
  return matches.map((token) => token.trim()).filter(Boolean)
}

function hasVariantRisk(seed: string, candidateName: string) {
  const seedNums = extractNumericTokens(seed)
  if (!seedNums.length) return false
  const candNums = extractNumericTokens(candidateName)
  return !seedNums.every((token) => candNums.includes(token))
}

async function getHandler(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const action = n(searchParams.get('action') || '')
  const slug = n(searchParams.get('slug') || '')
  const status = n(searchParams.get('status') || '')

  if (action === 'dashboard') {
    const catalog = await getCatalogProducts()
    const matrixRows = await ProductProviderMatrix.find({})
      .select('internalSlug productName category routingMode forcedProviderKey routes updatedAt')
      .lean()

    const mapBySlug = new Map<string, any>()
    for (const row of matrixRows as any[]) {
      mapBySlug.set(n(row?.internalSlug), row)
    }

    const rows = catalog.map((product) => {
      const internalSlug = n(product?.slug)
      const current = mapBySlug.get(internalSlug)
      const routes = Array.isArray(current?.routes) ? current.routes : []
      const activeRoutes = routes.filter((item: any) => item?.active !== false)
      const providers = Array.from(
        new Set(
          activeRoutes
            .map((item: any) => n(item?.providerKey))
            .filter(Boolean)
        )
      )

      const computedStatus =
        providers.length >= 2
          ? 'ready_multi'
          : providers.length === 1
            ? 'ready_single'
            : 'missing_all'

      return {
        internalSlug,
        productName: String(product?.name || '').trim() || internalSlug,
        category: String(product?.category || '').trim() || '',
        providers,
        dailycardStatus: providers.includes('dailycard') ? 'linked' : 'missing',
        go4cardStatus: providers.includes('go4card') ? 'linked' : 'missing',
        coverageStatus:
          providers.includes('dailycard') && providers.includes('go4card')
            ? 'both'
            : providers.includes('dailycard')
              ? 'missing_go4card'
              : providers.includes('go4card')
                ? 'missing_dailycard'
                : 'missing_all',
        activeProviderCount: providers.length,
        routeCount: routes.length,
        status: computedStatus,
        routingMode: String(current?.routingMode || 'cheapest'),
        forcedProviderKey: String(current?.forcedProviderKey || '').trim() || undefined,
        updatedAt: current?.updatedAt || null,
      }
    })

    const filteredRows = status
      ? rows.filter((row) => String(row.status) === status)
      : rows

    const summary = {
      totalProducts: rows.length,
      readyMulti: rows.filter((row) => row.status === 'ready_multi').length,
      readySingle: rows.filter((row) => row.status === 'ready_single').length,
      missingAll: rows.filter((row) => row.status === 'missing_all').length,
    }

    return NextResponse.json({ success: true, data: { summary, rows: filteredRows } })
  }

  if (slug) {
    const row = await ProductProviderMatrix.findOne({ internalSlug: slug }).lean()
    return NextResponse.json({ success: true, data: row || null })
  }

  const limit = Math.max(10, Math.min(300, Number(searchParams.get('limit') || 120)))
  const rows = await ProductProviderMatrix.find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()
  return NextResponse.json({ success: true, data: rows })
}

async function postHandler(req: NextRequest, admin: JWTPayload) {
  await connectDB()
  const body = await req.json()
  const internalSlug = n(body?.internalSlug || '')
  if (!internalSlug) {
    return NextResponse.json({ success: false, message: 'internalSlug is required' }, { status: 400 })
  }

  const routingMode = n(body?.routingMode || 'cheapest')
  if (!['cheapest', 'priority', 'forced'].includes(routingMode)) {
    return NextResponse.json({ success: false, message: 'Invalid routingMode' }, { status: 400 })
  }

  const updated = await ProductProviderMatrix.findOneAndUpdate(
    { internalSlug },
    {
      $set: {
        internalSlug,
        productName: String(body?.productName || '').trim() || undefined,
        category: n(body?.category || ''),
        routingMode,
        forcedProviderKey: routingMode === 'forced' ? n(body?.forcedProviderKey || '') || undefined : undefined,
        routes: normalizeRoutes(body?.routes || []),
        notes: String(body?.notes || '').trim() || undefined,
        updatedBy: admin.userId,
      },
    },
    { upsert: true, new: true }
  ).lean()

  return NextResponse.json({ success: true, data: updated })
}

async function patchHandler(req: NextRequest, admin: JWTPayload) {
  await connectDB()
  const body = await req.json()
  const action = n(body?.action || 'upsert_route')
  const internalSlug = n(body?.internalSlug || '')

  if (action === 'import_legacy_all') {
    const catalog = await getCatalogProducts()
    const catalogMeta = new Map<string, { name: string; category: string }>()
    for (const product of catalog) {
      const slug = n(product?.slug)
      if (!slug) continue
      catalogMeta.set(slug, {
        name: String(product?.name || '').trim() || slug,
        category: String(product?.category || '').trim() || '',
      })
    }

    const mappings = await ProductProviderMapping.find({ active: true })
      .select('internalSlug providerSlot providerProductId providerProductName priority fallbackEnabled')
      .lean()

    const bySlug = new Map<string, any[]>()
    for (const row of mappings as any[]) {
      const slug = n(row?.internalSlug)
      if (!slug) continue
      if (!bySlug.has(slug)) bySlug.set(slug, [])
      bySlug.get(slug)!.push(row)
    }

    let touched = 0
    let routesAdded = 0
    for (const [slug, rows] of bySlug.entries()) {
      const existing = (await ProductProviderMatrix.findOne({ internalSlug: slug }).lean()) as any
      const currentRoutes = Array.isArray(existing?.routes) ? [...existing.routes] : []
      const before = currentRoutes.length
      const mergedRoutes = normalizeRoutes([
        ...currentRoutes,
        ...rows.map((row) => ({
          providerKey: String(row?.providerSlot || '') === 'secondary' ? 'go4card' : 'dailycard',
          providerProductId: String(row?.providerProductId || '').trim(),
          providerProductName: String(row?.providerProductName || '').trim(),
          active: true,
          fallbackEnabled: row?.fallbackEnabled !== false,
          priority: toNum(row?.priority, 100),
        })),
      ])
      if (mergedRoutes.length === before && existing) continue
      const meta = catalogMeta.get(slug)
      await ProductProviderMatrix.findOneAndUpdate(
        { internalSlug: slug },
        {
          $set: {
            internalSlug: slug,
            productName: String(existing?.productName || meta?.name || slug),
            category: String(existing?.category || meta?.category || ''),
            routingMode: String(existing?.routingMode || 'cheapest'),
            forcedProviderKey: String(existing?.forcedProviderKey || '').trim() || undefined,
            routes: mergedRoutes,
            updatedBy: admin.userId,
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      )
      touched += 1
      routesAdded += Math.max(0, mergedRoutes.length - before)
    }

    return NextResponse.json({
      success: true,
      data: { touched, routesAdded },
      message: `Legacy import done. touched=${touched}, routesAdded=${routesAdded}`,
    })
  }

  if (action === 'auto_link_secondary_reviews') {
    const minConfidence = Math.max(0.5, Math.min(1, Number(body?.minConfidence || 0.9)))
    const reviews = await ProviderProductReview.find({
      providerSlot: 'secondary',
      classification: { $in: ['matched_to_existing', 'ambiguous_candidates'] },
      reviewStatus: { $nin: ['ignored'] },
      confidence: { $gte: minConfidence },
    })
      .select('providerProductId providerProductName suggestedInternalSlug confidence')
      .sort({ confidence: -1, updatedAt: -1 })
      .lean()

    let scanned = 0
    let linked = 0
    let skipped = 0
    let firstSkipReason = ''

    for (const row of reviews as any[]) {
      scanned += 1
      const slug = n(row?.suggestedInternalSlug)
      const providerProductId = String(row?.providerProductId || '').trim()
      if (!slug || !providerProductId) {
        skipped += 1
        if (!firstSkipReason) firstSkipReason = 'missing_slug_or_provider_id'
        continue
      }

      const existing = (await ProductProviderMatrix.findOne({ internalSlug: slug }).lean()) as any
      const routes = Array.isArray(existing?.routes) ? [...existing.routes] : []
      const hasSecondary = routes.some(
        (item: any) =>
          n(item?.providerKey) === 'go4card' &&
          String(item?.providerProductId || '').trim() === providerProductId
      )
      if (hasSecondary) {
        skipped += 1
        if (!firstSkipReason) firstSkipReason = 'already_linked'
        continue
      }

      const nextRoutes = normalizeRoutes([
        ...routes,
        {
          providerKey: 'go4card',
          providerProductId,
          providerProductName: String(row?.providerProductName || '').trim() || undefined,
          active: true,
          fallbackEnabled: true,
          priority: 100,
        },
      ])
      await ProductProviderMatrix.findOneAndUpdate(
        { internalSlug: slug },
        {
          $set: {
            internalSlug: slug,
            productName: String(existing?.productName || slug),
            category: String(existing?.category || ''),
            routingMode: String(existing?.routingMode || 'cheapest'),
            forcedProviderKey: String(existing?.forcedProviderKey || '').trim() || undefined,
            routes: nextRoutes,
            updatedBy: admin.userId,
          },
        },
        { upsert: true, new: true }
      )
      linked += 1
    }

    return NextResponse.json({
      success: true,
      data: { scanned, linked, skipped, firstSkipReason: firstSkipReason || undefined },
      message: `Auto-link secondary done. scanned=${scanned}, linked=${linked}, skipped=${skipped}`,
    })
  }

  if (action === 'set_provider_enabled') {
    const providerKey = n(body?.providerKey || '')
    const enabled = body?.enabled === true
    if (!internalSlug || !providerKey) {
      return NextResponse.json(
        { success: false, message: 'internalSlug and providerKey are required' },
        { status: 400 }
      )
    }

    const doc = (await ProductProviderMatrix.findOne({ internalSlug })) as any
    if (!doc) {
      return NextResponse.json({
        success: true,
        data: { changed: false, reason: 'no_matrix' },
      })
    }
    const routes = Array.isArray(doc?.routes) ? [...doc.routes] : []
    if (!routes.length) {
      return NextResponse.json({
        success: true,
        data: { changed: false, reason: 'no_routes' },
      })
    }
    const hasProviderRoute = routes.some((row: any) => n(row?.providerKey) === providerKey)
    if (!hasProviderRoute) {
      return NextResponse.json({
        success: true,
        data: { changed: false, reason: 'provider_route_not_found' },
      })
    }
    const hasAnyChange = routes.some(
      (row: any) => n(row?.providerKey) === providerKey && Boolean(row?.active !== false) !== enabled
    )
    if (!hasAnyChange) {
      return NextResponse.json({
        success: true,
        data: { changed: false, reason: 'already_in_requested_state' },
      })
    }
    const nextRoutes = routes.map((row: any) =>
      n(row?.providerKey) === providerKey
        ? { ...row, active: enabled }
        : row
    )
    const updated = await ProductProviderMatrix.findOneAndUpdate(
      { internalSlug },
      {
        $set: {
          internalSlug,
          routes: normalizeRoutes(nextRoutes),
          updatedBy: admin.userId,
        },
      },
      { new: true }
    ).lean()
    return NextResponse.json({ success: true, data: { changed: true, matrix: updated } })
  }

  if (action === 'auto_link_provider_by_name') {
    const providerKey = n(body?.providerKey || '')
    const minScore = Math.max(0.6, Math.min(1, Number(body?.minScore || 0.86)))
    if (!internalSlug || !providerKey) {
      return NextResponse.json(
        { success: false, message: 'internalSlug and providerKey are required' },
        { status: 400 }
      )
    }

    const doc = (await ProductProviderMatrix.findOne({ internalSlug }).lean()) as any
    const routes = Array.isArray(doc?.routes) ? [...doc.routes] : []
    if (routes.some((row: any) => n(row?.providerKey) === providerKey)) {
      return NextResponse.json({
        success: true,
        data: { linked: false, reason: 'already_linked' },
      })
    }

    const catalog = await getCatalogProducts()
    const catalogItem = catalog.find((item) => n(item?.slug) === internalSlug)
    const primaryMapping = await ProductProviderMapping.findOne({
      internalSlug,
      providerSlot: 'primary',
      active: true,
    })
      .select('providerProductName')
      .lean()

    const seeds = Array.from(
      new Set(
        [
          String(doc?.productName || '').trim(),
          String(catalogItem?.name || '').trim(),
          String((primaryMapping as any)?.providerProductName || '').trim(),
          String(internalSlug || '').replace(/-/g, ' ').trim(),
        ].filter(Boolean)
      )
    )

    const adapters = getProviderAdapters()
    const slot =
      providerKey === 'dailycard' ? 'primary' :
      providerKey === 'go4card' ? 'secondary' :
      ''
    const adapter = adapters.find((item) => n(item.key) === providerKey && item.isAvailable())

    const candidates: Array<{
      providerProductId: string
      providerProductName: string
      score: number
      source: 'review' | 'live'
    }> = []

    if (slot && seeds.length) {
      for (const seed of seeds.slice(0, 3)) {
        const reviewRows = await ProviderProductReview.find({
          providerSlot: slot,
          providerProductName: { $regex: seed, $options: 'i' },
          classification: { $nin: ['invalid_or_unusable'] },
          reviewStatus: { $nin: ['ignored'] },
        })
          .select('providerProductId providerProductName')
          .limit(40)
          .lean()
        for (const row of reviewRows as any[]) {
          const providerProductId = String(row?.providerProductId || '').trim()
          const providerProductName = String(row?.providerProductName || '').trim()
          if (!providerProductId || !providerProductName) continue
          const score = Math.max(...seeds.map((s) => scoreNameSimilarity(s, providerProductName)))
          candidates.push({ providerProductId, providerProductName, score, source: 'review' })
        }
      }
    }

    if (adapter && seeds.length) {
      for (const seed of seeds.slice(0, 2)) {
        try {
          const liveRows = await adapter.fetchProducts(seed)
          for (const row of liveRows.slice(0, 40)) {
            const providerProductId = String(row?.providerProductId || '').trim()
            const providerProductName = String(row?.providerProductName || row?.displayName || '').trim()
            if (!providerProductId || !providerProductName) continue
            const score = Math.max(...seeds.map((s) => scoreNameSimilarity(s, providerProductName)))
            candidates.push({ providerProductId, providerProductName, score, source: 'live' })
          }
        } catch {
          // keep safe
        }
      }
    }

    const dedup = new Map<string, (typeof candidates)[number]>()
    for (const row of candidates) {
      const key = `${row.providerProductId}|${row.providerProductName}`.toLowerCase()
      const current = dedup.get(key)
      if (!current || row.score > current.score) dedup.set(key, row)
    }
    const sorted = Array.from(dedup.values()).sort((a, b) => b.score - a.score)
    const best = sorted[0]
    const second = sorted[1]
    const primarySeed = seeds[0] || ''
    const ambiguousVariants =
      Boolean(best && second && Math.abs(Number(best.score || 0) - Number(second.score || 0)) <= 0.03) &&
      (hasVariantRisk(primarySeed, best?.providerProductName || '') || hasVariantRisk(primarySeed, second?.providerProductName || ''))

    if (!best || best.score < minScore || ambiguousVariants) {
      return NextResponse.json({
        success: true,
        data: {
          linked: false,
          reason: ambiguousVariants ? 'ambiguous_variants' : 'no_confident_match',
          bestScore: Number(best?.score || 0),
        },
      })
    }

    const nextRoutes = normalizeRoutes([
      ...routes,
      {
        providerKey,
        providerProductId: best.providerProductId,
        providerProductName: best.providerProductName,
        active: true,
        fallbackEnabled: true,
        priority: 100,
      },
    ])

    const updated = await ProductProviderMatrix.findOneAndUpdate(
      { internalSlug },
      {
        $set: {
          internalSlug,
          productName: String(doc?.productName || catalogItem?.name || internalSlug),
          category: String(doc?.category || catalogItem?.category || ''),
          routingMode: String(doc?.routingMode || 'cheapest'),
          forcedProviderKey: String(doc?.forcedProviderKey || '').trim() || undefined,
          routes: nextRoutes,
          updatedBy: admin.userId,
        },
      },
      { upsert: true, new: true }
    ).lean()

    return NextResponse.json({
      success: true,
      data: {
        linked: true,
        providerKey,
        providerProductId: best.providerProductId,
        providerProductName: best.providerProductName,
        score: best.score,
        source: best.source,
        matrix: updated,
      },
    })
  }

  if (!internalSlug) {
    return NextResponse.json({ success: false, message: 'internalSlug is required' }, { status: 400 })
  }

  if (action === 'import_missing_product') {
    const providerKey = n(body?.providerKey || '')
    const providerProductId = String(body?.providerProductId || '').trim()
    const providerProductName = String(body?.providerProductName || '').trim()
    const category = String(body?.category || 'digital-services').trim().toLowerCase() || 'digital-services'
    if (!providerKey || !providerProductId || !providerProductName) {
      return NextResponse.json(
        { success: false, message: 'providerKey, providerProductId, providerProductName are required' },
        { status: 400 }
      )
    }

    const catalog = await getCatalogProducts()
    const catalogItem = catalog.find((item) => n(item?.slug) === internalSlug)

    let created = false
    if (!catalogItem) {
      await CustomProduct.findOneAndUpdate(
        { slug: internalSlug },
        {
          $set: {
            name: providerProductName,
            slug: internalSlug,
            shortDescription: `Imported from ${providerKey}. Review before opening.`,
            fullDescription: `Imported from ${providerKey} with provider product ${providerProductId}. Please review details before enabling sales.`,
            price: Number(body?.price || 0),
            category,
            image: '/favicon.png',
            mode: 'single',
            active: true,
            featured: false,
            bestSeller: false,
            stockQuantity: 0,
            stockStatus: 'out_of_stock',
            saleEnabled: false,
            platform: 'BilyCard',
            deliveryTime: 'Instant',
            tags: ['imported', providerKey],
            providerMode: providerKey === 'go4card' ? 'secondary' : 'primary',
            routingMode: 'cheapest',
            providerLinks: [
              {
                providerCode: providerKey,
                providerProductId,
                providerProductName,
                enabled: true,
                priority: 100,
                priceSource: 'provider',
                providerAvailability: 'unknown',
                fallbackEnabled: true,
                lastSyncAt: new Date(),
              },
            ],
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      )
      created = true
    }

    const existing = (await ProductProviderMatrix.findOne({ internalSlug }).lean()) as any
    const routes = Array.isArray(existing?.routes) ? [...existing.routes] : []
    const nextRoutes = normalizeRoutes([
      ...routes,
      {
        providerKey,
        providerProductId,
        providerProductName,
        active: true,
        fallbackEnabled: true,
        priority: 100,
      },
    ])

    const updated = await ProductProviderMatrix.findOneAndUpdate(
      { internalSlug },
      {
        $set: {
          internalSlug,
          productName: String(existing?.productName || providerProductName || internalSlug),
          category: String(existing?.category || category || ''),
          routingMode: String(existing?.routingMode || 'cheapest'),
          routes: nextRoutes,
          updatedBy: admin.userId,
        },
      },
      { upsert: true, new: true }
    ).lean()

    return NextResponse.json({
      success: true,
      data: {
        imported: true,
        createdProduct: created,
        matrix: updated,
      },
    })
  }

  if (action === 'set_policy') {
    const routingMode = n(body?.routingMode || 'cheapest')
    if (!['cheapest', 'priority', 'forced'].includes(routingMode)) {
      return NextResponse.json({ success: false, message: 'Invalid routingMode' }, { status: 400 })
    }
    const updated = await ProductProviderMatrix.findOneAndUpdate(
      { internalSlug },
      {
        $set: {
          internalSlug,
          routingMode,
          forcedProviderKey: routingMode === 'forced' ? n(body?.forcedProviderKey || '') || undefined : undefined,
          updatedBy: admin.userId,
        },
      },
      { upsert: true, new: true }
    ).lean()
    return NextResponse.json({ success: true, data: updated })
  }

  if (action === 'remove_route') {
    const providerKey = n(body?.providerKey || '')
    const providerProductId = String(body?.providerProductId || '').trim()
    if (!providerKey || !providerProductId) {
      return NextResponse.json(
        { success: false, message: 'providerKey and providerProductId are required' },
        { status: 400 }
      )
    }
    const updated = await ProductProviderMatrix.findOneAndUpdate(
      { internalSlug },
      {
        $pull: {
          routes: {
            providerKey,
            providerProductId,
          },
        },
        $set: { updatedBy: admin.userId },
      },
      { new: true }
    ).lean()
    return NextResponse.json({ success: true, data: updated })
  }

  if (action === 'replace_routes') {
    const updated = await ProductProviderMatrix.findOneAndUpdate(
      { internalSlug },
      {
        $set: {
          routes: normalizeRoutes(body?.routes || []),
          updatedBy: admin.userId,
        },
      },
      { upsert: true, new: true }
    ).lean()
    return NextResponse.json({ success: true, data: updated })
  }

  const providerKey = n(body?.providerKey || '')
  const providerProductId = String(body?.providerProductId || '').trim()
  if (!providerKey || !providerProductId) {
    return NextResponse.json(
      { success: false, message: 'providerKey and providerProductId are required' },
      { status: 400 }
    )
  }

  const doc = (await ProductProviderMatrix.findOne({ internalSlug })) as any
  const routes = Array.isArray(doc?.routes) ? [...doc.routes] : []
  const existingIndex = routes.findIndex(
    (row: any) =>
      n(row?.providerKey) === providerKey &&
      String(row?.providerProductId || '').trim() === providerProductId
  )
  const nextRoute = {
    providerKey,
    providerProductId,
    providerProductName: String(body?.providerProductName || '').trim() || undefined,
    active: body?.active !== false,
    fallbackEnabled: body?.fallbackEnabled !== false,
    priority: toNum(body?.priority, 100),
    fixedUnitCost: toNum(body?.fixedUnitCost, 0) > 0 ? toNum(body?.fixedUnitCost, 0) : undefined,
    metadata:
      typeof body?.metadata === 'object' && body?.metadata
        ? body.metadata
        : undefined,
  }

  if (existingIndex >= 0) routes[existingIndex] = { ...routes[existingIndex], ...nextRoute }
  else routes.push(nextRoute)

  const updated = await ProductProviderMatrix.findOneAndUpdate(
    { internalSlug },
    {
      $set: {
        internalSlug,
        productName: String(body?.productName || '').trim() || doc?.productName || undefined,
        category: n(body?.category || doc?.category || ''),
        routes: normalizeRoutes(routes),
        updatedBy: admin.userId,
      },
      $setOnInsert: {
        routingMode: 'cheapest',
      },
    },
    { upsert: true, new: true }
  ).lean()

  return NextResponse.json({ success: true, data: updated })
}

async function deleteHandler(req: NextRequest) {
  await connectDB()
  const body = await req.json()
  const internalSlug = n(body?.internalSlug || '')
  if (!internalSlug) {
    return NextResponse.json({ success: false, message: 'internalSlug is required' }, { status: 400 })
  }
  await ProductProviderMatrix.deleteOne({ internalSlug })
  return NextResponse.json({ success: true, data: { deleted: true, internalSlug } })
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, () => getHandler(req))
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, (r, u) => postHandler(r, u))
}

export async function PATCH(req: NextRequest) {
  return withAdminAuth(req, (r, u) => patchHandler(r, u))
}

export async function DELETE(req: NextRequest) {
  return withAdminAuth(req, () => deleteHandler(req))
}
