'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption { value: string; label: string }

// Menu déroulant au design de l'appli (remplace le <select> natif).
// Si `value` ne correspond à aucune option, `placeholder` s'affiche (menu d'actions).
export default function Select({ value, onChange, options, placeholder, title, className = '', align = 'left', direction = 'down', fullWidth }: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  title?: string;
  className?: string;
  align?: 'left' | 'right';
  direction?: 'down' | 'up';
  fullWidth?: boolean;  // occupe toute la largeur du conteneur (texte tronqué si trop long)
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'block w-full' : 'inline-block'}`}>
      <button
        type="button"
        title={title}
        onClick={() => setOpen(o => !o)}
        className={`${fullWidth ? 'w-full ' : ''}flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${className}`}
        style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
      >
        <span className="flex-1 text-left truncate">{current?.label ?? placeholder ?? ''}</span>
        <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={`absolute ${direction === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} z-50 min-w-full w-max max-w-[260px] max-h-64 overflow-y-auto rounded-2xl border shadow-xl py-1.5 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
        >
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="flex-1 truncate">{o.label}</span>
              {current?.value === o.value && <Check size={12} className="text-gray-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
