import { Flashlight, Mail, MapPin, Phone } from 'lucide-react';

const columns = [
  { title: 'دسترسی سریع', links: [['صفحه اصلی', '/'], ['همه محصولات', '/products'], ['راهنمای خرید', '/#buying-guide']] },
  {
    title: 'دسته‌بندی‌ها',
    links: [
      ['طلق چراغ جلو', '/products?category=headlight'],
      ['طلق چراغ عقب', '/products?category=taillight'],
      ['برندها و مدل‌ها', '/#vehicle-selector'],
    ],
  },
  {
    title: 'خدمات مشتریان',
    links: [
      ['پیگیری سفارش', '/track'],
      ['راهنمای نصب', '/guide'],
      ['سؤالات متداول و ارسال', '/#faq'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-4 border-t border-line bg-[#0a1220] text-sm text-muted sm:mt-8">
      <div className="shop-wrap grid grid-cols-1 gap-x-5 gap-y-8 py-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1.4fr] md:py-10">
        <div>
          <a href="/" className="inline-flex min-h-11 items-center gap-2 text-lg font-extrabold text-ink">
            <Flashlight className="size-5 -rotate-45 text-brand" aria-hidden />
            صادق چراغ
          </a>
          <p className="max-w-xs leading-7 text-slate-300">
            فروشگاه تخصصی طلق چراغ جلو و عقب خودروهای داخلی و خارجی با ارسال بسته‌بندی ایمن به سراسر کشور
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-2 font-bold text-ink">{column.title}</h2>
            <ul>
              {column.links.map(([label, url]) => (
                <li key={url}>
                  <a href={url} className="inline-flex min-h-11 items-center transition-colors hover:text-brand">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <section
          id="footer-support"
          aria-labelledby="footer-support-heading"
          className="shop-anchor rounded-2xl border border-line bg-surface/70 p-4"
        >
          <h2 id="footer-support-heading" className="mb-3 font-bold text-ink">
            پشتیبانی، استعلام موجودی و خرید عمده
          </h2>
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <Phone size={16} className="shrink-0 text-brand" aria-hidden />
            هماهنگی تلفنی و همکاری همکاران پس از ثبت سفارش
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-300">
            <Mail size={15} className="shrink-0 text-brand" aria-hidden />
            <span dir="ltr">support@sadeghcheragh.ir</span>
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-slate-300">
            <MapPin size={15} className="shrink-0 text-brand" aria-hidden />
            تهران · ارسال به سراسر کشور (تیپاکس، پیشتاز و پیک تهران)
          </p>
          <p className="mt-2 text-xs leading-6 text-slate-400">ساعات پاسخگویی: شنبه تا پنج‌شنبه · ۹ صبح تا ۸ شب</p>
        </section>
      </div>
      <div className="border-t border-line">
        <div className="shop-wrap flex flex-wrap items-center justify-between gap-3 py-2 text-xs">
          <span>© فروشگاه صادق چراغ</span>
          <a href="/admin" className="inline-flex min-h-11 items-center hover:text-brand">
            پنل مدیریت
          </a>
        </div>
      </div>
    </footer>
  );
}
