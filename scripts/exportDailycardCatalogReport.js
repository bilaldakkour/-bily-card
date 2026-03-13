const fs = require('fs')
const path = require('path')

const rawPath = path.resolve(__dirname, './out/dailycard-products.raw.json')
const catalogPath = path.resolve(__dirname, '../lib/data/bilycardProducts.ts')
const outDir = path.resolve(__dirname, './out')
const outJson = path.join(outDir, 'dailycard-catalog-report.json')
const outCsv = path.join(outDir, 'dailycard-catalog-report.csv')

const normalize = (value) =>
  String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function detectCategory(name, productType) {
  const lower = normalize(name).toLowerCase()

  const gameKeywords = [
    'pubg',
    'free fire',
    'ml',
    'mobile legends',
    'roblox',
    'valorant',
    'fifa',
    'fc points',
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
  if (String(productType || '').toLowerCase() === 'stock') return 'gift-cards'
  return 'digital-services'
}

function parseRawItems() {
  if (!fs.existsSync(rawPath)) {
    throw new Error('Missing scripts/out/dailycard-products.raw.json. Run importDailycardProducts first.')
  }

  const payload = JSON.parse(fs.readFileSync(rawPath, 'utf8'))
  if (!Array.isArray(payload)) return []
  return payload
}

function parseCatalogSlugs() {
  if (!fs.existsSync(catalogPath)) return new Set()
  const source = fs.readFileSync(catalogPath, 'utf8')
  const matches = [...source.matchAll(/"slug":\s*"([^"]+)"/g)]
  return new Set(matches.map((m) => String(m[1] || '').toLowerCase()))
}

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toCsv(rows) {
  const headers = [
    'provider_order',
    'provider_id',
    'name',
    'price',
    'available',
    'product_type',
    'classified_category',
    'exists_in_generated_catalog',
  ]

  const escapeCell = (value) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.provider_order,
        row.provider_id,
        row.name,
        row.price,
        row.available,
        row.product_type,
        row.classified_category,
        row.exists_in_generated_catalog,
      ]
        .map(escapeCell)
        .join(',')
    )
  }

  return lines.join('\n')
}

function main() {
  const rawItems = parseRawItems()
  const slugs = parseCatalogSlugs()

  const report = rawItems.map((item, index) => {
    const id = String(item?.id || '').trim()
    const name = normalize(item?.name || `Product ${index + 1}`)
    const productType = normalize(item?.product_type || 'unknown').toLowerCase()
    const price = toNumber(item?.price)
    const available = item?.available === true
    const classifiedCategory = detectCategory(name, productType)

    const naiveSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')

    const existsInGeneratedCatalog = slugs.has(naiveSlug)

    return {
      provider_order: index + 1,
      provider_id: id,
      name,
      price,
      available,
      product_type: productType,
      classified_category: classifiedCategory,
      exists_in_generated_catalog: existsInGeneratedCatalog,
    }
  })

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8')
  fs.writeFileSync(outCsv, toCsv(report), 'utf8')

  const missingCount = report.filter((row) => !row.exists_in_generated_catalog).length
  const outOfStockCount = report.filter((row) => !row.available).length

  console.log(`Report rows: ${report.length}`)
  console.log(`Out of stock rows: ${outOfStockCount}`)
  console.log(`Rows not found by naive slug in generated catalog: ${missingCount}`)
  console.log(`JSON: ${outJson}`)
  console.log(`CSV: ${outCsv}`)
}

main()
