'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import type { BulkFormat } from './rendering';

// Choix du format (et de la taille pour PNG/WebP) avant un téléchargement groupé.
export default function BulkExportMenu({ label, busy, onClose, onConfirm, align = 'right' }: {
  align?: 'left' | 'right';
  label: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (format: BulkFormat, size: number) => void;
}) {
  const [format, setFormat] = useState<BulkFormat>('svg');
  const [size, setSize] = useState(1024);
  const ref = useRef<HTMLDivElement>(null);
  const isRaster = format === 'png' || format === 'webp';

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest('[data-bulk-trigger]')) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div ref={ref} className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-1.5 z-30 w-64 rounded-xl border shadow-lg p-3`}
      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">{label}</p>
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {(['svg', 'pdf', 'png', 'webp'] as BulkFormat[]).map(f => (
          <button key={f} onClick={() => setFormat(f)}
            className="flex items-center justify-center px-2 py-1.5 rounded-lg border text-xs uppercase transition-colors"
            style={format === f
              ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'white' }
              : { borderColor: 'var(--border)', color: '#6b7280' }}>
            {f}
          </button>
        ))}
      </div>
      <div className="relative mb-2">
        <input type="number" min={1} max={4096} value={size} disabled={!isRaster}
          onChange={e => setSize(Math.max(1, Math.min(4096, Number(e.target.value) || 0)))}
          className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border outline-none bg-white dark:bg-gray-900 focus:border-gray-400 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--border)' }} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">px</span>
      </div>
      <button onClick={() => onConfirm(format, size)} disabled={busy || (isRaster && !size)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
        style={{ background: 'var(--accent)' }}>
        <Download size={12} /> {busy ? 'Génération…' : 'Télécharger (.zip)'}
      </button>
    </div>
  );
}
