'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Module, ColorItem, ColorFormat } from '@/types';
import { suggestColorName } from '@/lib/colorNames';
import { hexToRgb, rgbToHsl } from '@/lib/colorUtils';
import { Plus, Trash2, Check, X, Pencil, Copy, Download } from 'lucide-react';
import { randomUUID } from 'crypto';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

const FORMAT_OPTIONS: { key: ColorFormat; label: string }[] = [
  { key: 'hex', label: 'Hexadécimal' },
  { key: 'rgb', label: 'RVB' },
  { key: 'hsl', label: 'TSL' },
  { key: 'cmyk', label: 'CMJN' },
  { key: 'pantone', label: 'Pantone' },
];

function buildRows(item: ColorItem, formats: ColorFormat[]) {
  const rgb = hexToRgb(item.value);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
  const all: Record<ColorFormat, { label: string; text: string }> = {
    hex: { label: 'HEX', text: item.value.toUpperCase() },
    rgb: { label: 'RVB', text: rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '—' },
    hsl: { label: 'TSL', text: hsl ? `${hsl.h}°, ${hsl.s}%, ${hsl.l}%` : '—' },
    cmyk: { label: 'CMJN', text: item.cmyk || '—' },
    pantone: { label: 'PANT', text: item.pantone || '—' },
  };
  return formats.map(key => ({ key, ...all[key] }));
}

function FormatMenu({ anchorRect, formats, onToggle, onClose }: {
  anchorRect: DOMRect;
  formats: ColorFormat[];
  onToggle: (key: ColorFormat) => void;
  onClose: () => void;
}) {
  const width = 224;
  const left = Math.min(
    Math.max(8, anchorRect.left + anchorRect.width / 2 - width / 2),
    window.innerWidth - width - 8
  );
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 8);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100]" onClick={e => { e.stopPropagation(); onClose(); }} />
      <div
        className="fixed z-[101] p-3 rounded-2xl border shadow-2xl bg-white dark:bg-gray-900 space-y-1"
        style={{ borderColor: 'var(--border)', top, left, width }}
        onClick={e => e.stopPropagation()}
      >
        {FORMAT_OPTIONS.map(opt => (
          <label key={opt.key} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={formats.includes(opt.key)} onChange={() => onToggle(opt.key)} />
            {opt.label}
          </label>
        ))}
      </div>
    </>,
    document.body
  );
}

