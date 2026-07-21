'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, DatabaseBackup } from 'lucide-react';

interface BackupInfo {
  id: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface Props { onClose: () => void; onRestored: () => void }

export default function BackupsPanel({ onClose, onRestored }: Props) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/backups').then(r => r.json()).then(data => { setBackups(data); setLoading(false); });
  }, []);

  async function restore(id: string) {
    if (!confirm('Restaurer cette sauvegarde ? Toutes les données actuelles seront remplacées par celles de cette sauvegarde.')) return;
    setRestoringId(id);
    await fetch(`/api/backups/${id}/restore`, { method: 'POST' });
    setRestoringId(null);
    onRestored();
    onClose();
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-card shadow-2xl flex flex-col border-l"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sauvegardes</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
            <X size={14} />
          </button>
        </div>

        <p className="px-4 pt-3 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          Une sauvegarde automatique est créée toutes les heures en cas de changement. Les 5 dernières sont conservées.
        </p>

        <div className="flex-1 overflow-y-auto mt-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400 dark:text-gray-500">Chargement…</div>
          ) : backups.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400 dark:text-gray-500">Aucune sauvegarde pour le moment</div>
          ) : (
            <div className="py-2">
              {backups.map(backup => (
                <div key={backup.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: 'var(--accent)' }}>
                    <DatabaseBackup size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatDate(backup.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => restore(backup.id)}
                    disabled={restoringId !== null}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 flex-shrink-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <RotateCcw size={11} /> {restoringId === backup.id ? 'Restauration…' : 'Restaurer'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
