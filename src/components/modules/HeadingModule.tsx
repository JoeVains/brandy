'use client';

import { useState } from 'react';
import { Module } from '@/types';
import ModuleDescription from './ModuleDescription';

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

  return (
    <div>
      {isEditing ? (
        <input
          className="w-full text-3xl font-bold text-gray-900 dark:text-gray-100 outline-none bg-transparent border-b-2 pb-1 focus:border-gray-400 dark:border-gray-600 border-transparent transition-colors mb-3"
          placeholder="Titre…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => save(draft)}
          onDragStart={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        />
      ) : module.content ? (
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{module.content}</h2>
      ) : (
        <p className="text-sm text-gray-300 dark:text-gray-600 italic mb-3">Aucun titre</p>
      )}
      <ModuleDescription
        moduleId={module.id}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />
    </div>
  );
}
