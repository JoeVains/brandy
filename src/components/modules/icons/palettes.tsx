'use client';

import { useEffect, useState } from 'react';
import { Check, X, ChevronDown, Palette as PaletteIcon } from 'lucide-react';
import type { Module, ColorItem } from '@/types';
import { normalizeHex, toPickerValue, sameColor } from './colorUtils';

export interface Palette { id: string; title: string; colors: ColorItem[] }

// Nuanciers de la marque = modules « couleurs ».
export function useBrandPalettes(brandId: string, shareToken?: string): Palette[] {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  useEffect(() => {
    // Page partagée : pas d'accès à /api/modules (protégé), on passe par le jeton de partage.
    const source = shareToken ? `/api/share/${shareToken}` : `/api/modules?brandId=${brandId}`;
    fetch(source)
      .then(r => r.json())
      .then((data: Module[] | { modules: Module[] }) => {
        const modules = Array.isArray(data) ? data : data.modules;
        setPalettes(
          modules
            .filter(m => m.type === 'colors' && (m.colorItems ?? []).length > 0)
            .map((m, i) => ({ id: m.id, title: m.title || `Nuancier ${i + 1}`, colors: m.colorItems ?? [] })),
        );
      })
      .catch(() => {});
  }, [brandId, shareToken]);
  return palettes;
}

// Choix d'un nuancier (si plusieurs) puis de l'une de ses couleurs.
export function PaletteSwatches({ palettes, paletteId, onPaletteChange, color, onPick }: {
  palettes: Palette[]; paletteId: string | null; onPaletteChange: (id: string) => void; color: string | null; onPick: (hex: string) => void;
}) {
  const [listOpen, setListOpen] = useState(false);
  if (palettes.length === 0) return null;
  const palette = palettes.find(p => p.id === paletteId) ?? palettes[0];
  return (
    <>
      {palettes.length > 1 && (
        <div className="mb-2">
          <button
            onClick={() => setListOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
          >
            <span className="flex-1 text-left truncate">{palette.title}</span>
            <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
          </button>
          {listOpen && (
            <div className="mt-1 rounded-2xl border shadow-xl py-1.5 max-h-48 overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              {palettes.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onPaletteChange(p.id); setListOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="flex-1 text-left truncate">{p.title}</span>
                  {p.id === palette.id && <Check size={12} className="text-gray-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {palette.colors.map(c => (
          <button
            key={c.id}
            onClick={() => onPick(c.value)}
            title={c.name || c.value}
            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-transform hover:scale-110"
            style={{ background: c.value, borderColor: sameColor(color, c.value) ? 'var(--accent)' : 'var(--border)' }}
          >
            {sameColor(color, c.value) && <Check size={10} color="white" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </>
  );
}

// Champ de couleur : pastille (sélecteur natif) + hex + raccourci vers les nuanciers de la marque.
export function TintControl({ value, onChange, palettes, paletteId, onPaletteChange, title, compact }: {
  value: string;
  onChange: (value: string) => void;
  palettes: Palette[];
  paletteId: string | null;
  onPaletteChange: (id: string) => void;
  title: string;
  compact?: boolean;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const color = normalizeHex(value);
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded border overflow-hidden"
          style={{
            borderColor: 'var(--border)',
            background: color ?? 'repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 50% / 6px 6px',
          }}
        >
          <input
            type="color"
            value={toPickerValue(color)}
            onChange={e => onChange(e.target.value)}
            title="Choisir une couleur"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </span>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          spellCheck={false}
          title={title}
          className={`w-32 pl-8 pr-6 py-1.5 text-xs font-mono rounded-lg border outline-none bg-white dark:bg-gray-900 focus:border-gray-400 dark:border-gray-600`}
          style={{ borderColor: value && !color ? '#ef4444' : 'var(--border)' }}
        />
        {value && (
          <button onClick={() => onChange('')} title="Couleurs d'origine"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
            <X size={12} />
          </button>
        )}
      </div>
      {palettes.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setPaletteOpen(o => !o)}
            title="Couleurs de la marque"
            className="p-1.5 rounded-lg border text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600"
            style={{ borderColor: 'var(--border)' }}
          >
            <PaletteIcon size={14} />
          </button>
          {paletteOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setPaletteOpen(false)} />
              <div className="absolute left-0 top-full mt-2 z-30 w-64 p-3 rounded-2xl border shadow-xl"
                style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <PaletteSwatches palettes={palettes} paletteId={paletteId} onPaletteChange={onPaletteChange} color={color} onPick={hex => { onChange(hex); setPaletteOpen(false); }} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
