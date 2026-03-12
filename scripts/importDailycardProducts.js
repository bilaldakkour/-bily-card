require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

const fs = require('fs')
const path = require('path')
const axios = require('axios')

const API_BASE = process.env.DAILYCARD_API_BASE || 'https://dailycard.shop/UAPI/api-keys'
const API_KEY = process.env.DAILYCARD_API_KEY
const API_SECRET = process.env.DAILYCARD_API_SECRET

if (!API_KEY || !API_SECRET) {
  console.error('Missing DAILYCARD_API_KEY or DAILYCARD_API_SECRET in .env.local')
  process.exit(1)
}

const headers = {
  'X-API-Key': API_KEY,
  'X-API-Secret': API_SECRET,
  'Content-Type': 'application/json',
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function pickPrice(raw) {
  const candidates = [
    raw.price,
    raw.selling_price,
    raw.final_price,
    raw.amount,
    raw.cost,
  ]

  for (const c of candidates) {
    const n = Number(c)
    if (!Number.isNaN(n) && Number.isFinite(n) && n >= 0) {
      return n
    }
  }

  return 0
}

function pickImage(raw) {
  const candidates = [
    raw.image,
    raw.image_url,
    raw.thumbnail,
    raw.thumbnail_url,
    raw.icon,
  ]

  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim()
    }
  }

  return '/games/pubg.jpg'
}

function pickName(raw) {
  const candidates = [raw.name, raw.title, raw.product_name]

  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim()
    }
  }

  return `Product ${raw.id || ''}`.trim()
}

function pickDescription(raw) {
  const candidates = [raw.description, raw.short_description, raw.details]

  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim()
    }
  }

  return 'Digital product with instant delivery.'
}

function pickCategory(raw) {
  const candidates = [
    raw.category_slug,
    raw.category,
    raw.category_name,
    raw.game,
    raw.platform,
  ]

  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) {
      return slugify(item)
    }
  }

  if (typeof raw.category === 'number') {
    return `category-${raw.category}`
  }

  return 'digital-products'
}

function toProduct(raw, index) {
  const name = pickName(raw)
  const slugBase = slugify(raw.slug || name) || `dailycard-product-${index + 1}`
  const category = pickCategory(raw)
  const price = pickPrice(raw)
  const shortDescription = pickDescription(raw)

  return {
    id: String(raw.id || slugBase || index + 1),
    slug: slugBase,
    name,
    shortDescription,
    fullDescription: shortDescription,
    price,
    category,
    image: pickImage(raw),
    featured: Boolean(raw.featured),
    bestSeller: Boolean(raw.best_seller || raw.popular || raw.is_popular),
    inputFields: [
      {
        name: 'playerId',
        label: 'Player ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your Player ID',
      },
    ],
    stockStatus: raw.in_stock === false ? 'out_of_stock' : 'in_stock',
    platform: raw.platform || raw.category_name || 'Digital',
    deliveryTime: raw.delivery_time || 'Instant',
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((tag) => String(tag))
      : ['dailycard'],
  }
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.products)) return payload.products
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function hasNextPage(payload, page, pageSize, currentCount) {
  if (payload?.next) return true

  const total = Number(payload?.count || payload?.total || payload?.total_count)
  if (!Number.isNaN(total) && total > 0) {
    return page * pageSize < total
  }

  return currentCount === pageSize
}

async function fetchAllProducts() {
  const pageSize = 200
  let page = 1
  const allRawItems = []

  while (true) {
    const url = `${API_BASE}/products/`
    const { data } = await axios.get(url, {
      headers,
      params: {
        page,
        page_size: pageSize,
      },
      timeout: 30000,
    })

    const items = extractItems(data)
    if (!items.length) break

    allRawItems.push(...items)

    const shouldContinue = hasNextPage(data, page, pageSize, items.length)
    if (!shouldContinue) break

    page += 1
  }

  return allRawItems
}

async function main() {
  try {
    console.log('Fetching DailyCard products...')
    const rawItems = await fetchAllProducts()

    if (!rawItems.length) {
      console.log('No products returned from API.')
      return
    }

    const mapped = rawItems.map((item, index) => toProduct(item, index))

    const outDir = path.resolve(__dirname, '../scripts/out')
    fs.mkdirSync(outDir, { recursive: true })

    const rawPath = path.join(outDir, 'dailycard-products.raw.json')
    const mappedPath = path.join(outDir, 'dailycard-products.mapped.json')

    fs.writeFileSync(rawPath, JSON.stringify(rawItems, null, 2), 'utf8')
    fs.writeFileSync(mappedPath, JSON.stringify(mapped, null, 2), 'utf8')

    console.log(`Fetched ${rawItems.length} products.`)
    console.log(`Raw saved to: ${rawPath}`)
    console.log(`Mapped saved to: ${mappedPath}`)
  } catch (error) {
    const message = error?.response?.data || error?.message || error
    console.error('Import failed:', message)
    process.exit(1)
  }
}

main()
