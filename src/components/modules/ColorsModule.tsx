'use client';

import { useState } from 'react';
import { Module, ColorItem } from '@/types';
import { suggestColorName } from '@/lib/colorNames';
import { hexToRgb, rgbToHsl } from '@/lib/colorUtils';
import { Plus, Trash2, Check, X, Pencil, Copy } from 'lucide-react';
import { randomUUID } from 'crypto';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

function ColorSwatch({ item, brandColor, onSave, onDelete, isEditing }: {
  item: ColorItem;
  brandColor: string;
  onSave: (updated: ColorItem) => void;
  onDelete: () => void;
  isEditing?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [hexInput, setHexInput] = useState(item.value);
  const [colorValue, setColorValue] = useState(item.value);
  const [nameTouched, setNameTouched] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const rgb = hexToRgb(colorValue);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;

  function applyHex(hex: string) {
    const full = hex.startsWith('#') ? hex : '#' + hex;
    setHexInput(full);
    if (full.replace('#', '').length === 6) {
      setColorValue(full);
      if (!nameTouched) setName(suggestColorName(full));
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  function save() {
    onSave({ ...item, name, value: colorValue });
    setEditing(false);
    setNameTouched(false);
  }

  if (editing) {
    return (
      <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="h-24 relative" style={{ background: colorValue }}>
          <input
            type="color"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            value={colorValue}
            onChange={e => applyHex(e.target.value)}
          />
        </div>
        <div className="p-3 space-y-2 bg-white">
          <input
            className="w-full border rounded-lg px-2 py-1 text-xs outline-none"
            style={{ borderColor: 'var(--border)' }}
            value={hexInput}
            onChange={e => applyHex(e.target.value)}
            placeholder="#000000"
          />
          <input
            className="w-full border rounded-lg px-2 py-1 text-xs outline-none"
            style={{ borderColor: 'var(--border)' }}
            value={name}
            onChange={e => { setName(e.target.value); setNameTouched(true); }}
            placeholder="Nom de la couleur"
          />
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-white" style={{ background: brandColor }}>
              <Check size={11} /> Sauvegarder
            </button>
            <button onClick={() => { setEditing(false); setHexInput(item.value); setColorValue(item.value); setName(item.name); }} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>
              <X size={11} /> Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden group" style={{ borderColor: 'var(--border)' }}>
      <div className="h-24 relative" style={{ background: item.value }}>
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <button onClick={() => { setEditing(true); setHexInput(item.value); setColorValue(item.value); setName(item.name); setNameTouched(false); }}
              className="p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-700">
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-full bg-white/80 hover:bg-white text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
      <div className="p-3 bg-white space-y-1">
        <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
        {[
          { label: 'HEX', text: item.value.toUpperCase(), key: 'hex' },
          { label: 'RVB', text: rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '—', key: 'rgb' },
          { label: 'TSL', text: hsl ? `${hsl.h}°, ${hsl.s}%, ${hsl.l}%` : '—', key: 'hsl' },
        ].map(row => (
          <button key={row.key} onClick={() => copyText(row.text, row.key)}
            className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 group/row">
            <span className="font-mono text-gray-400 text-[10px] w-7 flex-shrink-0 text-left">{row.label}</span>
            <span className="font-mono text-left flex-1">{copied === row.key ? '✓ copié' : row.text}</span>
            <Copy size={9} className="opacity-0 group-hover/row:opacity-50 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ColorsModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newHex, setNewHex] = useState('#000000');
  const [newHexInput, setNewHexInput] = useState('#000000');
  const [newName, setNewName] = useState(suggestColorName('#000000'));
  const [newNameTouched, setNewNameTouched] = useState(false);

  const items = module.colorItems ?? [];

  async function patch(colorItems: ColorItem[]) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ colorItems }),
    });
    const updated = await res.json();
    onUpdate(updated);
  }

  function applyNew(hex: string) {
    const full = hex.startsWith('#') ? hex : '#' + hex;
    setNewHexInput(full);
    if (full.replace('#', '').length === 6) {
      setNewHex(full);
      if (!newNameTouched) setNewName(suggestColorName(full));
    }
  }

  async function addColor() {
    if (!newName.trim()) return;
    const item: ColorItem = { id: crypto.randomUUID(), name: newName.trim(), value: newHex };
    await patch([...items, item]);
    setNewHex('#000000');
    setNewHexInput('#000000');
    setNewName(suggestColorName('#000000'));
    setNewNameTouched(false);
    setShowAdd(false);
  }

  async function updateItem(updated: ColorItem) {
    await patch(items.map(i => i.id === updated.id ? updated : i));
  }

  async function deleteItem(id: string) {
    await patch(items.filter(i => i.id !== id));
  }

  return (
    <div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {items.map(item => (
          <ColorSwatch key={item.id} item={item} brandColor={brandColor}
            onSave={updateItem} onDelete={() => deleteItem(item.id)} isEditing={isEditing} />
        ))}

        {isEditing && showAdd ? (
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="h-24 relative" style={{ background: newHex }}>
              <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={newHex} onChange={e => applyNew(e.target.value)} />
            </div>
            <div className="p-3 space-y-2 bg-white">
              <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                value={newHexInput} onChange={e => applyNew(e.target.value)} placeholder="#000000" />
              <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                value={newName} onChange={e => { setNewName(e.target.value); setNewNameTouched(true); }} placeholder="Nom" />
              <div className="flex gap-2 pt-1">
                <button onClick={addColor} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-white" style={{ background: brandColor }}>
                  <Check size={11} /> Ajouter
                </button>
                <button onClick={() => setShowAdd(false)} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>
                  <X size={11} /> Annuler
                </button>
              </div>
            </div>
          </div>
        ) : isEditing ? (
          <button onClick={() => setShowAdd(true)}
            className="h-full min-h-[160px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Plus size={20} />
            <span className="text-xs">Ajouter une couleur</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
