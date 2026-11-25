export type ProductCategory = 'headlight' | 'taillight' | 'foglight' | 'accessory' | 'bundle';
export type ProductSide = 'left' | 'right' | 'pair' | 'both' | 'universal' | 'standard';
export type LensMaterial =
  | 'پلی‌کربنات گرید A+ یووی‌دار (Polycarbonate UV400)'
  | 'پلی‌کربنات تزریقی تایوان'
  | 'پلی‌کربنات ضدخش نانو آلمان'
  | 'اکریلیک تقویت‌شده فابریک'
  | 'لاستیک بوتیل الاستیک آلمان'
  | 'فولاد کربنی سخت‌کاری‌شده و پلیمر ضدخش'
  | string;

export interface CarBrand {
  id: string;
  nameFa: string;
  nameEn: string;
  logo: string;
  country: string;
  isPopular?: boolean;
}

export interface CarModel {
  id: string;
  brandId: string;
  nameFa: string;
  nameEn: string;
  years: string;
  category: 'سدان' | 'هاچبک' | 'شاسی‌بلند' | 'کراس‌اوور' | 'وانت';
  generation?: string;
  image?: string;
}

export interface ProductSpec {
  material: LensMaterial;
  uvProtection: boolean;
  uvCoatingType: string;
  heatResistance: string; // e.g. "تا 130 درجه سانتی‌گراد"
  oemMatch: boolean; // ضمانت قالب 100% فابریک
  originCountry: string; // تایوان، آلمان، چین درجه یک، ایران
  warrantyMonths: number; // مثلا ۲۴ ماه ضمانت عدم زردی
  installationDifficulty: 'ساده' | 'متوسط' | 'تخصصی';
  oemCode?: string;
  fitmentYears: string;
}

export interface ProductReview {
  id: string;
  author: string;
  carModel: string;
  rating: number;
  date: string;
  comment: string;
  verifiedBuyer: boolean;
  likes: number;
}

export interface Product {
  id: string;
  titleFa: string;
  titleEn: string;
  brandId: string;
  modelId: string;
  brandNameFa: string;
  modelNameFa: string;
  years: string;
  category: ProductCategory;
  position: 'جلو' | 'عقب' | 'پروژکتور' | 'متفرقه';
  priceSingle: number; // قیمت تک سمت (تومان)
  pricePair: number; // قیمت جفت با تخفیف (تومان)
  originalPriceSingle?: number;
  originalPricePair?: number;
  discountPercent?: number;
  rating: number;
  reviewsCount: number;
  inStock: boolean;
  stockCount: number;
  image: string;
  gallery: string[];
  specs: ProductSpec;
  description: string;
  features: string[];
  tags: string[];
  compatibilityNotes: string;
  isBestSeller?: boolean;
  isNew?: boolean;
  isSpecialOffer?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  selectedSide: 'left' | 'right' | 'pair' | 'standard';
  sideLabel: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface FilterState {
  brandId: string;
  modelId: string;
  category: ProductCategory | 'all';
  position: string;
  search: string;
  inStockOnly: boolean;
  uvOnly: boolean;
  sortBy: 'popular' | 'newest' | 'priceAsc' | 'priceDesc' | 'discount';
}

export interface Order {
  id: string;
  trackingCode: string;
  customerName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  shippingMethod: 'tipax' | 'pishtaz' | 'express';
  shippingCost: number;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'online' | 'cod';
  status: 'processing' | 'packing' | 'shipped' | 'delivered' | 'cancelled';
  carrierCode?: string;
  createdAt: string;
}
