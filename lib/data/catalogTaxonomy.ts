import type { Product } from './products';

export type CatalogCategoryId =
  | 'cards'
  | 'applications'
  | 'games'
  | 'wallets'
  | 'balance'
  | 'social-media'
  | 'entertainment'
  | 'accounts-subscriptions'
  | 'redemption-coupons';

export type CatalogOfferType = 'products' | 'packages' | 'cards';

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[,_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(normalizeText(keyword)));

const RAW_CATEGORY_MAP: Record<string, CatalogCategoryId> = {
  cards: 'cards',
  'gift-cards': 'cards',
  'gift cards': 'cards',
  applications: 'applications',
  games: 'games',
  wallets: 'wallets',
  balance: 'balance',
  'social-media': 'social-media',
  'social media': 'social-media',
  entertainment: 'entertainment',
  'accounts-subscriptions': 'accounts-subscriptions',
  'accounts & subscriptions': 'accounts-subscriptions',
  'redemption-coupons': 'redemption-coupons',
  'redemption coupon': 'redemption-coupons',
};

const CARD_KEYWORDS = [
  'psn usa',
  'psn lebanon',
  'psn uae',
  'itunes usa',
  'itunes tl',
  'roblox',
  'razer gold global',
  'xbox live usa',
  'nintendo eshop usa',
  'amazon usa',
  'jawaker code',
  'steam usa',
  'google play tr',
];

const APPLICATION_PACKAGE_KEYWORDS = [
  'meyo',
  'imo',
  'yalla live',
  'star maker',
  'livu',
  'tumile',
  'mixu',
  'tiktok coins',
  'ddlive',
  'star lite',
];

const GAMES_PACKAGE_KEYWORDS = [
  'pubg mobile',
  'pubg tr',
  'ludo',
  'jawaker',
  'free fire',
  'clash of clans',
  'clash royale',
  'brawl stars',
  '8 ballpool',
  'hay day',
  'mobile legends',
  'weplay',
  'انتقام السلاطين',
  'delta force',
  'ea fc mobile',
  'fifa mobile',
  'blood strike',
  'call of duty mobile',
  'النجاة في الصقيع',
];

const WALLET_PRODUCT_KEYWORDS = ['usdt', 'perfect money', 'trx', 'trc20', 'binance', 'crypto'];
const BALANCE_PACKAGE_KEYWORDS = ['رصيد سرتيل', 'رصيد ام تي ان', 'syriatel', 'mtn'];
const SOCIAL_PACKAGE_KEYWORDS = ['facebook services', 'telegram services'];
const ENTERTAINMENT_PACKAGE_KEYWORDS = ['shahid', 'netflix', 'osn+'];
const ACCOUNT_PACKAGE_KEYWORDS = ['open ai', 'chatgpt', 'opan ai'];
const REDEMPTION_PRODUCT_KEYWORDS = ['internet dawnload manager', 'capcut', 'exitlag', 'idm'];

