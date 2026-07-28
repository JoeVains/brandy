'use client';

import { useRef } from 'react';
import { Module, AttachmentItem } from '@/types';
import { Paperclip, Download, Trash2, Plus } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const items = module.attachmentItems ?? [];

  async function upload(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'attachment');
    fd.append('name', file.name);
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  async function deleteItem(id: string) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    // Remove from attachmentItems list via PATCH
    const newItems = items.filter(i => i.id !== id);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attachmentItems: newItems }),
    });
    onUpdate(await res.json());
  }

  function getIcon(mimeType: string) {
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '🗜️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    return '📎';
  }

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        brandId={module.brandId}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} data-item-id={item.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50 dark:bg-gray-800/50 group" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xl">{getIcon(item.mimeType)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{formatSize(item.size)}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={`/uploads/${item.filename}`} download={item.name}
              className="p-1.5 rounded-lg border hover:bg-white dark:bg-gray-900 transition-colors text-gray-500" style={{ borderColor: 'var(--border)' }}>
              <Download size={13} />
            </a>
            {isEditing && (
              <button onClick={() => deleteItem(item.id)}
                className="p-1.5 rounded-lg border hover:bg-red-50 hover:text-red-500 transition-colors text-gray-500" style={{ borderColor: 'var(--border)' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
      {isEditing && (
        <>
          <button onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Plus size={16} /> Ajouter un fichier
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </>
      )}
    </div>
    </div>
  );
}
