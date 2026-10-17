'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IconItem, AssetStatus } from '@/types';
import { Trash2, Download, Check, X, Pencil } from 'lucide-react';
import { trackDownload } from '@/lib/trackDownload';
import { statusOf } from '@/lib/assetStatus';
import { recolorSvg } from '@/lib/svg';
import { StatusBadge, StatusSelect, VersionHistory } from '../../AssetStatus';
import { type RasterFormat, formatSize, downloadRaster } from './rendering';
import { toPickerValue, sameColor } from './colorUtils';
import { PaletteSwatches, useBrandPalettes } from './palettes';
import { byAlpha } from './utils';

export default function IconInspector({ item, moduleId, brandId, shareToken, paletteId, onPaletteChange, onKeywordsChange, onRename, allKeywords, onStatusChange, onReplaceFile, onRestoreVersion, initialColor, onClose, onDelete, isEditing: moduleEditing }: {
  shareToken?: string;
  paletteId: string | null;
  onPaletteChange: (id: string) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onRename: (name: string) => void;
  allKeywords: string[];
  onStatusChange: (status: AssetStatus) => void;
  onReplaceFile: (file: File) => Promise<void>;
  onRestoreVersion: (index: number) => void;
  item: IconItem;
  initialColor: string | null;
  moduleId: string;
  brandId: string;
  onClose: () => void;
  onDelete: () => void;
  isEditing?: boolean;
}) {
  // Édition locale à l'inspecteur : permet de modifier une icône sans passer le module entier en mode édition.
  const [localEdit, setLocalEdit] = useState(false);
  const isEditing = moduleEditing || localEdit;
  const [keywordDraft, setKeywordDraft] = useState('');
  const [suggestIdx, setSuggestIdx] = useState(-1);  // -1 : aucune suggestion en surbrillance, Entrée valide la saisie telle quelle
  const [nameDraft, setNameDraft] = useState(item.name);
  useEffect(() => { setNameDraft(item.name); }, [item.id, item.name]);
  const [rasterSize, setRasterSize] = useState(1024);
  const [format, setFormat] = useState<'svg' | 'pdf' | RasterFormat>('svg');
  const [color, setColor] = useState<string | null>(initialColor);
  const [exportingRaster, setExportingRaster] = useState(false);
  const palettes = useBrandPalettes(brandId, shareToken);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // La couleur globale des icônes sert de valeur par défaut (et suit ses changements).
  useEffect(() => { setColor(initialColor); }, [initialColor]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      if (target.closest('[data-icon-card]')) return;
      handleClose();
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  // Valide la saisie : plusieurs mots-clés possibles, séparés par des virgules ; doublons ignorés.
  function commitKeywords(extra?: string) {
    const added = (extra ?? keywordDraft).split(',').map(k => k.trim()).filter(Boolean);
    setKeywordDraft('');
    setSuggestIdx(-1);
    if (added.length === 0) return;
    const current = item.keywords ?? [];
    const merged = [...current];
    for (const raw of added) {
      // Réutilise la graphie d'un mot-clé déjà existant dans le module.
      const k = allKeywords.find(a => a.toLowerCase() === raw.toLowerCase()) ?? raw;
      if (!merged.some(m => m.toLowerCase() === k.toLowerCase())) merged.push(k);
    }
    if (merged.length !== current.length) onKeywordsChange(merged.sort(byAlpha));
  }

  // Suggestions : mots-clés déjà utilisés dans ce module qui contiennent la saisie.
  const typed = keywordDraft.split(',').pop()!.trim().toLowerCase();
  const suggestions = typed
    ? allKeywords.filter(k => k.toLowerCase().includes(typed) && !(item.keywords ?? []).some(c => c.toLowerCase() === k.toLowerCase())).slice(0, 6)
    : [];

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  useEffect(() => {
    setSvgText(null);
    fetch(`/uploads/${item.filename}`).then(r => r.text()).then(setSvgText);
  }, [item.filename]);

  useEffect(() => {
    if (!color || !svgText) { setPreviewUrl(null); return; }
    const blob = new Blob([recolorSvg(svgText, color)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [svgText, color]);

  async function handleDownloadRaster(rasterFormat: RasterFormat) {
    setExportingRaster(true);
    try {
      await downloadRaster(item.filename, item.name, rasterSize, color, rasterFormat);
      trackDownload(moduleId, [item.id]);
    } finally {
      setExportingRaster(false);
    }
  }

  function handleDownloadSvg() {
    trackDownload(moduleId, [item.id]);
    if (color && svgText) {
      const blob = new Blob([recolorSvg(svgText, color)], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.name}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const a = document.createElement('a');
      a.href = `/uploads/${item.filename}`;
      a.download = `${item.name}.svg`;
      a.click();
    }
  }

  function handleDownloadPdf() {
    const url = shareToken
      ? `/api/share/${shareToken}/download?module=${moduleId}&icon=${item.id}${color ? `&color=${encodeURIComponent(color)}` : ''}`
      : `/api/modules/${moduleId}/icons/${item.id}/pdf${color ? `?color=${encodeURIComponent(color)}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}.pdf`;
    a.click();
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 pointer-events-none transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      />
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-card shadow-2xl flex flex-col border-l transition-transform duration-200 ease-out"
        style={{ borderColor: 'var(--border)', transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name}</h2>
          {!shareToken && !moduleEditing && (
            <button
              onClick={() => setLocalEdit(e => !e)}
              title={localEdit ? 'Terminer la modification' : 'Modifier les infos de l\'icône'}
              className={`p-1 rounded flex-shrink-0 mr-1 transition-colors ${localEdit ? 'text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              style={localEdit ? { background: 'var(--accent)' } : undefined}
            >
              {localEdit ? <Check size={14} /> : <Pencil size={14} />}
            </button>
          )}
          <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="w-full aspect-square rounded-xl border flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50" style={{ borderColor: 'var(--border)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl ?? `/uploads/${item.filename}`} alt={item.name} className="w-full h-full object-contain" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-gray-400 dark:text-gray-500">Nom</span>
              {isEditing ? (
                <input
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={() => { const n = nameDraft.trim(); if (n && n !== item.name) onRename(n); else setNameDraft(item.name); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') { setNameDraft(item.name); (e.target as HTMLInputElement).blur(); }
                  }}
                  title="Renommer l'icône"
                  spellCheck={false}
                  className="w-[60%] px-2 py-0.5 -my-0.5 -mr-2 text-xs text-right rounded-lg border outline-none bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-gray-400 dark:border-gray-600"
                  style={{ borderColor: 'var(--border)' }}
                />
              ) : (
                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{item.name}</span>
              )}
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-gray-400 dark:text-gray-500">Fichier</span>
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{item.filename}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-gray-400 dark:text-gray-500">Taille</span>
              <span className="text-gray-700 dark:text-gray-300">{formatSize(item.size)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-gray-400 dark:text-gray-500">Format</span>
              <span className="text-gray-700 dark:text-gray-300">SVG</span>
            </div>
          </div>
          {(isEditing || statusOf(item) !== 'validated') && (
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 pt-2">Statut</p>
              {isEditing ? (
                <StatusSelect value={item.status} onChange={onStatusChange} />
              ) : (
                <StatusBadge status={statusOf(item)} showValidated />
              )}
            </div>
          )}

          {(isEditing || (item.keywords ?? []).length > 0) && (
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 pt-2">Mots-clés</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[...(item.keywords ?? [])].sort(byAlpha).map(k => (
                  <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {k}
                    {isEditing && (
                      <button onClick={() => onKeywordsChange((item.keywords ?? []).filter(x => x !== k))} title="Retirer"
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <X size={10} />
                      </button>
                    )}
                  </span>
                ))}
                {isEditing && (
                  <input
                    value={keywordDraft}
                    onChange={e => { setKeywordDraft(e.target.value); setSuggestIdx(-1); }}
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setSuggestIdx(i => (i + 1) % suggestions.length); }
                      else if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setSuggestIdx(i => (i <= 0 ? suggestions.length - 1 : i - 1)); }
                      else if (e.key === 'Enter' && suggestions[suggestIdx]) {
                        e.preventDefault();
                        commitKeywords(suggestions[suggestIdx]);
                      }
                      else if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitKeywords(); }
                      else if (e.key === 'Backspace' && !keywordDraft && (item.keywords ?? []).length) onKeywordsChange([...(item.keywords ?? [])].sort(byAlpha).slice(0, -1));
                    }}
                    onBlur={() => commitKeywords()}
                    placeholder={(item.keywords ?? []).length ? 'Ajouter…' : 'Ajouter un mot-clé…'}
                    className="flex-1 min-w-[90px] px-1 py-0.5 text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300"
                  />
                )}
              </div>
              {isEditing && suggestions.length > 0 && (
                <div className="mt-1.5 rounded-xl border shadow-md py-1 overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  {suggestions.map((k, idx) => (
                    <button
                      key={k}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => commitKeywords(k)}
                      className={`w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 transition-colors ${idx === suggestIdx ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(isEditing || (item.versions ?? []).length > 0) && (
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <VersionHistory
                current={item}
                versions={item.versions ?? []}
                baseName={item.name}
                canEdit={isEditing}
                accept=".svg,image/svg+xml"
                onReplace={onReplaceFile}
                onRestore={onRestoreVersion}
              />
            </div>
          )}

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 pt-2">Couleur</p>
              <PaletteSwatches palettes={palettes} paletteId={paletteId} onPaletteChange={onPaletteChange} color={color} onPick={setColor} />
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <button
                  onClick={() => setColor(null)}
                  title="Couleur d'origine"
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-transform hover:scale-110"
                  style={{
                    borderColor: color === null ? 'var(--accent)' : 'var(--border)',
                    background: 'repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 50% / 8px 8px',
                  }}
                >
                  {color === null && <Check size={10} className="text-gray-700" strokeWidth={3} />}
                </button>
                <label
                  title="Choisir une couleur"
                  className="relative w-6 h-6 rounded-full flex-shrink-0 overflow-hidden border-2 cursor-pointer transition-transform hover:scale-110"
                  style={{
                    borderColor: color && !palettes.some(p => p.colors.some(c => sameColor(color, c.value))) ? 'var(--accent)' : 'var(--border)',
                    background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                  }}
                >
                  <input
                    type="color"
                    value={toPickerValue(color)}
                    onChange={e => setColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
              </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 pt-2">Format</p>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {([
                { key: 'svg' as const, label: 'SVG' },
                { key: 'pdf' as const, label: 'PDF' },
                { key: 'png' as const, label: 'PNG' },
                { key: 'webp' as const, label: 'WEBP' },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className="flex items-center justify-center px-2 py-1.5 rounded-lg border text-xs transition-colors"
                  style={format === f.key
                    ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'white' }
                    : { borderColor: 'var(--border)', color: '#6b7280' }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative mb-2">
              <input
                type="number"
                min={1}
                max={4096}
                value={rasterSize}
                disabled={format !== 'png' && format !== 'webp'}
                onChange={e => setRasterSize(Math.max(1, Math.min(4096, Number(e.target.value) || 0)))}
                className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border outline-none bg-white dark:bg-gray-900 focus:border-gray-400 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--border)' }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">px</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (format === 'svg') handleDownloadSvg();
                  else if (format === 'pdf') handleDownloadPdf();
                  else handleDownloadRaster(format);
                }}
                disabled={exportingRaster || ((format === 'png' || format === 'webp') && !rasterSize)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                <Download size={12} /> {exportingRaster ? 'Export…' : 'Télécharger'}
              </button>
              {isEditing && (
                <button onClick={onDelete} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
