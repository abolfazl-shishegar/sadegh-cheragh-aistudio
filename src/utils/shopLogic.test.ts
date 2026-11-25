import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAndSortProducts,
  formatPersianDateTime,
  isExpressAvailable,
  isSideAllowedForCategory,
  maxOrderableQuantity,
  normalizeDigits,
  parseBrandFilter,
  reconcileCart,
  resolveShippingMethod,
  unitPriceForSide,
  unitsForItem,
  validateCheckoutStep1,
} from './shopLogic';
import type { CarBrand, CarModel, CartItem, Product } from '../types';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    titleFa: 'طلق تست',
    titleEn: 'Test Lens',
    brandId: 'peugeot',
    modelId: 'peugeot-207',
    brandNameFa: 'پژو',
    modelNameFa: 'پژو ۲۰۷',
    years: '۱۴۰۰',
    category: 'headlight',
    position: 'جلو',
    priceSingle: 500000,
    pricePair: 900000,
    rating: 4.9,
    reviewsCount: 10,
    inStock: true,
    stockCount: 5,
    image: '/assets/product-placeholder.svg',
    gallery: [],
    specs: {
      material: 'پلی‌کربنات گرید A+ یووی‌دار (Polycarbonate UV400)',
      uvProtection: true,
      uvCoatingType: 'UV400',
      heatResistance: '130C',
      oemMatch: true,
      originCountry: 'تایوان',
      warrantyMonths: 24,
      installationDifficulty: 'ساده',
      fitmentYears: '۱۴۰۰',
    },
    description: 'توضیح',
    features: [],
    tags: [],
    compatibilityNotes: '',
    ...overrides,
  };
}

