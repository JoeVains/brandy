'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Pencil, Trash2, FolderPlus, Folder, Tag } from 'lucide-react';
import type { HistoryEntry, HistoryAction } from '@/lib/history';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'à l\'instant';
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const ACTION_META: Record<HistoryAction, { label: string; icon: React.ReactNode; color: string }> = {
  'module.create':  { label: 'Module ajouté',      icon: <Plus size={11} />,      color: '#22c55e' },
  'module.edit':    { label: 'Module modifié',      icon: <Pencil size={11} />,    color: '#3b82f6' },
  'module.delete':  { label: 'Module supprimé',     icon: <Trash2 size={11} />,    color: '#ef4444' },
  'section.create': { label: 'Rubrique créée',      icon: <FolderPlus size={11} />,color: '#22c55e' },
  'section.edit':   { label: 'Rubrique renommée',   icon: <Folder size={11} />,    color: '#3b82f6' },
  'section.delete': { label: 'Rubrique supprimée',  icon: <Trash2 size={11} />,    color: '#ef4444' },
  'brand.create':   { label: 'Marque créée',        icon: <Tag size={11} />,       color: '#22c55e' },
  'brand.edit':     { label: 'Marque modifiée',     icon: <Pencil size={11} />,    color: '#3b82f6' },
  'brand.delete':   { label: 'Marque supprimée',    icon: <Trash2 size={11} />,    color: '#ef4444' },
};

interface Props { onClose: () => void }

export default function HistoryPanel({ onClose }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(data => { setEntries(data); setLoading(false); });
  }, []);

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-card shadow-2xl flex flex-col border-l"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Historique</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400 dark:text-gray-500">Chargement…</div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400 dark:text-gray-500">Aucun historique</div>
          ) : (
            <div className="py-2">
              {entries.map((entry, i) => {
                const meta = ACTION_META[entry.action];
                return (
                  <div key={entry.id} className="flex gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: meta.color }}>
                        {meta.icon}
                      </div>
                      {i < entries.length - 1 && (
                        <div className="w-px flex-1 mt-1 mb-0" style={{ background: 'var(--border)', minHeight: 12 }} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{meta.label}</p>
                      {entry.entityName && (
                        <p className="text-xs text-gray-500 truncate">
                          {entry.entityName}
                          {entry.entityType && <span className="text-gray-300 dark:text-gray-600 ml-1">· {entry.entityType}</span>}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {entry.brandName && (
                          <span className="text-[10px] text-gray-300 dark:text-gray-600 truncate">{entry.brandName}</span>
                        )}
                        {entry.brandName && entry.sectionName && (
                          <span className="text-[10px] text-gray-200 dark:text-gray-700">·</span>
                        )}
                        {entry.sectionName && (
                          <span className="text-[10px] text-gray-300 dark:text-gray-600 truncate">{entry.sectionName}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">{relativeTime(entry.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
