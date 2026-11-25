import { Fragment, type ReactNode } from 'react';
import { ArrowLeft, Camera, CarFront, CheckCircle2, ClipboardCheck, ListFilter, PackageCheck, PackageSearch, SearchCheck, ShieldCheck, ShoppingCart, Sparkles } from 'lucide-react';
import type { Product } from '../types';
import { formatPrice, toPersianDigits } from '../utils/formatters';

import { ProductCard } from './ProductCard';

const brandCards = [
  { id: 'ikco,peugeot', name: 'ایران خودرو و پژو', logo: 'iran-khodro.svg' },
  { id: 'saipa', name: 'سایپا', logo: 'saipa.png' },
  { id: 'chery', name: 'چری / مدیران خودرو', logo: 'chery.svg' },
  { id: 'jac', name: 'جک / کرمان موتور', logo: 'jac.png' },
  { id: 'hyundai', name: 'هیوندای', logo: 'hyundai.svg' },
  { id: 'kia', name: 'کیا موتورز', logo: 'kia.svg' },
];

export function HomeHero({ children, onOpenAdvisor }: { children: ReactNode; onOpenAdvisor: () => void }) {
  return (
    <section aria-labelledby="home-heading" className="shop-panel p-4 sm:p-7 lg:p-9">
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand"><span className="size-2 rounded-full bg-brand" />فروشگاه تخصصی طلق چراغ خودرو</p>
          <h1 id="home-heading" className="max-w-lg text-[29px] leading-[1.5] font-extrabold sm:text-4xl lg:text-[42px]">طلق چراغ مناسب<br className="hidden lg:block" /> خودروی خودت رو پیدا کن</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted sm:text-base sm:leading-8">طلق چراغ جلو و عقب خودروهای مختلف را بررسی کن و محصول سازگار با مدل ماشینت را راحت‌تر انتخاب کن.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={onOpenAdvisor} className="shop-button shop-secondary border-brand/50 cursor-pointer"><Sparkles size={17} aria-hidden />راهنمای هوشمند انتخاب طلق</button>
          </div>
        </div>
        <figure className="relative overflow-hidden rounded-2xl border border-line bg-surface-deep">
          <img src="/assets/hero-headlamp.jpg" alt="نمای نزدیک طلق و اجزای داخلی یک چراغ جلوی خودرو" width="1536" height="1024" fetchPriority="high" className="aspect-[2/1] w-full object-cover md:aspect-[4/3] lg:aspect-[3/2]" />
          <figcaption className="absolute bottom-3 end-3 rounded-md bg-canvas/90 px-2 py-1 text-xs text-muted">تصویر نمایشی</figcaption>
        </figure>
      </div>
      <div className="mt-6 border-t border-line pt-5 sm:mt-8 sm:pt-6">{children}</div>
    </section>
  );
}

const trustSignals = [
  { icon: PackageCheck, title: 'ضمانت سلامت فیزیکی در ارسال', detail: 'بسته‌بندی ضدضربه و تعویض رایگان در صورت شکستگی' },
  { icon: ShieldCheck, title: 'پلی‌کربنات درجه یک با لایه ضد UV', detail: 'مقاوم در برابر زردشدگی و کدری زیر نور آفتاب' },
  { icon: CheckCircle2, title: 'تطابق ۱۰۰٪ با خار و قالب فابریک', detail: 'نصب آسان و آب‌بندی استاندارد بدون تغییر در کاسه چراغ' },
  { icon: Camera, title: 'مشاوره رایگان قبل از خرید', detail: 'تشخیص مدل چراغ شما با ارسال عکس' },
];

export function HomeTrustSignals() {
  return (
    <section aria-label="ضمانت‌ها و مزایای خرید" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {trustSignals.map(({ icon: Icon, title, detail }) => (
        <article key={title} className="rounded-2xl border border-line bg-surface/80 p-4 sm:p-5">
          <Icon className="mb-3 size-6 text-brand" aria-hidden />
          <h2 className="font-bold leading-7 text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
        </article>
      ))}
    </section>
  );
}

