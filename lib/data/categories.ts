export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
  featured: boolean;
  icon?: string;
}

export const categories: Category[] = [
  {
    id: 'games',
    name: 'Games',
    slug: 'games',
    description: 'Top up your favorite mobile and PC games with digital currency',
    image: '/games/pubg.jpg',
    productCount: 45,
    featured: true,
    icon: 'Gamepad2'
  },
  {
    id: 'gift-cards',
    name: 'Gift Cards',
    slug: 'gift-cards',
    description: 'Digital gift cards for gaming platforms and entertainment services',
    image: '/games/steam.jpg',
    productCount: 32,
    featured: true,
    icon: 'Gift'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'Streaming services, social media credits, and digital entertainment',
    image: '/games/tiktok.jpg',
    productCount: 18,
    featured: true,
    icon: 'Music'
  },
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    slug: 'pubg',
    description: 'Unknown Cash (UC) for PUBG Mobile battle royale game',
    image: '/games/pubg.jpg',
    productCount: 8,
    featured: false,
    icon: 'Target'
  },
  {
    id: 'freefire',
    name: 'Free Fire',
    slug: 'freefire',
    description: 'Diamonds and credits for Garena Free Fire',
    image: '/games/free-fire.jpg',
    productCount: 6,
    featured: false,
    icon: 'Flame'
  },
  {
    id: 'steam',
    name: 'Steam',
    slug: 'steam',
    description: 'Steam gift cards and digital content',
    image: '/games/steam.jpg',
    productCount: 12,
    featured: false,
    icon: 'Monitor'
  },
  {
    id: 'google-play',
    name: 'Google Play',
    slug: 'google-play',
    description: 'Google Play Store gift cards and credits',
    image: '/games/google-play.jpg',
    productCount: 10,
    featured: false,
    icon: 'Smartphone'
  },
  {
    id: 'playstation',
    name: 'PlayStation',
    slug: 'playstation',
    description: 'PSN gift cards and PlayStation Store credits',
    image: '/games/playstation.jpg',
    productCount: 8,
    featured: false,
    icon: 'Gamepad'
  },
  {
    id: 'mobile-legends',
    name: 'Mobile Legends',
    slug: 'mobile-legends',
    description: 'Diamonds and battle points for Mobile Legends',
    image: '/games/free-fire.jpg',
    productCount: 5,
    featured: false,
    icon: 'Sword'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    slug: 'tiktok',
    description: 'TikTok coins for virtual gifts and interactions',
    image: '/games/tiktok.jpg',
    productCount: 4,
    featured: false,
    icon: 'Music'
  }
];

export const getCategoryBySlug = (slug: string): Category | undefined => {
  return categories.find(category => category.slug === slug);
};

export const getFeaturedCategories = (): Category[] => {
  return categories.filter(category => category.featured);
};