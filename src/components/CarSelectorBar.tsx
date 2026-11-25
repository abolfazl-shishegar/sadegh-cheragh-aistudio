import { useState } from 'react';
import { ArrowLeft, CarFront } from 'lucide-react';
import { CAR_BRANDS, CAR_MODELS } from '../data/carsAndProducts';
import { SearchableSelect } from './SearchableSelect';

const positions = [
  {value:'all', label:'همه موقعیت‌ها'},
  {value:'جلو', label:'چراغ جلو', keywords:'اصلی headlight'},
  {value:'عقب', label:'چراغ عقب', keywords:'خطر taillight'},
  {value:'پروژکتور', label:'مه‌شکن و پروژکتور', keywords:'مهشکن foglight'},
];
const brands = CAR_BRANDS.map(brand => ({ value:brand.id, label:brand.nameFa, keywords:brand.nameEn }));

type Props = {
  embedded?: boolean;
  selectedBrandId: string;
  selectedModelId: string;
  selectedPosition: string;
  onBrandChange: (id: string) => void;
  onModelChange: (id: string) => void;
  onPositionChange: (position: string) => void;
  onShowProducts: () => void;
};

export function CarSelectorBar({ embedded = false, selectedBrandId, selectedModelId, selectedPosition, onBrandChange, onModelChange, onPositionChange, onShowProducts }: Props) {
  const [attempted, setAttempted] = useState(false);
  const missingModel = selectedModelId === 'all';
  const models = CAR_MODELS.filter(model => model.id !== 'all' && model.brandId === selectedBrandId);
  return (
    <section id="vehicle-selector" aria-labelledby="vehicle-heading" className={'shop-anchor relative z-10 ' + (embedded ? '' : 'shop-panel p-5 sm:p-7')}>
      <div className={'flex items-start gap-3 ' + (embedded ? 'mb-3' : 'mb-5')}>
        <span className="mt-1 grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-deep text-brand"><CarFront size={21} aria-hidden /></span>
        <div>
          <h2 id="vehicle-heading" className={embedded ? 'text-base font-extrabold text-white sm:text-lg' : 'shop-heading'}>{embedded ? 'مشخصات خودرو و چراغ را انتخاب کن' : 'طلق مناسب ماشینت رو پیدا کن'}</h2>
          {!embedded && <p className="shop-description">برند، مدل و مشخصات چراغ را انتخاب کن تا محصولات مرتبط نمایش داده شوند.</p>}
        </div>
      </div>
      <form className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={event => {
        event.preventDefault();
        setAttempted(true);
        if (!missingModel) onShowProducts();
      }}>
        <SearchableSelect label="برند خودرو" placeholder="انتخاب برند" options={brands.filter(brand => brand.value !== 'all')} value={selectedBrandId} onChange={onBrandChange}/>
        <SearchableSelect label="مدل خودرو" placeholder={selectedBrandId === 'all' ? 'ابتدا برند را انتخاب کن' : 'انتخاب مدل'} disabled={selectedBrandId === 'all'} options={models.map(model => ({value:model.id, label:model.nameFa, keywords:[model.nameEn, model.generation, model.years].filter(Boolean).join(' ')}))} value={selectedModelId} onChange={onModelChange}/>
        <SearchableSelect label="موقعیت چراغ" options={positions} value={selectedPosition} onChange={onPositionChange}/>
        <button className="shop-button shop-primary min-h-12 sm:col-span-2 lg:col-span-1">نمایش طلق‌های سازگار <ArrowLeft size={16} aria-hidden /></button>
        {attempted && missingModel && <p role="status" className="text-sm text-ink sm:col-span-full">برای نمایش طلق‌های سازگار، برند و مدل خودرو را انتخاب کن.</p>}
      </form>
    </section>
  );
}
