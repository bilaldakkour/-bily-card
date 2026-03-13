export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  price: number;
  startingPrice?: number;
  category: string;
  image: string;
  featured: boolean;
  bestSeller: boolean;
  inputFields: InputField[];
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  platform: string;
  deliveryTime: string;
  tags: string[];
  groupKey?: string;
  groupSlug?: string;
  childCount?: number;
  childSlugs?: string[];
  groupChildren?: Product[];
  isGroupedParent?: boolean;
}

export interface InputField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export const products: Product[] = [
  {
    id: 'pubg-uc-60',
    slug: 'pubg-uc-60',
    name: 'PUBG Mobile UC 60',
    shortDescription: 'Top up your PUBG Mobile account with 60 UC instantly',
    fullDescription: 'Get 60 UC (Unknown Cash) for PUBG Mobile instantly after payment. Perfect for buying in-game items, skins, and boosts. Delivery is automatic and takes less than 5 minutes.',
    price: 2.99,
    category: 'pubg',
    image: '/games/pubg.jpg',
    featured: true,
    bestSeller: true,
    inputFields: [
      {
        name: 'playerId',
        label: 'Player ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your PUBG Player ID'
      },
      {
        name: 'package',
        label: 'Choose Package',
        type: 'select',
        required: true,
        options: ['60 UC - $2.99', '325 UC - $9.99', '660 UC - $18.99', '1800 UC - $45.99']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'PUBG Mobile',
    deliveryTime: 'Instant (2-5 minutes)',
    tags: ['gaming', 'mobile', 'popular']
  },
  {
    id: 'free-fire-diamonds-100',
    slug: 'free-fire-diamonds-100',
    name: 'Free Fire Diamonds 100',
    shortDescription: 'Purchase 100 Diamonds for Free Fire mobile game',
    fullDescription: 'Add 100 Diamonds to your Free Fire account. Use them to buy characters, skins, pets, and other in-game items. Fast and secure delivery guaranteed.',
    price: 4.99,
    category: 'freefire',
    image: '/games/free-fire.jpg',
    featured: true,
    bestSeller: true,
    inputFields: [
      {
        name: 'playerId',
        label: 'Player ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your Free Fire Player ID'
      },
      {
        name: 'package',
        label: 'Choose Package',
        type: 'select',
        required: true,
        options: ['100 Diamonds - $4.99', '310 Diamonds - $12.99', '520 Diamonds - $19.99', '1080 Diamonds - $39.99']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'Free Fire',
    deliveryTime: 'Instant (2-5 minutes)',
    tags: ['gaming', 'mobile', 'popular']
  },
  {
    id: 'steam-gift-card-10',
    slug: 'steam-gift-card-10',
    name: 'Steam Gift Card $10',
    shortDescription: 'Digital Steam Gift Card for $10 USD',
    fullDescription: 'Purchase a $10 Steam Gift Card instantly. Perfect for buying games, in-game content, and software on Steam. Delivered via email immediately after payment.',
    price: 10.00,
    category: 'steam',
    image: '/games/steam.jpg',
    featured: true,
    bestSeller: false,
    inputFields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'Enter your email for delivery'
      },
      {
        name: 'package',
        label: 'Choose Amount',
        type: 'select',
        required: true,
        options: ['$10 - $10.00', '$25 - $25.00', '$50 - $50.00', '$100 - $100.00']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'Steam',
    deliveryTime: 'Instant (via email)',
    tags: ['gaming', 'pc', 'gift-card']
  },
  {
    id: 'google-play-5',
    slug: 'google-play-5',
    name: 'Google Play Gift Card $5',
    shortDescription: 'Google Play Gift Card for $5 USD',
    fullDescription: 'Buy Google Play credit instantly. Use it for apps, games, movies, and more on Google Play Store. Perfect for Android users.',
    price: 5.00,
    category: 'google-play',
    image: '/games/google-play.jpg',
    featured: false,
    bestSeller: true,
    inputFields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'Enter your email for delivery'
      },
      {
        name: 'package',
        label: 'Choose Amount',
        type: 'select',
        required: true,
        options: ['$5 - $5.00', '$10 - $10.00', '$25 - $25.00', '$50 - $50.00']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'Google Play',
    deliveryTime: 'Instant (via email)',
    tags: ['mobile', 'apps', 'gift-card']
  },
  {
    id: 'tiktok-coins-100',
    slug: 'tiktok-coins-100',
    name: 'TikTok Coins 100',
    shortDescription: 'Purchase 100 TikTok Coins for gifts and interactions',
    fullDescription: 'Buy 100 TikTok Coins to send virtual gifts to your favorite creators. Support content creators and enhance your TikTok experience.',
    price: 1.99,
    category: 'tiktok',
    image: '/games/tiktok.jpg',
    featured: false,
    bestSeller: false,
    inputFields: [
      {
        name: 'username',
        label: 'TikTok Username',
        type: 'text',
        required: true,
        placeholder: 'Enter your TikTok username'
      },
      {
        name: 'package',
        label: 'Choose Package',
        type: 'select',
        required: true,
        options: ['100 Coins - $1.99', '500 Coins - $8.99', '1000 Coins - $16.99', '5000 Coins - $79.99']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'TikTok',
    deliveryTime: 'Instant (2-5 minutes)',
    tags: ['social', 'entertainment']
  },
  {
    id: 'playstation-10',
    slug: 'playstation-10',
    name: 'PlayStation Store Card $10',
    shortDescription: 'PlayStation Store Gift Card for $10 USD',
    fullDescription: 'Get a $10 PlayStation Store Gift Card instantly. Perfect for buying PS4/PS5 games, DLC, and subscriptions. Delivered via email.',
    price: 10.00,
    category: 'playstation',
    image: '/games/playstation.jpg',
    featured: true,
    bestSeller: false,
    inputFields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'Enter your email for delivery'
      },
      {
        name: 'package',
        label: 'Choose Amount',
        type: 'select',
        required: true,
        options: ['$10 - $10.00', '$20 - $20.00', '$50 - $50.00', '$100 - $100.00']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'PlayStation',
    deliveryTime: 'Instant (via email)',
    tags: ['gaming', 'console', 'gift-card']
  },
  {
    id: 'mobile-legends-250',
    slug: 'mobile-legends-250',
    name: 'Mobile Legends Diamonds 250',
    shortDescription: 'Add 250 Diamonds to your Mobile Legends account',
    fullDescription: 'Purchase 250 Diamonds for Mobile Legends: Bang Bang. Use them to buy heroes, skins, and battle items. Fast delivery guaranteed.',
    price: 7.99,
    category: 'mobile-legends',
    image: '/games/free-fire.jpg', // Using free-fire image as placeholder
    featured: false,
    bestSeller: false,
    inputFields: [
      {
        name: 'playerId',
        label: 'Player ID',
        type: 'text',
        required: true,
        placeholder: 'Enter your Mobile Legends Player ID'
      },
      {
        name: 'package',
        label: 'Choose Package',
        type: 'select',
        required: true,
        options: ['250 Diamonds - $7.99', '500 Diamonds - $14.99', '1000 Diamonds - $28.99', '2500 Diamonds - $69.99']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'Mobile Legends',
    deliveryTime: 'Instant (2-5 minutes)',
    tags: ['gaming', 'mobile']
  },
  {
    id: 'netflix-gift-card-15',
    slug: 'netflix-gift-card-15',
    name: 'Netflix Gift Card $15',
    shortDescription: 'Netflix Gift Card for premium streaming',
    fullDescription: 'Purchase a $15 Netflix Gift Card instantly. Perfect for upgrading your Netflix subscription or gifting to friends and family.',
    price: 15.00,
    category: 'entertainment',
    image: '/games/steam.jpg', // Using steam image as placeholder
    featured: false,
    bestSeller: false,
    inputFields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'Enter your email for delivery'
      },
      {
        name: 'package',
        label: 'Choose Amount',
        type: 'select',
        required: true,
        options: ['$15 - $15.00', '$25 - $25.00', '$50 - $50.00']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'Netflix',
    deliveryTime: 'Instant (via email)',
    tags: ['entertainment', 'streaming', 'gift-card']
  },
  {
    id: 'xbox-gift-card-20',
    slug: 'xbox-gift-card-20',
    name: 'Xbox Gift Card $20',
    shortDescription: 'Microsoft Xbox Gift Card for gaming',
    fullDescription: 'Buy a $20 Xbox Gift Card instantly. Use it for Xbox games, subscriptions, and digital content on Microsoft Store.',
    price: 20.00,
    category: 'xbox',
    image: '/games/playstation.jpg', // Using playstation image as placeholder
    featured: false,
    bestSeller: false,
    inputFields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'Enter your email for delivery'
      },
      {
        name: 'package',
        label: 'Choose Amount',
        type: 'select',
        required: true,
        options: ['$20 - $20.00', '$50 - $50.00', '$100 - $100.00']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'Xbox',
    deliveryTime: 'Instant (via email)',
    tags: ['gaming', 'console', 'gift-card']
  },
  {
    id: 'itunes-gift-card-10',
    slug: 'itunes-gift-card-10',
    name: 'iTunes Gift Card $10',
    shortDescription: 'Apple iTunes Gift Card for apps and media',
    fullDescription: 'Purchase a $10 iTunes Gift Card instantly. Perfect for buying apps, music, movies, and more from the Apple ecosystem.',
    price: 10.00,
    category: 'itunes',
    image: '/games/tiktok.jpg', // Using tiktok image as placeholder
    featured: false,
    bestSeller: false,
    inputFields: [
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'Enter your email for delivery'
      },
      {
        name: 'package',
        label: 'Choose Amount',
        type: 'select',
        required: true,
        options: ['$10 - $10.00', '$25 - $25.00', '$50 - $50.00', '$100 - $100.00']
      }
    ],
    stockStatus: 'in_stock',
    platform: 'iTunes',
    deliveryTime: 'Instant (via email)',
    tags: ['mobile', 'apps', 'gift-card']
  }
];

export const getProductBySlug = (slug: string): Product | undefined => {
  return products.find(product => product.slug === slug);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter(product => product.category === category);
};

export const getFeaturedProducts = (): Product[] => {
  return products.filter(product => product.featured);
};

export const getBestSellingProducts = (): Product[] => {
  return products.filter(product => product.bestSeller);
};