export function HomeCarCategories() {
  return (
    <section id="car-categories" aria-labelledby="car-categories-heading" className="shop-anchor">
      <h2 id="car-categories-heading" className="shop-heading">بر اساس خودرو خرید کن</h2>
      <p className="shop-description">برند خودروت رو انتخاب کن و طلق‌های مرتبط رو ببین.</p>
      <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
        {brandCards.map(brand => (
          <a key={brand.id} href={'/products?brand=' + encodeURIComponent(brand.id)} className="shop-panel group flex min-h-28 flex-col items-center justify-center gap-2 p-2 text-center transition-all hover:-translate-y-0.5 hover:border-brand/70 hover:shadow-[0_0_24px_rgba(6,182,212,0.16)] sm:min-h-32 sm:gap-3 sm:p-4">
            <span className={'grid h-14 w-[92px] max-w-full place-items-center overflow-hidden rounded-lg border border-slate-200/70 p-2 shadow-sm transition-transform group-hover:scale-[1.04] ' + (brand.logo === 'saipa.png' ? 'bg-surface-deep' : 'bg-white')}>
              <img src={'/assets/car-brands/' + brand.logo} alt="" aria-hidden="true" loading="lazy" decoding="async" className="max-h-10 max-w-full object-contain" />
            </span>
            <span className="text-xs font-bold text-ink sm:text-sm">{brand.name}</span>
            <span className="sr-only">مشاهده محصولات {brand.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function HomeInstallationEssentials({ products, onAdd }: { products: Product[]; onAdd: (product: Product) => void }) {
  const butyl = products.find(product => product.id === 'tlq-butyl-glue');
  return (
    <section aria-labelledby="installation-essentials-heading">
      <div className="mb-4">
        <h2 id="installation-essentials-heading" className="shop-heading">ملزومات نصب و آب‌بندی</h2>
        <p className="shop-description">برای نصب تمیزتر و آب‌بندی مطمئن‌تر، ابزارهای ضروری را هم ببین.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="shop-panel flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand"><Sparkles size={14} aria-hidden/>پیشنهاد نصب</span>
            <h3 className="text-lg font-extrabold text-white">چسب حرارتی (بوتیل) مخصوص آب‌بندی چراغ</h3>
            <p className="mt-2 text-sm leading-7 text-muted">کمک به جلوگیری از نفوذ آب و بخار زدن چراغ</p>
            {butyl && <p className="mt-3 text-xl font-extrabold text-brand">{formatPrice(butyl.priceSingle)} <span className="text-sm font-semibold text-muted">تومان</span></p>}
          </div>
          <button type="button" disabled={!butyl?.inStock} onClick={() => butyl && onAdd(butyl)} className="shop-button shop-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"><ShoppingCart size={17} aria-hidden/>افزودن به سبد</button>
        </article>
        <article className="shop-panel flex flex-col justify-between gap-5 border-brand/25 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.12),transparent_60%),var(--color-surface)] p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300"><CheckCircle2 size={14} aria-hidden/>پیشنهاد ویژه کنار خرید طلق</span>
            <h3 className="text-lg font-extrabold text-white">پک کامل تعویض طلق</h3>
            <p className="mt-2 text-sm leading-7 text-muted">چسب، پرایمر و دستکش؛ برای آماده‌سازی کامل نصب</p>
          </div>
          <a href="/products?category=accessory" className="shop-button shop-secondary shrink-0 border-brand/45 hover:bg-brand hover:text-canvas">دیدن ملزومات نصب <ArrowLeft size={16} aria-hidden/></a>
        </article>
      </div>
    </section>
  );
}

export function HomeFeatured({ products, ready, error, retry, onView }: {
  products: Product[]; ready: boolean; error: string; retry: () => void; onView: (product: Product) => void;
}) {
  const lenses = products.filter(product => product.category === 'headlight' || product.category === 'taillight');
  const featured = [...lenses.filter(product => product.inStock), ...lenses.filter(product => !product.inStock)].slice(0, 4);
  return (
    <section aria-labelledby="featured-heading" aria-busy={!ready}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="featured-heading" className="shop-heading">محصولات منتخب</h2>
          <p className="shop-description">چند طلق از کاتالوگ جلو و عقب فروشگاه را بررسی کن.</p>
        </div>
        <a href="/products" className="shop-link inline-flex min-h-11 items-center gap-2 font-semibold">مشاهده همه محصولات <ArrowLeft size={17} aria-hidden /></a>
      </div>
      {!ready ? (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" role="status">
          <span className="sr-only">در حال دریافت محصولات…</span>
          {[1, 2, 3, 4].map(item => <div key={item} aria-hidden="true" className="shop-panel aspect-[3/4] motion-safe:animate-pulse" />)}
        </div>
      ) : error ? (
        <p role="status" className="shop-panel mt-5 p-5">{error} <button type="button" className="shop-link ms-2 underline" onClick={retry}>تلاش دوباره</button></p>
      ) : featured.length ? (
        <div className="mt-5 grid grid-cols-1 gap-3 min-[350px]:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {featured.map(product => <Fragment key={product.id}><ProductCard product={product} onQuickView={onView} /></Fragment>)}
        </div>
      ) : <p className="shop-panel mt-5 p-5 text-muted">هنوز طلق جلو یا عقب در کاتالوگ ثبت نشده است.</p>}
    </section>
  );
}

const steps = [
  { icon: CarFront, title: 'خودرو را انتخاب کن', detail: 'برند و مدل خودرو را مشخص کن.' },
  { icon: ListFilter, title: 'مشخصات چراغ را بررسی کن', detail: 'جلو یا عقب بودن چراغ و سمت موردنیاز را مشخص کن.' },
  { icon: ClipboardCheck, title: 'محصول سازگار را بررسی کن', detail: 'تصاویر و توضیحات سازگاری را پیش از خرید بخوان.' },
];

export function HomeBuyingGuide() {
  return (
    <section id="buying-guide" aria-labelledby="buying-guide-heading" className="shop-panel shop-anchor p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="buying-guide-heading" className="shop-heading">چطور طلق چراغ مناسب انتخاب کنیم؟</h2>
          <p className="shop-description">از انتخاب خودرو تا بررسی سازگاری قطعه در سه مرحله.</p>
        </div>
        <a href="/guide" className="shop-link inline-flex min-h-11 items-center gap-2 font-semibold">راهنمای نصب <ArrowLeft size={16} aria-hidden /></a>
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, detail }, index) => (
          <li key={title} className="rounded-xl border border-line bg-surface-deep p-4">
            <div className="mb-3 flex items-center justify-between"><Icon className="size-5 text-brand" aria-hidden /><span className="text-sm font-semibold text-muted">مرحله {toPersianDigits(index + 1)}</span></div>
            <h3 className="font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted">{detail}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-sm">
        <a href="#vehicle-selector" className="shop-link inline-flex min-h-11 items-center gap-2"><SearchCheck size={17} aria-hidden /> جست‌وجوی تخصصی براساس خودرو</a>
        <a href="/track" className="shop-link inline-flex min-h-11 items-center gap-2"><PackageSearch size={17} aria-hidden /> پیگیری سفارش با کد رهگیری</a>
      </div>
    </section>
  );
}
