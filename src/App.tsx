import { Fragment, useEffect, useMemo, useState } from 'react';
import { CartItem, FilterState, Product, ProductCategory } from './types';
import { productCategories } from './productCategories';
import { CAR_BRANDS, CAR_MODELS } from './data/carsAndProducts';
import { getSideTitle, toPersianDigits } from './utils/formatters';

// Components
import { Navbar } from './components/Navbar';
import { CarSelectorBar } from './components/CarSelectorBar';
import { BeforeAfterSlider } from './components/BeforeAfterSlider';
import { ProductCard } from './components/ProductCard';
import { ProductQuickViewModal } from './components/ProductQuickViewModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingPage } from './components/OrderTrackingPage';
import { LensAdvisorModal } from './components/LensAdvisorModal';
import { InstallationGuideSection } from './components/InstallationGuideSection';
import { FaqSection } from './components/FaqSection';
import {
  HomeBuyingGuide,
  HomeCarCategories,
  HomeFeatured,
  HomeHero,
  HomeInstallationEssentials,
  HomeTrustSignals,
} from './components/HomeSections';
import { Footer } from './components/Footer';
import { api, defaultSettings, updateCart, type ShopSettings } from './shop';
import {
  filterAndSortProducts,
  parseBrandFilter,
  reconcileCart,
  unitPriceForSide,
  unitsForItem,
  type OrderSide,
} from './utils/shopLogic';

const positions = ['all', 'جلو', 'عقب', 'پروژکتور'];
const sortOptions: ReadonlyArray<{ id: FilterState['sortBy']; label: string }> = [
  { id: 'popular', label: 'پرفروش‌ترین‌ها' },
  { id: 'newest', label: 'جدیدترین' },
  { id: 'priceAsc', label: 'ارزان‌ترین' },
  { id: 'priceDesc', label: 'گران‌ترین' },
  { id: 'discount', label: 'بیشترین تخفیف' },
];
const validRoutes = new Set(['/', '/products', '/track', '/guide']);

function normalizeBrandParam(rawBrand: string): string {
  const parts = parseBrandFilter(rawBrand).filter((id) => CAR_BRANDS.some((b) => b.id === id));
  return parts.length ? parts.join(',') : 'all';
}

function parseRouteState(urlString: string) {
  const parsed = new URL(urlString, window.location.origin);
  const page = parsed.pathname.replace(/\/$/, '') || '/';
  const params = parsed.searchParams;
  const brand = normalizeBrandParam(params.get('brand') ?? 'all');
  const brandParts = parseBrandFilter(brand);
  const rawModel = params.get('model') ?? 'all';
  const model = CAR_MODELS.some(
    (item) => item.id === rawModel && (brandParts.length === 0 || brandParts.includes(item.brandId)),
  )
    ? rawModel
    : 'all';
  const rawCategory = params.get('category') ?? 'all';
  const category = (productCategories.find((item) => item.id === rawCategory)?.id ?? 'all') as ProductCategory | 'all';
  const rawPosition = params.get('position') ?? 'all';
  const position = positions.includes(rawPosition) ? rawPosition : 'all';
  const rawSort = params.get('sort') as FilterState['sortBy'] | null;
  const sortBy: FilterState['sortBy'] = sortOptions.some((s) => s.id === rawSort) ? rawSort! : 'popular';
  const searchQuery = params.get('q') ?? '';
  const inStockOnly = params.get('inStock') === '1';
  const uvOnly = params.get('uv') === '1';

  return {
    page,
    brand,
    model,
    category,
    position,
    sortBy,
    searchQuery,
    inStockOnly,
    uvOnly,
  };
}

