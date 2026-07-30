'use client';

import { useState } from 'react';
import { Module, ButtonItem } from '@/types';
import { Check, X, Pencil, Trash2, Plus, ExternalLink, GripVertical, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

const BUTTON_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4', '#111827',
];

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const ALIGN_TO_JUSTIFY: Record<'left' | 'center' | 'right', string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

function ButtonForm({ initial, brandColor, onSave, onCancel }: {
  initial: { label: string; url: string; color: string };
  brandColor: string;
  onSave: (v: { label: string; url: string; color: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [url, setUrl] = useState(initial.url);
  const [color, setColor] = useState(initial.color);
  const [hexInput, setHexInput] = useState(initial.color.replace('#', ''));

  function applyHex(hex: string) {
    const val = hex.replace(/[^0-9a-fA-F]/g, '');
    setHexInput(val);
    if (val.length === 6) setColor('#' + val);
  }

  return (
    <div className="p-3 border rounded-xl space-y-2.5" style={{ borderColor: 'var(--border)' }}>
      <input
        autoFocus
        className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none"
        style={{ borderColor: 'var(--border)' }}
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Texte du bouton"
      />
      <input
        className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none"
        style={{ borderColor: 'var(--border)' }}
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://exemple.com"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {BUTTON_COLORS.map(c => (
            <button key={c}
              className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : 'hover:scale-110'}`}
              style={{ background: c }}
              onClick={() => { setColor(c); setHexInput(c.replace('#', '')); }} />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={color}
            onChange={e => { setColor(e.target.value); setHexInput(e.target.value.replace('#', '')); }}
            className="w-6 h-6 rounded-lg cursor-pointer border-0 p-0 flex-shrink-0"
          />
          <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <span className="px-1.5 text-xs text-gray-400 dark:text-gray-500 font-mono select-none">#</span>
            <input
              className="w-16 py-1 pr-1.5 text-xs font-mono outline-none bg-transparent"
              style={{ color: 'var(--text-primary)' }}
              value={hexInput}
              maxLength={6}
              placeholder="b14100"
              onChange={e => applyHex(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ label: label.trim() || 'Cliquez ici', url: normalizeUrl(url), color })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white"
          style={{ background: brandColor }}
        >
          <Check size={12} /> Sauvegarder
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>
          <X size={12} /> Annuler
        </button>
      </div>
    </div>
  );
}

export default function ButtonModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const items = module.buttonItems ?? [];
  const align = module.buttonAlign ?? 'left';
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  async function patch(data: Partial<Module>) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    onUpdate(await res.json());
  }

  function setAlign(value: 'left' | 'center' | 'right') {
    patch({ buttonAlign: value });
  }

  function addButton(v: { label: string; url: string; color: string }) {
    const item: ButtonItem = { id: crypto.randomUUID(), ...v };
    patch({ buttonItems: [...items, item] });
    setShowAdd(false);
  }

  function updateButton(id: string, v: { label: string; url: string; color: string }) {
    patch({ buttonItems: items.map(i => i.id === id ? { ...i, ...v } : i) });
    setEditingId(null);
  }

  function deleteButton(id: string) {
    patch({ buttonItems: items.filter(i => i.id !== id) });
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
    await patch({ buttonItems: reordered });
  }

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        brandId={module.brandId}
        field="buttonDescription"
        value={module.buttonDescription}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, buttonDescription: desc })}
      />

      {!isEditing ? (
        items.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Aucun bouton</p>
        ) : (
          <div className="flex flex-wrap gap-3" style={{ justifyContent: ALIGN_TO_JUSTIFY[align] }}>
            {items.map(item => (
              item.url ? (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
                  style={{ background: item.color }}
                >
                  {item.label}
                  <ExternalLink size={14} />
                </a>
              ) : (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white opacity-70"
                  style={{ background: item.color }}
                >
                  {item.label}
                </span>
              )
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Alignement :</label>
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
              <button onClick={() => setAlign('left')}
                className="p-1.5 rounded-md transition-colors"
                title="Aligné à gauche"
                style={align === 'left' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
                <AlignLeft size={13} />
              </button>
              <button onClick={() => setAlign('center')}
                className="p-1.5 rounded-md transition-colors"
                title="Centré"
                style={align === 'center' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
                <AlignCenter size={13} />
              </button>
              <button onClick={() => setAlign('right')}
                className="p-1.5 rounded-md transition-colors"
                title="Aligné à droite"
                style={align === 'right' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
                <AlignRight size={13} />
              </button>
            </div>
          </div>
          {items.map((item, idx) => (
            <div key={item.id} className="relative">
              {dragOverIdx === idx && dragIdx !== null && dragIdx !== idx && (
                <div className="absolute left-2 right-2 -top-1 h-0.5 rounded-full z-10" style={{ background: brandColor }} />
              )}
              {editingId === item.id ? (
                <ButtonForm
                  initial={{ label: item.label, url: item.url, color: item.color }}
                  brandColor={brandColor}
                  onSave={v => updateButton(item.id, v)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  className="flex items-center gap-3 p-2.5 border rounded-xl group transition-opacity"
                  style={{ borderColor: 'var(--border)', opacity: dragIdx === idx ? 0.4 : 1 }}
                  onDragOver={e => onDragOver(e, idx)}
                  onDrop={() => onDrop(idx)}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                >
                  <div
                    draggable
                    onDragStart={e => onDragStart(e, idx)}
                    className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
                  >
                    <GripVertical size={14} />
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0"
                    style={{ background: item.color }}
                  >
                    {item.label}
                    {item.url && <ExternalLink size={12} />}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate flex-1">{item.url || 'Aucun lien'}</span>
                  <button onClick={() => setEditingId(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => deleteButton(item.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <ButtonForm
              initial={{ label: 'Cliquez ici', url: '', color: brandColor }}
              brandColor={brandColor}
              onSave={addButton}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <Plus size={16} />
              <span className="text-xs">Ajouter un bouton</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
