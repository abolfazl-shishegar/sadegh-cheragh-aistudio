import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Sun,
  ShieldAlert,
  Droplets,
  Flame,
  Car,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Eye,
  PlusCircle,
} from 'lucide-react';
import { CAR_MODELS } from '../data/carsAndProducts';
import { Product } from '../types';
import { formatCurrency } from '../utils/formatters';

interface LensAdvisorModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddAccessory?: (product: Product) => void;
}

const issues = [
  {
    id: 'yellowing',
    title: 'زرد شدن و ماتی ناشی از تابش آفتاب',
    desc: 'طلق فابریک لایه UV خود را از دست داده و کدر شده و نور در شب ضعیف است.',
    advice: 'برای جلوگیری از ماتی مجدد، طلق پلی‌کربنات با پوشش UV400 و گارانتی شفافیت انتخاب کنید.',
    icon: Sun,
    color: 'text-amber-300 bg-amber-500/15 border-amber-400/30',
  },
  {
    id: 'cracked',
    title: 'شکستگی یا ترک‌خوردگی در اثر سنگ‌ریزه یا تصادف',
    desc: 'کاسه داخلی سالم است ولی طلق بیرونی سوراخ یا ترک برداشته است.',
    advice: 'تعویض طلق با نمونه قالب فابریک، کاسه و موتور تنظیم نور اصلی خودرو را حفظ می‌کند.',
    icon: ShieldAlert,
    color: 'text-rose-300 bg-rose-500/15 border-rose-400/30',
  },
  {
    id: 'moisture',
    title: 'بخار گرفتگی دائمی و نفوذ آب کارواش',
    desc: 'چسب آب‌بندی دور طلق فاسد شده و داخل چراغ قطرات آب جمع می‌شود.',
    advice: 'علاوه بر تعویض یا بازبینی طلق، حتماً از نوار چسب بوتیل استاندارد برای آب‌بندی کامل شیار استفاده کنید.',
    icon: Droplets,
    color: 'text-sky-300 bg-sky-500/15 border-sky-400/30',
  },
  {
    id: 'burnt',
    title: 'تارعنکبوتی شدن یا سوختگی ناشی از زنون/هدلایت داغ',
    desc: 'حرارت لامپ کاسه و طلق را از درون سوزانده و موج ایجاد کرده است.',
    advice: 'طلق پلی‌کربنات گرید A+ با تحمل حرارتی ۱۳۰ تا ۱۴۰ درجه مناسب لامپ‌های پرقدرت است.',
    icon: Flame,
    color: 'text-orange-300 bg-orange-500/15 border-orange-400/30',
  },
] as const;

