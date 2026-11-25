import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  MapPin,
  User,
  Phone,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  PackageCheck,
} from 'lucide-react';
import { CartItem, Order } from '../types';
import { api, shippingCostFor, type ShopSettings } from '../shop';
import { formatCurrency, toPersianDigits } from '../utils/formatters';
import {
  formatPersianDateTime,
  isExpressAvailable,
  resolveShippingMethod,
  validateCheckoutStep1,
  type CheckoutCustomerInput,
} from '../utils/shopLogic';

interface CheckoutModalProps {
  settings: ShopSettings;
  onCatalogChanged: () => Promise<void>;
  onClose: () => void;
  items: CartItem[];
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  settings,
  onCatalogChanged,
  onClose,
  items,
  onOrderCompleted,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('تهران');
  const [city, setCity] = useState('تهران');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CheckoutCustomerInput, string>>>({});
  const [shippingMethod, setShippingMethod] = useState<'tipax' | 'pishtaz' | 'express'>('tipax');
  const [orderError, setOrderError] = useState('');
  const requestId = useRef('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing && step !== 4) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProcessing, step, onClose]);

  const expressAllowed = isExpressAvailable(city);
  const effectiveShippingMethod = resolveShippingMethod(shippingMethod, city);
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
  const shippingCost = shippingCostFor(subtotal, effectiveShippingMethod, settings);
  const totalAmount = subtotal + shippingCost;

  const resetIdempotency = () => {
    requestId.current = '';
  };

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    resetIdempotency();
    if (!isExpressAvailable(nextCity) && shippingMethod === 'express') {
      setShippingMethod('tipax');
    }
    if (fieldErrors.city) {
      setFieldErrors((prev) => ({ ...prev, city: undefined }));
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCheckoutStep1({
      customerName,
      phone,
      province,
      city,
      address,
      postalCode,
    });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    setShippingMethod((prev) => resolveShippingMethod(prev, validation.normalized.city));
    setStep(2);
  };

  const handleCompleteOrder = async () => {
    if (isProcessing) return;
    const validation = validateCheckoutStep1({
      customerName,
      phone,
      province,
      city,
      address,
      postalCode,
    });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setStep(1);
      return;
    }
    setIsProcessing(true);
    setOrderError('');
    requestId.current ||= crypto.randomUUID().replaceAll('-', '');
    try {
      const order = await api<Order>('orders', {
        requestId: requestId.current,
        ...validation.normalized,
        shippingMethod: effectiveShippingMethod,
        totalAmount,
        items: items.map((item) => ({
          productId: item.productId,
          side: item.selectedSide,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
      setCompletedOrder(order);
      onOrderCompleted(order);
      setStep(4);
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : 'ثبت سفارش با خطا مواجه شد.');
      await onCatalogChanged();
    } finally {
      setIsProcessing(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const inputCls =
    'w-full px-3.5 py-2.5 bg-surface-deep rounded-xl border border-line text-ink placeholder:text-muted/60 text-sm focus:border-brand outline-hidden';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      onClick={() => {
        if (!isProcessing && step !== 4) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/85 backdrop-blur-xl overflow-y-auto"
    >
      <div
        className="shop-panel w-full max-w-2xl shadow-2xl overflow-hidden my-8 relative flex flex-col max-h-[90vh] text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-surface-deep/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/30 text-brand flex items-center justify-center">
              <PackageCheck className="w-4 h-4" aria-hidden />
            </div>
            <div>
              <h3 id="checkout-modal-title" className="font-extrabold text-white text-base">
                ثبت و تکمیل سفارش طلق چراغ
              </h3>
              <p className="text-xs text-muted">مرحله {toPersianDigits(step)} از ۴</p>
            </div>
          </div>

          {step !== 4 && (
            <button
              type="button"
              aria-label="بستن پنجره ثبت سفارش"
              onClick={onClose}
              disabled={isProcessing}
              className="shop-button shop-secondary size-9 !min-h-9 !p-0 rounded-full cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          )}
        </div>

        {/* Steps Progress */}
        {step !== 4 && (
          <div className="px-6 py-3 bg-surface-deep/50 border-b border-line flex items-center justify-between text-xs">
            <div className={`flex items-center gap-1.5 font-bold ${step >= 1 ? 'text-brand' : 'text-muted'}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step >= 1 ? 'bg-brand text-canvas' : 'bg-raised text-muted'
                }`}
              >
                ۱
              </span>
              <span>مشخصات و آدرس</span>
            </div>
            <div className="w-8 h-px bg-line" />
            <div className={`flex items-center gap-1.5 font-bold ${step >= 2 ? 'text-brand' : 'text-muted'}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step >= 2 ? 'bg-brand text-canvas' : 'bg-raised text-muted'
                }`}
              >
                ۲
              </span>
              <span>شیوه ارسال</span>
            </div>
            <div className="w-8 h-px bg-line" />
            <div className={`flex items-center gap-1.5 font-bold ${step >= 3 ? 'text-brand' : 'text-muted'}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step >= 3 ? 'bg-brand text-canvas' : 'bg-raised text-muted'
                }`}
              >
                ۳
              </span>
              <span>تأیید و ثبت</span>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: Address & Details */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-name" className="text-xs font-bold text-ink mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-brand" aria-hidden />
                    نام و نام خانوادگی خریدار: *
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    placeholder="مثال: مهدی رضایی"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      resetIdempotency();
                      if (fieldErrors.customerName) setFieldErrors((p) => ({ ...p, customerName: undefined }));
                    }}
                    className={inputCls}
                  />
                  {fieldErrors.customerName && (
                    <p role="alert" className="mt-1 text-xs text-rose-300">
                      {fieldErrors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-phone" className="text-xs font-bold text-ink mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-brand" aria-hidden />
                    شماره موبایل جهت هماهنگی: *
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    dir="ltr"
                    inputMode="tel"
                    required
                    placeholder="09123456789"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      resetIdempotency();
                      if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    className={inputCls + ' text-left'}
                  />
                  {fieldErrors.phone && (
                    <p role="alert" className="mt-1 text-xs text-rose-300">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-province" className="block text-xs font-bold text-ink mb-1.5">
                    استان: *
                  </label>
                  <select
                    id="checkout-province"
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value);
                      resetIdempotency();
                    }}
                    className={inputCls}
                  >
                    <option value="تهران" className="bg-surface-deep text-ink">تهران</option>
                    <option value="البرز" className="bg-surface-deep text-ink">البرز (کرج)</option>
                    <option value="اصفهان" className="bg-surface-deep text-ink">اصفهان</option>
                    <option value="فارس" className="bg-surface-deep text-ink">فارس (شیراز)</option>
                    <option value="خراسان رضوی" className="bg-surface-deep text-ink">خراسان رضوی (مشهد)</option>
                    <option value="آذربایجان شرقی" className="bg-surface-deep text-ink">آذربایجان شرقی (تبریز)</option>
                    <option value="خوزستان" className="bg-surface-deep text-ink">خوزستان (اهواز)</option>
                    <option value="مازندران" className="bg-surface-deep text-ink">مازندران (ساری)</option>
                    <option value="گیلان" className="bg-surface-deep text-ink">گیلان (رشت)</option>
                    <option value="کرمان" className="bg-surface-deep text-ink">کرمان</option>
                    <option value="سایر استان‌ها" className="bg-surface-deep text-ink">سایر استان‌ها</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="checkout-city" className="block text-xs font-bold text-ink mb-1.5">
                    شهرستان: *
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    required
                    placeholder="مثال: تهران / کرج / شیراز"
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className={inputCls}
                  />
                  {fieldErrors.city && (
                    <p role="alert" className="mt-1 text-xs text-rose-300">
                      {fieldErrors.city}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="checkout-address" className="text-xs font-bold text-ink mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand" aria-hidden />
                  آدرس دقیق پستی و پلاک / واحد: *
                </label>
                <textarea
                  id="checkout-address"
                  required
                  rows={2}
                  placeholder="خیابان، کوچه، پلاک، طبقه و واحد"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    resetIdempotency();
                    if (fieldErrors.address) setFieldErrors((p) => ({ ...p, address: undefined }));
                  }}
                  className={inputCls}
                />
                {fieldErrors.address && (
                  <p role="alert" className="mt-1 text-xs text-rose-300">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="checkout-postal" className="block text-xs font-bold text-ink mb-1.5">
                  کد پستی ۱۰ رقمی (اختیاری):
                </label>
                <input
                  id="checkout-postal"
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="مثال: 1234567890"
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    resetIdempotency();
                    if (fieldErrors.postalCode) setFieldErrors((p) => ({ ...p, postalCode: undefined }));
                  }}
                  className={inputCls + ' text-left'}
                />
                {fieldErrors.postalCode && (
                  <p role="alert" className="mt-1 text-xs text-rose-300">
                    {fieldErrors.postalCode}
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" className="shop-button shop-primary px-6 cursor-pointer">
                  <span>ادامه و انتخاب نحوه ارسال</span>
                  <ArrowLeft className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Shipping Method */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted mb-3">روش ارسال کالای شکستنی و بسته‌بندی ضدضربه:</h4>

              <div className="space-y-3" role="radiogroup" aria-label="روش ارسال">
                <button
                  type="button"
                  role="radio"
                  aria-checked={effectiveShippingMethod === 'tipax'}
                  onClick={() => setShippingMethod('tipax')}
                  className={`w-full text-right p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    effectiveShippingMethod === 'tipax'
                      ? 'border-brand bg-raised shadow-md'
                      : 'border-line bg-surface-deep hover:border-brand/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 text-brand flex items-center justify-center font-bold">
                      📦
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">ارسال با تیپاکس اکسپرس (سراسر کشور)</div>
                      <p className="text-xs text-muted">تحویل ۱ الی ۲ روز کاری درب منزل با بیمه کامل شکستگی</p>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-white">
                    {settings.free > 0 && subtotal >= settings.free ? (
                      <span className="text-emerald-400 font-black">رایگان</span>
                    ) : (
                      formatCurrency(settings.standard)
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={effectiveShippingMethod === 'pishtaz'}
                  onClick={() => setShippingMethod('pishtaz')}
                  className={`w-full text-right p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    effectiveShippingMethod === 'pishtaz'
                      ? 'border-brand bg-raised shadow-md'
                      : 'border-line bg-surface-deep hover:border-brand/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold">
                      📮
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">پست پیشتاز سفارشی</div>
                      <p className="text-xs text-muted">تحویل ۲ الی ۴ روزه با کد رهگیری ۲۴ رقمی اداره پست</p>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-white">
                    {settings.free > 0 && subtotal >= settings.free ? (
                      <span className="text-emerald-400 font-black">رایگان</span>
                    ) : (
                      formatCurrency(settings.standard)
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={effectiveShippingMethod === 'express'}
                  disabled={!expressAllowed}
                  onClick={() => {
                    if (expressAllowed) setShippingMethod('express');
                  }}
                  className={`w-full text-right p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    !expressAllowed
                      ? 'border-line bg-surface-deep opacity-45 cursor-not-allowed'
                      : effectiveShippingMethod === 'express'
                        ? 'border-brand bg-raised shadow-md cursor-pointer'
                        : 'border-line bg-surface-deep hover:border-brand/40 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-bold">
                      ⚡
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">پیک فوری و اسنپ (ویژه شهر تهران)</div>
                      <p className="text-xs text-muted">
                        {expressAllowed
                          ? 'تحویل فوری ۲ الی ۴ ساعته در روزهای کاری'
                          : 'این روش فقط برای مقصد «تهران» فعال است'}
                      </p>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-white">
                    {settings.free > 0 && subtotal >= settings.free ? (
                      <span className="text-emerald-400 font-black">رایگان</span>
                    ) : (
                      formatCurrency(settings.express)
                    )}
                  </div>
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="shop-button shop-secondary text-xs cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" aria-hidden />
                  <span>بازگشت به آدرس</span>
                </button>

                <button type="button" onClick={() => setStep(3)} className="shop-button shop-primary px-6 cursor-pointer">
                  <span>ادامه و بازبینی نهایی</span>
                  <ArrowLeft className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Method & Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">بازبینی و ثبت سفارش</h4>
              <p className="text-sm text-muted bg-surface-deep border border-line rounded-xl p-4">
                پرداخت پس از هماهنگی با فروشنده انجام می‌شود.
              </p>

              {orderError && (
                <p role="alert" className="text-sm text-rose-200 bg-rose-950/70 border border-rose-500/40 rounded-xl p-3">
                  {orderError}
                </p>
              )}

              {/* Order Breakdown Box */}
              <div className="bg-surface-deep p-4 rounded-2xl border border-line space-y-2.5 text-xs">
                <div className="flex justify-between text-muted">
                  <span>تحویل گیرنده:</span>
                  <span className="font-bold text-white">
                    {customerName} (<bdi>{phone}</bdi>)
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>آدرس مقصد:</span>
                  <span className="font-bold text-white line-clamp-1">
                    {province} - {city} - {address}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>تعداد اقلام:</span>
                  <span className="font-bold text-white">{toPersianDigits(items.length)} ردیف کالا</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>هزینه ارسال:</span>
                  <span className="font-bold text-white">
                    {shippingCost === 0 ? 'رایگان' : formatCurrency(shippingCost)}
                  </span>
                </div>
                <div className="pt-2 border-t border-line flex justify-between text-sm font-extrabold text-white">
                  <span>مبلغ نهایی قابل پرداخت:</span>
                  <span className="text-brand font-black text-base">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isProcessing}
                  className="shop-button shop-secondary text-xs cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" aria-hidden />
                  <span>بازگشت</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing || items.length === 0 || !settings.open}
                  onClick={handleCompleteOrder}
                  className="px-7 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-xl flex items-center gap-2 transition-colors cursor-pointer border border-emerald-400/30"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      در حال ثبت سفارش…
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" aria-hidden />
                      <span>ثبت سفارش</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success & Tracking Code Receipt */}
          {step === 4 && completedOrder && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" aria-hidden />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white mb-1">سفارش شما با موفقیت ثبت شد!</h3>
                <p className="text-xs text-muted max-w-md mx-auto leading-6">
                  لطفاً کد پیگیری زیر را کپی و نزد خود نگه دارید تا از بخش «پیگیری سفارش» همراه با شماره موبایلتان
                  بتوانید وضعیت آماده‌سازی و ارسال را بررسی کنید.
                </p>
              </div>

              {/* Tracking Code Box */}
              <div className="bg-surface-deep text-white p-5 rounded-2xl max-w-md mx-auto border border-line">
                <span className="text-xs text-brand block mb-1">کد پیگیری اختصاصی صادق چراغ:</span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-black text-brand tracking-wider" dir="ltr">
                    {completedOrder.trackingCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(completedOrder.trackingCode)}
                    className="shop-button shop-secondary size-10 !min-h-10 !p-0 cursor-pointer"
                    title="کپی کد رهگیری"
                    aria-label="کپی کد رهگیری"
                  >
                    {copiedTracking ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-line text-[11px] text-muted flex justify-between gap-2">
                  <span>نام خریدار: {completedOrder.customerName}</span>
                  <span>تاریخ ثبت: {formatPersianDateTime(completedOrder.createdAt)}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <a href="/track" onClick={onClose} className="shop-button shop-secondary text-xs">
                  صفحه پیگیری سفارش
                </a>
                <button type="button" onClick={onClose} className="shop-button shop-primary text-xs cursor-pointer">
                  بازگشت به فروشگاه
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
