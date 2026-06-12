'use client';

import { useState } from 'react';
import { Module } from '@/types';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

export default function HeadingModule({ module, onUpdate, isEditing }: Props) {
  const [draft, setDraft] = useState(module.content ?? '');

  async function save(value: string) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: value.trim() }),
    });
    onUpdate(await res.json());
  }

  if (isEditing) {
    return (
      <input
        className="w-full text-3xl font-bold text-gray-900 outline-none bg-transparent border-b-2 pb-1 focus:border-gray-400 border-transparent transition-colors"
        placeholder="Titre…"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => save(draft)}
        onDragStart={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      />
    );
  }

  return module.content
    ? <h2 className="text-3xl font-bold text-gray-900">{module.content}</h2>
    : <p className="text-sm text-gray-300 italic">Aucun titre</p>;
}
