const fs = require('fs')
const path = require('path')

const rawPath = path.resolve(__dirname, './out/dailycard-products.raw.json')
const outputPath = path.resolve(__dirname, '../lib/data/bilycardProducts.ts')

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'))
const take = Array.isArray(raw) ? raw : []

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const usedSlugs = new Set()
const uniqueSlug = (name, id) => {
  let slug = slugify(name)
  if (!slug) slug = `product-${id}`

  let nextSlug = slug
  let i = 2
  while (usedSlugs.has(nextSlug)) {
    nextSlug = `${slug}-${i}`
    i += 1
  }

  usedSlugs.add(nextSlug)
  return nextSlug
}

const formatPrice = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

const normalizeName = (value) =>
  String(value || '')
    .replace(/[,_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const extractPackageBaseName = (name) => {
  const clean = normalizeName(name)
  if (!clean) return 'Package'

  const withoutVipDuration = clean.replace(/vip\s*\d+\s*days?/ig, '')
  const withoutStandaloneNumbers = withoutVipDuration.replace(/\b\d+(?:\.\d+)?\b/g, '')
  const withoutAttachedNumbers = withoutStandaloneNumbers.replace(/\d+/g, '')
  const normalized = withoutAttachedNumbers
    .replace(/\b(packages?|package|amount|qty|quantity)\b/ig, '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || clean
}

const detectCategory = (name, productType) => {
  const lower = normalizeName(name).toLowerCase()

  const gameKeywords = [
    'pubg',
    'free fire',
    'ml',
    'mobile legends',
    'roblox',
    'valorant',
    'fifa',
    'efootball',
    'cod',
    'call of duty',
    'steam',
    'playstation',
    'xbox',
    'riot',
    'diamond',
    'diamonds',
    'uc',
    'jewel',
  ]

  const appKeywords = [
    'tiktok',
    'meyo',
    'imo',
    'likee',
    'party star',
    'poppo',
    'soul chill',
    'dika',
    'xena',
    'oloo',
    'up fun',
    'cocco',
    'yaahlan',
    'sugo',
    'tango',
    'hiyoo',
    'lami',
    'layla',
    'dido',
    'yaho',
    'tokens',
    'coin',
    'coins',
  ]

  if (gameKeywords.some((keyword) => lower.includes(keyword))) return 'games'
  if (appKeywords.some((keyword) => lower.includes(keyword))) return 'applications'
  if (productType === 'stock') return 'gift-cards'
  return 'digital-services'
}

const byType = {
  package: [],
  count: [],
  stock: [],
}

for (const item of take) {
  const type = String(item.product_type || 'count').toLowerCase()
  if (type === 'package') byType.package.push(item)
  else if (type === 'stock') byType.stock.push(item)
  else byType.count.push(item)
}

const groupedPackageMap = new Map()

for (const item of byType.package) {
  const baseName = extractPackageBaseName(item.name)
  const key = baseName.toLowerCase()
  if (!groupedPackageMap.has(key)) groupedPackageMap.set(key, [])
  groupedPackageMap.get(key).push(item)
}

const mappedPackageProducts = Array.from(groupedPackageMap.entries()).map(
  ([, group], index) => {
    const first = group[0]
    const baseName = extractPackageBaseName(first.name)
    const id = `pkg-${first.id || index + 1}`

    const options = group
      .map((entry) => ({
        id: entry.id,
        name: normalizeName(entry.name),
        price: Number(entry.price) || 0,
        available: entry.available !== false,
      }))
      .sort((a, b) => a.price - b.price)

    const availableOptions = options.filter((option) => option.available)
    const minPrice = availableOptions.length
      ? availableOptions[0].price
      : (options.length ? options[0].price : 0)

    const hasAvailable = options.some((option) => option.available)
    const hasUnavailable = options.some((option) => !option.available)

    let stockStatus = 'in_stock'
    if (!hasAvailable) stockStatus = 'out_of_stock'
    else if (hasUnavailable) stockStatus = 'limited'

    return {
      id,
      slug: uniqueSlug(baseName, id),
      name: baseName,
      shortDescription: 'Package-based digital product with instant delivery.',
      fullDescription: 'Choose a package and get instant digital delivery.',
      price: minPrice,
      category: detectCategory(baseName, 'package'),
      image: typeof first.image === 'string' && first.image ? first.image : '/games/pubg.jpg',
      featured: index < 12,
      bestSeller: index < 20,
      inputFields: [
        {
          name: 'playerId',
          label: Array.isArray(first.params) && first.params[0] ? String(first.params[0]) : 'Player ID',
          type: 'text',
          required: true,
          placeholder: 'Enter details',
        },
        {
          name: 'package',
          label: 'Choose Package',
          type: 'select',
          required: true,
          options: options.map(
            (option) => `${option.name} - $${formatPrice(option.price)}${option.available ? '' : ' (Out of stock)'}`
          ),
        },
      ],
      stockStatus,
      platform: 'BilyCard',
      deliveryTime: 'Instant',
      tags: ['bilycard', 'package', detectCategory(baseName, 'package')],
    }
  }
)

const mappedCountProducts = byType.count.map((item, index) => {
  const id = String(item.id ?? index + 1)
  const name = String(item.name || `Product ${id}`)
  const firstParam = Array.isArray(item.params) && item.params.length > 0
    ? String(item.params[0])
    : 'Player ID'

  const minCount = Number(item?.qty_values?.min)
  const maxCount = Number(item?.qty_values?.max)

  return {
    id,
    slug: uniqueSlug(name, id),
    name: normalizeName(name),
    shortDescription: 'Count-based digital product with instant delivery.',
    fullDescription: 'Count-based digital product with instant delivery.',
    price: Number(item.price) || 0,
    category: detectCategory(name, 'quantity'),
    image: typeof item.image === 'string' && item.image ? item.image : '/games/pubg.jpg',
    featured: index < 8,
    bestSeller: index < 12,
    inputFields: [
      {
        name: 'count',
        label: 'Count',
        type: 'number',
        required: true,
        placeholder: Number.isFinite(minCount) ? `Minimum ${minCount}` : 'Enter count',
        validation: {
          ...(Number.isFinite(minCount) ? { min: minCount } : {}),
          ...(Number.isFinite(maxCount) ? { max: maxCount } : {}),
        },
      },
      {
        name: 'playerId',
        label: firstParam,
        type: 'text',
        required: true,
        placeholder: 'Enter details',
      },
    ],
    stockStatus: item.available === false ? 'out_of_stock' : 'in_stock',
    platform: 'BilyCard',
    deliveryTime: 'Instant',
    tags: ['bilycard', 'count', detectCategory(name, 'quantity')],
  }
})

const groupedStockMap = new Map()

for (const item of byType.stock) {
  const baseName = extractPackageBaseName(item.name)
    .replace(/\b(code|gift\s*card|card)\b/ig, '')
    .replace(/\s+/g, ' ')
    .trim()
  const key = (baseName || normalizeName(item.name)).toLowerCase()

  if (!groupedStockMap.has(key)) groupedStockMap.set(key, [])
  groupedStockMap.get(key).push(item)
}

const mappedStockProducts = Array.from(groupedStockMap.entries()).map(([, group], index) => {
  const first = group[0]
  const baseName = (
    extractPackageBaseName(first.name)
      .replace(/\b(code|gift\s*card|card)\b/ig, '')
      .replace(/\s+/g, ' ')
      .trim() || normalizeName(first.name)
  )

  const id = `stk-${first.id || index + 1}`
  const firstParam = Array.isArray(first.params) && first.params.length > 0
    ? String(first.params[0])
    : 'Player ID'

  const options = group
    .map((entry) => ({
      id: entry.id,
      name: normalizeName(entry.name),
      price: Number(entry.price) || 0,
      available: entry.available !== false,
    }))
    .sort((a, b) => a.price - b.price)

  const availableOptions = options.filter((option) => option.available)
  const minPrice = availableOptions.length
    ? availableOptions[0].price
    : (options.length ? options[0].price : 0)

  const hasAvailable = options.some((option) => option.available)
  const hasUnavailable = options.some((option) => !option.available)

  let stockStatus = 'in_stock'
  if (!hasAvailable) stockStatus = 'out_of_stock'
  else if (hasUnavailable) stockStatus = 'limited'

  const shouldCollapseToPackages = group.length > 1

  return {
    id,
    slug: uniqueSlug(baseName, id),
    name: normalizeName(baseName),
    shortDescription: shouldCollapseToPackages
      ? 'Multi-option digital product with instant delivery.'
      : 'Stock/code digital product with instant delivery.',
    fullDescription: shouldCollapseToPackages
      ? 'Choose a package and get instant digital delivery.'
      : 'Stock/code digital product with instant delivery.',
    price: minPrice,
    category: detectCategory(baseName, 'stock'),
    image: typeof first.image === 'string' && first.image ? first.image : '/games/pubg.jpg',
    featured: index < 5,
    bestSeller: index < 8,
    inputFields: shouldCollapseToPackages
      ? [
          {
            name: 'playerId',
            label: firstParam,
            type: 'text',
            required: true,
            placeholder: 'Enter details',
          },
          {
            name: 'package',
            label: 'Choose Package',
            type: 'select',
            required: true,
            options: options.map(
              (option) => `${option.name} - $${formatPrice(option.price)}${option.available ? '' : ' (Out of stock)'}`
            ),
          },
        ]
      : [
          {
            name: 'playerId',
            label: firstParam,
            type: 'text',
            required: true,
            placeholder: 'Enter details',
          },
        ],
    stockStatus,
    platform: 'BilyCard',
    deliveryTime: 'Instant',
    tags: ['bilycard', shouldCollapseToPackages ? 'package' : 'stock', detectCategory(baseName, 'stock')],
  }
})

const mapped = [
  ...mappedPackageProducts,
  ...mappedCountProducts,
  ...mappedStockProducts,
]

const fileContent = `import type { Product } from './products'\n\nexport const bilycardProducts: Product[] = ${JSON.stringify(mapped, null, 2)}\n\nexport const getBilycardProductBySlug = (slug: string): Product | undefined => bilycardProducts.find((product) => product.slug === slug)\n\nexport const getBilycardBestSellingProducts = (): Product[] => bilycardProducts.filter((product) => product.bestSeller)\n`

fs.writeFileSync(outputPath, fileContent, 'utf8')
console.log(`Generated ${mapped.length} products in lib/data/bilycardProducts.ts`)