export const LensAdvisorModal: React.FC<LensAdvisorModalProps> = ({
  products,
  isOpen,
  onClose,
  onSelectProduct,
  onAddAccessory,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedIssue, setSelectedIssue] = useState<string>('yellowing');

  const availableModels = CAR_MODELS.filter((model) =>
    products.some((p) => p.modelId === model.id && p.category !== 'accessory' && p.inStock),
  );
  const [selectedModelId, setSelectedModelId] = useState<string>(availableModels[0]?.id ?? 'peugeot-207');

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(availableModels[0].id);
    }
  }, [availableModels, selectedModelId]);

  if (!isOpen) return null;

  const activeIssue = issues.find((item) => item.id === selectedIssue) ?? issues[0];
  const matchedProducts = products.filter(
    (p) => p.modelId === selectedModelId && p.category !== 'accessory' && p.inStock,
  );
  const recommendedLens =
    selectedIssue === 'yellowing' || selectedIssue === 'burnt'
      ? matchedProducts.find((p) => p.specs?.uvProtection) ?? matchedProducts[0]
      : matchedProducts[0];
  const butylProduct = products.find((p) => p.id === 'tlq-butyl-glue' && p.inStock);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="advisor-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/85 backdrop-blur-xl overflow-y-auto"
    >
      <div
        className="shop-panel w-full max-w-xl shadow-2xl overflow-hidden my-8 relative flex flex-col max-h-[90vh] text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-surface-deep/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand/15 text-brand border border-brand/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="advisor-modal-title" className="font-extrabold text-white text-base">
                راهنمای هوشمند انتخاب طلق چراغ
              </h3>
              <p className="text-xs text-muted">یافتن طلق سازگار و راهکار فنی در ۳ مرحله ساده</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="بستن راهنمای انتخاب طلق"
            onClick={onClose}
            className="shop-button shop-secondary size-9 !min-h-9 !p-0 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: Symptom */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm mb-1">
                مرحله ۱: چه مشکلی برای چراغ خودروی شما پیش آمده است؟
              </h4>
              <p className="text-xs text-muted mb-4">
                برای تشخیص بهترین راهکار، وضعیت فعلی طلق چراغ را انتخاب نمایید:
              </p>

              <div className="space-y-3" role="radiogroup" aria-label="مشکل چراغ">
                {issues.map((item) => {
                  const Icon = item.icon;
                  const active = selectedIssue === item.id;
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      key={item.id}
                      onClick={() => setSelectedIssue(item.id)}
                      className={`w-full text-right p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                        active
                          ? 'border-brand bg-raised shadow-md'
                          : 'border-line hover:border-brand/40 bg-surface-deep/70'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm mb-0.5">{item.title}</div>
                        <div className="text-xs text-muted leading-relaxed">{item.desc}</div>
                      </div>
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${active ? 'text-brand' : 'text-slate-600'}`} />
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="shop-button shop-primary px-6 cursor-pointer"
                >
                  <span>مرحله بعد: انتخاب خودرو</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Car selection */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm mb-1">مرحله ۲: خودروی شما چیست؟</h4>
              <p className="text-xs text-muted mb-4">مدل خودروهای دارای طلق موجود در انبار:</p>

              <div>
                <label htmlFor="advisor-model-select" className="block text-xs font-bold text-ink mb-2">
                  انتخاب خودرو:
                </label>
                {availableModels.length > 0 ? (
                  <select
                    id="advisor-model-select"
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full p-3.5 bg-surface-deep rounded-xl border border-line text-ink text-sm font-medium focus:border-brand outline-hidden"
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id} className="bg-surface-deep text-ink">
                        {model.nameFa} ({model.years})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-xl border border-line bg-surface-deep p-3 text-xs text-muted">
                    در حال بارگذاری مدل‌های موجود…
                  </p>
                )}
              </div>

              <div className="bg-surface-deep p-4 rounded-2xl border border-line text-xs text-muted space-y-2 mt-4">
                <div className="font-bold flex items-center gap-1.5 text-brand">
                  <Car className="w-4 h-4" />
                  توصیه فنی بر اساس مشکل انتخاب‌شده:
                </div>
                <p className="leading-relaxed">{activeIssue.advice}</p>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="shop-button shop-secondary text-xs cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>مرحله قبل</span>
                </button>

                <button
                  type="button"
                  disabled={availableModels.length === 0}
                  onClick={() => setStep(3)}
                  className="shop-button shop-primary px-6 cursor-pointer disabled:opacity-45"
                >
                  <span>مشاهده پیشنهاد سازگار</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Recommended Product */}
          {step === 3 && !recommendedLens && (
            <div className="space-y-4 py-4 text-center">
              <p className="text-muted" role="status">
                برای مدل انتخابی، فعلاً محصول موجودی پیدا نشد. برای استعلام موجودی جدید می‌توانید با پشتیبانی تماس
                بگیرید.
              </p>
              <div className="flex justify-center gap-3">
                <button type="button" onClick={() => setStep(2)} className="shop-button shop-secondary cursor-pointer">
                  تغییر مدل خودرو
                </button>
                <a href="/#footer-support" onClick={onClose} className="shop-button shop-primary">
                  تماس با پشتیبانی
                </a>
              </div>
            </div>
          )}

          {step === 3 && recommendedLens && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="font-extrabold text-white text-base mb-1">پیشنهاد سازگار با خودرو و مشکل شما</h4>
                <p className="text-xs text-muted max-w-md mx-auto leading-6">{activeIssue.advice}</p>
              </div>

              {/* Product Card Showcase */}
              <div className="bg-surface-deep rounded-2xl p-4 border border-line flex flex-col sm:flex-row items-center gap-4 text-right">
                <img
                  src={recommendedLens.image}
                  alt={recommendedLens.titleFa}
                  className="w-24 h-24 rounded-xl object-cover border border-line bg-surface shrink-0"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded inline-block mb-1">
                    {recommendedLens.modelNameFa}
                  </div>
                  <h5 className="font-bold text-white text-sm line-clamp-1">{recommendedLens.titleFa}</h5>
                  <p className="text-[11px] text-muted mt-1 line-clamp-2">{recommendedLens.description}</p>
                  <p className="text-xs font-bold text-brand mt-1.5">
                    جفت: {formatCurrency(recommendedLens.pricePair)}
                  </p>
                </div>
              </div>

              {/* Moisture-specific or general butyl sealant recommendation */}
              {butylProduct && (selectedIssue === 'moisture' || onAddAccessory) && (
                <div
                  className={`rounded-2xl p-3.5 border text-right flex items-center justify-between gap-3 ${
                    selectedIssue === 'moisture'
                      ? 'border-brand/50 bg-brand/10'
                      : 'border-amber-400/30 bg-amber-500/10'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      {selectedIssue === 'moisture'
                        ? 'پیشنهاد ضروری برای رفع بخارگرفتگی: چسب بوتیل آلمانی'
                        : 'مکمل پیشنهادی نصب: چسب بوتیل آب‌بندی چراغ'}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      قیمت تک رول: {formatCurrency(butylProduct.priceSingle)}
                    </div>
                  </div>
                  {onAddAccessory && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddAccessory(butylProduct);
                        onClose();
                      }}
                      className="shop-button shop-secondary text-xs shrink-0 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-brand" />
                      افزودن چسب
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="shop-button shop-secondary text-xs cursor-pointer"
                >
                  تغییر مدل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectProduct(recommendedLens);
                    onClose();
                  }}
                  className="shop-button shop-primary px-6 text-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>مشاهده محصول و خرید آنلاین</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
