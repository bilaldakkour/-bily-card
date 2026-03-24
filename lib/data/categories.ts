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
    name: 'الألعاب',
    slug: 'games',
    description: 'اشحن ألعاب الهاتف والكمبيوتر بعملات رقمية بسرعة',
    image: '/games/pubg.jpg',
    productCount: 45,
    featured: true,
    icon: 'Gamepad2'
  },
  {
    id: 'gift-cards',
    name: 'بطاقات الهدايا',
    slug: 'gift-cards',
    description: 'بطاقات رقمية لمنصات الألعاب وخدمات الترفيه',
    image: '/games/steam.jpg',
    productCount: 32,
    featured: true,
    icon: 'Gift'
  },
  {
    id: 'entertainment',
    name: 'الترفيه',
    slug: 'entertainment',
    description: 'خدمات بث ورصيد منصات اجتماعية ومحتوى رقمي',
    image: '/games/tiktok.jpg',
    productCount: 18,
    featured: true,
    icon: 'Music'
  },
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    slug: 'pubg',
    description: 'رصيد UC للعبة PUBG Mobile',
    image: '/games/pubg.jpg',
    productCount: 8,
    featured: false,
    icon: 'Target'
  },
  {
    id: 'freefire',
    name: 'Free Fire',
    slug: 'freefire',
    description: 'ألماس ورصيد للعبة Garena Free Fire',
    image: '/games/free-fire.jpg',
    productCount: 6,
    featured: false,
    icon: 'Flame'
  },
  {
    id: 'steam',
    name: 'Steam',
    slug: 'steam',
    description: 'بطاقات Steam ومحتوى رقمي',
    image: '/games/steam.jpg',
    productCount: 12,
    featured: false,
    icon: 'Monitor'
  },
  {
    id: 'google-play',
    name: 'Google Play',
    slug: 'google-play',
    description: 'بطاقات ورصيد متجر Google Play',
    image: '/games/google-play.jpg',
    productCount: 10,
    featured: false,
    icon: 'Smartphone'
  },
  {
    id: 'playstation',
    name: 'PlayStation',
    slug: 'playstation',
    description: 'بطاقات PSN ورصيد متجر PlayStation',
    image: '/games/playstation.jpg',
    productCount: 8,
    featured: false,
    icon: 'Gamepad'
  },
  {
    id: 'mobile-legends',
    name: 'Mobile Legends',
    slug: 'mobile-legends',
    description: 'ألماس ونقاط للعبة Mobile Legends',
    image: '/games/free-fire.jpg',
    productCount: 5,
    featured: false,
    icon: 'Sword'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    slug: 'tiktok',
    description: 'عملات TikTok للهدايا والتفاعل',
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