test('normalizeDigits converts Persian and Arabic numerals to ASCII', () => {
  assert.equal(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789');
  assert.equal(normalizeDigits('٠٩١٢٠٠٠٠٠٠٠'), '09120000000');
});

test('validateCheckoutStep1 accepts optional empty postalCode and valid 10-digit postalCode', () => {
  const validWithoutPostal = validateCheckoutStep1({
    customerName: 'مهدی رضایی',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    province: 'فارس',
    city: 'شیراز',
    address: 'بلوار زند، کوچه پنجم، پلاک ۱۲',
    postalCode: '',
  });
  assert.equal(validWithoutPostal.valid, true);
  assert.equal(validWithoutPostal.normalized.phone, '09123456789');
  assert.equal(validWithoutPostal.normalized.postalCode, '');

  const validWithPostal = validateCheckoutStep1({
    customerName: 'مهدی رضایی',
    phone: '09123456789',
    province: 'تهران',
    city: 'تهران',
    address: 'خیابان ولیعصر، پلاک ۴۲',
    postalCode: '۱۲۳۴۵۶۷۸۹۰',
  });
  assert.equal(validWithPostal.valid, true);
  assert.equal(validWithPostal.normalized.postalCode, '1234567890');
});

test('validateCheckoutStep1 rejects invalid phone, short address, empty city, or malformed postalCode', () => {
  const result = validateCheckoutStep1({
    customerName: 'ا',
    phone: '09123',
    province: 'تهران',
    city: '',
    address: 'کوتاه',
    postalCode: '12345',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.customerName);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.city);
  assert.ok(result.errors.address);
  assert.ok(result.errors.postalCode);
});

test('shipping method resolution restricts express to Tehran and falls back to tipax', () => {
  assert.equal(isExpressAvailable('تهران'), true);
  assert.equal(isExpressAvailable('شیراز'), false);
  assert.equal(resolveShippingMethod('express', 'تهران'), 'express');
  assert.equal(resolveShippingMethod('express', 'شیراز'), 'tipax');
  assert.equal(resolveShippingMethod('pishtaz', 'شیراز'), 'pishtaz');
});

test('stock unit calculations count pair lenses as 2 units and accessories/single as 1 unit', () => {
  assert.equal(unitsForItem('pair', 1, 'headlight'), 2);
  assert.equal(unitsForItem('pair', 3, 'taillight'), 6);
  assert.equal(unitsForItem('left', 2, 'headlight'), 2);
  assert.equal(unitsForItem('standard', 2, 'accessory'), 2);

  assert.equal(isSideAllowedForCategory('standard', 'accessory'), true);
  assert.equal(isSideAllowedForCategory('pair', 'accessory'), false);
  assert.equal(isSideAllowedForCategory('pair', 'headlight'), true);
  assert.equal(isSideAllowedForCategory('standard', 'headlight'), false);
});

test('accessory pricing always uses priceSingle and pair lenses use pricePair', () => {
  const glue = makeProduct({ id: 'glue', category: 'accessory', priceSingle: 190000, pricePair: 340000 });
  const lens = makeProduct({ id: 'lens', category: 'headlight', priceSingle: 680000, pricePair: 1250000 });
  assert.equal(unitPriceForSide(glue, 'standard'), 190000);
  assert.equal(unitPriceForSide(lens, 'pair'), 1250000);
  assert.equal(unitPriceForSide(lens, 'left'), 680000);
});

test('maxOrderableQuantity and reconcileCart clamp stock across mixed pair and single lines', () => {
  const lens = makeProduct({ id: 'lens-1', stockCount: 5 });
  assert.equal(maxOrderableQuantity(lens, 'pair'), 2);
  assert.equal(maxOrderableQuantity(lens, 'left'), 5);

  const glue = makeProduct({ id: 'glue-1', category: 'accessory', priceSingle: 190000, pricePair: 340000, stockCount: 10 });

  const initialCart: CartItem[] = [
    {
      id: 'lens-1-pair',
      productId: 'lens-1',
      product: lens,
      selectedSide: 'pair',
      sideLabel: 'جفت',
      quantity: 2, // 4 units
      unitPrice: 900000,
      totalPrice: 1800000,
    },
    {
      id: 'lens-1-left',
      productId: 'lens-1',
      product: lens,
      selectedSide: 'left',
      sideLabel: 'چپ',
      quantity: 3, // only 1 unit left -> should clamp to 1!
      unitPrice: 500000,
      totalPrice: 1500000,
    },
    {
      id: 'glue-1-pair', // legacy cart entry with 'pair' for accessory -> migrates to 'standard' & priceSingle
      productId: 'glue-1',
      product: glue,
      selectedSide: 'pair',
      sideLabel: 'ست جفت',
      quantity: 1,
      unitPrice: 340000,
      totalPrice: 340000,
    },
  ];

  const reconciled = reconcileCart(initialCart, [lens, glue]);
  assert.equal(reconciled.adjusted, true);
  assert.equal(reconciled.items.length, 3);
  assert.equal(reconciled.items[0].quantity, 2);
  assert.equal(reconciled.items[1].quantity, 1);
  assert.equal(reconciled.items[2].selectedSide, 'standard');
  assert.equal(reconciled.items[2].unitPrice, 190000);
  assert.equal(reconciled.items[2].totalPrice, 190000);
});

test('formatPersianDateTime formats ISO dates into Persian locale output', () => {
  const formatted = formatPersianDateTime('2026-11-25T09:11:33.000Z');
  assert.notEqual(formatted, '2026-11-25T09:11:33.000Z');
  assert.match(formatted, /[۰-۹]/);
});

test('parseBrandFilter and filterAndSortProducts handle comma-separated brands, UV/stock flags, and sorting', () => {
  assert.deepEqual(parseBrandFilter('ikco,peugeot'), ['ikco', 'peugeot']);
  assert.deepEqual(parseBrandFilter('all'), []);

  const brands: CarBrand[] = [
    { id: 'ikco', nameFa: 'ایران خودرو', nameEn: 'IKCO', logo: '', country: 'Iran' },
    { id: 'peugeot', nameFa: 'پژو', nameEn: 'Peugeot', logo: '', country: 'France' },
    { id: 'kia', nameFa: 'کیا', nameEn: 'Kia', logo: '', country: 'Korea' },
  ];
  const models: CarModel[] = [
    { id: 'dena', brandId: 'ikco', nameFa: 'دنا پلاس', nameEn: 'Dena Plus', years: '۱۴۰۰', category: 'سدان' },
    { id: 'p207', brandId: 'peugeot', nameFa: 'پژو ۲۰۷', nameEn: '207', years: '۱۴۰۰', category: 'هاچبک' },
    { id: 'cerato', brandId: 'kia', nameFa: 'سراتو', nameEn: 'Cerato', years: '۱۳۹۸', category: 'سدان' },
  ];

  const p1 = makeProduct({
    id: 'p1',
    brandId: 'ikco',
    modelId: 'dena',
    titleFa: 'طلق دنا پلاس',
    pricePair: 1500000,
    inStock: true,
    stockCount: 4,
    isNew: true,
  });
  const p2 = makeProduct({
    id: 'p2',
    brandId: 'peugeot',
    modelId: 'p207',
    titleFa: 'طلق پژو ۲۰۷',
    pricePair: 900000,
    inStock: true,
    stockCount: 3,
    discountPercent: 15,
    specs: { ...makeProduct().specs, uvProtection: false },
  });
  const p3 = makeProduct({
    id: 'p3',
    brandId: 'kia',
    modelId: 'cerato',
    titleFa: 'طلق سراتو',
    pricePair: 2200000,
    inStock: false,
    stockCount: 0,
  });

  const baseFilter = {
    brandId: 'all',
    modelId: 'all',
    category: 'all' as const,
    position: 'all',
    search: '',
    inStockOnly: false,
    uvOnly: false,
    sortBy: 'popular' as const,
  };

  // Comma-separated multi-brand filter
  const multiBrand = filterAndSortProducts([p1, p2, p3], { ...baseFilter, brandId: 'ikco,peugeot', sortBy: 'priceAsc' }, brands, models);
  assert.deepEqual(
    multiBrand.map((p) => p.id),
    ['p2', 'p1'],
  );

  // inStockOnly + uvOnly
  const inStockUv = filterAndSortProducts([p1, p2, p3], { ...baseFilter, inStockOnly: true, uvOnly: true }, brands, models);
  assert.deepEqual(
    inStockUv.map((p) => p.id),
    ['p1'],
  );

  // Sort priceDesc
  const desc = filterAndSortProducts([p1, p2, p3], { ...baseFilter, sortBy: 'priceDesc' }, brands, models);
  assert.deepEqual(
    desc.map((p) => p.id),
    ['p3', 'p1', 'p2'],
  );

  // Arabic/Persian normalized search (ي/ك)
  const searchRes = filterAndSortProducts([p1, p2, p3], { ...baseFilter, search: 'دنا پلاس' }, brands, models);
  assert.deepEqual(
    searchRes.map((p) => p.id),
    ['p1'],
  );
});
