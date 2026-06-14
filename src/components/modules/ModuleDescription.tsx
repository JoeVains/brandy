'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  moduleId: string;
  value: string | undefined;
  isEditing?: boolean;
  onUpdate: (description: string) => void;
}

export default function ModuleDescription({ moduleId, value, isEditing, onUpdate }: Props) {
  const [draft, setDraft] = useState(value ?? '');
  const [focused, setFocused] = useState(false);
  const prevEditing = useRef(isEditing);

  useEffect(() => {
    if (prevEditing.current && !isEditing) {
      const trimmed = draft.trim();
      if (trimmed !== (value ?? '')) {
        fetch(`/api/modules/${moduleId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ description: trimmed }),
        }).then(r => r.json()).then(updated => onUpdate(updated.description ?? ''));
      }
    }
    prevEditing.current = isEditing;
  }, [isEditing]);

  if (isEditing) {
    return (
      <textarea
        className="w-full text-sm text-gray-500 dark:text-gray-300 resize-none outline-none rounded-lg px-3 py-2 mb-4 transition-colors"
        style={focused ? { background: '#f9fafb', border: '1px solid var(--border)' } : { background: 'transparent', border: '1px solid transparent' }}
        rows={2}
        placeholder="Ajouter une description…"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onDragStart={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      />
    );
  }

  return value ? <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">{value}</p> : null;
}
