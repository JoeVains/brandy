'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Module, IconItem, ColorItem } from '@/types';
import { Plus, Trash2, Download, Check, X, Search } from 'lucide-react';
import ModuleDescription from './ModuleDescription';
import { recolorSvg } from '@/lib/svg';

type RasterFormat = 'png' | 'webp';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

async function downloadRaster(filename: string, name: string, size: number, color: string | null, format: RasterFormat) {
  let src = `/uploads/${filename}`;
  let objectUrl: string | null = null;
  if (color) {
    const svgText = await fetch(src).then(r => r.text());
    const blob = new Blob([recolorSvg(svgText, color)], { type: 'image/svg+xml' });
    objectUrl = URL.createObjectURL(blob);
    src = objectUrl;
  }
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Impossible de charger le SVG'));
    img.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, size, size);
  const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, mimeType));
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${size}.${format}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function IconInspector({ item, moduleId, brandId, onClose, onDelete, isEditing }: {
  item: IconItem;
  moduleId: string;
  brandId: string;
  onClose: () => void;
  onDelete: () => void;
  isEditing?: boolean;
}) {
  const [rasterSize, setRasterSize] = useState(512);
  const [rasterFormat, setRasterFormat] = useState<RasterFormat>('png');
  const [color, setColor] = useState<string | null>(null);
  const [exportingRaster, setExportingRaster] = useState(false);
  const [brandColors, setBrandColors] = useState<ColorItem[]>([]);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/modules?brandId=${brandId}`)
      .then(r => r.json())
      .then((modules: Module[]) => {
        const seen = new Map<string, ColorItem>();
        modules.filter(m => m.type === 'colors').flatMap(m => m.colorItems ?? []).forEach(c => seen.set(c.id, c));
        setBrandColors([...seen.values()]);
      });
  }, [brandId]);

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

  async function handleDownloadRaster() {
    setExportingRaster(true);
    try {
      await downloadRaster(item.filename, item.name, rasterSize, color, rasterFormat);
    } finally {
      setExportingRaster(false);
    }
  }

  function handleDownloadSvg() {
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
    const url = `/api/modules/${moduleId}/icons/${item.id}/pdf${color ? `?color=${encodeURIComponent(color)}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}.pdf`;
    a.click();
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-card shadow-2xl flex flex-col border-l"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 flex-shrink-0">
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
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{item.name}</span>
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
          {brandColors.length > 0 && (
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 pt-2">Couleur</p>
              <div className="flex items-center gap-1.5 flex-wrap">
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
                {brandColors.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c.value)}
                    title={c.name || c.value}
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-transform hover:scale-110"
                    style={{ background: c.value, borderColor: color === c.value ? 'var(--accent)' : 'var(--border)' }}
                  >
                    {color === c.value && <Check size={10} color="white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={handleDownloadSvg} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ borderColor: 'var(--border)' }}>
              <Download size={12} /> SVG
            </button>
            <button onClick={handleDownloadPdf} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ borderColor: 'var(--border)' }}>
              <Download size={12} /> PDF
            </button>
            {isEditing && (
              <button onClick={onDelete} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 pt-2">Exporter en image</p>
            <div className="flex gap-1.5 mb-2">
              {(['png', 'webp'] as RasterFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setRasterFormat(f)}
                  className="px-2.5 py-1 rounded-lg text-xs uppercase transition-colors"
                  style={rasterFormat === f
                    ? { background: 'var(--accent)', color: 'white' }
                    : { border: '1px solid var(--border)', color: '#6b7280' }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={4096}
                  value={rasterSize}
                  onChange={e => setRasterSize(Math.max(1, Math.min(4096, Number(e.target.value) || 0)))}
                  className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border outline-none bg-white dark:bg-gray-900 focus:border-gray-400 dark:border-gray-600"
                  style={{ borderColor: 'var(--border)' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">px</span>
              </div>
              <button
                onClick={handleDownloadRaster}
                disabled={exportingRaster || !rasterSize}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white transition-colors disabled:opacity-50 flex-shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                <Download size={12} /> {exportingRaster ? 'Export…' : rasterFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

export default function IconsModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const items = module.iconItems ?? [];
  const filtered = search.trim() ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;

  async function uploadIcons(files: FileList) {
    let updated = module;
    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.svg')) continue;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slot', 'icon');
      fd.append('name', file.name);
      const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
      updated = await res.json();
    }
    onUpdate(updated);
  }

  async function reorderItems(fromIdx: number, toIdx: number) {
    const reordered = [...items];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ iconItems: reordered }),
    });
    onUpdate(await res.json());
  }

  async function deleteIcon(id: string) {
    const newItems = items.filter(i => i.id !== id);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ iconItems: newItems }),
    });
    onUpdate(await res.json());
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  async function renameIcon(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) { setEditingId(null); return; }
    const newItems = items.map(i => i.id === id ? { ...i, name: trimmed } : i);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ iconItems: newItems }),
    });
    onUpdate(await res.json());
    setEditingId(null);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function downloadSingle(filename: string, name: string) {
    const a = document.createElement('a');
    a.href = `/uploads/${filename}`;
    a.download = `${name}.svg`;
    a.click();
  }

  async function downloadZip(ids?: string[]) {
    setDownloading(true);
    const url = ids?.length
      ? `/api/modules/${module.id}/download?ids=${ids.join(',')}`
      : `/api/modules/${module.id}/download`;
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${module.title || 'icons'}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    setDownloading(false);
  }

  if (items.length === 0 && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300 dark:text-gray-500">
        <span className="text-2xl">❖</span>
        <span className="text-sm">Aucune icône</span>
      </div>
    );
  }

  const hasSelection = selected.size > 0;

  return (
    <div>
      {/* Description */}
      <ModuleDescription
        moduleId={module.id}
        brandId={module.brandId}
        field="iconDescription"
        value={module.iconDescription}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, iconDescription: desc })}
      />

      {/* Search */}
      {items.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border outline-none bg-white dark:bg-gray-900 transition-colors focus:border-gray-400 dark:border-gray-600"
            style={{ borderColor: 'var(--border)' }}
            placeholder="Rechercher une icône…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      {items.length > 0 && (
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            {hasSelection && (
              <>
                <span className="text-xs text-gray-500">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
                <button onClick={() => setSelected(new Set())}
                  className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
                  <X size={12} /> Désélectionner
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasSelection && (
              <button
                onClick={() => downloadZip([...selected])}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
                style={{ background: brandColor }}
              >
                <Download size={12} />
                Télécharger la sélection ({selected.size})
              </button>
            )}
            <button
              onClick={() => downloadZip()}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
            >
              <Download size={12} />
              {downloading ? 'Génération…' : 'Tout télécharger (.zip)'}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
        {filtered.length === 0 && search && (
          <div className="col-span-full py-8 text-center text-sm text-gray-400 dark:text-gray-500">Aucune icône ne correspond à « {search} »</div>
        )}
        {filtered.map((item, idx) => {
          const isSelected = selected.has(item.id);
          return (
            <div
              key={item.id}
              className="relative group flex flex-col items-center gap-2"
              style={{ opacity: dragIdx === idx ? 0.4 : 1 }}
              draggable={isEditing}
              onDragStart={isEditing ? e => { e.dataTransfer.effectAllowed = 'move'; setDragIdx(idx); } : undefined}
              onDragOver={isEditing ? e => { e.preventDefault(); setDragOverIdx(idx); } : undefined}
              onDragLeave={isEditing ? () => setDragOverIdx(null) : undefined}
              onDrop={isEditing ? e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) reorderItems(dragIdx, idx); setDragIdx(null); setDragOverIdx(null); } : undefined}
              onDragEnd={isEditing ? () => { setDragIdx(null); setDragOverIdx(null); } : undefined}
            >
              {dragOverIdx === idx && dragIdx !== null && dragIdx !== idx && (
                <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full z-10" style={{ background: brandColor }} />
              )}
              {/* Card */}
              <div
                onClick={() => setInspectedId(item.id)}
                className="relative w-full aspect-square rounded-xl border flex items-center justify-center p-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer transition-all"
                style={{
                  borderColor: isSelected ? brandColor : 'var(--border)',
                  background: isSelected ? `${brandColor}10` : '#f9fafb',
                  boxShadow: isSelected ? `0 0 0 2px ${brandColor}` : undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/uploads/${item.filename}`} alt={item.name} className="w-full h-full object-contain" />

                {/* Selection checkbox */}
                <div
                  onClick={e => { e.stopPropagation(); toggleSelect(item.id); }}
                  className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                  style={{ background: isSelected ? brandColor : 'var(--card-bg)', borderColor: isSelected ? brandColor : '#d1d5db' }}>
                  {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                </div>

                {/* Action buttons */}
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); downloadSingle(item.filename, item.name); }}
                    className="p-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100"
                  >
                    <Download size={11} />
                  </button>
                  {isEditing && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteIcon(item.id); }}
                      className="p-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              {isEditing && editingId === item.id ? (
                <input
                  autoFocus
                  className="w-full text-center text-xs outline-none border-b"
                  style={{ borderColor: brandColor }}
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={() => renameIcon(item.id, nameDraft)}
                  onKeyDown={e => { if (e.key === 'Enter') renameIcon(item.id, nameDraft); if (e.key === 'Escape') setEditingId(null); }}
                />
              ) : (
                <span
                  className="text-xs text-gray-500 dark:text-gray-300 truncate w-full text-center"
                  title={item.name}
                  onDoubleClick={() => { if (isEditing) { setEditingId(item.id); setNameDraft(item.name); } }}
                >
                  {item.name}
                </span>
              )}
            </div>
          );
        })}
        {isEditing && dragIdx !== null && (
          <div
            className="relative min-h-[24px]"
            onDragOver={e => { e.preventDefault(); setDragOverIdx(filtered.length); }}
            onDrop={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== filtered.length - 1) reorderItems(dragIdx, filtered.length); setDragIdx(null); setDragOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
          >
            {dragOverIdx === filtered.length && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full z-10" style={{ background: brandColor }} />
            )}
          </div>
        )}

        {/* Add button */}
        {isEditing && (
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus size={20} />
            <span className="text-xs">Ajouter</span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept=".svg" multiple className="hidden"
        onChange={e => e.target.files && uploadIcons(e.target.files)} />

      {inspectedId && (() => {
        const item = items.find(i => i.id === inspectedId);
        if (!item) return null;
        return (
          <IconInspector
            item={item}
            moduleId={module.id}
            brandId={module.brandId}
            isEditing={isEditing}
            onClose={() => setInspectedId(null)}
            onDelete={() => { deleteIcon(item.id); setInspectedId(null); }}
          />
        );
      })()}
    </div>
  );
}