function ColorSwatch({ item, brandColor, onSave, onDelete, isEditing, onDragStart, formats, onToggleFormat }: {
  item: ColorItem;
  brandColor: string;
  onSave: (updated: ColorItem) => void;
  onDelete: () => void;
  isEditing?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  formats: ColorFormat[];
  onToggleFormat: (key: ColorFormat) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [hexInput, setHexInput] = useState(item.value);
  const [colorValue, setColorValue] = useState(item.value);
  const [cmyk, setCmyk] = useState(item.cmyk ?? '');
  const [pantone, setPantone] = useState(item.pantone ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);

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
    onSave({ ...item, name, value: colorValue, cmyk: cmyk.trim() || undefined, pantone: pantone.trim() || undefined });
    setEditing(false);
    setNameTouched(false);
  }

  if (editing) {
    return (
      <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="h-24 relative" style={{ background: colorValue, borderBottom: '1px solid var(--border)' }}>
          <input
            type="color"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            value={colorValue}
            onChange={e => applyHex(e.target.value)}
          />
        </div>
        <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
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
          {formats.includes('cmyk') && (
            <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
              value={cmyk} onChange={e => setCmyk(e.target.value)} placeholder="CMJN (ex. 0, 20, 90, 0)" />
          )}
          {formats.includes('pantone') && (
            <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
              value={pantone} onChange={e => setPantone(e.target.value)} placeholder="Pantone (ex. 137 C)" />
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={save} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs text-white min-w-0" style={{ background: brandColor }}>
              <Check size={11} className="flex-shrink-0" /> <span className="truncate">Sauvegarder</span>
            </button>
            <button onClick={() => { setEditing(false); setHexInput(item.value); setColorValue(item.value); setName(item.name); setCmyk(item.cmyk ?? ''); setPantone(item.pantone ?? ''); }} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs border min-w-0" style={{ borderColor: 'var(--border)' }}>
              <X size={11} className="flex-shrink-0" /> <span className="truncate">Annuler</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden group transition-all duration-200 hover:scale-[1.03] hover:shadow-md relative" style={{ borderColor: 'var(--border)' }}>
      <div className="h-24 relative" style={{ background: item.value, cursor: isEditing ? 'grab' : 'pointer', borderBottom: '1px solid var(--border)' }}
        draggable={isEditing}
        onClick={e => { setMenuAnchor(e.currentTarget.getBoundingClientRect()); setShowMenu(v => !v); }}
        onDragStart={e => {
          const cardEl = (e.currentTarget as HTMLElement).parentElement;
          if (cardEl) {
            const rect = cardEl.getBoundingClientRect();
            e.dataTransfer.setDragImage(cardEl, e.clientX - rect.left, e.clientY - rect.top);
          }
          onDragStart?.(e);
        }}>
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <button onClick={e => { e.stopPropagation(); setEditing(true); setHexInput(item.value); setColorValue(item.value); setName(item.name); setCmyk(item.cmyk ?? ''); setPantone(item.pantone ?? ''); setNameTouched(false); }}
              className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <Pencil size={12} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        )}
        {showMenu && menuAnchor && <FormatMenu anchorRect={menuAnchor} formats={formats} onToggle={onToggleFormat} onClose={() => setShowMenu(false)} />}
      </div>
      <div className="p-3 bg-white dark:bg-gray-900 space-y-1">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
        {buildRows(item, formats).map(row => (
          <button key={row.key} onClick={() => copyText(row.text, row.key)}
            className="w-full flex items-start gap-2 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white dark:text-gray-200 group/row">
            <span className="font-mono text-gray-400 dark:text-gray-500 text-[10px] w-9 flex-shrink-0 text-left pt-0.5">{row.label}</span>
            <span className="font-mono text-left text-[11px] leading-snug flex-1 min-w-0 break-words">{copied === row.key ? '✓ copié' : row.text}</span>
            <Copy size={9} className="opacity-0 group-hover/row:opacity-50 flex-shrink-0 mt-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function DropSwatch({ item, brandColor, onSave, onDelete, isEditing, onDragStart, formats, onToggleFormat }: {
  item: ColorItem;
  brandColor: string;
  onSave: (updated: ColorItem) => void;
  onDelete: () => void;
  isEditing?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  formats: ColorFormat[];
  onToggleFormat: (key: ColorFormat) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [hexInput, setHexInput] = useState(item.value);
  const [colorValue, setColorValue] = useState(item.value);
  const [cmyk, setCmyk] = useState(item.cmyk ?? '');
  const [pantone, setPantone] = useState(item.pantone ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);

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
    onSave({ ...item, name, value: colorValue, cmyk: cmyk.trim() || undefined, pantone: pantone.trim() || undefined });
    setEditing(false);
    setNameTouched(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-3 p-4 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
        <div className="w-20 h-20 rounded-full relative flex-shrink-0 border" style={{ background: colorValue, borderColor: 'var(--border)' }}>
          <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
            value={colorValue} onChange={e => applyHex(e.target.value)} />
        </div>
        <div className="w-full space-y-2">
          <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
            value={hexInput} onChange={e => applyHex(e.target.value)} placeholder="#000000" />
          <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
            value={name} onChange={e => { setName(e.target.value); setNameTouched(true); }} placeholder="Nom de la couleur" />
          {formats.includes('cmyk') && (
            <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
              value={cmyk} onChange={e => setCmyk(e.target.value)} placeholder="CMJN (ex. 0, 20, 90, 0)" />
          )}
          {formats.includes('pantone') && (
            <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
              value={pantone} onChange={e => setPantone(e.target.value)} placeholder="Pantone (ex. 137 C)" />
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={save} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs text-white min-w-0" style={{ background: brandColor }}>
              <Check size={11} className="flex-shrink-0" /> <span className="truncate">Sauvegarder</span>
            </button>
            <button onClick={() => { setEditing(false); setHexInput(item.value); setColorValue(item.value); setName(item.name); setCmyk(item.cmyk ?? ''); setPantone(item.pantone ?? ''); }}
              className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs border min-w-0" style={{ borderColor: 'var(--border)' }}>
              <X size={11} className="flex-shrink-0" /> <span className="truncate">Annuler</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center group">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border transition-all duration-200 hover:scale-110 hover:shadow-md" style={{ background: item.value, borderColor: 'var(--border)', cursor: isEditing ? 'grab' : 'pointer' }}
          draggable={isEditing}
          onClick={e => { setMenuAnchor(e.currentTarget.getBoundingClientRect()); setShowMenu(v => !v); }}
          onDragStart={e => {
            const cardEl = (e.currentTarget as HTMLElement).parentElement?.parentElement;
            if (cardEl) {
              const rect = cardEl.getBoundingClientRect();
              e.dataTransfer.setDragImage(cardEl, e.clientX - rect.left, e.clientY - rect.top);
            }
            onDragStart?.(e);
          }} />
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/20">
            <button onClick={e => { e.stopPropagation(); setEditing(true); setHexInput(item.value); setColorValue(item.value); setName(item.name); setCmyk(item.cmyk ?? ''); setPantone(item.pantone ?? ''); setNameTouched(false); }}
              className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <Pencil size={12} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        )}
        {showMenu && menuAnchor && <FormatMenu anchorRect={menuAnchor} formats={formats} onToggle={onToggleFormat} onClose={() => setShowMenu(false)} />}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center">{item.name}</p>
        {buildRows(item, formats).map(row => (
          <button key={row.key} onClick={() => copyText(row.text, row.key)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white dark:text-gray-200 group/row">
            <span className="font-mono text-gray-400 dark:text-gray-500 text-[10px]">{row.label}</span>
            <span className="font-mono">{copied === row.key ? '✓ copié' : row.text}</span>
            <Copy size={9} className="opacity-0 group-hover/row:opacity-50 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ListSwatch({ item, brandColor, onSave, onDelete, isEditing, onDragStart, formats, onToggleFormat }: {
  item: ColorItem;
  brandColor: string;
  onSave: (updated: ColorItem) => void;
  onDelete: () => void;
  isEditing?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  formats: ColorFormat[];
  onToggleFormat: (key: ColorFormat) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [hexInput, setHexInput] = useState(item.value);
  const [colorValue, setColorValue] = useState(item.value);
  const [cmyk, setCmyk] = useState(item.cmyk ?? '');
  const [pantone, setPantone] = useState(item.pantone ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);

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
    onSave({ ...item, name, value: colorValue, cmyk: cmyk.trim() || undefined, pantone: pantone.trim() || undefined });
    setEditing(false);
    setNameTouched(false);
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3 p-3 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
        <div className="w-12 h-12 rounded-lg relative flex-shrink-0 border" style={{ background: colorValue, borderColor: 'var(--border)' }}>
          <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-lg"
            value={colorValue} onChange={e => applyHex(e.target.value)} />
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
            value={hexInput} onChange={e => applyHex(e.target.value)} placeholder="#000000" />
          <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
            value={name} onChange={e => { setName(e.target.value); setNameTouched(true); }} placeholder="Nom de la couleur" />
          {formats.includes('cmyk') && (
            <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
              value={cmyk} onChange={e => setCmyk(e.target.value)} placeholder="CMJN (ex. 0, 20, 90, 0)" />
          )}
          {formats.includes('pantone') && (
            <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
              value={pantone} onChange={e => setPantone(e.target.value)} placeholder="Pantone (ex. 137 C)" />
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={save} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs text-white min-w-0" style={{ background: brandColor }}>
              <Check size={11} className="flex-shrink-0" /> <span className="truncate">Sauvegarder</span>
            </button>
            <button onClick={() => { setEditing(false); setHexInput(item.value); setColorValue(item.value); setName(item.name); setCmyk(item.cmyk ?? ''); setPantone(item.pantone ?? ''); }}
              className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs border min-w-0" style={{ borderColor: 'var(--border)' }}>
              <X size={11} className="flex-shrink-0" /> <span className="truncate">Annuler</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-lg group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-lg border transition-transform duration-200 hover:scale-105" style={{ background: item.value, borderColor: 'var(--border)', cursor: isEditing ? 'grab' : 'pointer' }}
          draggable={isEditing}
          onClick={e => { setMenuAnchor(e.currentTarget.getBoundingClientRect()); setShowMenu(v => !v); }}
          onDragStart={e => {
            const rowEl = (e.currentTarget as HTMLElement).parentElement?.parentElement;
            if (rowEl) {
              const rect = rowEl.getBoundingClientRect();
              e.dataTransfer.setDragImage(rowEl, e.clientX - rect.left, e.clientY - rect.top);
            }
            onDragStart?.(e);
          }} />
        {showMenu && menuAnchor && <FormatMenu anchorRect={menuAnchor} formats={formats} onToggle={onToggleFormat} onClose={() => setShowMenu(false)} />}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {buildRows(item, formats).map(row => (
            <button key={row.key} onClick={() => copyText(row.text, row.key)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white dark:text-gray-200 group/row flex-shrink-0">
              <span className="font-mono text-gray-400 dark:text-gray-500 text-[10px] flex-shrink-0">{row.label}</span>
              <span className="font-mono whitespace-nowrap">{copied === row.key ? '✓ copié' : row.text}</span>
              <Copy size={9} className="opacity-0 group-hover/row:opacity-50 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
      {isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => { setEditing(true); setHexInput(item.value); setColorValue(item.value); setName(item.name); setCmyk(item.cmyk ?? ''); setPantone(item.pantone ?? ''); setNameTouched(false); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <Pencil size={12} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500">
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ColorsModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newHex, setNewHex] = useState('#000000');
  const [newHexInput, setNewHexInput] = useState('#000000');
  const [newName, setNewName] = useState(suggestColorName('#000000'));
  const [newNameTouched, setNewNameTouched] = useState(false);
  const [newCmyk, setNewCmyk] = useState('');
  const [newPantone, setNewPantone] = useState('');

  const items = module.colorItems ?? [];
  const colorMode = module.colorMode ?? 'cards';
  const formats = module.colorFormats ?? ['hex', 'rgb', 'hsl'];
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  async function patch(data: object) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    onUpdate(await res.json());
  }

  async function setMode(newMode: 'cards' | 'drops' | 'list') {
    await patch({ colorMode: newMode });
  }

  async function toggleFormat(key: ColorFormat) {
    const next = formats.includes(key) ? formats.filter(f => f !== key) : [...formats, key];
    await patch({ colorFormats: FORMAT_OPTIONS.map(o => o.key).filter(k => next.includes(k)) });
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
    const item: ColorItem = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      value: newHex,
      cmyk: newCmyk.trim() || undefined,
      pantone: newPantone.trim() || undefined,
    };
    await patch({ colorItems: [...items, item] });
    setNewHex('#000000');
    setNewHexInput('#000000');
    setNewName(suggestColorName('#000000'));
    setNewNameTouched(false);
    setNewCmyk('');
    setNewPantone('');
    setShowAdd(false);
  }

  async function updateItem(updated: ColorItem) {
    await patch({ colorItems: items.map(i => i.id === updated.id ? updated : i) });
  }

  async function deleteItem(id: string) {
    await patch({ colorItems: items.filter(i => i.id !== id) });
  }

  function onDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  async function onDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dragIdx < idx ? idx - 1 : idx, 0, moved);
    setDragIdx(null);
    setDragOverIdx(null);
    await patch({ colorItems: reordered });
  }

  async function onDropAtEnd() {
    if (dragIdx === null || dragIdx === items.length - 1) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.push(moved);
    setDragIdx(null);
    setDragOverIdx(null);
    await patch({ colorItems: reordered });
  }

  function downloadExport(format: 'ase' | 'less' | 'scss') {
    const a = document.createElement('a');
    a.href = `/api/modules/${module.id}/export?format=${format}`;
    a.click();
  }

  const ExportButtons = () => items.length > 0 ? (
    <div className="flex items-center gap-2 mb-4 justify-end">
      <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Exporter :</span>
      {(['scss', 'less', 'ase'] as const).map(fmt => (
        <button key={fmt} onClick={() => downloadExport(fmt)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-white dark:text-gray-200 transition-colors"
          style={{ borderColor: 'var(--border)' }}>
          <Download size={10} />
          .{fmt}
        </button>
      ))}
    </div>
  ) : null;

  const ModeToggle = () => (
    <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
      <button onClick={() => setMode('cards')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={colorMode === 'cards' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
        Cards
      </button>
      <button onClick={() => setMode('drops')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={colorMode === 'drops' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
        Drops
      </button>
      <button onClick={() => setMode('list')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={colorMode === 'list' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
        List
      </button>
    </div>
  );

  if (colorMode === 'drops') {
    return (
      <div>
        <ModuleDescription
          moduleId={module.id}
          brandId={module.brandId}
          field="colorDescription"
          value={module.colorDescription}
          isEditing={isEditing}
          onUpdate={desc => onUpdate({ ...module, colorDescription: desc })}
        />
        <ExportButtons />
        {isEditing && <ModeToggle />}
        <div className="flex flex-wrap gap-8">
          {items.map((item, idx) => (
            <div key={item.id}
              data-item-id={item.id}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              className="transition-opacity relative"
              style={{ opacity: dragIdx === idx ? 0.4 : 1 }}
            >
              {dragOverIdx === idx && dragIdx !== null && dragIdx !== idx && (
                <div className="absolute -left-4 top-0 bottom-0 w-0.5 rounded-full" style={{ background: brandColor }} />
              )}
              <DropSwatch item={item} brandColor={brandColor}
                onSave={updateItem} onDelete={() => deleteItem(item.id)} isEditing={isEditing}
                onDragStart={e => onDragStart(e, idx)} formats={formats} onToggleFormat={toggleFormat} />
            </div>
          ))}
          {isEditing && dragIdx !== null && (
            <div
              className="relative flex-1 min-w-[24px] self-stretch"
              onDragOver={e => { e.preventDefault(); setDragOverIdx(items.length); }}
              onDrop={onDropAtEnd}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            >
              {dragOverIdx === items.length && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: brandColor }} />
              )}
            </div>
          )}
          {isEditing && showAdd ? (
            <div className="flex flex-col items-center gap-3 p-4 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
              <div className="w-20 h-20 rounded-full relative border" style={{ background: newHex, borderColor: 'var(--border)' }}>
                <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                  value={newHex} onChange={e => applyNew(e.target.value)} />
              </div>
              <div className="w-full space-y-2">
                <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                  value={newHexInput} onChange={e => applyNew(e.target.value)} placeholder="#000000" />
                <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                  value={newName} onChange={e => { setNewName(e.target.value); setNewNameTouched(true); }} placeholder="Nom" />
                {formats.includes('cmyk') && (
                  <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                    value={newCmyk} onChange={e => setNewCmyk(e.target.value)} placeholder="CMJN (ex. 0, 20, 90, 0)" />
                )}
                {formats.includes('pantone') && (
                  <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                    value={newPantone} onChange={e => setNewPantone(e.target.value)} placeholder="Pantone (ex. 137 C)" />
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={addColor} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs text-white min-w-0" style={{ background: brandColor }}>
                    <Check size={11} className="flex-shrink-0" /> <span className="truncate">Ajouter</span>
                  </button>
                  <button onClick={() => setShowAdd(false)} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs border min-w-0" style={{ borderColor: 'var(--border)' }}>
                    <X size={11} className="flex-shrink-0" /> <span className="truncate">Annuler</span>
                  </button>
                </div>
              </div>
            </div>
          ) : isEditing ? (
            <button onClick={() => setShowAdd(true)}
              className="w-28 h-28 border-2 border-dashed rounded-full flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Plus size={18} />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (colorMode === 'list') {
    return (
      <div>
        <ModuleDescription
          moduleId={module.id}
          brandId={module.brandId}
          field="colorDescription"
          value={module.colorDescription}
          isEditing={isEditing}
          onUpdate={desc => onUpdate({ ...module, colorDescription: desc })}
        />
        <ExportButtons />
        {isEditing && <ModeToggle />}
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={item.id}
              data-item-id={item.id}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              className="transition-opacity relative"
              style={{ opacity: dragIdx === idx ? 0.4 : 1 }}
            >
              {dragOverIdx === idx && dragIdx !== null && dragIdx !== idx && (
                <div className="absolute left-2 right-2 -top-0.5 h-0.5 rounded-full" style={{ background: brandColor }} />
              )}
              <ListSwatch item={item} brandColor={brandColor}
                onSave={updateItem} onDelete={() => deleteItem(item.id)} isEditing={isEditing}
                onDragStart={e => onDragStart(e, idx)} formats={formats} onToggleFormat={toggleFormat} />
            </div>
          ))}
          {isEditing && dragIdx !== null && (
            <div
              className="relative min-h-[8px]"
              onDragOver={e => { e.preventDefault(); setDragOverIdx(items.length); }}
              onDrop={onDropAtEnd}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            >
              {dragOverIdx === items.length && (
                <div className="absolute left-2 right-2 top-0 h-0.5 rounded-full" style={{ background: brandColor }} />
              )}
            </div>
          )}
          {isEditing && showAdd ? (
            <div className="flex items-start gap-3 p-3 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
              <div className="w-12 h-12 rounded-lg relative flex-shrink-0 border" style={{ background: newHex, borderColor: 'var(--border)' }}>
                <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-lg"
                  value={newHex} onChange={e => applyNew(e.target.value)} />
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                  value={newHexInput} onChange={e => applyNew(e.target.value)} placeholder="#000000" />
                <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                  value={newName} onChange={e => { setNewName(e.target.value); setNewNameTouched(true); }} placeholder="Nom" />
                {formats.includes('cmyk') && (
                  <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                    value={newCmyk} onChange={e => setNewCmyk(e.target.value)} placeholder="CMJN (ex. 0, 20, 90, 0)" />
                )}
                {formats.includes('pantone') && (
                  <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                    value={newPantone} onChange={e => setNewPantone(e.target.value)} placeholder="Pantone (ex. 137 C)" />
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={addColor} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs text-white min-w-0" style={{ background: brandColor }}>
                    <Check size={11} className="flex-shrink-0" /> <span className="truncate">Ajouter</span>
                  </button>
                  <button onClick={() => setShowAdd(false)} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs border min-w-0" style={{ borderColor: 'var(--border)' }}>
                    <X size={11} className="flex-shrink-0" /> <span className="truncate">Annuler</span>
                  </button>
                </div>
              </div>
            </div>
          ) : isEditing ? (
            <button onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Plus size={16} />
              <span className="text-xs">Ajouter une couleur</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // — Cards mode —
  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        brandId={module.brandId}
        field="colorDescription"
        value={module.colorDescription}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, colorDescription: desc })}
      />
      <ExportButtons />
      {isEditing && <ModeToggle />}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))' }}>
        {items.map((item, idx) => (
          <div key={item.id}
            data-item-id={item.id}
            onDragOver={e => onDragOver(e, idx)}
            onDrop={() => onDrop(idx)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className="transition-opacity relative"
            style={{ opacity: dragIdx === idx ? 0.4 : 1 }}
          >
            {dragOverIdx === idx && dragIdx !== null && dragIdx !== idx && (
              <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full" style={{ background: brandColor }} />
            )}
            <ColorSwatch item={item} brandColor={brandColor}
              onSave={updateItem} onDelete={() => deleteItem(item.id)} isEditing={isEditing}
              onDragStart={e => onDragStart(e, idx)} formats={formats} onToggleFormat={toggleFormat} />
          </div>
        ))}
        {isEditing && dragIdx !== null && (
          <div
            className="relative min-h-[24px]"
            onDragOver={e => { e.preventDefault(); setDragOverIdx(items.length); }}
            onDrop={onDropAtEnd}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
          >
            {dragOverIdx === items.length && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: brandColor }} />
            )}
          </div>
        )}

        {isEditing && showAdd ? (
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="h-24 relative" style={{ background: newHex, borderBottom: '1px solid var(--border)' }}>
              <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={newHex} onChange={e => applyNew(e.target.value)} />
            </div>
            <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
              <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                value={newHexInput} onChange={e => applyNew(e.target.value)} placeholder="#000000" />
              <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                value={newName} onChange={e => { setNewName(e.target.value); setNewNameTouched(true); }} placeholder="Nom" />
              {formats.includes('cmyk') && (
                <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                  value={newCmyk} onChange={e => setNewCmyk(e.target.value)} placeholder="CMJN (ex. 0, 20, 90, 0)" />
              )}
              {formats.includes('pantone') && (
                <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                  value={newPantone} onChange={e => setNewPantone(e.target.value)} placeholder="Pantone (ex. 137 C)" />
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={addColor} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs text-white min-w-0" style={{ background: brandColor }}>
                  <Check size={11} className="flex-shrink-0" /> <span className="truncate">Ajouter</span>
                </button>
                <button onClick={() => setShowAdd(false)} className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs border min-w-0" style={{ borderColor: 'var(--border)' }}>
                  <X size={11} className="flex-shrink-0" /> <span className="truncate">Annuler</span>
                </button>
              </div>
            </div>
          </div>
        ) : isEditing ? (
          <button onClick={() => setShowAdd(true)}
            className="h-full min-h-[160px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Plus size={20} />
            <span className="text-xs">Ajouter une couleur</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
