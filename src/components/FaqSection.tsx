import { ChevronDown } from 'lucide-react';
import { FAQS } from '../data/carsAndProducts';

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="shop-anchor grid gap-5 lg:grid-cols-[0.65fr_1.35fr] lg:gap-8">
      <div>
        <h2 id="faq-heading" className="shop-heading">سؤالات متداول</h2>
        <p className="shop-description">پاسخ‌های کوتاه درباره انتخاب طلق و ارسال سفارش.</p>
      </div>
      <div className="shop-panel overflow-hidden">
        {FAQS.map(faq => (
          <details name="shop-faq" key={faq.question} className="group border-b border-line transition-colors open:bg-raised last:border-b-0">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-sm leading-6 font-bold hover:text-brand focus-visible:-outline-offset-2 sm:px-5 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <ChevronDown aria-hidden className="size-4 shrink-0 text-muted group-open:rotate-180 motion-safe:transition-transform"/>
            </summary>
            <p className="shop-faq-answer px-4 pb-5 text-sm leading-7 text-muted sm:px-5">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
