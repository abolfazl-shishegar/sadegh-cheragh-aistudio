import type { ProductCategory } from './types';

export const productCategories: ReadonlyArray<{id: ProductCategory | 'all'; label: string}> = [
  { id: 'all', label: 'همه محصولات' },
  { id: 'headlight', label: 'طلق چراغ جلو' },
  { id: 'taillight', label: 'طلق چراغ عقب و خطر' },
  { id: 'foglight', label: 'مه‌شکن و پروژکتور' },
  { id: 'accessory', label: 'چسب بوتیل و ابزار نصب' },
  { id: 'bundle', label: 'بسته‌های طلق چراغ' },
];
