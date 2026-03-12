require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })
const mongoose = require('mongoose')


// Product schema (simplified for seeding)
const productSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  price: Number,
  image: String,
  category: String,
  providerProductId: String,
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
}, { timestamps: true })

const Product = mongoose.model('Product', productSchema)

const products = [
  {
    name: 'PUBG UC',
    slug: 'pubg-uc',
    description: 'Top up PUBG Mobile UC instantly with Bily Card',
    price: 9.99,
    image: 'https://via.placeholder.com/300x200?text=PUBG+UC',
    category: 'Gaming',
    providerProductId: 'pubg-uc-100',
    active: true,
    featured: true,
  },
  {
    name: 'Free Fire Diamonds',
    slug: 'free-fire-diamonds',
    description: 'Recharge Free Fire diamonds quickly with Bily Card',
    price: 4.99,
    image: 'https://via.placeholder.com/300x200?text=Free+Fire+Diamonds',
    category: 'Gaming',
    providerProductId: 'ff-diamonds-100',
    active: true,
    featured: true,
  },
  {
    name: 'TikTok Coins',
    slug: 'tiktok-coins',
    description: 'Recharge TikTok coins instantly with Bily Card',
    price: 2.99,
    image: 'https://via.placeholder.com/300x200?text=TikTok+Coins',
    category: 'Social Media',
    providerProductId: 'tiktok-coins-100',
    active: true,
    featured: false,
  },
  {
    name: 'Google Play Card',
    slug: 'google-play-card',
    description: 'Get Google Play gift cards with Bily Card',
    price: 19.99,
    image: 'https://via.placeholder.com/300x200?text=Google+Play+Card',
    category: 'Gift Cards',
    providerProductId: 'gplay-20',
    active: true,
    featured: false,
  },
  {
    name: 'Steam Wallet',
    slug: 'steam-wallet',
    description: 'Top up Steam Wallet balance with Bily Card',
    price: 14.99,
    image: 'https://via.placeholder.com/300x200?text=Steam+Wallet',
    category: 'Gaming',
    providerProductId: 'steam-15',
    active: true,
    featured: true,
  },
  {
    name: 'Mobile Legends Diamonds',
    slug: 'mobile-legends-diamonds',
    description: 'Recharge Mobile Legends diamonds with Bily Card',
    price: 7.99,
    image: 'https://via.placeholder.com/300x200?text=Mobile+Legends+Diamonds',
    category: 'Gaming',
    providerProductId: 'ml-diamonds-200',
    active: true,
    featured: false,
  },
]

async function seedProducts() {
  try {
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required')
    }

    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    // Clear existing products
    await Product.deleteMany({})
    console.log('Cleared existing products')

    // Insert new products
    const insertedProducts = await Product.insertMany(products)
    console.log(`Seeded ${insertedProducts.length} products`)

    console.log('Seeding completed successfully')
  } catch (error) {
    console.error('Error seeding products:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

seedProducts()