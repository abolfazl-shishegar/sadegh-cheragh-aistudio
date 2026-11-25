import type { CarBrand, CarModel, CartItem, FilterState, Order, Product, ProductCategory } from '../types';
import { matchesSearch } from './search';

export type OrderSide = 'left' | 'right' | 'pair' | 'standard';

export interface CheckoutCustomerInput {
  customerName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
}

export interface CheckoutValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof CheckoutCustomerInput, string>>;
  normalized: {
    customerName: string;
    phone: string;
    province: string;
    city: string;
    address: string;
    postalCode: string;
  };
}

export const ORDER_SIDE_LABELS: Record<OrderSide, string> = {
  left: 'سمت چپ (راننده)',
  right: 'سمت راست (شاگرد)',
  pair: 'ست جفت (چپ + راست)',
  standard: 'استاندارد (تک‌واحد)',
};

export function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizeDigits(value: unknown): string {
  return String(value ?? '')
    .replace(/[۰-۹٠-٩]/g, (c) => String(c.charCodeAt(0) - (c < '۰' ? 1632 : 1776)))
    .trim();
}

export function isExpressAvailable(city: string): boolean {
  return cleanText(city, 60) === 'تهران';
}

export function resolveShippingMethod(
  method: Order['shippingMethod'],
  city: string,
): Order['shippingMethod'] {
  if (method === 'express' && !isExpressAvailable(city)) {
    return 'tipax';
  }
  return method;
}

export function validateCheckoutStep1(input: Partial<CheckoutCustomerInput>): CheckoutValidationResult {
  const customerName = cleanText(input.customerName, 100);
  const phone = normalizeDigits(input.phone).replace(/[\s-]/g, '');
  const province = cleanText(input.province, 60);
  const city = cleanText(input.city, 60);
  const address = cleanText(input.address, 500);
  const postalCode = normalizeDigits(input.postalCode).replace(/[\s-]/g, '');

  const errors: Partial<Record<keyof CheckoutCustomerInput, string>> = {};

  if (customerName.length < 2) {
    errors.customerName = 'نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.';
  }
  if (!/^09\d{9}$/.test(phone)) {
    errors.phone = 'شماره موبایل معتبر نیست (مثال: 09123456789).';
  }
  if (!province) {
    errors.province = 'استان را انتخاب کنید.';
  }
  if (city.length < 2) {
    errors.city = 'نام شهرستان را وارد کنید.';
  }
  if (address.length < 8) {
    errors.address = 'آدرس دقیق پستی باید حداقل ۸ کاراکتر باشد.';
  }
  if (postalCode !== '' && !/^\d{10}$/.test(postalCode)) {
    errors.postalCode = 'کد پستی در صورت وارد شدن باید دقیقاً ۱۰ رقم باشد.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      customerName,
      phone,
      province,
      city,
      address,
      postalCode,
    },
  };
}

export function unitsPerLineItem(side: OrderSide, category: ProductCategory): number {
  if (category === 'accessory') return 1;
  return side === 'pair' ? 2 : 1;
}

export function unitsForItem(side: OrderSide, quantity: number, category: ProductCategory): number {
  return unitsPerLineItem(side, category) * quantity;
}

export function isSideAllowedForCategory(side: OrderSide, category: ProductCategory): boolean {
  if (category === 'accessory') {
    return side === 'standard';
  }
  return side === 'left' || side === 'right' || side === 'pair';
}

export function unitPriceForSide(product: Pick<Product, 'priceSingle' | 'pricePair' | 'category'>, side: OrderSide): number {
  if (product.category === 'accessory') return product.priceSingle;
  return side === 'pair' ? product.pricePair : product.priceSingle;
}

export function maxOrderableQuantity(product: Pick<Product, 'stockCount' | 'category'>, side: OrderSide, usedUnits = 0): number {
  const remainingUnits = Math.max(0, product.stockCount - usedUnits);
  const perItem = unitsPerLineItem(side, product.category);
  return Math.min(99, Math.floor(remainingUnits / perItem));
}

