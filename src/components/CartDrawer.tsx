import React, { useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ShieldCheck,
  Truck,
  ArrowLeft,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { CartItem, Product } from '../types';
import { formatCurrency, formatPrice, toPersianDigits } from '../utils/formatters';
import { unitsForItem, unitsPerLineItem } from '../utils/shopLogic';
import type { ShopSettings } from '../shop';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  products: Product[];
  settings: ShopSettings;
  stockNotice?: string;
  onClearNotice?: () => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onAddAccessory: (product: Product) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  products,
  settings,
  stockNotice,
  onClearNotice,
  onUpdateQuantity,
  onRemoveItem,
  onAddAccessory,
  onProceedToCheckout,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
  const freeShippingThreshold = settings.free;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = freeShippingThreshold
    ? Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))
    : 0;

  // Find Butyl glue accessory for 1-click add
  const butylGlueProduct = products.find((p) => p.id === 'tlq-butyl-glue' && p.inStock);
  const hasButylGlueInCart = items.some((item) => item.productId === 'tlq-butyl-glue');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden bg-canvas/80 backdrop-blur-xl"
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-6">
        <div
          className="w-screen max-w-md bg-surface shadow-2xl flex flex-col justify-between overflow-hidden border-r border-line text-ink"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-line flex items-center justify-between bg-surface-deep/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 text-brand flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" aria-hidden />
              </div>
              <div>
                <h3 id="cart-drawer-title" className="font-extrabold text-white text-base">
                  سبد خرید شما
                </h3>
                <p className="text-xs text-muted">{toPersianDigits(items.length)} قلم کالا</p>
              </div>
            </div>

            <button
              id="close-cart-drawer-btn"
              type="button"
              aria-label="بستن سبد خرید"
              onClick={onClose}
              className="shop-button shop-secondary size-9 !min-h-9 !p-0 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>

          {freeShippingThreshold > 0 && (
            <div className="bg-surface-deep/60 px-5 py-3 border-b border-line">
              <div className="flex items-center justify-between text-xs font-bold text-ink mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-brand" aria-hidden />
                  {remainingForFreeShipping === 0 ? (
                    <span className="text-emerald-300">تبریک! ارسال سفارش شما رایگان شد</span>
                  ) : (
                    <span>
                      فقط <strong className="text-brand">{formatPrice(remainingForFreeShipping)} تومان</strong> تا ارسال رایگان
                    </span>
                  )}
                </span>
                <span className="text-muted">{toPersianDigits(freeShippingProgress)}٪</span>
              </div>
              <div className="w-full h-2 bg-canvas rounded-full overflow-hidden border border-line">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {stockNotice && (
              <div
                role="status"
                className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-2"
              >
                <span>{stockNotice}</span>
                {onClearNotice && (
                  <button
                    type="button"
                    onClick={onClearNotice}
                    aria-label="بستن اعلان"
                    className="text-amber-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden />
                  </button>
                )}
              </div>
            )}
            {items.length === 0 ? (
              <div className="text-center py-16 text-muted flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-surface-deep border border-line flex items-center justify-center text-muted mb-4">
                  <ShoppingBag className="w-8 h-8" aria-hidden />
                </div>
                <h4 className="font-bold text-white text-base mb-1">سبد خرید شما خالی است</h4>
                <p className="text-xs text-muted max-w-xs mb-6 leading-6">
                  مدل خودروی خود را انتخاب کنید و طلق سازگار را به سبد اضافه کنید.
                </p>
                <button type="button" onClick={onClose} className="shop-button shop-primary text-xs cursor-pointer">
                  مشاهده کاتالوگ طلق‌ها
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-deep rounded-2xl p-3.5 border border-line flex gap-3 relative group"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-canvas border border-line p-1 shrink-0 overflow-hidden">
                    <img
                      src={item.product.image}
                      alt={item.product.titleFa}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-white text-xs line-clamp-1">{item.product.titleFa}</h4>
                        <button
                          id={`remove-item-btn-${item.id}`}
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`حذف ${item.product.titleFa}`}
                          title="حذف از سبد"
                          className="text-muted hover:text-rose-400 transition-colors p-1 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-brand/15 text-brand border border-brand/30 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1">
                        {item.sideLabel}
                      </div>
                    </div>

                    {/* Quantity & Unit Price */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
                      <div className="flex items-center border border-line rounded-xl bg-surface overflow-hidden">
                        <button
                          type="button"
                          aria-label={`کم کردن تعداد ${item.product.titleFa}`}
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1.5 text-muted hover:bg-raised hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" aria-hidden />
                        </button>
                        <span className="px-2 text-xs font-bold text-white min-w-6 text-center">
                          {toPersianDigits(item.quantity)}
                        </span>
                        <button
                          type="button"
                          aria-label={`زیاد کردن تعداد ${item.product.titleFa}`}
                          disabled={
                            item.quantity >= 99 ||
                            items
                              .filter((line) => line.productId === item.productId)
                              .reduce(
                                (sum, line) => sum + unitsForItem(line.selectedSide, line.quantity, item.product.category),
                                0,
                              ) +
                              unitsPerLineItem(item.selectedSide, item.product.category) >
                              item.product.stockCount
                          }
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1.5 text-muted hover:bg-raised hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" aria-hidden />
                        </button>
                      </div>

                      <div className="text-left font-black text-white text-xs">
                        {formatPrice(item.totalPrice)}{' '}
                        <span className="text-[10px] font-normal text-muted">تومان</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Suggested Add-on: Butyl Glue */}
            {items.length > 0 && !hasButylGlueInCart && butylGlueProduct && (
              <div className="bg-amber-500/10 rounded-2xl p-3.5 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Sparkles className="w-5 h-5 text-amber-300" aria-hidden />
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 text-xs">نوار چسب بوتیل آب‌بندی چراغ (۴ متر)</h5>
                    <p className="text-[10px] text-amber-300/80 font-medium">ضروری برای عایق‌کاری ۱۰۰٪ ضد نفوذ آب</p>
                    <span className="text-xs font-extrabold text-amber-200">
                      {formatCurrency(butylGlueProduct.priceSingle)}
                    </span>
                  </div>
                </div>

                <button
                  id="add-butyl-glue-btn"
                  type="button"
                  onClick={() => onAddAccessory(butylGlueProduct)}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-colors border border-amber-400/30 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" aria-hidden />
                  افزودن
                </button>
              </div>
            )}
          </div>

          {/* Footer Checkout Bar */}
          {items.length > 0 && (
            <div className="p-5 border-t border-line bg-surface-deep/90 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>مجموع قیمت کالاها:</span>
                <span className="font-bold text-white">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted">
                <span>هزینه بسته‌بندی ایمن و ضدضربه:</span>
                <span className="font-bold text-emerald-400">رایگان (هدیه صادق چراغ)</span>
              </div>

              <div className="pt-2 border-t border-line flex items-center justify-between">
                <span className="font-extrabold text-white text-sm">جمع پیش از ارسال:</span>
                <span className="font-black text-brand text-lg">{formatCurrency(subtotal)}</span>
              </div>

              <button
                id="proceed-to-checkout-modal-btn"
                type="button"
                onClick={onProceedToCheckout}
                disabled={!settings.open}
                className="shop-button shop-primary w-full font-extrabold text-sm cursor-pointer disabled:opacity-45"
              >
                <span>{settings.open ? 'تکمیل اطلاعات و ثبت نهایی سفارش' : 'ثبت سفارش موقتاً بسته است'}</span>
                <ArrowLeft className="w-4 h-4" aria-hidden />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
                <span>ضمانت بازگشت وجه در صورت عدم تطابق قالب</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
