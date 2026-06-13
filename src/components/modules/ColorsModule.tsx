'use client';

import { useState, useEffect, useRef } from 'react';
import { Module, ColorItem } from '@/types';
import { suggestColorName } from '@/lib/colorNames';
import { hexToRgb, rgbToHsl } from '@/lib/colorUtils';
import { Plus, Trash2, Check, X, Pencil, Copy, Download } from 'lucide-react';
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
    <div className="border rounded-xl overflow-hidden group transition-all duration-200 hover:scale-[1.03] hover:shadow-md" style={{ borderColor: 'var(--border)' }}>
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
            <span className="font-mono text-left flex-1 whitespace-nowrap overflow-hidden">{copied === row.key ? '✓ copié' : row.text}</span>
            <Copy size={9} className="opacity-0 group-hover/row:opacity-50 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function DropSwatch({ item, brandColor, onSave, onDelete, isEditing }: {
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

  const rgb = hexToRgb(item.value);
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
      <div className="flex flex-col items-center gap-3 p-4 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
        <div className="w-20 h-20 rounded-full relative flex-shrink-0" style={{ background: colorValue }}>
          <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
            value={colorValue} onChange={e => applyHex(e.target.value)} />
        </div>
        <div className="w-full space-y-2">
          <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
            value={hexInput} onChange={e => applyHex(e.target.value)} placeholder="#000000" />
          <input className="w-full border rounded-lg px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
            value={name} onChange={e => { setName(e.target.value); setNameTouched(true); }} placeholder="Nom de la couleur" />
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-white" style={{ background: brandColor }}>
              <Check size={11} /> Sauvegarder
            </button>
            <button onClick={() => { setEditing(false); setHexInput(item.value); setColorValue(item.value); setName(item.name); }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>
              <X size={11} /> Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rows = [
    { label: 'HEX', text: item.value.toUpperCase(), key: 'hex' },
    { label: 'RVB', text: rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '—', key: 'rgb' },
    { label: 'TSL', text: hsl ? `${hsl.h}°, ${hsl.s}%, ${hsl.l}%` : '—', key: 'hsl' },
  ];

  return (
    <div className="flex flex-col items-center gap-3 text-center group">
      <div className="relative">
        <div className="w-20 h-20 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-md" style={{ background: item.value }} />
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/20">
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
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-800 text-center">{item.name}</p>
        {rows.map(row => (
          <button key={row.key} onClick={() => copyText(row.text, row.key)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 group/row">
            <span className="font-mono text-gray-400 text-[10px]">{row.label}</span>
            <span className="font-mono">{copied === row.key ? '✓ copié' : row.text}</span>
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
  const colorMode = module.colorMode ?? 'cards';
  const [descDraft, setDescDraft] = useState(module.colorDescription ?? '');
  const [descFocused, setDescFocused] = useState(false);
  const prevEditing = useRef(isEditing);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (prevEditing.current && !isEditing) {
      const trimmed = descDraft.trim();
      if (trimmed !== (module.colorDescription ?? '')) {
        patch({ colorDescription: trimmed });
      }
    }
    prevEditing.current = isEditing;
  }, [isEditing]);

  async function patch(data: object) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    onUpdate(await res.json());
  }

  async function setMode(newMode: 'cards' | 'drops') {
    await patch({ colorMode: newMode });
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
    await patch({ colorItems: [...items, item] });
    setNewHex('#000000');
    setNewHexInput('#000000');
    setNewName(suggestColorName('#000000'));
    setNewNameTouched(false);
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
    reordered.splice(idx, 0, moved);
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
      <span className="text-xs text-gray-400 mr-1">Exporter :</span>
      {(['scss', 'less', 'ase'] as const).map(fmt => (
        <button key={fmt} onClick={() => downloadExport(fmt)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          style={{ borderColor: 'var(--border)' }}>
          <Download size={10} />
          .{fmt}
        </button>
      ))}
    </div>
  ) : null;

  const ModeToggle = () => (
    <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
      <button onClick={() => setMode('cards')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={colorMode === 'cards' ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}>
        Cards
      </button>
      <button onClick={() => setMode('drops')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={colorMode === 'drops' ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}>
        Drops
      </button>
    </div>
  );

  if (colorMode === 'drops') {
    return (
      <div>
        {isEditing ? (
          <textarea
            className="w-full text-sm text-gray-500 resize-none outline-none rounded-lg px-3 py-2 mb-4 transition-colors"
            style={descFocused ? { background: '#f9fafb', border: '1px solid var(--border)' } : { background: 'transparent', border: '1px solid transparent' }}
            rows={2}
            placeholder="Ajouter une description…"
            value={descDraft}
            onChange={e => setDescDraft(e.target.value)}
            onFocus={() => setDescFocused(true)}
            onBlur={() => setDescFocused(false)}
            onDragStart={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          />
        ) : module.colorDescription ? (
          <p className="text-sm text-gray-500 mb-4">{module.colorDescription}</p>
        ) : null}
        <ExportButtons />
        {isEditing && <ModeToggle />}
        <div className="flex flex-wrap gap-8">
          {items.map((item, idx) => (
            <div key={item.id}
              draggable={isEditing}
              onDragStart={e => onDragStart(e, idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              className="transition-opacity"
              style={{ opacity: dragIdx === idx ? 0.4 : 1, cursor: isEditing ? 'grab' : 'default', outline: dragOverIdx === idx && dragIdx !== idx ? '2px solid var(--accent)' : undefined, borderRadius: 999 }}
            >
              <DropSwatch item={item} brandColor={brandColor}
                onSave={updateItem} onDelete={() => deleteItem(item.id)} isEditing={isEditing} />
            </div>
          ))}
          {isEditing && showAdd ? (
            <div className="flex flex-col items-center gap-3 p-4 border rounded-xl" style={{ borderColor: 'var(--border)' }}>
              <div className="w-20 h-20 rounded-full relative" style={{ background: newHex }}>
                <input type="color" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                  value={newHex} onChange={e => applyNew(e.target.value)} />
              </div>
              <div className="w-full space-y-2">
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
              className="w-28 h-28 border-2 border-dashed rounded-full flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Plus size={18} />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // — Cards mode —
  return (
    <div>
      <ExportButtons />
      {isEditing ? (
        <textarea
          className="w-full text-sm text-gray-500 resize-none outline-none rounded-lg px-3 py-2 mb-4 transition-colors"
          style={descFocused ? { background: '#f9fafb', border: '1px solid var(--border)' } : { background: 'transparent', border: '1px solid transparent' }}
          rows={2}
          placeholder="Ajouter une description…"
          value={descDraft}
          onChange={e => setDescDraft(e.target.value)}
          onFocus={() => setDescFocused(true)}
          onBlur={() => setDescFocused(false)}
          onDragStart={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        />
      ) : module.colorDescription ? (
        <p className="text-sm text-gray-500 mb-4">{module.colorDescription}</p>
      ) : null}
      {isEditing && <ModeToggle />}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))' }}>
        {items.map((item, idx) => (
          <div key={item.id}
            draggable={isEditing}
            onDragStart={e => onDragStart(e, idx)}
            onDragOver={e => onDragOver(e, idx)}
            onDrop={() => onDrop(idx)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className="transition-opacity"
            style={{ opacity: dragIdx === idx ? 0.4 : 1, cursor: isEditing ? 'grab' : 'default', outline: dragOverIdx === idx && dragIdx !== idx ? '2px solid var(--accent)' : undefined, borderRadius: 12 }}
          >
            <ColorSwatch item={item} brandColor={brandColor}
              onSave={updateItem} onDelete={() => deleteItem(item.id)} isEditing={isEditing} />
          </div>
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
