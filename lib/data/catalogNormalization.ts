import type { Product } from './products';
import { classifyCatalogProduct, getCategoryLabel as taxonomyCategoryLabel } from './catalogTaxonomy';

export function normalizeCategory(product: Product): string {
  return classifyCatalogProduct(product).category;
}

export function getCategoryLabel(categoryId: string): string {
  return taxonomyCategoryLabel(categoryId as any);
}
