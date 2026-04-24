import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface ModelOption {
  id: string;
  display_name: string;
}

interface ModelSelectProps {
  value: string;
  onChange: (v: string) => void;
  models: ModelOption[];
  defaultLabel?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
}

export function ModelSelect({ value, onChange, models, defaultLabel, placeholder = 'Select model…', size = 'md' }: ModelSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedModel = models.find(m => m.id === value);
  const isDefault = !value;

  const triggerLabel = isDefault && defaultLabel
    ? defaultLabel
    : selectedModel?.display_name ?? (value || placeholder);

  const py = size === 'sm' ? 'py-1.5' : 'py-2';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`
          w-full flex items-center justify-between gap-2
          px-3 ${py} ${textSize}
          bg-surface-base border rounded-lg
          ${open ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : 'border-slate-700/50 hover:border-slate-600/70'}
          text-slate-100 outline-none transition-all duration-150 cursor-pointer
        `}
      >
        <span className={`truncate ${isDefault ? 'text-slate-400' : 'text-slate-100'}`}>
          {triggerLabel}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="
          absolute z-[200] w-full mt-1
          bg-surface-elevated border border-slate-700/60
          rounded-lg shadow-2xl shadow-black/60
          overflow-hidden
          animate-in
        ">
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {/* Default / global option */}
            {defaultLabel && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs
                  transition-colors duration-100
                  ${isDefault
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'}
                `}
              >
                <span className="w-3.5 shrink-0">
                  {isDefault && <Check size={13} className="text-emerald-400" />}
                </span>
                <span className="truncate italic">{defaultLabel}</span>
              </button>
            )}

            {/* Divider if default option exists */}
            {defaultLabel && models.length > 0 && (
              <div className="border-t border-slate-700/40 mx-2" />
            )}

            {/* Model list */}
            {models.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500 text-center">No models loaded</p>
            ) : (
              models.map(m => {
                const isSelected = value === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { onChange(m.id); setOpen(false); }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 text-left
                      transition-colors duration-100
                      ${isSelected
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-slate-300 hover:bg-slate-700/40 hover:text-slate-100'}
                    `}
                  >
                    <span className="w-3.5 shrink-0">
                      {isSelected && <Check size={13} className="text-emerald-400" />}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate">{m.display_name}</span>
                      <span className={`text-[10px] truncate ${isSelected ? 'text-emerald-500/70' : 'text-slate-500'}`}>{m.id}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
