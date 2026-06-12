'use client';

import { useState } from 'react';
import { Module } from '@/types';
import { Check, X, Pencil } from 'lucide-react';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
}

export default function TextModule({ module, brandColor, onUpdate }: Props) {
  const [editing, setEditing] = useState(!module.content);
  const [draft, setDraft] = useState(module.content ?? '');

  async function save() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: draft }),
    });
    onUpdate(await res.json());
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none min-h-[120px]"
          style={{ borderColor: 'var(--border)' }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Saisissez votre texte ici..."
        />
        <div className="flex gap-2">
          <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: brandColor }}>
            <Check size={13} /> Sauvegarder
          </button>
          <button onClick={() => { setDraft(module.content ?? ''); setEditing(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: 'var(--border)' }}>
            <X size={13} /> Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{module.content || <span className="text-gray-400 italic">Aucun texte</span>}</p>
      <button onClick={() => setEditing(true)}
        className="absolute top-0 right-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-700 bg-white border"
        style={{ borderColor: 'var(--border)' }}>
        <Pencil size={13} />
      </button>
    </div>
  );
}
