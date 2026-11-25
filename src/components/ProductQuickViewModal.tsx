import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Star, X } from 'lucide-react';
import type { Product } from '../types';
import { REVIEWS } from '../data/carsAndProducts';
import { catalogPhotos, isSamplePrice, isSampleProduct, productPlaceholder } from '../utils/catalogPresentation';
import { formatPrice, toPersianDigits } from '../utils/formatters';
import { maxOrderableQuantity, unitPriceForSide, type OrderSide } from '../utils/shopLogic';

type Props = {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, side: OrderSide, quantity: number) => void;
};

const sides = [['right', 'راست (شاگرد)'], ['left', 'چپ (راننده)'], ['pair', 'جفت']] as const;

export function ProductQuickViewModal({ product, onClose, onAddToCart }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const accessory = product.category === 'accessory';
  const [side, setSide] = useState<OrderSide>(accessory ? 'standard' : 'pair');
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const photos = catalogPhotos(product);
  const photo = !imageFailed && photos[imageIndex];
  const price = unitPriceForSide(product, side);
  const originalPrice = side === 'pair' ? product.originalPricePair : product.originalPriceSingle;
  const samplePrice = isSamplePrice(product, side);
  const maxQuantity = maxOrderableQuantity(product, side);
  const available = product.inStock && maxQuantity > 0;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      element?.close();
    };
  }, []);

  useEffect(() => {
    setQuantity((prev) => Math.max(1, Math.min(prev, Math.max(1, maxQuantity))));
  }, [maxQuantity]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="quick-view-title"
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-[18px] border border-line bg-surface text-ink backdrop:bg-canvas/85"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line p-4 sm:px-6">
        <div>
          <p className="text-xs leading-6 text-muted">
            {product.modelNameFa}
            {product.years && ' · ' + toPersianDigits(product.years)}
          </p>
          <h2 id="quick-view-title" className="text-lg leading-8 font-extrabold sm:text-xl">
            {product.titleFa}
          </h2>
        </div>
        <button
          type="button"
          aria-label="بستن جزئیات محصول"
          onClick={onClose}
          className="shop-button shop-secondary size-11 shrink-0 cursor-pointer"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      <div className="grid gap-5 p-4 md:grid-cols-2 md:p-6">
        <div>
          <figure className="overflow-hidden rounded-xl bg-surface-deep text-[#26364a] border border-line">
            <img
              src={photo || productPlaceholder}
              alt={photo ? product.titleFa : ''}
              onError={() => setImageFailed(true)}
              className={photo ? 'aspect-[4/3] w-full object-cover' : 'aspect-[4/3] w-full object-contain p-4'}
            />
            {!photo && <figcaption className="pb-3 text-center text-sm text-muted">عکس محصول ثبت نشده</figcaption>}
          </figure>
          {photos.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {photos.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  aria-label={'نمای ' + toPersianDigits(index + 1)}
                  aria-pressed={index === imageIndex}
                  onClick={() => {
                    setImageIndex(index);
                    setImageFailed(false);
                  }}
                  className={
                    'size-14 overflow-hidden rounded-lg border-2 bg-surface-deep cursor-pointer ' +
                    (index === imageIndex ? 'border-brand' : 'border-line')
                  }
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {isSampleProduct(product) && (
            <p className="mb-3 rounded-lg border border-line bg-surface-deep p-3 text-sm leading-6 text-muted">
              این کالا از کاتالوگ نمونهٔ اولیه است. پیش از خرید، اطلاعات و سازگاری آن را بررسی کن.
            </p>
          )}
          {product.description && <p className="mb-3 text-sm leading-7 text-muted">{product.description}</p>}
          {product.compatibilityNotes && (
            <p className="mb-4 text-sm leading-7 text-muted">{product.compatibilityNotes}</p>
          )}

          <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
            {(
              [
                ['جنس', product.specs.material],
                ['کشور سازنده', product.specs.originCountry],
                ['مقاومت حرارتی', product.specs.heatResistance],
                ['نصب', product.specs.installationDifficulty],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-surface-deep p-2">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 leading-6">{value}</dd>
              </div>
            ))}
          </dl>

          {!accessory && (
            <div role="group" aria-label="سمت چراغ" className="mb-4 grid grid-cols-3 gap-2">
              {sides.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={side === value}
                  className={
                    'shop-button shop-secondary !px-1 cursor-pointer ' +
                    (side === value ? '!border-brand !text-brand' : '')
                  }
                  onClick={() => setSide(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-line pt-4">
            <p className="text-sm text-muted">
              {available
                ? samplePrice
                  ? `قیمت و موجودی نمونه (${toPersianDigits(maxQuantity)} قابل سفارش)`
                  : `موجود در انبار (${toPersianDigits(maxQuantity)} قابل سفارش)`
                : 'ناموجود'}
            </p>
            {!samplePrice && originalPrice !== undefined && originalPrice > price && (
              <del className="block mt-1 text-xs text-muted">{formatPrice(originalPrice * quantity)} تومان</del>
            )}
            <p className="mt-1 text-xl font-extrabold text-brand">{formatPrice(price * quantity)} تومان</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div role="group" aria-label="تعداد" className="flex items-center rounded-xl border border-line">
                <button
                  type="button"
                  aria-label="کم کردن تعداد"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(quantity - 1)}
                  className="size-11 disabled:opacity-40 cursor-pointer"
                >
                  −
                </button>
                <output className="min-w-6 text-center">{toPersianDigits(quantity)}</output>
                <button
                  type="button"
                  aria-label="زیاد کردن تعداد"
                  disabled={!available || quantity >= maxQuantity}
                  onClick={() => setQuantity(quantity + 1)}
                  className="size-11 disabled:opacity-40 cursor-pointer"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                disabled={!available}
                className="shop-button shop-primary flex-1 disabled:opacity-45 cursor-pointer"
                onClick={() => {
                  onAddToCart(product, side, quantity);
                  onClose();
                }}
              >
                <ShoppingBag size={17} aria-hidden /> افزودن به سبد خرید
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <section aria-label="دیدگاه مشتریان" className="border-t border-line p-4 sm:px-6 bg-surface-deep/40">
        <h3 className="text-sm font-bold text-white mb-3">تجربه خریداران صادق چراغ</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {REVIEWS.slice(0, 2).map((rev) => (
            <article key={rev.id} className="rounded-xl border border-line bg-surface-deep p-3 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <strong className="text-ink">{rev.author}</strong>
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                  <Star className="size-3.5 fill-amber-300" aria-hidden />
                  {toPersianDigits(rev.rating)}
                </span>
              </div>
              <p className="text-[11px] text-brand mb-1">{rev.carModel}</p>
              <p className="text-muted leading-6">{rev.comment}</p>
            </article>
          ))}
        </div>
      </section>
    </dialog>
  );
}