export interface CartReconcileResult {
  items: CartItem[];
  adjusted: boolean;
}

export function reconcileCart(items: CartItem[], products: Product[]): CartReconcileResult {
  const index = new Map(products.map((p) => [p.id, p]));
  const usedUnits = new Map<string, number>();
  let adjusted = false;
  const result: CartItem[] = [];

  for (const item of items) {
    const p = index.get(item.productId);
    if (!p?.inStock) {
      adjusted = true;
      continue;
    }

    const side: OrderSide = p.category === 'accessory' ? 'standard' : (item.selectedSide === 'standard' ? 'pair' : item.selectedSide);
    if (side !== item.selectedSide) {
      adjusted = true;
    }

    const previousUnits = usedUnits.get(p.id) ?? 0;
    const maxQty = maxOrderableQuantity(p, side, previousUnits);
    const requestedQty = Number.isInteger(item.quantity) ? item.quantity : 0;
    const quantity = Math.min(requestedQty, maxQty);

    if (quantity <= 0) {
      adjusted = true;
      continue;
    }
    if (quantity !== requestedQty) {
      adjusted = true;
    }

    usedUnits.set(p.id, previousUnits + unitsForItem(side, quantity, p.category));
    const unitPrice = unitPriceForSide(p, side);
    const sideLabel = ORDER_SIDE_LABELS[side];
    const id = `${p.id}-${side}`;

    const existing = result.find((entry) => entry.id === id);
    if (existing) {
      adjusted = true;
      const mergedQty = Math.min(99, existing.quantity + quantity);
      existing.quantity = mergedQty;
      existing.totalPrice = mergedQty * unitPrice;
    } else {
      result.push({
        ...item,
        id,
        product: p,
        selectedSide: side,
        sideLabel,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
      });
    }
  }

  return { items: result, adjusted };
}

export function formatPersianDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tehran',
  }).format(parsed);
}

export function parseBrandFilter(brandId: string): string[] {
  if (!brandId || brandId === 'all') return [];
  return brandId
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part !== 'all');
}

export function filterAndSortProducts(
  products: Product[],
  filter: FilterState,
  brands: CarBrand[],
  models: CarModel[],
): Product[] {
  const selectedBrands = parseBrandFilter(filter.brandId);

  const filtered = products.filter((p) => {
    const catalogBrand = brands.find((item) => item.id === p.brandId);
    const catalogModel = models.find((item) => item.id === p.modelId);

    if (
      filter.search.trim() &&
      !matchesSearch(
        [
          p.titleFa,
          p.titleEn,
          p.brandNameFa,
          p.modelNameFa,
          catalogBrand?.nameEn,
          catalogModel?.nameEn,
          ...(p.tags ?? []),
        ].join(' '),
        filter.search,
      )
    ) {
      return false;
    }

    if (selectedBrands.length > 0 && !selectedBrands.includes(p.brandId)) {
      return false;
    }

    if (filter.modelId !== 'all' && p.modelId !== filter.modelId) {
      return false;
    }

    if (filter.category !== 'all' && p.category !== filter.category) {
      return false;
    }

    if (filter.position !== 'all' && p.position !== filter.position) {
      return false;
    }

    if (filter.inStockOnly && (!p.inStock || p.stockCount <= 0)) {
      return false;
    }

    if (filter.uvOnly && !p.specs?.uvProtection) {
      return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (filter.sortBy) {
      case 'priceAsc':
        return a.pricePair - b.pricePair;
      case 'priceDesc':
        return b.pricePair - a.pricePair;
      case 'discount':
        return (b.discountPercent ?? 0) - (a.discountPercent ?? 0) || b.rating * b.reviewsCount - a.rating * a.reviewsCount;
      case 'newest':
        return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || b.rating * b.reviewsCount - a.rating * a.reviewsCount;
      case 'popular':
      default:
        return (
          Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller)) ||
          b.rating * b.reviewsCount - a.rating * a.reviewsCount
        );
    }
  });
}

