import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  Flame,
  Filter,
  Flashlight,
  Handshake,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { toPersianDigits } from '../utils/formatters';
import { matchesSearch } from '../utils/search';
import type { Product } from '../types';

type Props = {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdvisor: () => void;
  searchQuery: string;
  activeCategory?: string;
  activeSort?: string;
  products: Product[];
  onNavigate?: (url: string) => void;
};

const menuItem =
  'flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-right text-sm text-ink hover:bg-raised cursor-pointer';
const megaMenuBrands = [
  { id: 'ikco', label: 'ایران‌خودرو و پژو', detail: 'پژو، دنا، سمند، تارا و دیگر مدل‌ها', brandIds: ['ikco', 'peugeot'] },
  { id: 'saipa', label: 'سایپا', detail: 'شاهین، کوییک، ساینا، تیبا و دیگر مدل‌ها', brandIds: ['saipa'] },
  { id: 'chery', label: 'مدیران خودرو', detail: 'چری، ام‌وی‌ام و فونیکس', brandIds: ['chery'] },
  { id: 'jac', label: 'کرمان موتور', detail: 'جک و کی‌ام‌سی', brandIds: ['jac'] },
  { id: 'hyundai-kia', label: 'هیوندای و کیا', detail: 'مدل‌های هیوندای و کیا', brandIds: ['hyundai', 'kia'] },
  {
    id: 'imported',
    label: 'خودروهای وارداتی',
    detail: 'ب‌ام‌و، بنز، تویوتا، رنو و دیگر وارداتی‌ها',
    brandIds: ['bmw', 'mercedes', 'toyota', 'renault'],
  },
];

function HeaderMenu({
  label,
  name,
  children,
  wide = false,
}: {
  label: ReactNode;
  name: string;
  wide?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (menu.current) menu.current.open = false;
  };
  return (
    <details
      ref={menu}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          close();
          event.currentTarget.querySelector('summary')?.focus();
        }
      }}
    >
      <summary
        aria-label={name}
        className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold hover:bg-raised hover:text-brand [&::-webkit-details-marker]:hidden"
      >
        {label}
      </summary>
      <nav
        aria-label={name}
        className={`absolute ${
          wide ? 'right-0 left-auto w-[min(92vw,760px)]' : 'left-0 right-auto w-56'
        } top-full z-50 mt-2 box-border max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-2 shadow-lg`}
      >
        {children(close)}
      </nav>
    </details>
  );
}

