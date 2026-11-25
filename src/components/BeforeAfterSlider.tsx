import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';

const photo = '/assets/comparison-muscle-car.png';
const gap = 28;

export function BeforeAfterSlider() {
  const [progress, setProgress] = useState(50);
  const [bounds, setBounds] = useState({ min: 20, max: 80 });
  const frame = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLSpanElement>(null);
  const before = useRef<HTMLSpanElement>(null);
  const position = bounds.min + (bounds.max - bounds.min) * progress / 100;

  useLayoutEffect(() => {
    const panel = frame.current!;
    const afterLabel = after.current!;
    const beforeLabel = before.current!;
    function measure() {
      const area = panel.getBoundingClientRect();
      if (!area.width) return;
      const min = (afterLabel.getBoundingClientRect().right - area.left + gap) / area.width * 100;
      const max = (beforeLabel.getBoundingClientRect().left - area.left - gap) / area.width * 100;
      setBounds(max - min >= 15 ? { min, max } : { min: 15, max: 85 });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(afterLabel);
    observer.observe(beforeLabel);
    measure();
    return () => observer.disconnect();
  }, []);

  function moveToPointer(event: PointerEvent<HTMLInputElement>) {
    if (bounds.min === bounds.max) return;
    const area = frame.current!.getBoundingClientRect();
    const pointer = (event.clientX - area.left) / area.width * 100;
    setProgress(Math.min(100, Math.max(0, (pointer - bounds.min) / (bounds.max - bounds.min) * 100)));
  }

  return (
    <section aria-labelledby="comparison-heading" className="shop-panel grid items-center gap-6 p-4 sm:p-7 lg:grid-cols-[0.8fr_1.2fr] lg:gap-8">
      <div>
        <h2 id="comparison-heading" className="shop-heading shop-anchor">تفاوت رو با چشم خودت ببین</h2>
        <p className="shop-description">مقایسه ظاهر چراغ قبل و بعد از تعویض طلق</p>
        <ul className="mt-4 space-y-2 text-sm leading-7 text-muted">
          <li className="flex gap-2"><Check className="mt-1.5 size-4 shrink-0 text-brand" aria-hidden />اگر آسیب فقط روی طلق باشد، تعویض طلق یکی از گزینه‌هاست.</li>
          <li className="flex gap-2"><Check className="mt-1.5 size-4 shrink-0 text-brand" aria-hidden />پیش از خرید، مدل، سال ساخت و سمت چراغ را بررسی کن.</li>
        </ul>
        <p id="comparison-hint" className="mt-4 flex items-center gap-2 text-sm text-ink"><MoveHorizontal className="size-5 text-brand" aria-hidden />دستگیره را بکش یا از کلیدهای جهت‌دار استفاده کن.</p>
      </div>
      <div className="min-w-0">
      <div ref={frame} dir="ltr" className="relative isolate aspect-[2/1] select-none overflow-hidden rounded-2xl border border-white/15 bg-slate-950 focus-within:ring-2 focus-within:ring-cyan-300">
        <img src={photo} alt="نمای روبه‌روی خودروی اسپرت مشکی با چراغ‌های روشن" draggable={false} loading="lazy" decoding="async" className="absolute inset-0 size-full"/>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{clipPath: `inset(0 0 0 ${position}%)`}}>
          <img src={photo} alt="" draggable={false} loading="lazy" decoding="async" className="size-full blur-[1px] brightness-75 sepia-[.8] saturate-125"/>
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-[3px] -translate-x-1/2 bg-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,.8)]" style={{left: `${position}%`}} aria-hidden="true">
          <span className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[#06B6D4] text-white shadow-[0_0_20px_rgba(6,182,212,.55)] motion-safe:animate-pulse">
            <span className="flex items-center"><ChevronLeft className="size-4"/><ChevronRight className="-ms-1 size-4"/></span>
          </span>
        </div>
        <span ref={after} dir="rtl" className="pointer-events-none absolute top-3 left-3 whitespace-nowrap rounded-lg border border-emerald-300/30 bg-emerald-950/90 px-3 py-2 text-sm font-bold text-emerald-200 sm:text-base">بعد از تعویض<span className="hidden sm:inline">: شفاف و فابریک</span></span>
        <span ref={before} dir="rtl" className="pointer-events-none absolute top-3 right-3 whitespace-nowrap rounded-lg border border-orange-300/30 bg-orange-950/90 px-3 py-2 text-sm font-bold text-orange-200 sm:text-base">قبل از تعویض<span className="hidden sm:inline">: کدر و زرد</span></span>
        <input
          id="before-after-range-slider"
          dir="ltr"
          type="range"
          min="0"
          max="100"
          value={Math.round(progress)}
          onChange={event => setProgress(event.target.valueAsNumber)}
          onPointerDown={event => {
            if (event.button !== 0 || !event.isPrimary) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            event.currentTarget.setPointerCapture(event.pointerId);
            moveToPointer(event);
          }}
          onPointerMove={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) moveToPointer(event);
          }}
          aria-label="مقایسهٔ قبل و بعد از تعویض طلق"
          aria-describedby="comparison-hint"
          className="absolute inset-0 size-full touch-pan-y cursor-ew-resize opacity-0"
        />
      </div>
      <p className="mt-2 text-xs leading-6 text-muted">تصویر نمایشی · تفاوت طلق کدر و شفاف با فیلتر شبیه‌سازی شده است.</p>
      </div>
    </section>
  );
}
