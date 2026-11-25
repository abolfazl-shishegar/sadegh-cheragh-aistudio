import type { CartItem, Order, Product } from './types';
import { reconcileCart } from './utils/shopLogic';

export type ShopSettings = { standard: number; express: number; free: number; open: number };
export type ManagedProduct = Product & { active: boolean; version: number };
export type TrackedOrder = Pick<
  Order,
  'trackingCode' | 'status' | 'createdAt' | 'shippingMethod' | 'carrierCode' | 'totalAmount'
> & { items: { title: string; sideLabel: string; quantity: number }[] };

export type AdminAuthStatus = {
  configuredViaEnv: boolean;
  needsSetup: boolean;
};

export const defaultSettings: ShopSettings = { standard: 55000, express: 85000, free: 2000000, open: 0 };
export const statuses: Record<Order['status'], string> = {
  processing: 'ثبت‌شده',
  packing: 'در حال بسته‌بندی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
};
export const shippingLabels: Record<Order['shippingMethod'], string> = {
  tipax: 'تیپاکس اکسپرس',
  pishtaz: 'پست پیشتاز',
  express: 'پیک فوری تهران',
};

export const shippingCostFor = (subtotal: number, method: Order['shippingMethod'], settings: ShopSettings) =>
  settings.free > 0 && subtotal >= settings.free ? 0 : method === 'express' ? settings.express : settings.standard;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, data?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(
    '/api/' + path,
    data === undefined
      ? { headers }
      : { method: 'POST', headers, body: JSON.stringify(data) },
  );
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    throw new ApiError(result?.error || 'ارتباط با فروشگاه برقرار نشد.', response.status);
  }
  return result;
}

export function updateCart(items: CartItem[], products: Product[]): CartItem[] {
  return reconcileCart(items, products).items;
}
