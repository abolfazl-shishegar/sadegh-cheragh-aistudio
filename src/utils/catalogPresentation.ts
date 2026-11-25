import { PRODUCTS } from '../data/carsAndProducts';
import type { Product } from '../types';

const seedProducts = new Map(PRODUCTS.map((product) => [product.id, product]));
export const productPlaceholder = '/assets/product-placeholder.svg';

export function isSamplePrice(product: Product, side: 'left' | 'right' | 'pair' | 'standard') {
  const seed = seedProducts.get(product.id);
  return (
    seed !== undefined &&
    (side === 'pair' ? seed.pricePair === product.pricePair : seed.priceSingle === product.priceSingle)
  );
}

export function catalogPhotos(product: Product) {
  return [...new Set([product.image, ...(product.gallery ?? [])])].filter(
    (url) => Boolean(url) && url !== productPlaceholder,
  );
}

export function isSampleProduct(product: Product) {
  return seedProducts.has(product.id);
}
