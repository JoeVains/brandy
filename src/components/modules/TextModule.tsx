'use client';

import { useState } from 'react';
import { Module } from '@/types';
import { Check, X, Pencil } from 'lucide-react';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

export default function TextModule({ module, brandColor, onUpdate, isEditing: isEditMode }: Props) {
  const [editing, setEditing] = useState(false);
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
    <div className="relative">
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
        {module.content || <span className="text-gray-400 dark:text-gray-500 italic">Aucun texte</span>}
      </p>
      {isEditMode && (
        <button onClick={() => setEditing(true)}
          className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors">
          <Pencil size={11} /> Modifier le texte
        </button>
      )}
    </div>
  );
}