const APPLICATION_PRODUCT_KEYWORDS = [
  'up fun', 'oloo live', 'xena', 'dika live', 'soul chill', 'poppo live', 'party star', 'likee', 'dido',
  'layla', 'lami', 'hiyoo', 'tango', 'sugo', 'yaahlan', 'cocco', 'ifun', 'tami', '7star', 'wego',
  'ditto', 'bigo', 'yooy', 'dimo', 'soul chat', 'gimme', 'yoyo', 'binmo', 'yoho', 'ahlan', '4fun',
  'oohla', 'soyo', 'up live', 'hiya', 'beela', 'waho', 'tada', 'topvoice', 'kwai', 'mico live', 'azal',
  'haki', 'olamet', 'mr7ba', 'top top', 'ligo', 'taka', 'honey jar', 'migo', 'super live', 'hawa',
  'lama', 'kiyo', 'wyak', 'sky chat', 'ayome', 'allo', 'light chat', 'soul u', 'litchat', 'habby',
  'gold chat', 'bobo', 'fancy', 'saba', 'salam', 'talktalk', 'hoby chat', 'amar chat', 'hala me',
  'ghanny', 'lions chat', 'chamet live', 'hiplay chat', 'somatch', 'majlis', 'higo chat', 'soul star',
  'hami party', 'hi party', 'party hero', 'karawan chat', 'yobi live', 'amo chat', 'asha live',
  'opa live', 'shila chat', 'imu chat', 'mango live', 'junko', 'hoki chat', 'wasla chat', 'fofo chat',
  'yami star', 'layam chat', 'sama chat', 'weso chat', 'dana chat', 'pawa live', 'saada chat',
  'sodfa chat', 'waki star', 'gamet live', 'jaco chat', 'ro star', 'pocket chat', 'nawa live',
  'mazyoun zena', 'carni live', 'yahlla chat', 'yudo chat', '1star chat', 'gala star', 'hago',
  'moli star', 'yigo chat', 'yolo chat', 'halla live', 'kafu chat', 'sawalfna', 'haya chat', 'sugo tr',
  'sahra chat', 'laki chat', 'kiti', 'hayuki', 'fun star', 'biu live', 'saya likee', 'leesky',
  'kessmet chat', 'pota live', 'maza chat', 'fun up', 'joyo live', 'lado live', 'sala live', 'rooka',
  'vova', 'waaw chat', 'nahki', 'yoparti', 'boli', 'lklk', 'vvparty', 'yohoo star', 'halo star',
  'hati', 'panda chat', 'cloz', 'mazag', 'pk star', 'vilaa', 'zaar', 'wechill', 'our talk', 'hart live',
  'doli live', 'yaza', 'dawa', 'tomohi', 'yoso farm', 'rooh', 'matemet', 'chillchat', 'yoki',
  'hapi arabic', 'nady', 'infun', 'hopi star', 'tayyb chat', 'yoppo chat', 'roka live', 'wadi chat',
  'super meet', 'hamster', 'yo2', 'oner', 'maan chat', 'westar', 'fomi party', 'karak chat',
  'ume chat', 'baat live', 'crush live', 'echo', 'hooka chat', 'alulu', 'arza live', 'yiya',
  'chirp chat', 'aswat', 'lotfun', 'soulfa', 'mashi chat', 'sango',
];

export function getCategoryLabel(categoryId: CatalogCategoryId): string {
  switch (categoryId) {
    case 'cards':
      return 'CARD';
    case 'applications':
      return 'APPLICATION';
    case 'games':
      return 'GAMES';
    case 'wallets':
      return 'WALLETS';
    case 'balance':
      return 'BALANCE';
    case 'social-media':
      return 'SOCIAL MEDIA';
    case 'entertainment':
      return 'ENTERTAINMENT';
    case 'accounts-subscriptions':
      return 'ACOUNTS & SUBSCRIPTIONS';
    case 'redemption-coupons':
      return 'REDEMPTION COUPON';
    default:
      return 'APPLICATION';
  }
}

