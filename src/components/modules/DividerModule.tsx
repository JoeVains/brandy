'use client';

import { useState } from 'react';
import { Module } from '@/types';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

const THICKNESSES = [1, 2, 3, 4, 6, 8, 12, 16, 20, 24];
const DIVIDER_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4', '#111827',
];

export function DividerLine({ module }: { module: Module }) {
  const thickness = module.dividerThickness ?? 1;
  return (
    <div className="w-full" style={{ height: thickness, background: module.dividerColor ?? 'var(--border)', borderRadius: 9999 }} />
  );
}

export function DividerControls({ module, onUpdate }: { module: Module; onUpdate: (updated: Module) => void }) {
  const thickness = module.dividerThickness ?? 1;
  const color = module.dividerColor;
  const [hexInput, setHexInput] = useState((color ?? '').replace('#', ''));

  async function patch(data: object) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    onUpdate(await res.json());
  }

  function applyHex(hex: string) {
    const val = hex.replace(/[^0-9a-fA-F]/g, '');
    setHexInput(val);
    if (val.length === 6) patch({ dividerColor: '#' + val });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">Épaisseur :</span>
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit flex-wrap">
          {THICKNESSES.map(t => (
            <button key={t} onClick={() => patch({ dividerThickness: t })}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={t === thickness ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}>
              {t}px
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">Couleur :</span>
        <button
          onClick={() => patch({ dividerColor: null })}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-transform ${!color ? 'scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : 'hover:scale-110'}`}
          style={{ background: 'var(--border)', borderColor: 'var(--card-bg)' }}
          title="Par défaut"
        />
        <div className="flex gap-1.5">
          {DIVIDER_COLORS.map(c => (
            <button key={c}
              className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : 'hover:scale-110'}`}
              style={{ background: c }}
              onClick={() => { patch({ dividerColor: c }); setHexInput(c.replace('#', '')); }} />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={color ?? '#000000'}
            onChange={e => { patch({ dividerColor: e.target.value }); setHexInput(e.target.value.replace('#', '')); }}
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
    </div>
  );
}

export default function DividerModule({ module, onUpdate, isEditing }: Props) {
  return (
    <div>
      <DividerLine module={module} />
      {isEditing && (
        <div className="mt-4">
          <DividerControls module={module} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}
