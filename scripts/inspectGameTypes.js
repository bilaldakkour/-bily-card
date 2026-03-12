const fs = require('fs')

const data = JSON.parse(fs.readFileSync('scripts/out/dailycard-products.raw.json', 'utf8'))

const q = (s) => String(s || '').toLowerCase()

const hits = data.filter(
  (x) =>
    q(x.name).includes('free fire') ||
    q(x.name).includes('freefire') ||
    q(x.name).includes('pubg') ||
    q(x.name).includes('mobile legends') ||
    q(x.name).includes('mlbb')
)

console.log('matches', hits.length)
console.log(
  JSON.stringify(
    hits.slice(0, 80).map((x) => ({
      id: x.id,
      name: x.name,
      product_type: x.product_type,
      price: x.price,
      params: x.params,
      qty_values: x.qty_values,
    })),
    null,
    2
  )
)