export default function App() {
  const [routeUrl, setRouteUrl] = useState(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setRouteUrl(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const route = useMemo(() => parseRouteState(routeUrl), [routeUrl]);
  const page = route.page;

  // Selector bar states (synced with URL when route changes)
  const [selectedBrandId, setSelectedBrandId] = useState(() =>
    route.brand.includes(',') ? 'all' : route.brand,
  );
  const [selectedModelId, setSelectedModelId] = useState(() => route.model);
  const [selectedPosition, setSelectedPosition] = useState(() => route.position);

  useEffect(() => {
    setSelectedBrandId(route.brand.includes(',') ? 'all' : route.brand);
    setSelectedModelId(route.model);
    setSelectedPosition(route.position);
  }, [route.brand, route.model, route.position]);

  function navigate(targetUrl: string, options?: { replace?: boolean }) {
    const resolved = new URL(targetUrl, window.location.origin);
    if (resolved.pathname.replace(/\/$/, '') === '/admin') {
      window.location.assign(resolved.pathname + resolved.search);
      return;
    }
    const nextUrl = resolved.pathname + resolved.search;
    if (options?.replace) {
      window.history.replaceState({}, '', nextUrl + resolved.hash);
    } else {
      window.history.pushState({}, '', nextUrl + resolved.hash);
    }
    setRouteUrl(nextUrl);
    if (resolved.hash) {
      requestAnimationFrame(() => {
        document.getElementById(resolved.hash.slice(1))?.scrollIntoView();
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  }

  // Intercept internal SPA links cleanly
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href') ?? '';
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
      if (href.startsWith('#')) return;
      const resolved = new URL(href, window.location.origin);
      if (resolved.origin !== window.location.origin) return;
      const cleanPath = resolved.pathname.replace(/\/$/, '') || '/';
      if (cleanPath === '/admin') return;
      event.preventDefault();
      navigate(resolved.pathname + resolved.search + resolved.hash);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [catalogError, setCatalogError] = useState('');
  const [catalogReady, setCatalogReady] = useState(false);
  const [cartNotice, setCartNotice] = useState('');

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('talaq_cart');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  });

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('talaq_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  async function refreshCatalog() {
    setCatalogReady(false);
    setCatalogError('');
    try {
      const data = await api<{ products: Product[]; settings: ShopSettings }>('catalog');
      setProducts(data.products);
      setSettings(data.settings);
      setCart((prev) => updateCart(prev, data.products));
      setCatalogError('');
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'دریافت کاتالوگ ناموفق بود.');
    } finally {
      setCatalogReady(true);
    }
  }
  useEffect(() => {
    void refreshCatalog();
  }, []);

  // Cart operations
  const handleAddToCart = (product: Product, side: OrderSide, quantity: number = 1) => {
    if (!product.inStock) return;
    const normalizedSide: OrderSide = product.category === 'accessory' ? 'standard' : side === 'standard' ? 'pair' : side;
    const unitPrice = unitPriceForSide(product, normalizedSide);
    const itemId = `${product.id}-${normalizedSide}`;
    const sideLabel = getSideTitle(normalizedSide) || 'استاندارد';

    let reachedLimit = false;
    setCart((prevCart) => {
      const currentUnits = prevCart
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + unitsForItem(item.selectedSide, item.quantity, product.category), 0);
      const neededUnits = unitsForItem(normalizedSide, quantity, product.category);
      if (currentUnits + neededUnits > product.stockCount) {
        reachedLimit = true;
        return prevCart;
      }
      const existingIndex = prevCart.findIndex((item) => item.id === itemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = Math.min(99, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          unitPrice,
          totalPrice: newQty * unitPrice,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: itemId,
          productId: product.id,
          product,
          selectedSide: normalizedSide,
          sideLabel,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
        };
        return [...prevCart, newItem];
      }
    });

    setCartNotice(reachedLimit ? `حداکثر موجودی انبار برای «${product.titleFa}» در سبد خرید شما ثبت شده است.` : '');
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    let reachedLimit = false;
    setCart((prevCart) => {
      const target = prevCart.find((item) => item.id === itemId);
      const nextRaw = prevCart.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              totalPrice: newQuantity * item.unitPrice,
            }
          : item,
      );
      const reconciled = reconcileCart(nextRaw, products);
      if (target && reconciled.adjusted) {
        const updatedItem = reconciled.items.find((i) => i.id === itemId);
        if (!updatedItem || updatedItem.quantity < newQuantity) {
          reachedLimit = true;
        }
      }
      return reconciled.items;
    });
    setCartNotice(reachedLimit ? 'تعداد درخواستی بیشتر از موجودی فعلی انبار است.' : '');
  };

  const handleRemoveItem = (itemId: string) => {
    setCartNotice('');
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  const handleAddAccessory = (product: Product) => {
    handleAddToCart(product, 'standard', 1);
  };

  const handleOrderCompleted = () => {
    setCartNotice('');
    setCart([]);
    void refreshCatalog();
  };

  const showSelectedProducts = () => {
    const filters = new URLSearchParams();
    if (selectedBrandId !== 'all') filters.set('brand', selectedBrandId);
    if (selectedModelId !== 'all') filters.set('model', selectedModelId);
    if (selectedPosition !== 'all') filters.set('position', selectedPosition);
    navigate(filters.size ? '/products?' + filters : '/products');
  };

  const updateProductsQuery = (patch: Partial<{
    category: ProductCategory | 'all';
    position: string;
    sort: FilterState['sortBy'];
    inStock: boolean;
    uv: boolean;
    brand: string;
    model: string;
  }>) => {
    const params = new URLSearchParams(window.location.search);
    const apply = (key: string, val: string | undefined, defaultVal: string) => {
      if (!val || val === defaultVal) params.delete(key);
      else params.set(key, val);
    };
    if ('category' in patch) apply('category', patch.category, 'all');
    if ('position' in patch) apply('position', patch.position, 'all');
    if ('sort' in patch) apply('sort', patch.sort, 'popular');
    if ('brand' in patch) apply('brand', patch.brand, 'all');
    if ('model' in patch) apply('model', patch.model, 'all');
    if ('inStock' in patch) {
      if (patch.inStock) params.set('inStock', '1');
      else params.delete('inStock');
    }
    if ('uv' in patch) {
      if (patch.uv) params.set('uv', '1');
      else params.delete('uv');
    }
    navigate(params.size ? '/products?' + params : '/products', { replace: true });
  };

  // Filter & Sort Logic via shared pure domain function
  const filteredProducts = useMemo(() => {
    return filterAndSortProducts(
      products,
      {
        brandId: route.brand,
        modelId: route.model,
        category: route.category,
        position: route.position,
        search: route.searchQuery,
        inStockOnly: route.inStockOnly,
        uvOnly: route.uvOnly,
        sortBy: route.sortBy,
      },
      CAR_BRANDS,
      CAR_MODELS,
    );
  }, [products, route]);

  const categoryObj = productCategories.find((item) => item.id === route.category) ?? productCategories[0];
  const activeBrandNames = parseBrandFilter(route.brand)
    .map((id) => CAR_BRANDS.find((b) => b.id === id)?.nameFa)
    .filter(Boolean)
    .join('، ');
  const activeModelName =
    route.model !== 'all' ? CAR_MODELS.find((item) => item.id === route.model)?.nameFa : undefined;
  const hasActiveFilters = Boolean(
    route.searchQuery ||
      route.brand !== 'all' ||
      route.model !== 'all' ||
      route.position !== 'all' ||
      route.category !== 'all' ||
      route.inStockOnly ||
      route.uvOnly,
  );

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isKnownRoute = validRoutes.has(page);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <Navbar
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdvisor={() => setIsAdvisorOpen(true)}
        searchQuery={route.searchQuery}
        products={products}
        activeCategory={page === '/products' ? route.category : undefined}
        activeSort={page === '/products' ? route.sortBy : undefined}
        onNavigate={(url) => navigate(url)}
      />

      <main className="shop-wrap flex-1 py-5 sm:py-8">
        {page === '/' && (
          <div className="space-y-10 sm:space-y-14 lg:space-y-16">
            <div className="space-y-5 sm:space-y-6">
              <HomeHero onOpenAdvisor={() => setIsAdvisorOpen(true)}>
                <CarSelectorBar
                  embedded
                  selectedBrandId={selectedBrandId}
                  selectedModelId={selectedModelId}
                  selectedPosition={selectedPosition}
                  onBrandChange={(id) => {
                    setSelectedBrandId(id);
                    setSelectedModelId('all');
                  }}
                  onModelChange={setSelectedModelId}
                  onPositionChange={setSelectedPosition}
                  onShowProducts={showSelectedProducts}
                />
              </HomeHero>
              <HomeTrustSignals />
            </div>
            <HomeCarCategories />
            <HomeFeatured
              products={products}
              ready={catalogReady}
              error={catalogError}
              retry={refreshCatalog}
              onView={setQuickViewProduct}
            />
            <HomeInstallationEssentials products={products} onAdd={handleAddAccessory} />
            <BeforeAfterSlider />
            <HomeBuyingGuide />
            <FaqSection />
          </div>
        )}

        {page === '/products' && (
          <section aria-labelledby="products-heading" className="pb-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 id="products-heading" className="text-xl font-extrabold sm:text-2xl">
                  {categoryObj.label}
                </h1>
                {catalogReady && !catalogError && (
                  <p className="mt-1 text-xs text-muted">
                    {toPersianDigits(filteredProducts.length)} محصول نمایش داده می‌شود
                  </p>
                )}
              </div>
              {hasActiveFilters && (
                <a
                  href="/products"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  پاک کردن همه فیلترها
                </a>
              )}
            </div>

            {/* Filter & Sort Controls */}
            <div className="shop-panel p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5">
                  <span className="text-muted text-xs">دسته:</span>
                  <select
                    aria-label="فیلتر دسته‌بندی"
                    value={route.category}
                    onChange={(e) => updateProductsQuery({ category: e.target.value as ProductCategory | 'all' })}
                    className="min-h-10 rounded-xl border border-line bg-surface-deep px-3 text-ink focus:border-brand outline-hidden cursor-pointer"
                  >
                    {productCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5">
                  <span className="text-muted text-xs">موقعیت:</span>
                  <select
                    aria-label="فیلتر موقعیت چراغ"
                    value={route.position}
                    onChange={(e) => updateProductsQuery({ position: e.target.value })}
                    className="min-h-10 rounded-xl border border-line bg-surface-deep px-3 text-ink focus:border-brand outline-hidden cursor-pointer"
                  >
                    <option value="all">همه موقعیت‌ها</option>
                    <option value="جلو">چراغ جلو</option>
                    <option value="عقب">چراغ عقب</option>
                    <option value="پروژکتور">پروژکتور</option>
                  </select>
                </label>

                <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface-deep px-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={route.inStockOnly}
                    onChange={(e) => updateProductsQuery({ inStock: e.target.checked })}
                  />
                  <span className="text-xs">فقط کالاهای موجود</span>
                </label>

                <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface-deep px-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={route.uvOnly}
                    onChange={(e) => updateProductsQuery({ uv: e.target.checked })}
                  />
                  <span className="text-xs">دارای پوشش UV</span>
                </label>
              </div>

              <label className="flex items-center gap-1.5">
                <span className="text-muted text-xs">مرتب‌سازی:</span>
                <select
                  aria-label="مرتب‌سازی محصولات"
                  value={route.sortBy}
                  onChange={(e) => updateProductsQuery({ sort: e.target.value as FilterState['sortBy'] })}
                  className="min-h-10 rounded-xl border border-line bg-surface-deep px-3 text-ink focus:border-brand outline-hidden cursor-pointer"
                >
                  {sortOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {(route.searchQuery || route.brand !== 'all' || route.model !== 'all' || route.position !== 'all') && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                {route.searchQuery ? (
                  <span>نتایج جست‌وجوی «{route.searchQuery}»</span>
                ) : (
                  <span>
                    {[
                      activeBrandNames,
                      activeModelName,
                      route.position === 'all' ? undefined : 'چراغ ' + route.position,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </p>
            )}

            {catalogError || !catalogReady ? (
              <p className="shop-panel p-5 text-sm" role="status">
                {catalogError || 'در حال دریافت محصولات…'}
                {catalogError && (
                  <button type="button" className="mr-2 text-brand underline cursor-pointer" onClick={refreshCatalog}>
                    تلاش دوباره
                  </button>
                )}
              </p>
            ) : filteredProducts.length === 0 ? (
              <div className="shop-panel p-6 text-sm text-muted">
                محصولی با این مشخصات پیدا نشد.
                <a href="/products" className="mr-2 text-brand underline">
                  مشاهده همه محصولات
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <Fragment key={product.id}>
                    <ProductCard product={product} onAddToCart={handleAddToCart} onQuickView={setQuickViewProduct} />
                  </Fragment>
                ))}
              </div>
            )}
          </section>
        )}

        {page === '/track' && <OrderTrackingPage />}
        {page === '/guide' && <InstallationGuideSection />}

        {!isKnownRoute && (
          <section aria-labelledby="not-found-title" className="shop-panel mx-auto max-w-lg p-8 text-center space-y-4">
            <p className="text-3xl font-black text-brand">۴۰۴</p>
            <h1 id="not-found-title" className="text-xl font-extrabold text-white">
              صفحه مورد نظر پیدا نشد
            </h1>
            <p className="text-sm text-muted leading-7">
              نشانی واردشده وجود ندارد یا تغییر کرده است. می‌توانید به صفحه اصلی فروشگاه برگردید یا کاتالوگ طلق‌ها را بررسی کنید.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <a href="/" className="shop-button shop-primary">
                صفحه اصلی فروشگاه
              </a>
              <a href="/products" className="shop-button shop-secondary">
                مشاهده محصولات
              </a>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Modals & Drawers */}
      {quickViewProduct && (
        <Fragment key={quickViewProduct.id}>
          <ProductQuickViewModal
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            onAddToCart={handleAddToCart}
          />
        </Fragment>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => {
          setIsCartOpen(false);
          setCartNotice('');
        }}
        items={cart}
        products={products}
        settings={settings}
        stockNotice={cartNotice}
        onClearNotice={() => setCartNotice('')}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onAddAccessory={handleAddAccessory}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {isCheckoutOpen && (
        <CheckoutModal
          settings={settings}
          onCatalogChanged={refreshCatalog}
          onClose={() => setIsCheckoutOpen(false)}
          items={cart}
          onOrderCompleted={handleOrderCompleted}
        />
      )}

      {isAdvisorOpen && (
        <LensAdvisorModal
          isOpen
          products={products}
          onClose={() => setIsAdvisorOpen(false)}
          onAddAccessory={handleAddAccessory}
          onSelectProduct={(product) => {
            setQuickViewProduct(product);
          }}
        />
      )}
    </div>
  );
}
