'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Module, IconItem, IconCategory, ColorItem } from '@/types';
import { categoryFolders, iconZipPath } from '@/lib/iconCategories';
import { Plus, Trash2, Download, Check, X, Search, Palette as PaletteIcon, ChevronDown, ChevronUp, Pencil, FolderPlus } from 'lucide-react';
import ModuleDescription from './ModuleDescription';
import { recolorSvg } from '@/lib/svg';

type RasterFormat = 'png' | 'webp';

// Accepte "e52323", "#E52323", "#f00" ; renvoie "#rrggbb"/"#rgb" ou null si invalide.
function normalizeHex(input: string): string | null {
  const v = input.trim().replace(/^#/, '');
  return /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? `#${v.toLowerCase()}` : null;
}

// <input type="color"> n'accepte que #rrggbb.
function toPickerValue(hex: string | null): string {
  if (!hex) return '#000000';
  return hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
}

function sameColor(a: string | null, b: string): boolean {
  return !!a && a.toLowerCase() === b.toLowerCase();
}

const svgCache = new Map<string, Promise<string>>();
function fetchSvg(filename: string): Promise<string> {
  let p = svgCache.get(filename);
  if (!p) {
    p = fetch(`/uploads/${filename}`).then(r => r.text());
    svgCache.set(filename, p);
  }
  return p;
}

// Miniature d'icône, recolorée côté client quand une couleur est fournie.
function TintedImg({ filename, alt, color }: { filename: string; alt: string; color: string | null }) {
  const [src, setSrc] = useState(`/uploads/${filename}`);
  useEffect(() => {
    if (!color) { setSrc(`/uploads/${filename}`); return; }
    let cancelled = false;
    fetchSvg(filename).then(text => {
      if (!cancelled) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolorSvg(text, color))}`);
    });
    return () => { cancelled = true; };
  }, [filename, color]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="w-full h-full object-contain" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

async function renderRaster(filename: string, size: number, color: string | null, format: RasterFormat): Promise<Blob | null> {
  let src = `/uploads/${filename}`;
  let objectUrl: string | null = null;
  if (color) {
    const svgText = await fetchSvg(filename);
    objectUrl = URL.createObjectURL(new Blob([recolorSvg(svgText, color)], { type: 'image/svg+xml' }));
    src = objectUrl;
  }
  try {
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
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise(resolve => canvas.toBlob(resolve, format === 'webp' ? 'image/webp' : 'image/png'));
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.style.display = 'none';
  // Chrome/Edge : lien attaché au DOM et URL révoquée avec délai, sinon le téléchargement peut échouer.
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(a.href);
  }, 10000);
}

async function downloadRaster(filename: string, name: string, size: number, color: string | null, format: RasterFormat) {
  const blob = await renderRaster(filename, size, color, format);
  if (blob) saveBlob(blob, `${name}-${size}.${format}`);
}

type BulkFormat = 'svg' | 'pdf' | RasterFormat;

// Choix du format (et de la taille pour PNG/WebP) avant un téléchargement groupé.
function BulkExportMenu({ label, busy, onClose, onConfirm }: {
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
    <div ref={ref} className="absolute right-0 top-full mt-1.5 z-30 w-64 rounded-xl border shadow-lg p-3"
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

interface Palette { id: string; title: string; colors: ColorItem[] }

// Nuanciers de la marque = modules « couleurs ».
function useBrandPalettes(brandId: string, shareToken?: string): Palette[] {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  useEffect(() => {
    // Page partagée : pas d'accès à /api/modules (protégé), on passe par le jeton de partage.
    const source = shareToken ? `/api/share/${shareToken}` : `/api/modules?brandId=${brandId}`;
    fetch(source)
      .then(r => r.json())
      .then((data: Module[] | { modules: Module[] }) => {
        const modules = Array.isArray(data) ? data : data.modules;
        setPalettes(
          modules
            .filter(m => m.type === 'colors' && (m.colorItems ?? []).length > 0)
            .map((m, i) => ({ id: m.id, title: m.title || `Nuancier ${i + 1}`, colors: m.colorItems ?? [] })),
        );
      })
      .catch(() => {});
  }, [brandId, shareToken]);
  return palettes;
}

// Choix d'un nuancier (si plusieurs) puis de l'une de ses couleurs.
function PaletteSwatches({ palettes, paletteId, onPaletteChange, color, onPick }: {
  palettes: Palette[]; paletteId: string | null; onPaletteChange: (id: string) => void; color: string | null; onPick: (hex: string) => void;
}) {
  const [listOpen, setListOpen] = useState(false);
  if (palettes.length === 0) return null;
  const palette = palettes.find(p => p.id === paletteId) ?? palettes[0];
  return (
    <>
      {palettes.length > 1 && (
        <div className="mb-2">
          <button
            onClick={() => setListOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl border text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
          >
            <span className="flex-1 text-left truncate">{palette.title}</span>
            <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
          </button>
          {listOpen && (
            <div className="mt-1 rounded-2xl border shadow-xl py-1.5 max-h-48 overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              {palettes.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onPaletteChange(p.id); setListOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="flex-1 text-left truncate">{p.title}</span>
                  {p.id === palette.id && <Check size={12} className="text-gray-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {palette.colors.map(c => (
          <button
            key={c.id}
            onClick={() => onPick(c.value)}
            title={c.name || c.value}
            className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-transform hover:scale-110"
            style={{ background: c.value, borderColor: sameColor(color, c.value) ? 'var(--accent)' : 'var(--border)' }}
          >
            {sameColor(color, c.value) && <Check size={10} color="white" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </>
  );
}

function IconInspector({ item, moduleId, brandId, shareToken, paletteId, onPaletteChange, initialColor, onClose, onDelete, isEditing }: {
  shareToken?: string;
  paletteId: string | null;
  onPaletteChange: (id: string) => void;
  item: IconItem;
  initialColor: string | null;
  moduleId: string;
  brandId: string;
  onClose: () => void;
  onDelete: () => void;
  isEditing?: boolean;
}) {
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

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
  shareToken?: string;
}

export default function IconsModule({ module, brandColor, onUpdate, isEditing, shareToken }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [exportMenu, setExportMenu] = useState<'all' | 'selection' | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [tintInput, setTintInput] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Nuancier choisi : conservé à la fermeture du menu et partagé avec l'inspecteur.
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const palettes = useBrandPalettes(module.brandId, shareToken);
  const tint = normalizeHex(tintInput);
  const categories = module.iconCategories ?? [];
  const uploadTarget = useRef<string | undefined>(undefined);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catDraft, setCatDraft] = useState('');
  const items = module.iconItems ?? [];
  const filtered = search.trim() ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;

  async function patchModule(patch: Partial<Module>) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const updated = await res.json();
    onUpdate(updated);
    return updated as Module;
  }

  function pickFiles(categoryId?: string) {
    uploadTarget.current = categoryId;
    inputRef.current?.click();
  }

  async function uploadIcons(files: FileList) {
    const categoryId = uploadTarget.current;
    const before = new Set(items.map(i => i.id));
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
    if (categoryId) {
      // Les icônes ajoutées depuis une catégorie y sont rangées directement.
      const iconItems = (updated.iconItems ?? []).map(i => before.has(i.id) ? i : { ...i, categoryId });
      const res = await fetch(`/api/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ iconItems }),
      });
      updated = await res.json();
    }
    onUpdate(updated);
  }

  // Déplace une icône avant l'index `toIdx` (items.length = à la fin) et l'affecte à une catégorie.
  async function moveItem(fromIdx: number, toIdx: number, categoryId?: string) {
    const moved: IconItem = { ...items[fromIdx] };
    if (categoryId) moved.categoryId = categoryId; else delete moved.categoryId;
    const reordered = items.filter((_, i) => i !== fromIdx);
    reordered.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved);
    await patchModule({ iconItems: reordered });
  }

  async function addCategory() {
    const cat: IconCategory = { id: crypto.randomUUID(), name: 'Nouvelle catégorie' };
    await patchModule({ iconCategories: [...categories, cat] });
    setEditingCatId(cat.id);
    setCatDraft(cat.name);
  }

  async function renameCategory(id: string, name: string) {
    setEditingCatId(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    await patchModule({ iconCategories: categories.map(c => c.id === id ? { ...c, name: trimmed } : c) });
  }

  async function moveCategory(id: string, dir: -1 | 1) {
    const i = categories.findIndex(c => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[i], next[j]] = [next[j], next[i]];
    await patchModule({ iconCategories: next });
  }

  async function deleteCategory(id: string) {
    // Les icônes de la catégorie supprimée repassent « sans catégorie ».
    const iconItems = items.map(i => {
      if (i.categoryId !== id) return i;
      const { categoryId: _removed, ...rest } = i;
      return rest;
    });
    await patchModule({ iconCategories: categories.filter(c => c.id !== id), iconItems });
  }

  async function assignSelection(categoryId: string) {
    const iconItems = items.map(i => {
      if (!selected.has(i.id)) return i;
      const { categoryId: _old, ...rest } = i;
      return categoryId ? { ...rest, categoryId } : rest;
    });
    await patchModule({ iconItems });
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

  async function downloadZip(format: BulkFormat, size: number, ids?: string[]) {
    setDownloading(true);
    try {
      const zipName = `${module.title || 'icons'}.zip`;
      if (format === 'png' || format === 'webp') {
        // Rastérisation côté client (canvas), puis zip dans le navigateur.
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        const folders = categoryFolders(categories);
        for (const item of items.filter(i => !ids?.length || ids.includes(i.id))) {
          const blob = await renderRaster(item.filename, size, tint, format);
          if (blob) zip.file(iconZipPath(item, folders, `${item.name}-${size}.${format}`), blob);
        }
        saveBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), zipName);
      } else {
        const params = new URLSearchParams({ format });
        if (ids?.length) params.set('ids', ids.join(','));
        if (tint) params.set('color', tint);
        const res = await fetch(shareToken
          ? `/api/share/${shareToken}/download?${new URLSearchParams({ module: module.id })}&${params}`
          : `/api/modules/${module.id}/download?${params}`);
        if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
        saveBlob(await res.blob(), zipName);
      }
      setExportMenu(null);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Le téléchargement a échoué.');
    } finally {
      setDownloading(false);
    }
  }

  function renderCard(item: IconItem) {
          const idx = items.indexOf(item);
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
              onDrop={isEditing ? e => { e.preventDefault(); e.stopPropagation(); if (dragIdx !== null && dragIdx !== idx) moveItem(dragIdx, idx, item.categoryId); setDragIdx(null); setDragOverIdx(null); } : undefined}
              onDragEnd={isEditing ? () => { setDragIdx(null); setDragOverIdx(null); } : undefined}
            >
              {dragOverIdx === idx && dragIdx !== null && dragIdx !== idx && (
                <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full z-10" style={{ background: brandColor }} />
              )}
              {/* Card */}
              <div
                onClick={() => setInspectedId(item.id)}
                data-icon-card
                className="relative w-full aspect-square rounded-xl border flex items-center justify-center p-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer transition-all"
                style={{
                  borderColor: isSelected ? brandColor : 'var(--border)',
                  background: isSelected ? `${brandColor}10` : '#f9fafb',
                  boxShadow: isSelected ? `0 0 0 2px ${brandColor}` : undefined,
                }}
              >
                <TintedImg filename={item.filename} alt={item.name} color={tint} />

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
  }

  function renderGroups() {
    const known = new Set(categories.map(c => c.id));
    const groups: { cat: IconCategory | null; items: IconItem[] }[] = [
      { cat: null, items: filtered.filter(i => !i.categoryId || !known.has(i.categoryId)) },
      ...categories.map(c => ({ cat: c, items: filtered.filter(i => i.categoryId === c.id) })),
    ];
    const grouped = categories.length > 0;
    const dropToEnd = (catId?: string) => (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIdx !== null) moveItem(dragIdx, items.length, catId);
      setDragIdx(null); setDragOverIdx(null);
    };

    return (
      <div className="space-y-6">
        {filtered.length === 0 && search && (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Aucune icône ne correspond à « {search} »</div>
        )}
        {groups.map(({ cat, items: groupItems }) => {
          // « Sans catégorie » n'apparaît que s'il contient des icônes (ou en édition) ; pendant une recherche, les groupes vides sont masqués.
          if (grouped && cat === null && groupItems.length === 0 && !isEditing) return null;
          if (search && groupItems.length === 0) return null;
          const catIndex = cat ? categories.findIndex(c => c.id === cat.id) : -1;
          return (
            <div key={cat?.id ?? 'none'}>
              {grouped && (
                <div
                  className="flex items-center gap-2 mb-3 pb-1.5 border-b"
                  style={{ borderColor: 'var(--border)' }}
                  onDragOver={isEditing ? e => e.preventDefault() : undefined}
                  onDrop={isEditing ? dropToEnd(cat?.id) : undefined}
                >
                  {cat && isEditing && editingCatId === cat.id ? (
                    <input
                      autoFocus
                      value={catDraft}
                      onChange={e => setCatDraft(e.target.value)}
                      onBlur={() => renameCategory(cat.id, catDraft)}
                      onKeyDown={e => { if (e.key === 'Enter') renameCategory(cat.id, catDraft); if (e.key === 'Escape') setEditingCatId(null); }}
                      className="text-sm font-semibold outline-none border-b bg-transparent text-gray-800 dark:text-gray-200"
                      style={{ borderColor: brandColor }}
                    />
                  ) : (
                    <span
                      className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                      onDoubleClick={() => { if (isEditing && cat) { setEditingCatId(cat.id); setCatDraft(cat.name); } }}
                    >
                      {cat ? cat.name : 'Sans catégorie'}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">{groupItems.length}</span>
                  {cat && isEditing && (
                    <div className="ml-auto flex items-center gap-0.5 text-gray-400 dark:text-gray-500">
                      <button onClick={() => { setEditingCatId(cat.id); setCatDraft(cat.name); }} title="Renommer" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200"><Pencil size={12} /></button>
                      <button onClick={() => moveCategory(cat.id, -1)} disabled={catIndex === 0} title="Monter" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ChevronUp size={13} /></button>
                      <button onClick={() => moveCategory(cat.id, 1)} disabled={catIndex === categories.length - 1} title="Descendre" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ChevronDown size={13} /></button>
                      <button onClick={() => deleteCategory(cat.id)} title="Supprimer la catégorie (les icônes sont conservées)" className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
                {groupItems.map(renderCard)}
                {isEditing && dragIdx !== null && (
                  <div
                    className="relative min-h-[24px]"
                    onDragOver={e => { e.preventDefault(); setDragOverIdx(items.length); }}
                    onDrop={dropToEnd(cat?.id)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  />
                )}
                {isEditing && (
                  <button
                    onClick={() => pickFiles(cat?.id)}
                    className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Plus size={20} />
                    <span className="text-xs">Ajouter</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {isEditing && (
          <button
            onClick={addCategory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <FolderPlus size={13} />
            Ajouter une catégorie
          </button>
        )}
      </div>
    );
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
            <div className="relative">
              <span
                className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded border overflow-hidden"
                style={{
                  borderColor: 'var(--border)',
                  background: tint ?? 'repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 50% / 6px 6px',
                }}
              >
                <input
                  type="color"
                  value={toPickerValue(tint)}
                  onChange={e => setTintInput(e.target.value)}
                  title="Choisir une couleur"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </span>
              <input
                value={tintInput}
                onChange={e => setTintInput(e.target.value)}
                placeholder="#000000"
                maxLength={7}
                spellCheck={false}
                title="Couleur des icônes (hexadécimal)"
                className="w-28 pl-8 pr-6 py-1.5 text-xs font-mono rounded-lg border outline-none bg-white dark:bg-gray-900 focus:border-gray-400 dark:border-gray-600"
                style={{ borderColor: tintInput && !tint ? '#ef4444' : 'var(--border)' }}
              />
              {tintInput && (
                <button onClick={() => setTintInput('')} title="Couleurs d'origine"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
                  <X size={12} />
                </button>
              )}
            </div>
            {palettes.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setPaletteOpen(o => !o)}
                  title="Couleurs de la marque"
                  className="p-1.5 rounded-lg border text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <PaletteIcon size={14} />
                </button>
                {paletteOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setPaletteOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 z-30 w-64 p-3 rounded-2xl border shadow-xl"
                      style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                      <PaletteSwatches palettes={palettes} paletteId={paletteId} onPaletteChange={setPaletteId} color={tint} onPick={hex => { setTintInput(hex); setPaletteOpen(false); }} />
                    </div>
                  </>
                )}
              </div>
            )}
            {hasSelection && (
              <>
                <span className="text-xs text-gray-500">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
                <button onClick={() => setSelected(new Set())}
                  className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
                  <X size={12} /> Désélectionner
                </button>
                {isEditing && categories.length > 0 && (
                  <select
                    value=""
                    onChange={e => { if (e.target.value) assignSelection(e.target.value === '__none' ? '' : e.target.value); }}
                    title="Ranger la sélection dans une catégorie"
                    className="px-2 py-1 text-xs rounded-lg border outline-none bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 dark:border-gray-600"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <option value="">Ranger dans…</option>
                    <option value="__none">Sans catégorie</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </>
            )}
          </div>
          <div className="relative flex items-center gap-2">
            {hasSelection && (
              <button
                data-bulk-trigger
                onClick={() => setExportMenu(m => m === 'selection' ? null : 'selection')}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
                style={{ background: brandColor }}
              >
                <Download size={12} />
                Télécharger la sélection ({selected.size})
              </button>
            )}
            <button
              data-bulk-trigger
              onClick={() => setExportMenu(m => m === 'all' ? null : 'all')}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
            >
              <Download size={12} />
              {downloading ? 'Génération…' : 'Tout télécharger (.zip)'}
            </button>
            {exportMenu && (
              <BulkExportMenu
                label={exportMenu === 'selection' ? `Sélection (${selected.size} icône${selected.size > 1 ? 's' : ''})` : `Toutes les icônes (${items.length})`}
                busy={downloading}
                onClose={() => setExportMenu(null)}
                onConfirm={(format, size) => downloadZip(format, size, exportMenu === 'selection' ? [...selected] : undefined)}
              />
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {renderGroups()}

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
            shareToken={shareToken}
            paletteId={paletteId}
            onPaletteChange={setPaletteId}
            initialColor={tint}
            isEditing={isEditing}
            onClose={() => setInspectedId(null)}
            onDelete={() => { deleteIcon(item.id); setInspectedId(null); }}
          />
        );
      })()}
    </div>
  );
}
