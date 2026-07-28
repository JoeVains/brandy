'use client';

import { useState, useEffect, useRef } from 'react';
import { Module, ColorItem } from '@/types';
import { contrastRatio } from '@/lib/colorUtils';
import { Palette, Check, ChevronDown } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

function ratioLevel(ratio: number): { label: string; color: string } {
  if (ratio >= 7) return { label: 'AAA', color: '#16a34a' };
  if (ratio >= 4.5) return { label: 'AA', color: '#16a34a' };
  if (ratio >= 3) return { label: 'AA Large', color: '#d97706' };
  return { label: 'Échec', color: '#dc2626' };
}

export default function AccessibilityModule({ module, onUpdate, isEditing }: Props) {
  const [colorModules, setColorModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const sourceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sourceMenuOpen) return;
    function handler(e: MouseEvent) {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(e.target as Node)) {
        setSourceMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sourceMenuOpen]);

  useEffect(() => {
    fetch(`/api/modules?brandId=${module.brandId}`)
      .then(r => r.json())
      .then((modules: Module[]) => {
        setColorModules(modules.filter(m => m.type === 'colors'));
        setLoading(false);
      });
  }, [module.brandId]);

  async function setSource(sourceId: string) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessibilitySourceModuleId: sourceId || null }),
    });
    onUpdate(await res.json());
  }

  if (loading) {
    return <div className="text-sm text-gray-400 dark:text-gray-400">Chargement…</div>;
  }

  const source = module.accessibilitySourceModuleId
    ? colorModules.find(m => m.id === module.accessibilitySourceModuleId)
    : null;

  const seen = new Map<string, ColorItem>();
  (source ? [source] : colorModules).flatMap(m => m.colorItems ?? []).forEach(item => seen.set(item.id, item));
  const colors = [...seen.values()];
  const sourceLabel = source ? (source.title || 'Couleurs') : 'Toutes les couleurs';

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />

      {isEditing && colorModules.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs text-gray-500 dark:text-gray-400">Couleurs de référence :</label>
          <div className="relative" ref={sourceMenuRef}>
            <button
              onClick={() => setSourceMenuOpen(o => !o)}
              className="flex items-center gap-2 text-xs border rounded-lg pl-2.5 pr-2 py-1.5 outline-none text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              {sourceLabel}
              <ChevronDown size={12} className="text-gray-400 dark:text-gray-500" />
            </button>
            {sourceMenuOpen && (
              <div className="absolute left-0 top-full mt-2 rounded-2xl border shadow-xl z-50 py-2 min-w-[220px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <button
                  onClick={() => { setSource(''); setSourceMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    <Palette size={14} />
                  </span>
                  <span className="flex-1 text-left">Toutes les couleurs</span>
                  {!module.accessibilitySourceModuleId && <Check size={13} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                </button>

                <div className="h-px mx-3 my-1.5" style={{ background: 'var(--border)' }} />

                {colorModules.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSource(m.id); setSourceMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      <Palette size={14} />
                    </span>
                    <span className="flex-1 text-left truncate">{m.title || 'Couleurs'}</span>
                    {module.accessibilitySourceModuleId === m.id && <Check size={13} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {colors.length < 2 ? (
        <p className="text-sm text-gray-400 dark:text-gray-400">
          Ajoutez au moins deux couleurs dans un module Couleurs de cette marque pour voir les contrastes.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-separate" style={{ borderSpacing: 4 }}>
            <thead>
              <tr>
                <th className="w-24" />
                {colors.map(col => (
                  <th key={col.id} className="text-xs font-medium text-gray-500 dark:text-gray-400 pb-1 px-1 truncate max-w-[96px]">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map(row => (
                <tr key={row.id}>
                  <td className="text-xs font-medium text-gray-500 dark:text-gray-400 pr-2 text-right whitespace-nowrap">
                    {row.name}
                  </td>
                  {colors.map(col => {
                    if (col.id === row.id) {
                      return <td key={col.id} className="w-24 h-16 rounded-lg bg-gray-50 dark:bg-gray-800" />;
                    }
                    const ratio = contrastRatio(row.value, col.value);
                    const level = ratio !== null ? ratioLevel(ratio) : null;
                    return (
                      <td key={col.id}>
                        <div
                          className="w-24 h-16 rounded-lg flex flex-col items-center justify-center gap-0.5"
                          style={{ background: row.value, color: col.value }}
                          title={`${row.name} / ${col.name}`}
                        >
                          <span className="text-xs font-semibold" style={{ color: col.value }}>Aa</span>
                          {ratio !== null && (
                            <span className="text-[10px] font-mono" style={{ color: col.value }}>
                              {ratio.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {level && (
                          <p className="text-[10px] text-center mt-1 font-medium" style={{ color: level.color }}>
                            {level.label}
                          </p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
