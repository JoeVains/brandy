'use client';

import { useState } from 'react';
import { Module, GradientItem, GradientStop } from '@/types';
import { Plus, Trash2, Check, X, Pencil, Copy, Download } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

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

function GradientSwatch({ item, brandColor, onSave, onDelete, isEditing }: {
  item: GradientItem;
  brandColor: string;
  onSave: (updated: GradientItem) => void;
  onDelete: () => void;
  isEditing?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [type, setType] = useState<'linear' | 'radial'>(item.type);
  const [angle, setAngle] = useState(item.angle ?? 135);
  const [stops, setStops] = useState<GradientStop[]>(item.stops);
  const [copied, setCopied] = useState(false);

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
    setStops(prev => [...prev, { color: '#888888', position: mid }]);
  }

  function removeStop(idx: number) {
    if (stops.length <= 2) return;
    setStops(prev => prev.filter((_, i) => i !== idx));
  }

  function save() {
    onSave({ ...item, name, type, angle, stops });
    setEditing(false);
  }

  function cancel() {
    setName(item.name);
    setType(item.type);
    setAngle(item.angle ?? 135);
    setStops(item.stops);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="border rounded-xl overflow-hidden" style={{ borderColor: brandColor, outline: `2px solid ${brandColor}` }}>
        {/* Live preview */}
        <div className="h-20" style={{ background: css }} />

        <div className="p-3 bg-white space-y-3">
          {/* Name */}
          <input
            className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none"
            style={{ borderColor: 'var(--border)' }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom du dégradé"
          />

          {/* Type + angle */}
          <div className="flex items-center gap-2">
            <div className="flex p-0.5 bg-gray-100 rounded-lg">
              {(['linear', 'radial'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={type === t ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}>
                  {t === 'linear' ? 'Linéaire' : 'Radial'}
                </button>
              ))}
            </div>
            {type === 'linear' && (
              <div className="flex items-center gap-1.5 flex-1">
                <input type="range" min={0} max={360} value={angle}
                  onChange={e => setAngle(Number(e.target.value))}
                  className="flex-1 h-1 accent-gray-600" />
                <span className="text-xs text-gray-500 w-10 text-right">{angle}°</span>
              </div>
            )}
          </div>

          {/* Stops */}
          <div className="space-y-2">
            {stops.map((stop, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="color" value={stop.color} onChange={e => updateStop(idx, { color: e.target.value })}
                  className="w-7 h-7 rounded-md border cursor-pointer p-0.5" style={{ borderColor: 'var(--border)' }} />
                <span className="text-xs text-gray-400 font-mono w-14">{stop.color}</span>
                <input type="range" min={0} max={100} value={stop.position}
                  onChange={e => updateStop(idx, { position: Number(e.target.value) })}
                  className="flex-1 h-1 accent-gray-600" />
                <span className="text-xs text-gray-500 w-8 text-right">{stop.position}%</span>
                <button onClick={() => removeStop(idx)} disabled={stops.length <= 2}
                  className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
            <button onClick={addStop}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
              <Plus size={11} /> Ajouter une couleur
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={save} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-white" style={{ background: brandColor }}>
              <Check size={11} /> Sauvegarder
            </button>
            <button onClick={cancel} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>
              <X size={11} /> Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden group transition-all duration-200 hover:scale-[1.02] hover:shadow-md" style={{ borderColor: 'var(--border)' }}>
      <div className="h-24 relative" style={{ background: savedCss }}>
        {isEditing && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-700">
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-full bg-white/80 hover:bg-white text-red-500">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
      <div className="p-3 bg-white space-y-1.5">
        <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
        <button onClick={copy}
          className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 group/row transition-colors">
          <span className="font-mono text-left flex-1 truncate text-[10px]">{copied ? '✓ copié' : savedCss}</span>
          <Copy size={9} className="flex-shrink-0 opacity-0 group-hover/row:opacity-50" />
        </button>
        <p className="text-[10px] text-gray-300 capitalize">
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

  const DEFAULT_STOPS: GradientStop[] = [
    { color: '#667eea', position: 0 },
    { color: '#764ba2', position: 100 },
  ];
  const [newName, setNewName] = useState('Nouveau dégradé');
  const [newType, setNewType] = useState<'linear' | 'radial'>('linear');
  const [newAngle, setNewAngle] = useState(135);
  const [newStops, setNewStops] = useState<GradientStop[]>(DEFAULT_STOPS);

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
    setNewName('Nouveau dégradé');
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
    await patch(reordered);
  }

  function updateNewStop(idx: number, p: Partial<GradientStop>) {
    setNewStops(prev => prev.map((s, i) => i === idx ? { ...s, ...p } : s));
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

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />

      {items.length > 0 && (
        <div className="flex justify-end mb-4">
          <button onClick={downloadCss}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Download size={10} /> .css
          </button>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {items.map((item, idx) => (
          <div key={item.id}
            draggable={isEditing}
            onDragStart={e => onDragStart(e, idx)}
            onDragOver={e => onDragOver(e, idx)}
            onDrop={() => onDrop(idx)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className="transition-opacity"
            style={{ opacity: dragIdx === idx ? 0.4 : 1, cursor: isEditing ? 'grab' : 'default', outline: dragOverIdx === idx && dragIdx !== idx ? `2px solid ${brandColor}` : undefined, borderRadius: 12 }}
          >
            <GradientSwatch item={item} brandColor={brandColor}
              onSave={updateItem} onDelete={() => deleteItem(item.id)} isEditing={isEditing} />
          </div>
        ))}

        {/* Add form */}
        {isEditing && showAdd && (
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="h-16" style={{ background: newCss }} />
            <div className="p-3 bg-white space-y-2.5">
              <input className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none" style={{ borderColor: 'var(--border)' }}
                value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom" />
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 bg-gray-100 rounded-lg">
                  {(['linear', 'radial'] as const).map(t => (
                    <button key={t} onClick={() => setNewType(t)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors"
                      style={newType === t ? { background: 'white', color: '#111' } : { color: '#6b7280' }}>
                      {t === 'linear' ? 'Linéaire' : 'Radial'}
                    </button>
                  ))}
                </div>
                {newType === 'linear' && (
                  <div className="flex items-center gap-1 flex-1">
                    <input type="range" min={0} max={360} value={newAngle}
                      onChange={e => setNewAngle(Number(e.target.value))} className="flex-1 h-1 accent-gray-600" />
                    <span className="text-[10px] text-gray-500 w-8 text-right">{newAngle}°</span>
                  </div>
                )}
              </div>
              {newStops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="color" value={stop.color} onChange={e => updateNewStop(idx, { color: e.target.value })}
                    className="w-6 h-6 rounded border cursor-pointer p-0.5" style={{ borderColor: 'var(--border)' }} />
                  <input type="range" min={0} max={100} value={stop.position}
                    onChange={e => updateNewStop(idx, { position: Number(e.target.value) })} className="flex-1 h-1 accent-gray-600" />
                  <span className="text-[10px] text-gray-400 w-7 text-right">{stop.position}%</span>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={addGradient} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-white" style={{ background: brandColor }}>
                  <Check size={11} /> Ajouter
                </button>
                <button onClick={() => setShowAdd(false)} className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>
                  <X size={11} /> Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditing && !showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="h-full min-h-[160px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Plus size={20} />
            <span className="text-xs">Ajouter un dégradé</span>
          </button>
        )}
      </div>
    </div>
  );
}
