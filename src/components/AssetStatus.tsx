'use client';

import { useRef, useState } from 'react';
import { Download, History, RotateCcw, Upload } from 'lucide-react';
import type { AssetStatus, FileVersion } from '@/types';
import { STATUS_LABELS, statusOf } from '@/lib/assetStatus';
import Select from './Select';

const BADGE_STYLES: Record<AssetStatus, string> = {
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  to_validate: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  validated: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  obsolete: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

// Pastille de statut. Les fichiers validés (cas normal) n'affichent rien, sauf demande explicite.
export function StatusBadge({ status, showValidated, className = '' }: { status: AssetStatus; showValidated?: boolean; className?: string }) {
  if (status === 'validated' && !showValidated) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none ${BADGE_STYLES[status]} ${className}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function StatusSelect({ value, onChange, className = 'text-xs' }: { value: AssetStatus | undefined; onChange: (s: AssetStatus) => void; className?: string }) {
  return (
    <Select
      className={className}
      value={statusOf({ status: value })}
      onChange={v => onChange(v as AssetStatus)}
      options={(['draft', 'to_validate', 'validated', 'obsolete'] as AssetStatus[]).map(s => ({ value: s, label: STATUS_LABELS[s] }))}
    />
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Historique des versions d'un fichier : version actuelle + anciennes versions (téléchargeables, restaurables).
// `accept` filtre le sélecteur de fichier du remplacement.
export function VersionHistory({ current, versions, baseName, canEdit, accept, onReplace, onRestore }: {
  current: { filename: string; size: number };
  versions: FileVersion[];
  baseName: string;
  canEdit?: boolean;
  accept?: string;
  onReplace?: (file: File) => Promise<void> | void;
  onRestore?: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const ext = (f: string) => f.split('.').pop() ?? '';

  async function pick(file: File) {
    setBusy(true);
    try { await onReplace?.(file); } finally { setBusy(false); }
  }

  const total = versions.length + 1;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pt-2">
        <History size={12} className="text-gray-400" />
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Versions</p>
      </div>
      <ul className="space-y-1 text-xs">
        <li className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <span className="font-medium text-gray-700 dark:text-gray-200">v{total}</span>
          <span className="text-gray-400">actuelle · {formatSize(current.size)}</span>
        </li>
        {versions.map((v, i) => (
          <li key={`${v.filename}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <span className="font-medium text-gray-600 dark:text-gray-300">v{total - 1 - i}</span>
            <span className="flex-1 truncate text-gray-400">{formatDate(v.date)} · {formatSize(v.size)}</span>
            <a href={`/uploads/${v.filename}`} download={`${baseName}-v${total - 1 - i}.${ext(v.filename)}`} title="Télécharger cette version"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><Download size={12} /></a>
            {canEdit && onRestore && (
              <button onClick={() => onRestore(i)} title="Remettre cette version en service" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <RotateCcw size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && onReplace && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--border)' }}
          >
            <Upload size={12} />
            {busy ? 'Envoi…' : 'Remplacer par une nouvelle version'}
          </button>
          <input ref={inputRef} type="file" accept={accept} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ''; }} />
        </>
      )}
    </div>
  );
}
