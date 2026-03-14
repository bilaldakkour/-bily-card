import type { Product } from './products';
import type { CatalogCategoryId } from './catalogTaxonomy';

type DisplayGroupRule = {
  key: string;
  name: string;
  preferredSlug?: string;
};

type CatalogCurationRule = {
  category?: CatalogCategoryId;
  hiddenFromCatalog?: boolean;
  group?: DisplayGroupRule;
};

const CATEGORY_OVERRIDES = new Map<string, CatalogCategoryId>([
  ['gold-global', 'games'],
  ['gold-mena', 'games'],
  ['product-765', 'balance'],
  ['product-764', 'balance'],
  ['product-763', 'balance'],
  ['product-762', 'balance'],
  ['product-pkg-705', 'games'],
  ['product-pkg-708', 'games'],
  ['product-pkg-707', 'games'],
  ['product-pkg-661', 'games'],
  ['lv-2', 'games'],
  ['lv', 'games'],
  ['product-pkg-655', 'games'],
  ['product-pkg-657', 'games'],
  ['product-pkg-710', 'games'],
  ['product-pkg-712', 'games'],
  ['product-pkg-656', 'games'],
  ['product-pkg-605', 'games'],
  ['product-pkg-606', 'games'],
  ['product-pkg-423', 'games'],
  ['product-pkg-424', 'games'],
  ['product-pkg-156', 'games'],
  ['product-pkg-704', 'games'],
  ['product-602', 'games'],
  ['black-accelerator', 'games'],
  ['blue-accelerator', 'games'],
  ['red-accelerator', 'games'],
  ['channel-followers', 'accounts-subscriptions'],
  ['page-followers', 'accounts-subscriptions'],
  ['instagram-followers', 'accounts-subscriptions'],
  ['instagram-likes', 'accounts-subscriptions'],
  ['instagram-views', 'accounts-subscriptions'],
  ['tiktok-followers', 'accounts-subscriptions'],
  ['tiktok-likes', 'accounts-subscriptions'],
  ['tiktok-views', 'accounts-subscriptions'],
  ['full-account-month', 'accounts-subscriptions'],
  ['full-account-year', 'accounts-subscriptions'],
  ['n-full-account-month', 'accounts-subscriptions'],
  ['n-full-account-year', 'accounts-subscriptions'],
  ['n-user-month', 'accounts-subscriptions'],
  ['user-month', 'accounts-subscriptions'],
  ['user-year', 'accounts-subscriptions'],
  ['delta', 'games'],
  ['delta-2', 'games'],
  ['fc-points', 'games'],
  ['gc', 'games'],
  ['tokens', 'games'],
  ['cash-ball', 'games'],
  ['clash-royal', 'games'],
  ['clash-of-clans-gold-pass', 'games'],
  ['farm-pass', 'games'],
  ['jawaker-unit', 'games'],
  ['k-coin', 'games'],
  ['likes', 'accounts-subscriptions'],
  ['post-views', 'accounts-subscriptions'],
  ['payeer', 'wallets'],
  ['pep', 'applications'],
  ['weplay', 'applications'],
  ['yalla-ludo-diamond', 'applications'],
  ['yalla-ludo-gold', 'applications'],
  ['roblox-us', 'cards'],
  ['steam-usa', 'cards'],
  ['xbox-us', 'cards'],
  ['token', 'cards'],
  ['gold', 'applications'],
  ['strike-pass-elite-global', 'games'],
  ['strike-pass-premium-global', 'games'],
  ['whiteout-survival-d', 'games'],
  ['star-maker-unit', 'applications'],
  ['yalla-luod-gold', 'applications'],
  ['yami-star', 'applications'],
  ['yigo-chat', 'applications'],
  ['yahlla-chat', 'applications'],
]);

const HIDDEN_FROM_CATALOG = new Set<string>([
  'daily-sim-115com',
  'daily-sim-11exch',
  'daily-sim-163som',
  'daily-sim-1688',
  'daily-sim-1kkirana',
  'daily-sim-1mg',
  'daily-sim-27asia',
  'daily-sim-2dehands',
  'daily-sim-32red',
  'daily-sim-4fun',
  'daily-sim-51ca',
  'daily-sim-888casino',
  'daily-sim-99app',
  'daily-sim-adani',
  'daily-sim-adverts',
  'daily-sim-airbnb',
  'daily-sim-alfamidi',
  'daily-sim-aliexpress',
  'daily-sim-amazon',
  'daily-sim-apple',
  'daily-sim-biedronka',
  'daily-sim-didi',
  'daily-sim-global24',
  'daily-sim-globus',
  'daily-sim-google',
  'daily-sim-paypal',
  'daily-sim-sorare',
  'daily-sim-tango',
  'daily-sim-telegram',
  'daily-sim-tiktok',
  'daily-sim-truecaller',
  'daily-sim-whatnot',
  'daily-sim-whatsapp',
  'daily-sim-zoho',
  'daily-sim-zupee',
]);

const GROUP_RULES = new Map<string, DisplayGroupRule>([
  ['pubg', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['uc-pubg', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['manuel-uc', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['pubg-tr-uc', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-705', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-708', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-707', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-661', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['lv-2', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['lv', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-655', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-657', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-710', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-712', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['product-pkg-656', { key: 'pubg', name: 'PUBG', preferredSlug: 'pubg' }],
  ['black-accelerator', { key: 'jawaker', name: 'Jawaker', preferredSlug: 'black-accelerator' }],
  ['blue-accelerator', { key: 'jawaker', name: 'Jawaker', preferredSlug: 'black-accelerator' }],
  ['red-accelerator', { key: 'jawaker', name: 'Jawaker', preferredSlug: 'black-accelerator' }],
  ['tokens', { key: 'jawaker', name: 'Jawaker', preferredSlug: 'black-accelerator' }],
  ['user-month', { key: 'shahid', name: 'Shahid', preferredSlug: 'user-month' }],
  ['user-year', { key: 'shahid', name: 'Shahid', preferredSlug: 'user-month' }],
]);

export function getCatalogCurationRule(product: Product): CatalogCurationRule {
  const slug = String(product.slug || '').trim().toLowerCase();
  const next: CatalogCurationRule = {};

  if (CATEGORY_OVERRIDES.has(slug)) {
    next.category = CATEGORY_OVERRIDES.get(slug);
  }

  if (HIDDEN_FROM_CATALOG.has(slug)) {
    next.hiddenFromCatalog = true;
  }

  if (GROUP_RULES.has(slug)) {
    next.group = GROUP_RULES.get(slug);
  }

  return next;
}

export function isCatalogHiddenFromListings(product: Product): boolean {
  return Boolean(getCatalogCurationRule(product).hiddenFromCatalog);
}
