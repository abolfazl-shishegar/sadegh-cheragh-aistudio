import React, { useEffect, useState } from 'react';
import {
  api,
  ApiError,
  shippingLabels,
  statuses,
  type AdminAuthStatus,
  type ManagedProduct,
  type ShopSettings,
} from '../shop';
import type { Order } from '../types';
import { CAR_MODELS } from '../data/carsAndProducts';
import { formatCurrency, toPersianDigits } from '../utils/formatters';
import { formatPersianDateTime } from '../utils/shopLogic';
import { matchesSearch } from '../utils/search';

type Dashboard = { products: ManagedProduct[]; orders: Order[]; settings: ShopSettings };
const steps: Record<Order['status'], Order['status'][]> = {
  processing: ['packing', 'cancelled'],
  packing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
const categories = {
  headlight: 'چراغ جلو',
  taillight: 'چراغ عقب',
  foglight: 'پروژکتور',
  accessory: 'لوازم نصب',
  bundle: 'بسته',
};
const box = 'shop-panel p-4 sm:p-5';
const field =
  'min-h-11 bg-surface-deep border border-line rounded-xl px-3 py-2 min-w-0 w-full text-ink placeholder:text-muted/60 focus:border-brand outline-hidden';
const button = 'shop-button shop-primary disabled:opacity-50 cursor-pointer';
const secondary = 'shop-button shop-secondary cursor-pointer';
const csv = (value: unknown) => {
  const s = String(value ?? '');
  return '"' + (/^[\s]*[=+@-]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"';
};

export function Admin() {
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [token, setToken] = useState<string>('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [data, setData] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState('orders');
  const [product, setProduct] = useState<ManagedProduct | 'new' | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadAuthStatus() {
    try {
      const status = await api<AdminAuthStatus>('admin/auth/status');
      setAuthStatus(status);
      setAuthError('');
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'بررسی وضعیت ورود ناموفق بود.');
    }
  }

  useEffect(() => {
    void loadAuthStatus();
  }, []);

  async function load(activeToken: string = token) {
    if (!activeToken) return;
    try {
      setData(await api<Dashboard>('admin', undefined, activeToken));
      setError('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToken('');
        setData(null);
        setAuthError(e.message);
        void loadAuthStatus();
        return;
      }
      setError(e instanceof Error ? e.message : 'دریافت اطلاعات مدیریت ناموفق بود.');
    }
  }

  useEffect(() => {
    if (token) {
      void load(token);
    }
  }, [token]);

  async function handleSetupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');
    if (password.length < 8) {
      setAuthError('رمز عبور باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await api<{ token: string }>('admin/auth/setup', { password });
      setAuthStatus({ configuredViaEnv: false, needsSetup: false });
      setToken(res.token);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'ثبت رمز مدیریت ناموفق بود.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (!password) {
      setAuthError('لطفاً رمز عبور را وارد کنید.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await api<{ token: string }>('admin/auth/login', { password });
      setToken(res.token);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'ورود ناموفق بود.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    const activeToken = token;
    setToken('');
    setData(null);
    setProduct(null);
    setOrder(null);
    setNotice('');
    setError('');
    if (activeToken) {
      await api('admin/auth/logout', {}, activeToken).catch(() => null);
    }
    void loadAuthStatus();
  }

  async function save(
    event: React.FormEvent<HTMLFormElement>,
    path: string,
    prepare: (form: Record<string, FormDataEntryValue>) => unknown,
  ) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api('admin/' + path, prepare(Object.fromEntries(new FormData(event.currentTarget))), token);
      setNotice('تغییرات ذخیره شد.');
      setProduct(null);
      setConfirmDeleteId(null);
      setOrder(null);
      await load(token);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToken('');
        setData(null);
        setAuthError(e.message);
        void loadAuthStatus();
        return;
      }
      setError(e instanceof Error ? e.message : 'ذخیره تغییرات ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProduct(target: ManagedProduct) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api('admin/products/delete', { id: target.id, version: target.version }, token);
      setNotice(`محصول «${target.titleFa}» حذف شد.`);
      setProduct(null);
      setConfirmDeleteId(null);
      await load(token);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToken('');
        setData(null);
        setAuthError(e.message);
        void loadAuthStatus();
        return;
      }
      setError(e instanceof Error ? e.message : 'حذف محصول ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  function exportOrders() {
    const rows = [
      ['کد سفارش', 'تاریخ', 'مشتری', 'روش ارسال', 'مبلغ (تومان)', 'وضعیت', 'کد مرسوله'],
      ...orders.map((o) => [
        o.trackingCode,
        formatPersianDateTime(o.createdAt),
        o.customerName,
        shippingLabels[o.shippingMethod] ?? o.shippingMethod,
        o.totalAmount,
        statuses[o.status],
        o.carrierCode,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + rows.map((row) => row.map(csv).join(',')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sadegh-cheragh-orders.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <main dir="rtl" className="max-w-md mx-auto p-4 sm:p-8 min-h-screen flex flex-col justify-center gap-5 text-sm">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-brand font-semibold mb-1">صادق چراغ</p>
              <h1 className="font-black text-2xl">
                {authStatus?.needsSetup ? 'راه‌اندازی اولیه پنل مدیریت' : 'ورود به پنل مدیریت'}
              </h1>
            </div>
            <a className={secondary} href="/">
              فروشگاه
            </a>
          </header>

          {!authStatus && !authError ? (
            <p className={box}>در حال بررسی وضعیت احراز هویت…</p>
          ) : authStatus?.needsSetup ? (
            <form onSubmit={handleSetupSubmit} className={box + ' grid gap-4'}>
              <p className="text-muted leading-6">
                برای نخستین بار، یک رمز عبور قوی (حداقل ۸ کاراکتر) جهت محافظت از پنل مدیریت تعیین کنید. پس از ثبت،
                این فرم قفل می‌شود.
              </p>
              {authError && (
                <p role="alert" className="bg-rose-950/70 border border-rose-500/40 rounded-xl p-3 text-rose-200">
                  {authError}
                </p>
              )}
              <label className="grid gap-1.5">
                <span>رمز عبور مدیریت</span>
                <input
                  type="password"
                  name="password"
                  dir="ltr"
                  minLength={8}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                  className={field}
                />
              </label>
              <label className="grid gap-1.5">
                <span>تکرار رمز عبور</span>
                <input
                  type="password"
                  name="confirmPassword"
                  dir="ltr"
                  minLength={8}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                  className={field}
                />
              </label>
              <button type="submit" disabled={authBusy} className={button + ' font-bold py-2.5'}>
                {authBusy ? 'در حال ثبت رمز…' : 'ثبت رمز و ورود به پنل'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className={box + ' grid gap-4'}>
              <p className="text-muted leading-6">
                برای مشاهده سفارش‌ها و مدیریت محصولات، رمز عبور پنل مدیریت را وارد کنید.
              </p>
              {authError && (
                <p role="alert" className="bg-rose-950/70 border border-rose-500/40 rounded-xl p-3 text-rose-200">
                  {authError}
                </p>
              )}
              <label className="grid gap-1.5">
                <span>رمز عبور مدیریت</span>
                <input
                  type="password"
                  name="password"
                  dir="ltr"
                  required
                  autoComplete="current-password"
                  className={field}
                />
              </label>
              <button type="submit" disabled={authBusy} className={button + ' font-bold py-2.5'}>
                {authBusy ? 'در حال بررسی…' : 'ورود به پنل مدیریت'}
              </button>
            </form>
          )}
        </main>
      </div>
    );
  }

  const orders = data?.orders.filter((o) => !filter || o.status === filter) ?? [];
  const p = product && product !== 'new' ? product : null;
  const filteredProducts =
    data?.products.filter((item) =>
      matchesSearch([item.titleFa, item.titleEn, item.brandNameFa, item.modelNameFa, item.id].join(' '), query),
    ) ?? [];

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main dir="rtl" className="max-w-6xl mx-auto p-4 sm:p-8 grid gap-5 text-sm">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-brand font-semibold mb-1">صادق چراغ</p>
            <h1 className="font-black text-2xl">پنل مدیریت فروشگاه</h1>
          </div>
          <div className="flex items-center gap-2">
            <a className={secondary} href="/">
              بازگشت به فروشگاه
            </a>
            <button type="button" className={secondary + ' text-rose-300'} onClick={() => void handleLogout()}>
              خروج
            </button>
          </div>
        </header>
        {error && (
          <p role="alert" className="bg-rose-950/70 border border-rose-500/40 rounded-xl p-3 text-rose-200">
            {error}{' '}
            <button
              type="button"
              className="underline mr-2 cursor-pointer"
              onClick={() => {
                setError('');
                setProduct(null);
                setOrder(null);
                void load();
              }}
            >
              تازه‌سازی اطلاعات
            </button>
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300">
            {notice}
          </p>
        )}
        {!data ? (
          !error && <p>در حال بارگذاری…</p>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['سفارش جدید', toPersianDigits(data.orders.filter((o) => o.status === 'processing').length)],
                ['کالای فعال', toPersianDigits(data.products.filter((item) => item.active).length)],
                ['موجودی کم', toPersianDigits(data.products.filter((item) => item.active && item.stockCount <= 3).length)],
                [
                  'مبلغ سفارش‌های تحویل‌شده',
                  formatCurrency(
                    data.orders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + o.totalAmount, 0),
                  ),
                ],
              ].map(([label, value]) => (
                <article key={label} className={box}>
                  <p className="text-muted">{label}</p>
                  <b className="text-lg mt-2 block text-white">{value}</b>
                </article>
              ))}
            </section>
            <nav className="flex flex-wrap gap-2">
              {[
                ['orders', 'سفارش‌ها'],
                ['products', 'محصولات و موجودی'],
                ['settings', 'تنظیمات'],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setProduct(null);
                    setConfirmDeleteId(null);
                    setOrder(null);
                  }}
                  className={id === tab ? button : secondary}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === 'orders' && (
              <section className={box + ' grid gap-4'}>
                <div className="flex flex-wrap gap-3 justify-between items-center">
                  <label className="flex items-center gap-2">
                    <span>وضعیت</span>
                    <select className={secondary} value={filter} onChange={(e) => setFilter(e.target.value)}>
                      <option value="">همه</option>
                      {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className={secondary} onClick={exportOrders}>
                    خروجی CSV
                  </button>
                </div>
                {order && (() => {
                  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
                  return (
                    <form
                      key={order.id}
                      className="rounded-xl border border-line bg-surface-deep/70 p-4 grid gap-3"
                      onSubmit={(e) => save(e, 'orders', (d) => ({ ...d, id: order.id, previousStatus: order.status }))}
                    >
                      <strong>
                        {order.customerName} · <bdi>{order.phone}</bdi>
                      </strong>
                      <p className="text-muted">
                        {order.province}، {order.city}، {order.address}
                        {order.postalCode ? ` · کد پستی: ${order.postalCode}` : ''}
                      </p>
                      <p className="text-brand font-semibold">
                        روش ارسال: {shippingLabels[order.shippingMethod] ?? order.shippingMethod}
                      </p>
                      <div className="space-y-1 text-slate-200">
                        {order.items.map((item) => (
                          <p key={item.id}>
                            {item.product.titleFa}، {item.sideLabel} × {toPersianDigits(item.quantity)}
                          </p>
                        ))}
                      </div>
                      <p>
                        هزینهٔ ارسال {formatCurrency(order.shippingCost)} · مبلغ کل{' '}
                        <strong className="text-white">{formatCurrency(order.totalAmount)}</strong>
                      </p>
                      {isTerminal ? (
                        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
                          این سفارش در وضعیت نهایی ({statuses[order.status]}) قرار دارد و امکان تغییر وضعیت آن وجود ندارد.
                        </p>
                      ) : (
                        <>
                          <label className="grid gap-1">
                            <span>وضعیت</span>
                            <select className={field} name="status" defaultValue={order.status}>
                              {[order.status, ...steps[order.status]].map((s) => (
                                <option key={s} value={s}>
                                  {statuses[s]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-1">
                            <span>کد مرسوله</span>
                            <input
                              className={field}
                              name="carrierCode"
                              defaultValue={order.carrierCode}
                              maxLength={100}
                              dir="ltr"
                            />
                          </label>
                        </>
                      )}
                      <div className="flex gap-2">
                        {!isTerminal && (
                          <button type="submit" disabled={busy} className={button}>
                            ذخیره وضعیت
                          </button>
                        )}
                        <button type="button" className={secondary} onClick={() => setOrder(null)}>
                          بستن
                        </button>
                      </div>
                    </form>
                  );
                })()}
                {!orders.length ? (
                  <p className="text-muted">سفارشی برای نمایش وجود ندارد.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right whitespace-nowrap">
                      <thead>
                        <tr className="text-muted">
                          <th className="pb-2">شماره سفارش</th>
                          <th className="pb-2">مشتری</th>
                          <th className="pb-2">روش ارسال</th>
                          <th className="pb-2">تاریخ</th>
                          <th className="pb-2">وضعیت</th>
                          <th className="pb-2">مبلغ</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr className="border-t border-line" key={o.id}>
                            <td className="py-3 px-1">
                              <bdi>{o.trackingCode}</bdi>
                            </td>
                            <td>{o.customerName}</td>
                            <td className="text-muted">{shippingLabels[o.shippingMethod] ?? o.shippingMethod}</td>
                            <td>{formatPersianDateTime(o.createdAt)}</td>
                            <td>{statuses[o.status]}</td>
                            <td>{formatCurrency(o.totalAmount)}</td>
                            <td>
                              <button type="button" className={secondary} onClick={() => setOrder(o)}>
                                جزئیات
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
            {tab === 'products' && (
              <section className={box + ' grid gap-4'}>
                <div className="flex gap-2">
                  <input
                    className={field}
                    placeholder="جست‌وجوی نام یا مدل (با پشتیبانی حروف فارسی/عربی)"
                    aria-label="جست‌وجوی محصول"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className={button + ' shrink-0'}
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setProduct('new');
                    }}
                  >
                    افزودن محصول
                  </button>
                </div>
                {product && (
                  <form
                    key={p?.id ?? 'new'}
                    className="grid sm:grid-cols-2 gap-3 border border-line bg-surface-deep/60 rounded-xl p-4"
                    onSubmit={(e) =>
                      save(e, 'products', (d) => ({
                        ...d,
                        id: p?.id,
                        version: p?.version,
                        priceSingle: Number(d.priceSingle),
                        pricePair: Number(d.pricePair),
                        stockCount: Number(d.stockCount),
                        active: d.active === 'on',
                        gallery: String(d.gallery ?? '')
                          .split(/[\n,]/)
                          .map((u) => u.trim())
                          .filter(Boolean),
                        specs: {
                          material: String(d.specMaterial ?? ''),
                          originCountry: String(d.specOriginCountry ?? ''),
                          heatResistance: String(d.specHeatResistance ?? ''),
                          warrantyMonths: Number(d.specWarrantyMonths || 0),
                          installationDifficulty: String(d.specDifficulty ?? 'تخصصی'),
                          uvProtection: d.specUvProtection === 'on',
                          oemMatch: d.specOemMatch === 'on',
                          fitmentYears: String(d.specFitmentYears ?? ''),
                        },
                      }))
                    }
                  >
                    <label className="grid gap-1">
                      <span>نام کالا</span>
                      <input className={field} name="titleFa" maxLength={120} required defaultValue={p?.titleFa} />
                    </label>
                    <label className="grid gap-1">
                      <span>مدل خودرو</span>
                      <select className={field} name="modelId" defaultValue={p?.modelId ?? 'all'}>
                        <option value="all">همهٔ خودروها</option>
                        {CAR_MODELS.filter((m) => m.id !== 'all').map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nameFa}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span>دسته</span>
                      <select className={field} name="category" defaultValue={p?.category ?? 'headlight'}>
                        {Object.entries(categories).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span>موجودی</span>
                      <input
                        className={field}
                        type="number"
                        name="stockCount"
                        min={0}
                        max={1000000}
                        required
                        defaultValue={p?.stockCount ?? 0}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span>قیمت تک (تومان)</span>
                      <input
                        className={field}
                        type="number"
                        name="priceSingle"
                        min={1}
                        max={1000000000}
                        required
                        defaultValue={p?.priceSingle}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span>قیمت جفت (تومان)</span>
                      <input
                        className={field}
                        type="number"
                        name="pricePair"
                        min={1}
                        max={1000000000}
                        required
                        defaultValue={p?.pricePair}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span>آدرس تصویر اصلی (HTTPS یا محلی)</span>
                      <input className={field} dir="ltr" name="image" maxLength={800} defaultValue={p?.image} />
                    </label>
                    <label className="grid gap-1">
                      <span>آدرس‌های گالری (با کاما یا خط جدید جدا شود)</span>
                      <input
                        className={field}
                        dir="ltr"
                        name="gallery"
                        defaultValue={p?.gallery?.join(', ') ?? ''}
                      />
                    </label>
                    <label className="grid gap-1 sm:col-span-2">
                      <span>توضیحات محصول</span>
                      <textarea className={field} rows={2} name="description" maxLength={1500} defaultValue={p?.description} />
                    </label>
                    <label className="grid gap-1 sm:col-span-2">
                      <span>نکات سازگاری</span>
                      <input
                        className={field}
                        name="compatibilityNotes"
                        maxLength={500}
                        defaultValue={p?.compatibilityNotes ?? ''}
                      />
                    </label>

                    {/* Specs editor */}
                    <label className="grid gap-1">
                      <span>جنس بدنه / طلق</span>
                      <input
                        className={field}
                        name="specMaterial"
                        maxLength={120}
                        defaultValue={p?.specs?.material ?? 'پلی‌کربنات گرید A+ یووی‌دار (Polycarbonate UV400)'}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span>کشور سازنده</span>
                      <input
                        className={field}
                        name="specOriginCountry"
                        maxLength={80}
                        defaultValue={p?.specs?.originCountry ?? 'تایوان'}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span>مقاومت حرارتی</span>
                      <input
                        className={field}
                        name="specHeatResistance"
                        maxLength={120}
                        defaultValue={p?.specs?.heatResistance ?? 'تا ۱۳۰ درجه سانتی‌گراد'}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span>ضمانت (ماه)</span>
                      <input
                        className={field}
                        type="number"
                        min={0}
                        max={120}
                        name="specWarrantyMonths"
                        defaultValue={p?.specs?.warrantyMonths ?? 24}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span>سختی نصب</span>
                      <select
                        className={field}
                        name="specDifficulty"
                        defaultValue={p?.specs?.installationDifficulty ?? 'متوسط'}
                      >
                        <option value="ساده">ساده</option>
                        <option value="متوسط">متوسط</option>
                        <option value="تخصصی">تخصصی</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span>سال ساخت سازگار</span>
                      <input
                        className={field}
                        name="specFitmentYears"
                        maxLength={80}
                        defaultValue={p?.specs?.fitmentYears ?? p?.years ?? ''}
                      />
                    </label>

                    <div className="flex flex-wrap gap-4 sm:col-span-2 py-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="active" type="checkbox" defaultChecked={p?.active ?? true} />
                        <span>نمایش در فروشگاه</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="specUvProtection" type="checkbox" defaultChecked={p?.specs?.uvProtection ?? true} />
                        <span>لایه محافظ UV</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="specOemMatch" type="checkbox" defaultChecked={p?.specs?.oemMatch ?? true} />
                        <span>تطابق قالب فابریک</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 pt-2 border-t border-line">
                      <div className="flex gap-2">
                        <button type="submit" disabled={busy} className={button}>
                          ذخیره محصول
                        </button>
                        <button
                          type="button"
                          className={secondary}
                          onClick={() => {
                            setProduct(null);
                            setConfirmDeleteId(null);
                          }}
                        >
                          بستن
                        </button>
                      </div>
                      {p && (
                        <div className="flex items-center gap-2">
                          {confirmDeleteId === p.id ? (
                            <>
                              <span className="text-xs text-rose-300">حذف دائمی؟</span>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleDeleteProduct(p)}
                                className="shop-button bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/30 cursor-pointer"
                              >
                                بله، حذف شود
                              </button>
                              <button
                                type="button"
                                className={secondary}
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                انصراف
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="shop-button border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                            >
                              حذف محصول
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </form>
                )}
                <div className="divide-y divide-line">
                  {filteredProducts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <b>{item.titleFa}</b>
                        <p className="text-muted mt-1">
                          {item.active ? 'فعال' : 'غیرفعال'} · موجودی {toPersianDigits(item.stockCount)} ·{' '}
                          {formatCurrency(item.priceSingle)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={secondary}
                        onClick={() => {
                          setConfirmDeleteId(null);
                          setProduct(item);
                        }}
                      >
                        ویرایش
                      </button>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="py-4 text-muted">محصولی مطابق جست‌وجوی شما پیدا نشد.</p>
                  )}
                </div>
              </section>
            )}
            {tab === 'settings' && (
              <form
                className={box + ' grid gap-3 max-w-xl'}
                onSubmit={(e) =>
                  save(e, 'settings', (d) => ({
                    standard: Number(d.standard),
                    express: Number(d.express),
                    free: Number(d.free),
                    open: d.open === 'on',
                  }))
                }
              >
                <label className="grid gap-1">
                  <span>هزینهٔ ارسال عادی (تومان)</span>
                  <input
                    className={field}
                    type="number"
                    name="standard"
                    min={0}
                    max={1000000000}
                    required
                    defaultValue={data.settings.standard}
                  />
                </label>
                <label className="grid gap-1">
                  <span>هزینهٔ ارسال فوری تهران (تومان)</span>
                  <input
                    className={field}
                    type="number"
                    name="express"
                    min={0}
                    max={1000000000}
                    required
                    defaultValue={data.settings.express}
                  />
                </label>
                <label className="grid gap-1">
                  <span>حداقل سفارش برای ارسال رایگان؛ صفر یعنی غیرفعال</span>
                  <input
                    className={field}
                    type="number"
                    name="free"
                    min={0}
                    max={1000000000}
                    required
                    defaultValue={data.settings.free}
                  />
                </label>
                <label className="flex gap-2 items-center cursor-pointer">
                  <input name="open" type="checkbox" defaultChecked={!!data.settings.open} />
                  <span>ثبت سفارش فعال باشد</span>
                </label>
                <button type="submit" disabled={busy} className={button}>
                  ذخیره تنظیمات
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
