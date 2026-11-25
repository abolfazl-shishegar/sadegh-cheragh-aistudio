import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { matchesSearch } from '../utils/search';

type Option = { value: string; label: string; keywords?: string };

type Props = {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function SearchableSelect({ label, options, value, onChange, disabled, placeholder }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<number | null>(null);
  const selected = options.find(option => option.value === value);
  const visible = options.filter(option => matchesSearch(`${option.label} ${option.keywords ?? ''}`, query));
  const optionId = (index: number) => `${id}-option-${index}`;

  function close() {
    setOpen(false);
    setQuery('');
    setActive(null);
  }

  function choose(option: Option) {
    onChange(option.value);
    close();
  }

  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-200">{label}</label>
      <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && active !== null && visible[active] ? optionId(active) : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={open ? 'برای جست‌وجو تایپ کنید' : selected?.label ?? placeholder ?? 'انتخاب کنید'}
        value={open ? query : selected?.label ?? ''}
        className="min-h-12 w-full rounded-xl border border-line bg-surface-deep py-3 ps-4 pe-10 text-sm text-ink placeholder:text-muted focus:border-brand disabled:opacity-65"
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={close}
        onChange={event => {
          setOpen(true);
          setQuery(event.target.value);
          setActive(null);
        }}
        onKeyDown={event => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            close();
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            if (!visible.length) return;
            const step = event.key === 'ArrowDown' ? 1 : -1;
            const index = active === null ? (step > 0 ? 0 : visible.length - 1) : (active + step + visible.length) % visible.length;
            setActive(index);
            requestAnimationFrame(() => document.getElementById(optionId(index))?.scrollIntoView({ block: 'nearest' }));
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault();
            const option = active === null ? (query.trim() ? visible[0] : undefined) : visible[active];
            if (option) choose(option);
            else if (!query.trim()) close();
          }
        }}
      />
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted" />
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
          <ul id={`${id}-options`} role="listbox" aria-label={label}>
            {visible.map((option, index) => (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={value === option.value}
                className={`flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2 text-sm ${active === index || value === option.value ? 'bg-raised text-brand' : 'text-ink hover:bg-raised'}`}
                onMouseDown={event => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option.label}
              </li>
            ))}
          </ul>
          {visible.length === 0 && <p role="status" className="px-3 py-2 text-sm text-slate-400">گزینه‌ای پیدا نشد.</p>}
        </div>
      )}
    </div>
  );
}
