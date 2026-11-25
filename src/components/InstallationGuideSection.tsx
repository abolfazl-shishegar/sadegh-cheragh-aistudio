import React from 'react';
import { Wrench, Flame, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

export const InstallationGuideSection: React.FC = () => {
  const steps = [
    {
      number: '۱',
      title: 'جداسازی چراغ از روی خودرو',
      desc: 'کاپوت را بالا زده و پیچ‌های اتصال کاسه چراغ به سینی جلو را با آچار بکس یا آلن باز کنید و سوکت برق لامپ‌ها را با احتیاط جدا نمایید.',
      icon: Wrench,
    },
    {
      number: '۲',
      title: 'حرارت‌دهی و نرم کردن چسب فابریک',
      desc: 'با سشوار صنعتی یا قرار دادن چراغ به مدت ۵ دقیقه در حرارت ملایم (حدود ۹۰ درجه)، چسب دور شیار طلق را نرم کنید و با اهرم پلاستیکی لبه‌ها را آزاد نمایید.',
      icon: Flame,
    },
    {
      number: '۳',
      title: 'پاکسازی شیار و چسب‌گذاری نو با بوتیل',
      desc: 'چسب‌های قدیمی خشک‌شده را از شیار خارج کنید. یک لایه نوار چسب بوتیل مخصوص چراغ را به صورت یکدست درون شیار دور تا دور قرار دهید.',
      icon: Sparkles,
    },
    {
      number: '۴',
      title: 'جا انداختن طلق جدید و قفل کردن خارها',
      desc: 'طلق نو را روی کاسه قرار داده، با حرارت ملایم چسب را تحت فشار دست فشرده کنید تا خارهای فابریک کاملاً چفت شوند.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section
      aria-labelledby="guide-title"
      className="shop-panel p-6 sm:p-10 relative overflow-hidden"
    >
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-bold mb-3 border border-brand/30">
            <Wrench className="w-3.5 h-3.5" aria-hidden />
            راهنمای گام‌به‌گام و مصور
          </div>
          <h1 id="guide-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            آموزش تعویض و آب‌بندی طلق چراغ در ۴ مرحله
          </h1>
          <p className="text-muted text-sm max-w-2xl mx-auto leading-relaxed">
            با رعایت این مراحل ساده، بدون نیاز به پرداخت هزینه‌های سنگین تعویض چراغ، طلق نو را با کیفیت کارخانه‌ای روی خودرو نصب کنید.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="bg-surface-deep rounded-2xl p-5 border border-line flex flex-col justify-between hover:border-brand/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-xl bg-brand/15 text-brand border border-brand/30 flex items-center justify-center font-black text-sm">
                      {step.number}
                    </span>
                    <Icon className="w-5 h-5 text-brand" aria-hidden />
                  </div>
                  <h2 className="font-extrabold text-white text-sm mb-2 leading-snug">{step.title}</h2>
                  <p className="text-muted text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pro Tip Callout */}
        <div className="bg-surface-deep border border-brand/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
          <div className="w-10 h-10 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0 border border-brand/30">
            <AlertTriangle className="w-5 h-5 text-brand" aria-hidden />
          </div>
          <div className="flex-1 text-muted leading-relaxed">
            <strong className="text-brand block text-sm mb-0.5">نکته طلایی متخصصین صادق چراغ:</strong>
            هرگز از چسب‌های سیلیکون آکواریوم معمولی اسیدی استفاده نکنید؛ زیرا اسید استیک به مرور زمان کاسه کرومی داخل چراغ را سیاه کرده و گاز تولید می‌کند. حتماً از{' '}
            <strong className="text-white">چسب بوتیل استاندارد چراغ</strong> استفاده نمایید.
          </div>
        </div>
      </div>
    </section>
  );
};
