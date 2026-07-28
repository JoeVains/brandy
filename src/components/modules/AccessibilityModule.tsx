'use client';

import { useState, useEffect } from 'react';
import { Module, ColorItem } from '@/types';
import { contrastRatio } from '@/lib/colorUtils';
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

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />

      {isEditing && colorModules.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs text-gray-500 dark:text-gray-400">Couleurs de référence :</label>
          <select
            className="text-xs border rounded-lg px-2 py-1 outline-none bg-transparent"
            style={{ borderColor: 'var(--border)' }}
            value={module.accessibilitySourceModuleId ?? ''}
            onChange={e => setSource(e.target.value)}
          >
            <option value="">Toutes les couleurs de la marque</option>
            {colorModules.map(m => (
              <option key={m.id} value={m.id}>{m.title || 'Couleurs'}</option>
            ))}
          </select>
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
