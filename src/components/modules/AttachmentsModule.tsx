'use client';

import { useRef, useState } from 'react';
import { Module, AttachmentItem, AssetStatus } from '@/types';
import { Download, Trash2, Plus, History } from 'lucide-react';
import { StatusBadge, StatusSelect, VersionHistory } from '../AssetStatus';
import { restoreVersion, statusOf, visibleItems } from '@/lib/assetStatus';
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
  const [showObsolete, setShowObsolete] = useState(false);
  const [openVersions, setOpenVersions] = useState<string | null>(null);
  const obsoleteCount = items.filter(i => statusOf(i) === 'obsolete').length;
  const shown = visibleItems(items, !!isEditing, showObsolete);

  async function patchItems(next: AttachmentItem[]) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attachmentItems: next }),
    });
    onUpdate(await res.json());
  }

  async function setStatus(id: string, status: AssetStatus) {
    await patchItems(items.map(i => {
      if (i.id !== id) return i;
      const { status: _old, ...rest } = i;
      return status === 'validated' ? rest : { ...rest, status };
    }));
  }

  // Remplace le fichier ; l'ancienne version reste dans l'historique.
  async function replaceFile(id: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'attachment');
    fd.append('replaceItemId', id);
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    if (res.ok) onUpdate(await res.json());
    else alert('Le remplacement du fichier a échoué.');
  }

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
      {!isEditing && obsoleteCount > 0 && (
        <button onClick={() => setShowObsolete(o => !o)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          {showObsolete ? 'Masquer' : 'Afficher'} les obsolètes ({obsoleteCount})
        </button>
      )}
      {shown.map(item => (
        <div key={item.id}>
        <div data-item-id={item.id} className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50 dark:bg-gray-800/50 group" style={{ borderColor: 'var(--border)', opacity: statusOf(item) === 'obsolete' ? 0.6 : 1 }}>
          <span className="text-xl">{getIcon(item.mimeType)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {item.name} <StatusBadge status={statusOf(item)} className="ml-1 align-middle" />
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{formatSize(item.size)}</p>
          </div>
          {isEditing && <StatusSelect value={item.status} onChange={st => setStatus(item.id, st)} />}
          {(isEditing || (item.versions ?? []).length > 0) && (
            <button onClick={() => setOpenVersions(v => v === item.id ? null : item.id)} title="Versions"
              className="p-1.5 rounded-lg border hover:bg-white dark:bg-gray-900 transition-colors text-gray-500" style={{ borderColor: 'var(--border)' }}>
              <History size={13} />
            </button>
          )}
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
        {openVersions === item.id && (
          <div className="mt-1 ml-9 mr-1 p-3 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <VersionHistory
              current={item}
              versions={item.versions ?? []}
              baseName={item.name}
              canEdit={isEditing}
              onReplace={file => replaceFile(item.id, file)}
              onRestore={i => patchItems(items.map(a => a.id === item.id ? restoreVersion(a, i) : a))}
            />
          </div>
        )}
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