export function classifyCatalogProduct(product: Product): {
  category: CatalogCategoryId;
  offerType: CatalogOfferType;
} {
  const hasPackageField = Boolean(
    product.inputFields?.some((field) => field.type === 'select' && field.name === 'package')
  );

  const haystack = normalizeText(
    [
      product.name,
      product.shortDescription,
      product.fullDescription,
      product.category,
      ...(Array.isArray(product.tags) ? product.tags : []),
    ].join(' ')
  );

  const rawCategory = normalizeText(String(product.category || ''));
  const mappedRawCategory = RAW_CATEGORY_MAP[rawCategory];

  // Trust explicit provider category when it maps cleanly to our taxonomy.
  // This prevents aggressive keyword rules from misclassifying products.
  if (mappedRawCategory) {
    if (mappedRawCategory === 'cards') {
      return { category: 'cards', offerType: 'cards' };
    }

    return {
      category: mappedRawCategory,
      offerType: hasPackageField ? 'packages' : 'products',
    };
  }

  // Provider uses digital-services as a broad bucket; route with careful hints.
  if (rawCategory === 'digital-services' || rawCategory === 'digital services') {
    if (hasAnyKeyword(haystack, CARD_KEYWORDS)) {
      return { category: 'cards', offerType: 'cards' };
    }

    if (hasAnyKeyword(haystack, WALLET_PRODUCT_KEYWORDS)) {
      return { category: 'wallets', offerType: 'products' };
    }

    if (hasAnyKeyword(haystack, BALANCE_PACKAGE_KEYWORDS)) {
      return { category: 'balance', offerType: 'packages' };
    }

    if (hasAnyKeyword(haystack, SOCIAL_PACKAGE_KEYWORDS)) {
      return { category: 'social-media', offerType: 'packages' };
    }

    if (hasAnyKeyword(haystack, ENTERTAINMENT_PACKAGE_KEYWORDS)) {
      return { category: 'entertainment', offerType: 'packages' };
    }

    if (hasAnyKeyword(haystack, ACCOUNT_PACKAGE_KEYWORDS)) {
      return { category: 'accounts-subscriptions', offerType: 'packages' };
    }

    if (hasAnyKeyword(haystack, REDEMPTION_PRODUCT_KEYWORDS)) {
      return { category: 'redemption-coupons', offerType: 'products' };
    }

    if (hasAnyKeyword(haystack, GAMES_PACKAGE_KEYWORDS)) {
      return { category: 'games', offerType: 'packages' };
    }

    if (hasAnyKeyword(haystack, APPLICATION_PACKAGE_KEYWORDS)) {
      return { category: 'applications', offerType: 'packages' };
    }

    if (hasAnyKeyword(haystack, APPLICATION_PRODUCT_KEYWORDS)) {
      return { category: 'applications', offerType: 'products' };
    }

    return {
      category: 'applications',
      offerType: hasPackageField ? 'packages' : 'products',
    };
  }

  if (hasAnyKeyword(haystack, CARD_KEYWORDS)) {
    return { category: 'cards', offerType: 'cards' };
  }

  if (hasAnyKeyword(haystack, WALLET_PRODUCT_KEYWORDS)) {
    return { category: 'wallets', offerType: 'products' };
  }

  if (hasAnyKeyword(haystack, BALANCE_PACKAGE_KEYWORDS)) {
    return { category: 'balance', offerType: 'packages' };
  }

  if (hasAnyKeyword(haystack, SOCIAL_PACKAGE_KEYWORDS)) {
    return { category: 'social-media', offerType: 'packages' };
  }

  if (hasAnyKeyword(haystack, ENTERTAINMENT_PACKAGE_KEYWORDS)) {
    return { category: 'entertainment', offerType: 'packages' };
  }

  if (hasAnyKeyword(haystack, ACCOUNT_PACKAGE_KEYWORDS)) {
    return { category: 'accounts-subscriptions', offerType: 'packages' };
  }

  if (hasAnyKeyword(haystack, REDEMPTION_PRODUCT_KEYWORDS)) {
    return { category: 'redemption-coupons', offerType: 'products' };
  }

  if (hasAnyKeyword(haystack, GAMES_PACKAGE_KEYWORDS)) {
    return { category: 'games', offerType: 'packages' };
  }

  if (hasAnyKeyword(haystack, APPLICATION_PACKAGE_KEYWORDS)) {
    return { category: 'applications', offerType: 'packages' };
  }

  if (hasAnyKeyword(haystack, APPLICATION_PRODUCT_KEYWORDS)) {
    return { category: 'applications', offerType: 'products' };
  }

  if (product.category === 'games') {
    return { category: 'games', offerType: hasPackageField ? 'packages' : 'products' };
  }

  if (product.category === 'applications') {
    return { category: 'applications', offerType: hasPackageField ? 'packages' : 'products' };
  }

  if (product.category === 'wallets') {
    return { category: 'wallets', offerType: hasPackageField ? 'packages' : 'products' };
  }

  return {
    category: 'applications',
    offerType: hasPackageField ? 'packages' : 'products',
  };
}