export function Navbar({
  cartCount,
  onOpenCart,
  onOpenAdvisor,
  searchQuery,
  activeCategory,
  activeSort,
  products,
  onNavigate,
}: Props) {
  const [query, setQuery] = useState(searchQuery);
  const [activeMegaBrand, setActiveMegaBrand] = useState(megaMenuBrands[0].id);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const activeMegaGroup = megaMenuBrands.find((group) => group.id === activeMegaBrand) ?? megaMenuBrands[0];
  const featuredModels = [
    ...new Map(
      products
        .filter((product) => activeMegaGroup.brandIds.includes(product.brandId) && product.modelId !== 'all')
        .map((product) => [product.modelId, product]),
    ).values(),
  ].slice(0, 6);
  const suggestions = query.trim()
    ? [
        ...new Set(
          products.flatMap((product) => [
            product.brandId !== 'all' ? product.brandNameFa : '',
            product.modelId !== 'all' ? product.modelNameFa : '',
            product.titleFa,
          ]),
        ),
      ]
        .filter((value) => value && matchesSearch(value, query))
        .slice(0, 8)
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="shop-wrap py-2 sm:py-3">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2.5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-5">
          <a href="/" className="inline-flex min-h-11 items-center gap-2 justify-self-start rounded-lg">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/35 bg-surface text-brand">
              <Flashlight aria-hidden className="size-5 -rotate-45" />
            </span>
            <span className="text-lg font-extrabold whitespace-nowrap text-ink sm:text-xl">صادق چراغ</span>
          </a>
          <form
            action="/products"
            role="search"
            onSubmit={(event) => {
              if (!onNavigate) return;
              event.preventDefault();
              const q = query.trim();
              onNavigate(q ? '/products?q=' + encodeURIComponent(q) : '/products');
            }}
            className="relative col-span-2 row-start-2 md:col-span-1 md:row-auto"
          >
            <label htmlFor="main-search-input" className="sr-only">
              جست‌وجوی خودرو یا طلق چراغ
            </label>
            <input
              id="main-search-input"
              name="q"
              type="search"
              list="catalog-suggestions"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جست‌وجوی طلق چراغ، برند یا مدل خودرو..."
              className="min-h-11 w-full rounded-full border border-line bg-surface py-2.5 pe-12 ps-4 text-sm text-ink placeholder:text-muted focus:border-brand"
            />
            <datalist id="catalog-suggestions">
              {suggestions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
            <button
              type="submit"
              aria-label="جست‌وجو"
              className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-full text-brand hover:bg-raised cursor-pointer"
            >
              <Search aria-hidden className="size-[18px]" />
            </button>
          </form>
          <div className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end md:col-start-auto md:row-start-auto">
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={cartCount ? `سبد خرید، ${toPersianDigits(cartCount)} قلم` : 'سبد خرید'}
              className="relative grid size-11 place-items-center rounded-xl border border-line hover:bg-raised cursor-pointer"
            >
              <ShoppingBag aria-hidden className="size-5" />
              {cartCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1 -end-1 rounded-full bg-brand px-1 text-xs font-bold text-canvas"
                >
                  {toPersianDigits(cartCount)}
                </span>
              )}
            </button>
            <div className="lg:hidden">
              <HeaderMenu name="منوی سایت" label={<Menu aria-hidden className="size-5" />}>
                {(close) => (
                  <>
                    <a className={menuItem} href="/products" onClick={close}>
                      همه محصولات
                    </a>
                    <a className={menuItem} href="/products?category=accessory" onClick={close}>
                      چسب و ملزومات نصب
                    </a>
                    <a className={menuItem} href="/track" onClick={close}>
                      پیگیری سفارش
                    </a>
                    <button
                      type="button"
                      className={menuItem}
                      onClick={() => {
                        close();
                        onOpenAdvisor();
                      }}
                    >
                      راهنمای انتخاب طلق
                    </button>
                    <a className={menuItem} href="/guide" onClick={close}>
                      آموزش نصب
                    </a>
                    <a className={menuItem} href="/#footer-support" onClick={close}>
                      پشتیبانی و خرید عمده
                    </a>
                  </>
                )}
              </HeaderMenu>
            </div>
          </div>
        </div>
        <nav
          aria-label="دسترسی سریع"
          className="mt-2 hidden flex-wrap items-center justify-between gap-x-0 gap-y-1 border-t border-line pt-2 md:mt-3 lg:flex lg:gap-x-0 xl:gap-x-1"
        >
          <HeaderMenu
            name="انتخاب خودرو و دسته‌بندی کالاها"
            wide
            label={
              <>
                <Menu aria-hidden className="size-4" />
                <span className="whitespace-nowrap">
                  انتخاب خودرو <span className="hidden xl:inline">(دسته‌بندی کالاها)</span>
                </span>
                <ChevronDown aria-hidden className="size-4" />
              </>
            }
          >
            {(close) => (
              <div dir="rtl" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-slate-800 bg-surface-deep p-2">
                  <h2 className="mb-2 border-b border-slate-800 px-3 pb-2 pt-1 text-sm font-bold text-[#06B6D4]">
                    انتخاب براساس برند خودرو
                  </h2>
                  <ul className="space-y-1">
                    {megaMenuBrands.map((group) => (
                      <li key={group.id}>
                        <button
                          type="button"
                          aria-pressed={activeMegaBrand === group.id}
                          onFocus={() => setActiveMegaBrand(group.id)}
                          onMouseEnter={() => setActiveMegaBrand(group.id)}
                          onClick={() => setActiveMegaBrand(group.id)}
                          className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-right text-sm text-slate-200 transition-colors hover:bg-slate-800/80 hover:text-cyan-400 focus-visible:bg-slate-800/80 aria-pressed:bg-slate-800/80 aria-pressed:text-cyan-400 cursor-pointer"
                        >
                          <span className="min-w-0 truncate font-medium">{group.label}</span>
                          <ChevronLeft className="ms-3 size-4 shrink-0 text-slate-400" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 border-t border-slate-800 pt-2">
                    <a
                      className="flex min-h-10 items-center justify-between rounded-lg px-3 text-sm font-semibold text-[#06B6D4] transition-colors hover:bg-slate-800/80"
                      href="/products"
                      onClick={close}
                    >
                      مشاهده همه محصولات <ArrowLeft size={16} aria-hidden />
                    </a>
                    <a
                      className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-slate-100"
                      href="/#vehicle-selector"
                      onClick={close}
                    >
                      <Filter size={15} aria-hidden />
                      جستجوی پیشرفته بر اساس مدل
                    </a>
                  </div>
                </div>
                <div aria-live="polite" className="min-w-0 rounded-lg border border-slate-800 bg-surface-deep p-3 sm:p-4">
                  <h3 className="border-b border-slate-800 pb-2 text-base font-bold text-white">
                    {activeMegaGroup.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{activeMegaGroup.detail}</p>
                  <h4 className="mt-4 text-xs font-bold text-slate-400">مدل‌های پرفروش و مرتبط</h4>
                  {featuredModels.length ? (
                    <ul className="mt-2 space-y-1">
                      {featuredModels.map((product) => (
                        <li key={product.modelId}>
                          <a
                            className="flex min-h-10 items-center justify-between rounded-lg px-3 text-sm text-slate-200 transition-colors hover:bg-slate-800/80 hover:text-cyan-400"
                            href={
                              '/products?brand=' +
                              encodeURIComponent(product.brandId) +
                              '&model=' +
                              encodeURIComponent(product.modelId)
                            }
                            onClick={close}
                          >
                            {product.modelNameFa}
                            <ChevronLeft className="ms-2 size-4 shrink-0 text-slate-500" aria-hidden />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 rounded-lg border border-dashed border-slate-700 p-3 text-sm leading-6 text-slate-400">
                      مدل‌های این گروه را در صفحه محصولات ببین.
                    </p>
                  )}
                  <a
                    className="mt-3 inline-flex min-h-10 items-center gap-2 font-semibold text-[#06B6D4] hover:text-cyan-300"
                    href={'/products?brand=' + encodeURIComponent(activeMegaGroup.brandIds.join(','))}
                    onClick={close}
                  >
                    همه محصولات این گروه <ArrowLeft size={15} aria-hidden />
                  </a>
                </div>
              </div>
            )}
          </HeaderMenu>
          <a
            href="/products?sort=popular"
            className={'shop-nav-link ' + (activeSort === 'popular' ? 'bg-raised text-brand font-bold' : '')}
          >
            <Flame size={16} aria-hidden />
            <span className="whitespace-nowrap">پرفروش‌ترین‌ها</span>
          </a>
          <a
            href="/products?category=accessory"
            className={'shop-nav-link ' + (activeCategory === 'accessory' ? 'bg-raised text-brand font-bold' : '')}
          >
            <Package size={16} aria-hidden />
            <span className="whitespace-nowrap">چسب و ملزومات نصب</span>
          </a>
          <button type="button" onClick={onOpenAdvisor} className="shop-nav-link cursor-pointer">
            <Sparkles size={16} aria-hidden />
            <span className="whitespace-nowrap">راهنمای هوشمند انتخاب طلق</span>
          </button>
          <a href="/#footer-support" className="shop-nav-link">
            <Handshake size={16} aria-hidden />
            <span className="whitespace-nowrap">خرید عمده (ویژه همکاران)</span>
          </a>
          <a href="/guide" className="shop-nav-link">
            <Wrench size={16} aria-hidden />
            <span className="whitespace-nowrap">آموزش نصب و آب‌بندی</span>
          </a>
          <a href="/track" className="shop-nav-link whitespace-nowrap">
            پیگیری سفارش
          </a>
        </nav>
      </div>
    </header>
  );
}
