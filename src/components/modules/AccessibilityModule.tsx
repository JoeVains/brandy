'use client';

import { useState, useEffect, useRef } from 'react';
import { Module, ColorItem } from '@/types';
import { contrastRatio } from '@/lib/colorUtils';
import { suggestColorName } from '@/lib/colorNames';
import { Palette, Check, ChevronDown, Plus, X, Trash2, Pipette, Pencil } from 'lucide-react';
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

export default function AccessibilityModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const [colorModules, setColorModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newHex, setNewHex] = useState('#000000');
  const [newHexInput, setNewHexInput] = useState('#000000');
  const [newName, setNewName] = useState(suggestColorName('#000000'));
  const [newNameTouched, setNewNameTouched] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editHex, setEditHex] = useState('#000000');
  const [editHexInput, setEditHexInput] = useState('#000000');
  const [editName, setEditName] = useState('');

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

  const sourceIds = module.accessibilitySourceModuleIds
    ?? (module.accessibilitySourceModuleId ? [module.accessibilitySourceModuleId] : []);
  const isCustomMode = module.accessibilitySource === 'custom';

  async function toggleSource(id: string) {
    const next = sourceIds.includes(id) ? sourceIds.filter(i => i !== id) : [...sourceIds, id];
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessibilitySourceModuleIds: next, accessibilitySourceModuleId: null, accessibilitySource: 'modules' }),
    });
    onUpdate(await res.json());
  }

  async function clearSources() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessibilitySourceModuleIds: [], accessibilitySourceModuleId: null, accessibilitySource: 'modules' }),
    });
    onUpdate(await res.json());
  }

  async function selectCustomSource() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessibilitySourceModuleIds: [], accessibilitySourceModuleId: null, accessibilitySource: 'custom' }),
    });
    onUpdate(await res.json());
  }

  const customColors = module.accessibilityCustomColors ?? [];

  function applyNewHex(hex: string) {
    const full = hex.startsWith('#') ? hex : '#' + hex;
    setNewHexInput(full);
    if (full.replace('#', '').length === 6) {
      setNewHex(full);
      if (!newNameTouched) setNewName(suggestColorName(full));
    }
  }

  async function addCustomColor() {
    if (!newName.trim()) return;
    const item: ColorItem = { id: crypto.randomUUID(), name: newName.trim(), value: newHex };
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessibilityCustomColors: [...customColors, item] }),
    });
    onUpdate(await res.json());
    setNewHex('#000000');
    setNewHexInput('#000000');
    setNewName(suggestColorName('#000000'));
    setNewNameTouched(false);
    setShowAddCustom(false);
  }

  async function deleteCustomColor(id: string) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessibilityCustomColors: customColors.filter(c => c.id !== id) }),
    });
    onUpdate(await res.json());
  }

  function startEditCustom(item: ColorItem) {
    setEditingCustomId(item.id);
    setEditHex(item.value);
    setEditHexInput(item.value);
    setEditName(item.name);
  }

  function applyEditHex(hex: string) {
    const full = hex.startsWith('#') ? hex : '#' + hex;
    setEditHexInput(full);
    if (full.replace('#', '').length === 6) setEditHex(full);
  }

  async function saveEditCustom() {
    if (!editingCustomId || !editName.trim()) return;
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accessibilityCustomColors: customColors.map(c => c.id === editingCustomId ? { ...c, name: editName.trim(), value: editHex } : c),
      }),
    });
    onUpdate(await res.json());
    setEditingCustomId(null);
  }

  if (loading) {
    return <div className="text-sm text-gray-400 dark:text-gray-400">Chargement…</div>;
  }

  const sources = colorModules.filter(m => sourceIds.includes(m.id));

  const seen = new Map<string, ColorItem>();
  if (isCustomMode) {
    customColors.forEach(item => seen.set(item.id, item));
  } else {
    (sources.length > 0 ? sources : colorModules).flatMap(m => m.colorItems ?? []).forEach(item => seen.set(item.id, item));
  }
  const colors = [...seen.values()];
  const sourceLabel = isCustomMode
    ? 'Couleurs personnalisées'
    : sources.length === 0
      ? 'Toutes les couleurs'
      : sources.length === 1
        ? (sources[0].title || 'Couleurs')
        : `${sources.length} modules`;

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        brandId={module.brandId}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />

      {isEditing && (
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
                  onClick={clearSources}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    <Palette size={14} />
                  </span>
                  <span className="flex-1 text-left">Toutes les couleurs</span>
                  {!isCustomMode && sourceIds.length === 0 && <Check size={13} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                </button>

                {colorModules.length > 0 && (
                  <>
                    <div className="h-px mx-3 my-1.5" style={{ background: 'var(--border)' }} />
                    {colorModules.map(m => (
                      <button
                        key={m.id}
                        onClick={() => toggleSource(m.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <input type="checkbox" readOnly checked={!isCustomMode && sourceIds.includes(m.id)} className="flex-shrink-0" />
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          <Palette size={14} />
                        </span>
                        <span className="flex-1 text-left truncate">{m.title || 'Couleurs'}</span>
                      </button>
                    ))}
                  </>
                )}

                <div className="h-px mx-3 my-1.5" style={{ background: 'var(--border)' }} />

                <button
                  onClick={selectCustomSource}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    <Pipette size={14} />
                  </span>
                  <span className="flex-1 text-left">Couleurs personnalisées</span>
                  {isCustomMode && <Check size={13} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditing && isCustomMode && (
        <div className="mb-4">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Couleurs personnalisées :</label>
          <div className="flex items-center gap-2 flex-wrap">
            {customColors.map(item => (
              editingCustomId === item.id ? (
                <div key={item.id} className="flex items-center gap-1.5 p-1.5 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                  <input
                    type="color"
                    value={editHex}
                    onChange={e => applyEditHex(e.target.value)}
                    className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 flex-shrink-0"
                  />
                  <input
                    className="w-20 border rounded-lg px-1.5 py-1 text-xs outline-none"
                    style={{ borderColor: 'var(--border)' }}
                    value={editHexInput}
                    onChange={e => applyEditHex(e.target.value)}
                    placeholder="#000000"
                  />
                  <input
                    className="w-24 border rounded-lg px-1.5 py-1 text-xs outline-none"
                    style={{ borderColor: 'var(--border)' }}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nom"
                    onKeyDown={e => { if (e.key === 'Enter') saveEditCustom(); if (e.key === 'Escape') setEditingCustomId(null); }}
                  />
                  <button onClick={saveEditCustom} className="p-1 rounded-lg text-white flex-shrink-0" style={{ background: brandColor }}>
                    <Check size={12} />
                  </button>
                  <button onClick={() => setEditingCustomId(null)} className="p-1 rounded-lg border text-gray-500 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div key={item.id} className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }}>
                  <span className="w-4 h-4 rounded-full border flex-shrink-0" style={{ background: item.value, borderColor: 'var(--border)' }} />
                  <span className="text-gray-700 dark:text-gray-300 max-w-[100px] truncate">{item.name}</span>
                  <button onClick={() => startEditCustom(item)} className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => deleteCustomColor(item.id)} className="p-0.5 rounded text-gray-400 hover:text-red-500">
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            ))}
            {showAddCustom ? (
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                <input
                  type="color"
                  value={newHex}
                  onChange={e => applyNewHex(e.target.value)}
                  className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 flex-shrink-0"
                />
                <input
                  className="w-20 border rounded-lg px-1.5 py-1 text-xs outline-none"
                  style={{ borderColor: 'var(--border)' }}
                  value={newHexInput}
                  onChange={e => applyNewHex(e.target.value)}
                  placeholder="#000000"
                />
                <input
                  className="w-24 border rounded-lg px-1.5 py-1 text-xs outline-none"
                  style={{ borderColor: 'var(--border)' }}
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setNewNameTouched(true); }}
                  placeholder="Nom"
                  onKeyDown={e => { if (e.key === 'Enter') addCustomColor(); if (e.key === 'Escape') setShowAddCustom(false); }}
                />
                <button onClick={addCustomColor} className="p-1 rounded-lg text-white flex-shrink-0" style={{ background: brandColor }}>
                  <Check size={12} />
                </button>
                <button onClick={() => setShowAddCustom(false)} className="p-1 rounded-lg border text-gray-500 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCustom(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <Plus size={12} /> Ajouter une couleur
              </button>
            )}
          </div>
        </div>
      )}

      {colors.length < 2 ? (
        <p className="text-sm text-gray-400 dark:text-gray-400">
          {isCustomMode
            ? 'Ajoutez au moins deux couleurs personnalisées pour voir les contrastes.'
            : 'Ajoutez au moins deux couleurs dans un module Couleurs de cette marque pour voir les contrastes.'}
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
                          className="w-24 h-16 rounded-lg border flex flex-col items-center justify-center gap-0.5"
                          style={{ background: row.value, color: col.value, borderColor: 'var(--border)' }}
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
