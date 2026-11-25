import React, { useState } from 'react';
import { api, shippingLabels, statuses, type TrackedOrder } from '../shop';
import { formatCurrency, toPersianDigits } from '../utils/formatters';
import { formatPersianDateTime } from '../utils/shopLogic';

export function OrderTrackingPage() {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setOrder(null);
    setError('');
    try {
      setOrder(await api('track', Object.fromEntries(new FormData(event.currentTarget))));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'بررسی سفارش ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="tracking-title" className="shop-panel mx-auto max-w-xl space-y-5 p-5 sm:p-7">
      <header>
        <h1 id="tracking-title" className="shop-heading">
          پیگیری سفارش
        </h1>
        <p className="shop-description">کد سفارش و موبایلی را که هنگام خرید وارد کردید بنویسید.</p>
      </header>
      <form onSubmit={search} className="grid gap-3 text-sm">
        <label className="grid gap-1.5">
          <span>کد سفارش</span>
          <input
            name="code"
            dir="ltr"
            required
            maxLength={23}
            placeholder="SC-..."
            className="min-h-11 rounded-xl border border-line bg-surface-deep p-3 text-ink placeholder:text-muted/60 focus:border-brand outline-hidden"
          />
        </label>
        <label className="grid gap-1.5">
          <span>موبایل ثبت‌شده</span>
          <input
            name="phone"
            dir="ltr"
            required
            maxLength={11}
            inputMode="tel"
            autoComplete="tel"
            placeholder="09123456789"
            className="min-h-11 rounded-xl border border-line bg-surface-deep p-3 text-ink placeholder:text-muted/60 focus:border-brand outline-hidden"
          />
        </label>
        <button disabled={busy} className="shop-button shop-primary font-bold disabled:opacity-50 cursor-pointer">
          {busy ? 'در حال بررسی…' : 'نمایش وضعیت'}
        </button>
        {error && (
          <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/70 p-3 text-rose-200">
            {error}
          </p>
        )}
      </form>
      {order && (
        <div className="rounded-xl border border-line bg-surface-deep p-4 grid gap-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <strong className="text-brand">{statuses[order.status]}</strong>
            <b className="text-white">{formatCurrency(order.totalAmount)}</b>
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span>
              کد پیگیری: <bdi className="font-mono text-ink">{order.trackingCode}</bdi>
            </span>
            <span>تاریخ ثبت: {formatPersianDateTime(order.createdAt)}</span>
          </div>
          <div className="text-xs text-muted">
            روش ارسال: <span className="text-ink">{shippingLabels[order.shippingMethod] ?? order.shippingMethod}</span>
          </div>
          <div className="space-y-1.5 border-t border-line pt-3">
            {order.items.map((line, i) => (
              <div key={i} className="text-ink">
                {line.title}، {line.sideLabel} × {toPersianDigits(line.quantity)}
              </div>
            ))}
          </div>
          {order.carrierCode && (
            <div className="border-t border-line pt-3">
              کد مرسوله پستی/تیپاکس: <bdi className="font-mono font-bold text-brand">{order.carrierCode}</bdi>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
