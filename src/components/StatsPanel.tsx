'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import type { DownloadStatRow } from '@/app/api/stats/downloads/route';
import Select from './Select';

const TYPE_LABELS: Record<string, string> = {
  icons: 'Icônes', image: 'Images', attachments: 'Fichiers', typography: 'Typographie',
};

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

interface Props {
  brandId: string;
  onClose: () => void;
  onNavigate: (sectionId: string, moduleId: string, itemId?: string) => void;
}

// Quels fichiers sont réellement téléchargés, et lesquels ne le sont jamais.
export default function StatsPanel({ brandId, onClose, onNavigate }: Props) {
  const [rows, setRows] = useState<DownloadStatRow[] | null>(null);
  const [period, setPeriod] = useState<'30' | 'all'>('30');
  const [view, setView] = useState<'top' | 'never'>('top');
  const [withBulk, setWithBulk] = useState(false);

  useEffect(() => {
    fetch(`/api/stats/downloads?brandId=${brandId}`).then(r => r.json()).then(setRows).catch(() => setRows([]));
  }, [brandId]);

  // Par défaut on ne compte que les téléchargements choisis (fichier, catégorie, sélection) ; « Tout télécharger » est optionnel.
  const count = (r: DownloadStatRow) => (period === '30' ? r.last30 + (withBulk ? r.bulkLast30 : 0) : r.total + (withBulk ? r.bulkTotal : 0));
  const everDownloaded = (r: DownloadStatRow) => r.total + (withBulk ? r.bulkTotal : 0) > 0;
  const { list, never, downloaded, total } = useMemo(() => {
    const all = rows ?? [];
    const never = all.filter(r => !everDownloaded(r));
    const list = (view === 'never' ? never : all.filter(r => count(r) > 0).sort((a, b) => count(b) - count(a) || (b.last ?? '').localeCompare(a.last ?? '')));
    return { list, never, downloaded: all.length - never.length, total: all.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, period, view, withBulk]);

  const max = list.length ? Math.max(...list.map(count), 1) : 1;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-96 bg-card shadow-2xl flex flex-col border-l" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Téléchargements</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500">
            <X size={14} />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          {rows && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              <strong className="text-gray-700 dark:text-gray-200">{downloaded}</strong> fichier{downloaded > 1 ? 's' : ''} téléchargé{downloaded > 1 ? 's' : ''} sur {total}
              {' · '}<strong className="text-gray-700 dark:text-gray-200">{never.length}</strong> jamais téléchargé{never.length > 1 ? 's' : ''}
            </p>
          )}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border overflow-hidden text-xs" style={{ borderColor: 'var(--border)' }}>
              {([['top', 'Les plus téléchargés'], ['never', 'Jamais téléchargés']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setView(v)}
                  className="px-2.5 py-1.5 transition-colors"
                  style={view === v ? { background: 'var(--accent)', color: 'white' } : { color: '#6b7280' }}>
                  {label}
                </button>
              ))}
            </div>
            {view === 'top' && (
              <Select
                className="text-xs"
                value={period}
                onChange={v => setPeriod(v as '30' | 'all')}
                options={[{ value: '30', label: '30 derniers jours' }, { value: 'all', label: 'Depuis le début' }]}
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rows === null ? (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400 dark:text-gray-500">Chargement…</div>
          ) : list.length === 0 ? (
            <div className="flex items-center justify-center h-32 px-6 text-center text-xs text-gray-400 dark:text-gray-500">
              {view === 'never' ? 'Tous les fichiers ont été téléchargés au moins une fois.' : 'Aucun téléchargement sur cette période.'}
            </div>
          ) : list.map(r => (
            <button key={`${r.moduleId}-${r.itemId}`}
              onClick={() => { onNavigate(r.sectionId, r.moduleId, r.itemId === '__single' ? undefined : r.itemId); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-50 dark:bg-gray-800/50" style={{ borderColor: 'var(--border)' }}>
                {r.filename && /\.(svg|png|jpe?g|webp|gif)$/i.test(r.filename)
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`/uploads/${r.filename}`} alt="" className="w-full h-full object-contain p-1" />
                  : <Download size={13} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{r.name}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                  {r.moduleTitle || TYPE_LABELS[r.moduleType] || r.moduleType} · {r.sectionName}
                </p>
                {view === 'top' && (
                  <div className="mt-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count(r) / max) * 100}%`, background: 'var(--accent)' }} />
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {view === 'top' && <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{count(r)}</p>}
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{r.last ? `dernier : ${formatDate(r.last)}` : 'jamais'}</p>
              </div>
            </button>
          ))}
        </div>

        <label className="px-4 py-2 border-t flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <input type="checkbox" checked={withBulk} onChange={e => setWithBulk(e.target.checked)} />
          Compter aussi les « Tout télécharger »
        </label>
        <p className="px-4 py-2 border-t text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          Les téléchargements sont comptés depuis la mise en service de cette fonction. Un zip compte pour un téléchargement par fichier inclus ; les « Tout télécharger » sont comptés à part.
        </p>
      </div>
    </>,
    document.body
  );
}
