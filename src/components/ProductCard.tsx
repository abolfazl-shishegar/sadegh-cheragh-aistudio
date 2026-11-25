import { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import type { Product } from '../types';
import { catalogPhotos, isSamplePrice, productPlaceholder } from '../utils/catalogPresentation';
import { formatPrice } from '../utils/formatters';
import { unitPriceForSide, type OrderSide } from '../utils/shopLogic';

type Props = {
  product: Product;
  onQuickView: (product: Product) => void;
  onAddToCart?: (product: Product, side: OrderSide) => void;
};

export function ProductCard({ product, onQuickView, onAddToCart }: Props) {
  const [side, setSide] = useState<'left' | 'right' | 'pair'>('pair');
  const [photoFailed, setPhotoFailed] = useState(false);
  const accessory = product.category === 'accessory';
  const selectedSide: OrderSide = accessory ? 'standard' : onAddToCart ? side : 'pair';
  const price = unitPriceForSide(product, selectedSide);
  const originalPrice = selectedSide === 'pair' ? product.originalPricePair : product.originalPriceSingle;
  const sample = isSamplePrice(product, selectedSide);
  const photo = !photoFailed && catalogPhotos(product)[0];
  const vehicle = [...new Set([product.brandNameFa, product.modelNameFa])].join(' · ');

  useEffect(() => {
    setPhotoFailed(false);
  }, [product.id, product.image]);

  return (
    <article className="shop-panel flex h-full min-w-0 flex-col overflow-hidden transition-colors hover:border-brand/50">
      <button
        type="button"
        aria-label={'مشاهده و خرید ' + product.titleFa}
        onClick={() => onQuickView(product)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-deep text-[#26364a] focus-visible:-outline-offset-2 cursor-pointer"
        style={{ backgroundImage: 'radial-gradient(ellipse at center, rgba(73,220,235,.16), rgba(17,30,49,.94) 70%)' }}
      >
        <img
          src={photo || productPlaceholder}
          alt={photo ? product.titleFa : ''}
          loading="lazy"
          decoding="async"
          onError={() => setPhotoFailed(true)}
          className={photo ? 'size-full object-cover' : 'size-full object-contain p-3'}
        />
        {!photo && (
          <span className="absolute inset-x-2 bottom-2 mx-auto w-fit rounded-md bg-white/85 px-2 py-1 text-xs">
            عکس محصول ثبت نشده
          </span>
        )}
        {!accessory && (
          <span className="absolute right-3 top-3 rounded-full border border-cyan-200/30 bg-canvas/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            {selectedSide === 'pair' ? 'جفت کامل' : selectedSide === 'left' ? 'تک سمت · چپ' : 'تک سمت · راست'}
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {!accessory && <p className="text-xs leading-6 text-muted">{vehicle}</p>}
        <h3 className="mt-1 line-clamp-2 text-[15px] leading-[1.6] font-bold text-white sm:text-base">
          <button type="button" onClick={() => onQuickView(product)} className="text-start text-white hover:text-brand cursor-pointer">
            {product.titleFa}
          </button>
        </h3>
        <div className="mt-auto pt-4">
          {onAddToCart && !accessory && (
            <div aria-label="انتخاب سمت چراغ" role="group" className="mb-3 grid grid-cols-3 gap-1.5">
              {([['right', 'راست'], ['left', 'چپ'], ['pair', 'جفت']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={side === value}
                  className={
                    'min-h-11 rounded-lg border px-1 text-xs cursor-pointer ' +
                    (side === value
                      ? 'border-brand/60 bg-raised text-brand font-bold'
                      : 'border-line bg-surface-deep text-muted hover:text-ink')
                  }
                  onClick={() => setSide(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <span
            className={
              'inline-flex rounded-full px-2.5 py-1 text-xs font-bold ' +
              (product.inStock ? 'bg-emerald-500/10 text-[#10B981]' : 'bg-slate-500/15 text-slate-300')
            }
          >
            {product.inStock ? 'موجود در انبار - آماده ارسال' : 'ناموجود'}
          </span>
          {!sample && originalPrice !== undefined && originalPrice > price && (
            <del className="block mt-1 text-xs text-muted">{formatPrice(originalPrice)} تومان</del>
          )}
          <p className="mt-2 text-xl font-extrabold text-brand">
            {formatPrice(price)} <span className="text-sm font-medium text-muted">تومان</span>
          </p>
          {sample && <p className="mt-1 text-xs text-muted">قیمت نمونه</p>}
          {onAddToCart ? (
            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => onAddToCart(product, selectedSide)}
              className="shop-button shop-primary mt-3 w-full disabled:opacity-45 cursor-pointer"
            >
              خرید سریع <ShoppingBag size={15} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="shop-button mt-3 w-full border border-brand/60 bg-transparent text-brand transition-colors hover:bg-brand hover:text-canvas cursor-pointer"
            >
              مشاهده و خرید <ArrowLeft size={15} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
