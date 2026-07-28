'use client';

import { useState, useEffect, useRef } from 'react';
import { Module, GradientItem, GradientStop } from '@/types';
import { Plus, Trash2, Check, X, Pencil, Copy, Download, ArrowLeftRight } from 'lucide-react';
import ModuleDescription from './ModuleDescription';
import { suggestGradientName } from '@/lib/gradientNames';

function HexInput({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [hex, setHex] = useState(color);
  useEffect(() => { setHex(color); }, [color]);

  function handleChange(v: string) {
    setHex(v);
    const normalized = v.startsWith('#') ? v : `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) onChange(normalized);
  }

  return (
    <input type="text" value={hex} maxLength={7}
      onChange={e => handleChange(e.target.value)}
      onBlur={() => setHex(color)}
      className="text-xs font-mono w-16 border rounded px-1.5 py-0.5 outline-none"
      style={{ borderColor: 'var(--border)' }} />
  );
}

function AngleDial({ angle, onChange }: { angle: number; onChange: (a: number) => void }) {
  const S = 34, cx = S / 2, cy = S / 2, r = S / 2 - 2.5;
  const rad = ((angle - 90) * Math.PI) / 180;
  const lx = cx + r * Math.cos(rad), ly = cy + r * Math.sin(rad);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    let deg = Math.round(Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;
    if (deg >= 360) deg -= 360;
    onChange(deg);
  }

  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}
      className="cursor-crosshair flex-shrink-0" onClick={handleClick}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={1.5} fill="#9ca3af" />
      <line x1={cx} y1={cy} x2={lx} y2={ly} stroke="#4b5563" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2.5} fill="#4b5563" />
    </svg>
  );
}

function ColorStopRow({ stop, onUpdate, onRemove, canRemove, isDragging, onDragStart, onDragOver, onDrop, onDragEnd }: {
  stop: GradientStop;
  onUpdate: (p: Partial<GradientStop>) => void;
  onRemove: () => void;
  canRemove: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}) {
  return (
    <div className="space-y-1 transition-opacity" style={{ opacity: isDragging ? 0.35 : 1 }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver?.(e); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop?.(); }}
      onDragEnd={onDragEnd}>
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <div draggable
          onDragStart={e => {
            e.dataTransfer.setData('text/plain', '');
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(img, 0, 0);
            onDragStart?.(e);
          }}
          className="flex-shrink-0 text-gray-300 dark:text-gray-500 hover:text-gray-500 transition-colors select-none"
          style={{ cursor: 'grab', fontSize: 10, letterSpacing: '-1px', lineHeight: 1 }}>
          ⠿
        </div>
        {/* Color swatch with transparent input overlaid on top */}
        <div className="relative w-6 h-6 flex-shrink-0 rounded border hover:scale-110 transition-transform"
          style={{ background: stop.color, borderColor: 'var(--border)' }}>
          <input type="color" value={stop.color}
            onChange={e => onUpdate({ color: e.target.value })}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ padding: 0, border: 'none' }} />
        </div>
        <HexInput color={stop.color} onChange={color => onUpdate({ color })} />
        <button onClick={onRemove} disabled={!canRemove}
          className="ml-auto text-gray-300 dark:text-gray-500 hover:text-red-400 disabled:opacity-20 transition-colors">
          <X size={12} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={100} value={stop.position}
          onChange={e => onUpdate({ position: Number(e.target.value) })}
          className="flex-1 h-1 accent-gray-600" />
        <input type="number" min={0} max={100} value={stop.position}
          onChange={e => { const v = Math.min(100, Math.max(0, Number(e.target.value))); onUpdate({ position: v }); }}
          className="text-xs w-10 border rounded px-1 py-0.5 outline-none text-right"
          style={{ borderColor: 'var(--border)' }} />
        <span className="text-xs text-gray-400 dark:text-gray-500">%</span>
      </div>
    </div>
  );
}

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

function gradientToCss(type: string, angle: number, stops: GradientStop[]): string {
  const s = stops.map(st => `${st.color} ${st.position}%`).join(', ');
  return type === 'radial'
    ? `radial-gradient(circle, ${s})`
    : `linear-gradient(${angle}deg, ${s})`;
}

function GradientSwatch({ item, brandColor, onSave, onDelete, onDuplicate, isEditing, onDragStart, drops, list }: {
  item: GradientItem;
  brandColor: string;
  onSave: (updated: GradientItem) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isEditing?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  drops?: boolean;
  list?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [type, setType] = useState<'linear' | 'radial'>(item.type);
  const [angle, setAngle] = useState(item.angle ?? 135);
  type StopWithId = GradientStop & { _id: string };
  function withId(s: GradientStop): StopWithId { return { ...s, _id: Math.random().toString(36).slice(2) }; }

  const [stops, setStops] = useState<StopWithId[]>(() => item.stops.map(withId));
  const [copied, setCopied] = useState(false);
  const [dragStopIdx, setDragStopIdx] = useState<number | null>(null);

  function reverseStops() {
    setStops(prev => [...prev].reverse().map(s => ({ ...s, position: 100 - s.position })));
  }

  function handleStopDragStart(idx: number) {
    setDragStopIdx(idx);
  }

  function handleStopDrop(toIdx: number) {
    if (dragStopIdx === null || dragStopIdx === toIdx) { setDragStopIdx(null); return; }
    const reordered = [...stops];
    const [moved] = reordered.splice(dragStopIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setStops(reordered);
    setDragStopIdx(null);
  }

  const css = gradientToCss(type, angle, stops);
  const savedCss = gradientToCss(item.type, item.angle ?? 135, item.stops);

  function copy() {
    navigator.clipboard.writeText(`background: ${savedCss};`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function updateStop(idx: number, patch: Partial<GradientStop>) {
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  function addStop() {
    const mid = Math.round((stops[stops.length - 1].position + stops[0].position) / 2);
    setStops(prev => [...prev, withId({ color: '#888888', position: mid })]);
  }

  function removeStop(idx: number) {
    if (stops.length <= 2) return;
    setStops(prev => prev.filter((_, i) => i !== idx));
  }

  function save() {
    onSave({ ...item, name, type, angle, stops: stops.map(({ _id, ...s }) => s) });
    setEditing(false);
  }

  function cancel() {
    setName(item.name);
    setType(item.type);
    setAngle(item.angle ?? 135);
    setStops(item.stops.map(withId));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="border rounded-xl overflow-hidden" style={{ borderColor: brandColor, outline: `2px solid ${brandColor}` }}>
        {/* Live preview */}
        <div className="h-20" style={{ background: css }} />

        <div className="p-3 bg-white dark:bg-gray-900 space-y-3">
          {/* Name */}
          <input
            className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none"
            style={{ borderColor: 'var(--border)' }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom du dégradé"
          />

          {/* Type + reverse */}
          <div className="flex items-center gap-2">
            <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
              {(['linear', 'radial'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={type === t ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
                  {t === 'linear' ? 'Linéaire' : 'Radial'}
                </button>
              ))}
            </div>
            <button onClick={reverseStops} title="Inverser le dégradé"
              className="p-1.5 rounded-lg border text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <ArrowLeftRight size={12} />
            </button>
          </div>

          {/* Angle */}
          {type === 'linear' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AngleDial angle={angle} onChange={setAngle} />
                <input type="range" min={0} max={360} value={angle}
                  onChange={e => setAngle(Number(e.target.value))}
                  className="flex-1 h-1 accent-gray-600" />
                <input type="number" min={0} max={360} value={angle}
                  onChange={e => { const v = Number(e.target.value); if (v >= 0 && v <= 360) setAngle(v); }}
                  className="text-xs w-12 border rounded px-1.5 py-0.5 outline-none text-right"
                  style={{ borderColor: 'var(--border)' }} />
                <span className="text-xs text-gray-400 dark:text-gray-500">°</span>
              </div>
            </div>
          )}

          {/* Stops */}
          <div className="space-y-2">
            {stops.map((stop, idx) => (
              <ColorStopRow key={stop._id} stop={stop}
                onUpdate={p => updateStop(idx, p)}
                onRemove={() => removeStop(idx)}
                canRemove={stops.length > 2}
                isDragging={dragStopIdx === idx}
                onDragStart={() => handleStopDragStart(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleStopDrop(idx)}
                onDragEnd={() => setDragStopIdx(null)} />
            ))}
            <button onClick={addStop}
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors">
              <Plus size={11} /> Ajouter une couleur
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex-1 flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-xs text-white min-w-0" style={{ background: brandColor }}>
              <Check size={11} className="flex-shrink-0" /> <span className="truncate">Sauvegarder</span>
            </button>
            <button onClick={cancel} className="flex-1 flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-xs border min-w-0" style={{ borderColor: 'var(--border)' }}>
              <X size={11} className="flex-shrink-0" /> <span className="truncate">Annuler</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (list) {
    return (
      <div className="flex items-center gap-3 py-2 px-2 rounded-lg group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
        <div className="w-10 h-10 rounded-lg border flex-shrink-0 transition-transform duration-200 hover:scale-105"
          style={{ background: savedCss, borderColor: 'var(--border)', cursor: isEditing ? 'grab' : 'default' }}
          draggable={isEditing} onDragStart={onDragStart} />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate flex-shrink-0 w-32">{item.name}</p>
          <button onClick={copy}
            className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex-1 justify-end min-w-0">
            <span className="font-mono text-[10px] truncate">{copied ? '✓ copié' : savedCss}</span>
            <Copy size={9} className="flex-shrink-0 opacity-0 group-hover:opacity-50" />
          </button>
        </div>
        {isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Pencil size={12} />
            </button>
            <button onClick={onDuplicate} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Copy size={12} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (drops) {
    return (
      <div className="flex flex-col items-center gap-2 group">
        <div className="w-28 h-28 rounded-full border relative transition-all duration-200 hover:scale-105 hover:shadow-md"
          style={{ background: savedCss, borderColor: 'var(--border)', cursor: isEditing ? 'grab' : 'default' }}
          draggable={isEditing} onDragStart={onDragStart}>
          {isEditing && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
              <button onClick={() => setEditing(true)}
                className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                <Pencil size={12} />
              </button>
              <button onClick={onDuplicate} className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                <Copy size={12} />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-red-500">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 text-center">{item.name}</p>
        <button onClick={copy}
          className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 transition-colors">
          <span className="font-mono">{copied ? '✓ copié' : `${item.type === 'linear' ? `${item.angle ?? 135}°` : 'Radial'}`}</span>
          <Copy size={8} className="opacity-0 group-hover:opacity-50" />
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden group transition-all duration-200 hover:scale-[1.02] hover:shadow-md" style={{ borderColor: 'var(--border)' }}>
      <div className="h-24 relative" style={{ background: savedCss, cursor: isEditing ? 'grab' : 'default' }}
        draggable={isEditing} onDragStart={onDragStart}>
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <Pencil size={12} />
            </button>
            <button onClick={onDuplicate} className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <Copy size={12} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-full bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
      <div className="p-3 bg-white dark:bg-gray-900 space-y-1.5">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
        <button onClick={copy}
          className="w-full flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 group/row transition-colors">
          <span className="font-mono text-left flex-1 truncate text-[10px]">{copied ? '✓ copié' : savedCss}</span>
          <Copy size={9} className="flex-shrink-0 opacity-0 group-hover/row:opacity-50" />
        </button>
        <p className="text-[10px] text-gray-300 dark:text-gray-500 capitalize">
          {item.type === 'linear' ? `Linéaire · ${item.angle ?? 135}°` : 'Radial'} · {item.stops.length} couleurs
        </p>
      </div>
    </div>
  );
}

export default function GradientsModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const items = module.gradientItems ?? [];
  const gradientMode = module.gradientMode ?? 'cards';

  async function setMode(newMode: 'cards' | 'drops' | 'list') {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gradientMode: newMode }),
    });
    onUpdate(await res.json());
  }

  const ModeToggle = () => (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
      <button onClick={() => setMode('cards')}
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={gradientMode === 'cards' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
        Cards
      </button>
      <button onClick={() => setMode('drops')}
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={gradientMode === 'drops' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
        Drops
      </button>
      <button onClick={() => setMode('list')}
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={gradientMode === 'list' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
        List
      </button>
    </div>
  );

  const DEFAULT_STOPS: GradientStop[] = [
    { color: '#667eea', position: 0 },
    { color: '#764ba2', position: 100 },
  ];
  const [newName, setNewName] = useState(() => suggestGradientName(DEFAULT_STOPS));
  const [newNameTouched, setNewNameTouched] = useState(false);
  const [newType, setNewType] = useState<'linear' | 'radial'>('linear');
  const [newAngle, setNewAngle] = useState(135);
  const [newStops, setNewStops] = useState<GradientStop[]>(DEFAULT_STOPS);
  const [newDragStopIdx, setNewDragStopIdx] = useState<number | null>(null);
  const [newStopIds, setNewStopIds] = useState<string[]>(() => DEFAULT_STOPS.map(() => Math.random().toString(36).slice(2)));

  const newCss = gradientToCss(newType, newAngle, newStops);

  async function patch(gradientItems: GradientItem[]) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gradientItems }),
    });
    onUpdate(await res.json());
  }

  async function addGradient() {
    const item: GradientItem = {
      id: crypto.randomUUID(),
      name: newName.trim() || 'Dégradé',
      type: newType,
      angle: newAngle,
      stops: newStops,
    };
    await patch([...items, item]);
    setNewName(suggestGradientName(DEFAULT_STOPS));
    setNewNameTouched(false);
    setNewType('linear');
    setNewAngle(135);
    setNewStops(DEFAULT_STOPS);
    setShowAdd(false);
  }

  async function updateItem(updated: GradientItem) {
    await patch(items.map(i => i.id === updated.id ? updated : i));
  }

  async function deleteItem(id: string) {
    await patch(items.filter(i => i.id !== id));
  }

  async function duplicateItem(id: string) {
    const src = items.find(i => i.id === id);
    if (!src) return;
    const copy = { ...src, id: crypto.randomUUID(), name: `${src.name} (copie)` };
    const idx = items.findIndex(i => i.id === id);
    const next = [...items];
    next.splice(idx + 1, 0, copy);
    await patch(next);
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
    await patch(reordered);
  }

  async function onDropAtEnd() {
    if (dragIdx === null || dragIdx === items.length - 1) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.push(moved);
    setDragIdx(null);
    setDragOverIdx(null);
    await patch(reordered);
  }

  function updateNewStop(idx: number, p: Partial<GradientStop>) {
    setNewStops(prev => {
      const next = prev.map((s, i) => i === idx ? { ...s, ...p } : s);
      if (!newNameTouched) setNewName(suggestGradientName(next));
      return next;
    });
  }

  function handleNewStopDrop(toIdx: number) {
    if (newDragStopIdx === null || newDragStopIdx === toIdx) { setNewDragStopIdx(null); return; }
    setNewStops(prev => {
      const reordered = [...prev];
      const [moved] = reordered.splice(newDragStopIdx, 1);
      reordered.splice(toIdx, 0, moved);
      if (!newNameTouched) setNewName(suggestGradientName(reordered));
      return reordered;
    });
    setNewStopIds(prev => {
      const reordered = [...prev];
      const [moved] = reordered.splice(newDragStopIdx, 1);
      reordered.splice(toIdx, 0, moved);
      return reordered;
    });
    setNewDragStopIdx(null);
  }

  function downloadCss() {
    const lines = items.map(i =>
      `--gradient-${i.name.toLowerCase().replace(/\s+/g, '-')}: ${gradientToCss(i.type, i.angle ?? 135, i.stops)};`
    );
    const css = `:root {\n${lines.map(l => `  ${l}`).join('\n')}\n}`;
    const blob = new Blob([css], { type: 'text/css' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${module.title || 'gradients'}.css`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const AddForm = isEditing && showAdd ? (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: brandColor, outline: `2px solid ${brandColor}` }}>
      <div className="h-20" style={{ background: newCss }} />
      <div className="p-3 bg-white dark:bg-gray-900 space-y-3">
        <input className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
          value={newName} onChange={e => { setNewName(e.target.value); setNewNameTouched(true); }} placeholder="Nom" />
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
            {(['linear', 'radial'] as const).map(t => (
              <button key={t} onClick={() => setNewType(t)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={newType === t ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
                {t === 'linear' ? 'Linéaire' : 'Radial'}
              </button>
            ))}
          </div>
          <button onClick={() => setNewStops(prev => { const next = [...prev].reverse().map(s => ({ ...s, position: 100 - s.position })); if (!newNameTouched) setNewName(suggestGradientName(next)); return next; })}
            title="Inverser le dégradé"
            className="p-1.5 rounded-lg border text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <ArrowLeftRight size={12} />
          </button>
        </div>
        {newType === 'linear' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AngleDial angle={newAngle} onChange={setNewAngle} />
              <input type="range" min={0} max={360} value={newAngle}
                onChange={e => setNewAngle(Number(e.target.value))} className="flex-1 h-1 accent-gray-600" />
              <input type="number" min={0} max={360} value={newAngle}
                onChange={e => { const v = Number(e.target.value); if (v >= 0 && v <= 360) setNewAngle(v); }}
                className="text-xs w-12 border rounded px-1.5 py-0.5 outline-none text-right"
                style={{ borderColor: 'var(--border)' }} />
              <span className="text-xs text-gray-400 dark:text-gray-500">°</span>
            </div>
          </div>
        )}
        <div className="space-y-2">
        {newStops.map((stop, idx) => (
          <ColorStopRow key={newStopIds[idx]} stop={stop}
            onUpdate={p => updateNewStop(idx, p)}
            onRemove={() => {
              setNewStops(prev => { const next = prev.filter((_, i) => i !== idx); if (!newNameTouched) setNewName(suggestGradientName(next)); return next; });
              setNewStopIds(prev => prev.filter((_, i) => i !== idx));
            }}
            canRemove={newStops.length > 2}
            isDragging={newDragStopIdx === idx}
            onDragStart={() => setNewDragStopIdx(idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleNewStopDrop(idx)}
            onDragEnd={() => setNewDragStopIdx(null)} />
        ))}
          <button onClick={() => {
            const mid = Math.round((newStops[newStops.length - 1].position + newStops[0].position) / 2);
            setNewStops(prev => { const next = [...prev, { color: '#888888', position: mid }]; if (!newNameTouched) setNewName(suggestGradientName(next)); return next; });
            setNewStopIds(prev => [...prev, Math.random().toString(36).slice(2)]);
          }} className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors">
            <Plus size={11} /> Ajouter une couleur
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={addGradient} className="flex-1 flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-xs text-white min-w-0" style={{ background: brandColor }}>
            <Check size={11} className="flex-shrink-0" /> <span className="truncate">Ajouter</span>
          </button>
          <button onClick={() => setShowAdd(false)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-xs border min-w-0" style={{ borderColor: 'var(--border)' }}>
            <X size={11} className="flex-shrink-0" /> <span className="truncate">Annuler</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const Description = (
    <ModuleDescription
      moduleId={module.id}
      value={module.description}
      isEditing={isEditing}
      onUpdate={desc => onUpdate({ ...module, description: desc })}
    />
  );

  const Toolbar = items.length > 0 ? (
    <div className="flex items-center justify-between mb-4">
      {isEditing ? <ModeToggle /> : <div />}
      <button onClick={downloadCss}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:text-gray-200 transition-colors"
        style={{ borderColor: 'var(--border)' }}>
        <Download size={10} /> .css
      </button>
    </div>
  ) : isEditing ? (
    <div className="mb-4"><ModeToggle /></div>
  ) : null;

  if (gradientMode === 'drops') {
    return (
      <div>
        {Description}
        {Toolbar}
        <div className="flex flex-wrap gap-8">
          {items.map((item, idx) => {
            const css = gradientToCss(item.type, item.angle ?? 135, item.stops);
            return (
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
                <GradientSwatch item={item} brandColor={brandColor}
                  onSave={updateItem} onDelete={() => deleteItem(item.id)} onDuplicate={() => duplicateItem(item.id)} isEditing={isEditing}
                  onDragStart={e => onDragStart(e, idx)} drops />
              </div>
            );
          })}
          {isEditing && !showAdd && (
            <button onClick={() => setShowAdd(true)}
              className="w-28 h-28 border-2 border-dashed rounded-full flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Plus size={18} />
            </button>
          )}
        </div>
        {AddForm && <div className="mt-6 max-w-xs">{AddForm}</div>}
      </div>
    );
  }

  if (gradientMode === 'list') {
    return (
      <div>
        {Description}
        {Toolbar}
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
              <GradientSwatch item={item} brandColor={brandColor}
                onSave={updateItem} onDelete={() => deleteItem(item.id)} onDuplicate={() => duplicateItem(item.id)} isEditing={isEditing}
                onDragStart={e => onDragStart(e, idx)} list />
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
          {isEditing && !showAdd && (
            <button onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Plus size={16} />
              <span className="text-xs">Ajouter un dégradé</span>
            </button>
          )}
        </div>
        {AddForm && <div className="mt-4 max-w-xs">{AddForm}</div>}
      </div>
    );
  }

  return (
    <div>
      {Description}
      {Toolbar}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
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
            <GradientSwatch item={item} brandColor={brandColor}
              onSave={updateItem} onDelete={() => deleteItem(item.id)} onDuplicate={() => duplicateItem(item.id)} isEditing={isEditing}
              onDragStart={e => onDragStart(e, idx)} />
          </div>
        ))}

        {/* Add form */}
        {AddForm}

        {isEditing && !showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="h-full min-h-[160px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Plus size={20} />
            <span className="text-xs">Ajouter un dégradé</span>
          </button>
        )}
      </div>
    </div>
  );
}
