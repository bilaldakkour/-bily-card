require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

async function main() {
  const filePath = path.resolve(__dirname, '../lib/data/bilycardProducts.ts');
  const text = fs.readFileSync(filePath, 'utf8');
  const slugs = [...text.matchAll(/"slug":\s*"([^"]+)"/g)].map((m) => m[1].toLowerCase());
  const uniqueSlugs = [...new Set(slugs)];

  if (!uniqueSlugs.length) {
    throw new Error('No product slugs found in lib/data/bilycardProducts.ts');
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db();
  const pricingCollection = db.collection('productpricings');

  const operations = uniqueSlugs.map((slug) => ({
    updateOne: {
      filter: { productSlug: slug },
      update: {
        $set: {
          productSlug: slug,
          percentage: 5,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const result = await pricingCollection.bulkWrite(operations, { ordered: false });

  const notFivePercent = await pricingCollection.countDocuments({
    productSlug: { $in: uniqueSlugs },
    percentage: { $ne: 5 },
  });

  console.log(
    'PRICING_5_DONE',
    JSON.stringify({
      products: uniqueSlugs.length,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      notFivePercent,
    })
  );

  await client.close();
}

main().catch((error) => {
  console.error('PRICING_5_ERR', error.message);
  process.exit(1);
});
