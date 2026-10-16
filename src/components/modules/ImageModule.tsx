'use client';

import { trackDownload } from '@/lib/trackDownload';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Module, ImageItem, IconCategory, AssetStatus } from '@/types';
import { StatusBadge, StatusSelect, VersionHistory } from '../AssetStatus';
import CategorySections, { CategorySelect, type CategoryPatch } from '../CategorySections';
import { categoryFolders } from '@/lib/iconCategories';
import { isPublished, restoreVersion, statusOf, visibleItems } from '@/lib/assetStatus';
import { ImageIcon, Trash2, Upload, Plus, LayoutGrid, Square, X, Download, ZoomIn, ChevronLeft, ChevronRight, History } from 'lucide-react';
import ModuleDescription from './ModuleDescription';
import Select from '../Select';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
  shareToken?: string;
}

function downloadAsPng(src: string, filename: string) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 800;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace(/\.svg$/i, '.png');
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = src;
}

interface LightboxItem { src: string; filename: string; mimeType?: string; caption?: string; }

function Lightbox({ items, index, onNavigate, onClose }: {
  items: LightboxItem[];
  index: number;
  onNavigate: (i: number) => void;
  onClose: () => void;
}) {
  const { src, filename, mimeType, caption } = items[index];
  const isSvg = mimeType === 'image/svg+xml' || filename.toLowerCase().endsWith('.svg');
  const total = items.length;
  const prevIndex = (index - 1 + total) % total;
  const nextIndex = (index + 1) % total;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onNavigate(prevIndex);
      else if (e.key === 'ArrowRight') onNavigate(nextIndex);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prevIndex, nextIndex, onNavigate, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        {isSvg ? (
          <>
            <a href={src} download={filename} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
              <Download size={14} /> SVG
            </a>
            <button onClick={e => { e.stopPropagation(); downloadAsPng(src, filename); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
              <Download size={14} /> PNG
            </button>
          </>
        ) : (
          <a href={src} download={filename} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
            <Download size={14} /> Télécharger
          </a>
        )}
        <button onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Prev */}
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate(prevIndex); }}
          className="absolute left-4 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Image */}
      <img src={src} alt="" className="max-w-[80vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()} />

      {/* Next */}
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNavigate(nextIndex); }}
          className="absolute right-4 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Caption + counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" onClick={e => e.stopPropagation()}>
        {caption && (
          <p className="px-4 py-1.5 rounded-xl bg-black/50 text-white text-sm text-center max-w-lg">{caption}</p>
        )}
        {items.length > 1 && (
          <div className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">
            {index + 1} / {items.length}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function ImageModule({ module, brandColor, onUpdate, isEditing, shareToken }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const uploadTarget = useRef<string | undefined>(undefined);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const mode = module.imageMode ?? 'single';
  const fit = module.imageFit ?? 'contain';
  // En lecture, les brouillons sont masqués et les obsolètes repliés ; en édition, tout est visible.
  const [showObsolete, setShowObsolete] = useState(false);
  const [openVersions, setOpenVersions] = useState<string | null>(null);
  const allImageItems = module.imageItems ?? [];
  const obsoleteCount = allImageItems.filter(i => statusOf(i) === 'obsolete').length;
  const imageItems = visibleItems(allImageItems, !!isEditing, showObsolete);
  const imageCategories = module.imageCategories ?? [];

  const lightboxItems: LightboxItem[] = mode === 'gallery'
    ? imageItems.map(i => ({ src: `/uploads/${i.filename}`, filename: i.filename, mimeType: i.mimeType, caption: i.caption }))
    : module.imageFilename
      ? [{ src: `/uploads/${module.imageFilename}`, filename: module.imageFilename, mimeType: module.imageMimeType }]
      : [];

  async function setFit(newFit: 'cover' | 'contain') {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageFit: newFit }),
    });
    onUpdate(await res.json());
  }

  async function setMode(newMode: 'single' | 'gallery') {
    const patch: Record<string, unknown> = { imageMode: newMode };

    if (newMode === 'gallery' && module.imageFilename) {
      patch.imageItems = [
        ...(module.imageItems ?? []),
        {
          id: crypto.randomUUID(),
          filename: module.imageFilename,
          mimeType: module.imageMimeType ?? '',
          size: module.imageSize ?? 0,
        },
      ];
      patch.imageFilename = null;
      patch.imageMimeType = null;
      patch.imageSize = null;
    }

    if (newMode === 'single' && imageItems.length > 0) {
      const first = imageItems[0];
      patch.imageFilename = first.filename;
      patch.imageMimeType = first.mimeType;
      patch.imageSize = first.size ?? 0;
      patch.imageItems = imageItems.slice(1);
    }

    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    onUpdate(await res.json());
  }

  async function uploadSingle(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'image');
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  async function handleSingleInput(files: FileList) {
    if (files.length === 0) return;
    if (files.length > 1) {
      // Auto-switch to gallery, migrate existing single image if any
      const patch: Record<string, unknown> = { imageMode: 'gallery' };
      if (module.imageFilename) {
        patch.imageItems = [
          ...(module.imageItems ?? []),
          { id: crypto.randomUUID(), filename: module.imageFilename, mimeType: module.imageMimeType ?? '', size: module.imageSize ?? 0 },
        ];
        patch.imageFilename = null;
        patch.imageMimeType = null;
        patch.imageSize = null;
      }
      const res = await fetch(`/api/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      onUpdate(await res.json());
      // Upload each file sequentially
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('slot', 'image-item');
        const r = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
        onUpdate(await r.json());
      }
    } else {
      await uploadSingle(files[0]);
    }
  }

  async function handleGalleryInput(files: FileList) {
    const categoryId = uploadTarget.current;
    const before = new Set((module.imageItems ?? []).map(i => i.id));
    let updated: Module = module;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slot', 'image-item');
      const r = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
      updated = await r.json();
      onUpdate(updated);
    }
    if (categoryId) {
      // Les images ajoutées depuis une catégorie y sont rangées directement.
      const imageItems = (updated.imageItems ?? []).map(i => before.has(i.id) ? i : { ...i, categoryId });
      const r = await fetch(`/api/modules/${module.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imageItems }) });
      onUpdate(await r.json());
    }
  }

  function pickGalleryFiles(categoryId?: string) {
    uploadTarget.current = categoryId;
    galleryInputRef.current?.click();
  }

  // Enregistrement groupé des catégories et/ou de la liste d'images.
  async function saveCategories(patch: CategoryPatch<ImageItem>) {
    const body: Record<string, unknown> = {};
    if (patch.categories) body.imageCategories = patch.categories;
    if (patch.items) body.imageItems = patch.items;
    const res = await fetch(`/api/modules/${module.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    onUpdate(await res.json());
  }

  // Déplace une image avant l'index `toIdx` (imageItems.length = à la fin) et l'affecte à une catégorie.
  async function moveItem(fromIdx: number, toIdx: number, categoryId?: string) {
    const moved: ImageItem = { ...imageItems[fromIdx] };
    if (categoryId) moved.categoryId = categoryId; else delete moved.categoryId;
    const reordered = imageItems.filter((_, i) => i !== fromIdx);
    reordered.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved);
    await patchImageItems(reordered);
  }

  async function assignSelection(categoryId?: string) {
    await patchImageItems(imageItems.map(i => {
      if (!selected.has(i.id)) return i;
      const { categoryId: _c, ...rest } = i;
      return categoryId ? { ...rest, categoryId } : rest;
    }));
  }

  // Téléchargement d'un zip (toute la galerie, une sélection ou une catégorie à plat).
  function zipUrl(params: Record<string, string>) {
    const q = new URLSearchParams(params);
    return shareToken
      ? `/api/share/${shareToken}/download?${new URLSearchParams({ module: module.id })}&${q}`
      : `/api/modules/${module.id}/download?${q}`;
  }

  async function setSingleStatus(status: AssetStatus) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageStatus: status === 'validated' ? null : status }),
    });
    onUpdate(await res.json());
  }

  // Remplacement : l'ancienne image reste dans l'historique (géré côté serveur).
  async function replaceSingleFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'image');
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    if (res.ok) onUpdate(await res.json());
    else alert('Le remplacement du fichier a échoué.');
  }

  async function restoreSingleVersion(index: number) {
    const restored = restoreVersion(
      { filename: module.imageFilename ?? '', size: module.imageSize ?? 0, mimeType: module.imageMimeType, versions: module.imageVersions },
      index,
    );
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageFilename: restored.filename, imageSize: restored.size, imageMimeType: restored.mimeType, imageVersions: restored.versions }),
    });
    onUpdate(await res.json());
  }

  async function removeSingle() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageFilename: null, imageMimeType: null, imageSize: null, imageStatus: null, imageVersions: null }),
    });
    onUpdate(await res.json());
  }

  async function uploadGalleryItem(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'image-item');
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function downloadZip(ids?: string[], category?: { name: string }) {
    setDownloading(true);
    try {
      const params: Record<string, string> = {};
      if (ids?.length) params.ids = ids.join(',');
      if (category) params.flat = '1';
      const res = await fetch(zipUrl(params));
      if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${module.title || 'images'}${category ? ` - ${category.name.replace(/\//g, '-')}` : ''}.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 10000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Le téléchargement a échoué.');
    } finally {
      setDownloading(false);
    }
  }

  async function patchImageItems(next: ImageItem[]) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageItems: next }),
    });
    onUpdate(await res.json());
  }

  async function setImageStatus(id: string, status: AssetStatus) {
    await patchImageItems(imageItems.map(i => {
      if (i.id !== id) return i;
      const { status: _old, ...rest } = i;
      return status === 'validated' ? rest : { ...rest, status };
    }));
  }

  // Remplace le fichier ; l'ancienne version reste dans l'historique.
  async function replaceImageFile(id: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'image-item');
    fd.append('replaceItemId', id);
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    if (res.ok) onUpdate(await res.json());
    else alert('Le remplacement du fichier a échoué.');
  }

  async function updateCaption(id: string, caption: string) {
    const newItems = imageItems.map(i => i.id === id ? { ...i, caption: caption || undefined } : i);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageItems: newItems }),
    });
    onUpdate(await res.json());
  }

  async function removeGalleryItem(id: string) {
    const newItems = imageItems.filter(i => i.id !== id);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageItems: newItems }),
    });
    onUpdate(await res.json());
  }

  const ModeToggle = () => (
    <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
      <button
        onClick={() => setMode('single')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={mode === 'single' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}
      >
        <Square size={12} /> Image unique
      </button>
      <button
        onClick={() => setMode('gallery')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={mode === 'gallery' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}
      >
        <LayoutGrid size={12} /> Galerie
      </button>
    </div>
  );

  const FitToggle = () => (
    <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
      <button
        onClick={() => setFit('contain')}
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={fit === 'contain' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}
      >
        Ajuster
      </button>
      <button
        onClick={() => setFit('cover')}
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={fit === 'cover' ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.12)' } : { color: '#6b7280' }}
      >
        Remplir
      </button>
    </div>
  );

  const descriptionBlock = (
    <ModuleDescription
      moduleId={module.id}
        brandId={module.brandId}
      value={module.description}
      isEditing={isEditing}
      onUpdate={desc => onUpdate({ ...module, description: desc })}
    />
  );

  function renderCard(item: ImageItem) {
          const idx = imageItems.indexOf(item);
          const isSelected = selected.has(item.id);
          return (
          <div key={item.id} className="flex flex-col gap-1">
            {/* Draggable card wrapper */}
            <div
              className="relative group"
              style={{ opacity: dragIdx === idx ? 0.4 : statusOf(item) === 'obsolete' ? 0.55 : 1, cursor: isEditing ? 'grab' : 'pointer' }}
              draggable={isEditing && !selectMode}
              onDragStart={isEditing && !selectMode ? e => { e.dataTransfer.effectAllowed = 'move'; setDragIdx(idx); } : undefined}
              onDragOver={isEditing && !selectMode ? e => { e.preventDefault(); setDragOverIdx(idx); } : undefined}
              onDragLeave={isEditing && !selectMode ? () => setDragOverIdx(null) : undefined}
              onDrop={isEditing && !selectMode ? e => { e.preventDefault(); e.stopPropagation(); if (dragIdx !== null && dragIdx !== idx) moveItem(dragIdx, idx, item.categoryId); setDragIdx(null); setDragOverIdx(null); } : undefined}
              onDragEnd={isEditing && !selectMode ? () => { setDragIdx(null); setDragOverIdx(null); } : undefined}
              onClick={() => selectMode ? toggleSelect(item.id) : (!isEditing ? setLightboxIndex(idx) : undefined)}
            >
              {dragOverIdx === idx && dragIdx !== null && dragIdx !== idx && (
                <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full z-10" style={{ background: brandColor }} />
              )}
              <div
                data-item-id={item.id}
                className="rounded-xl overflow-hidden border bg-gray-50 dark:bg-gray-800/50"
                style={{
                  borderColor: isSelected ? brandColor : 'var(--border)',
                  outline: isSelected ? `2px solid ${brandColor}` : 'none',
                }}
              >
                <img src={`/uploads/${item.filename}`} alt="" className="w-full h-40" style={{ objectFit: fit }} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2">
                  {!selectMode && !isEditing && <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />}
                  {!selectMode && isEditing && (
                    <button onClick={e => { e.stopPropagation(); setLightboxIndex(idx); }}
                      className="p-1.5 rounded-lg bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <ZoomIn size={14} />
                    </button>
                  )}
                </div>
                {selectMode && (
                  <div className="absolute top-2 left-2">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-transparent' : 'border-white bg-black/20'}`}
                      style={isSelected ? { background: brandColor } : {}}>
                      {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`/uploads/${item.filename}`}
                    download={item.filename}
                    onClick={e => { e.stopPropagation(); trackDownload(module.id, [item.id]); }}
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 shadow-sm"
                  >
                    <Download size={13} />
                  </a>
                  {isEditing && (
                    <button
                      onClick={e => { e.stopPropagation(); removeGalleryItem(item.id); }}
                      className="p-1.5 rounded-lg bg-white dark:bg-gray-900/80 hover:bg-white dark:bg-gray-900 text-red-500 shadow-sm"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {isEditing && <CategorySelect categories={imageCategories} value={item.categoryId} onChange={cid => patchImageItems(imageItems.map(i => { if (i.id !== item.id) return i; const { categoryId: _c, ...rest } = i; return cid ? { ...rest, categoryId: cid } : rest; }))} />}
            {/* Caption — outside the draggable div */}
            {isEditing && (
              <input
                type="text"
                placeholder="Ajouter une légende…"
                defaultValue={item.caption ?? ''}
                onBlur={e => { if (e.target.value !== (item.caption ?? '')) updateCaption(item.id, e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                className="w-full text-xs text-gray-500 placeholder-gray-300 bg-transparent outline-none border-b border-transparent focus:border-gray-300 dark:border-gray-700 transition-colors py-1 text-center"
              />
            )}
            {(statusOf(item) !== 'validated' || isEditing) && (
              <div className="flex items-center justify-center gap-2">
                {isEditing
                  ? <StatusSelect value={item.status} onChange={st => setImageStatus(item.id, st)} />
                  : <StatusBadge status={statusOf(item)} />}
                {(isEditing || (item.versions ?? []).length > 0) && (
                  <button onClick={() => setOpenVersions(v => v === item.id ? null : item.id)} title="Versions"
                    className="p-1.5 rounded-lg border text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <History size={12} />
                  </button>
                )}
              </div>
            )}
            {!isEditing && statusOf(item) === 'validated' && (item.versions ?? []).length > 0 && (
              <button onClick={() => setOpenVersions(v => v === item.id ? null : item.id)} className="text-[10px] text-gray-400 hover:text-gray-600 text-center">
                Historique des versions
              </button>
            )}
            {openVersions === item.id && (
              <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <VersionHistory
                  current={item}
                  versions={item.versions ?? []}
                  baseName={item.caption || 'image'}
                  canEdit={isEditing}
                  accept="image/*"
                  onReplace={file => replaceImageFile(item.id, file)}
                  onRestore={i => patchImageItems(allImageItems.map(a => a.id === item.id ? restoreVersion(a, i) : a))}
                />
              </div>
            )}
          </div>
          );
  }

  function renderGroup(groupItems: ImageItem[], cat: IconCategory | null) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {groupItems.map(renderCard)}
        {isEditing && !selectMode && dragIdx !== null && (
          <div
            className="relative min-h-[24px]"
            onDragOver={e => { e.preventDefault(); setDragOverIdx(imageItems.length); }}
            onDrop={e => { e.preventDefault(); if (dragIdx !== null) moveItem(dragIdx, imageItems.length, cat?.id); setDragIdx(null); setDragOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
          />
        )}

        {isEditing && (
          <button
            onClick={() => pickGalleryFiles(cat?.id)}
            className="h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus size={20} />
            <span className="text-xs">Ajouter une image</span>
          </button>
        )}

        {!isEditing && imageItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 gap-2 text-gray-300 dark:text-gray-500">
            <ImageIcon size={28} />
            <span className="text-sm">Aucune image</span>
          </div>
        )}
      </div>
    );
  }

  // ——— Single ———
  if (mode === 'single') {
    if (module.imageFilename) {
      const singleStatus = statusOf({ status: module.imageStatus });
      // En lecture : brouillon masqué, obsolète replié derrière un bouton.
      if (!isEditing && (singleStatus === 'draft' || (singleStatus === 'obsolete' && !showObsolete))) {
        return (
          <div>
            {descriptionBlock}
            {singleStatus === 'obsolete' ? (
              <button onClick={() => setShowObsolete(true)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                Afficher l&apos;image obsolète
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300 dark:text-gray-500">
                <ImageIcon size={28} />
                <span className="text-sm">Aucune image</span>
              </div>
            )}
          </div>
        );
      }
      return (
        <div>
          {isEditing && <ModeToggle />}
          {isEditing && <FitToggle />}
          {descriptionBlock}
          <div className="relative group rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', opacity: singleStatus === 'obsolete' ? 0.6 : 1 }}>
            <img src={`/uploads/${module.imageFilename}`} alt="" className="w-full max-h-[500px] bg-gray-50 dark:bg-gray-800/50" style={{ objectFit: fit }} />
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setLightboxIndex(0)}
                className="p-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border)' }}>
                <ZoomIn size={14} />
              </button>
              <a href={`/uploads/${module.imageFilename}`} download={module.imageFilename} onClick={() => trackDownload(module.id, ['__single'])}
                className="p-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center" style={{ borderColor: 'var(--border)' }}>
                <Download size={14} />
              </a>
              {isEditing && (
                <>
                  <button onClick={() => inputRef.current?.click()}
                    className="p-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border)' }}>
                    <Upload size={14} />
                  </button>
                  <button onClick={removeSingle} className="p-2 rounded-lg bg-white dark:bg-gray-900 border shadow-sm hover:bg-red-50 text-red-500" style={{ borderColor: 'var(--border)' }}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleSingleInput(e.target.files)} />
          </div>
          {(isEditing || singleStatus !== 'validated' || (module.imageVersions ?? []).length > 0) && (
            <div className="mt-2 flex items-center gap-2">
              {isEditing
                ? <StatusSelect value={module.imageStatus} onChange={setSingleStatus} />
                : <StatusBadge status={singleStatus} />}
              {(isEditing || (module.imageVersions ?? []).length > 0) && (
                <button onClick={() => setOpenVersions(v => v === 'single' ? null : 'single')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <History size={12} /> Versions
                </button>
              )}
            </div>
          )}
          {openVersions === 'single' && (
            <div className="mt-2 p-3 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <VersionHistory
                current={{ filename: module.imageFilename, size: module.imageSize ?? 0 }}
                versions={module.imageVersions ?? []}
                baseName="image"
                canEdit={isEditing}
                accept="image/*"
                onReplace={replaceSingleFile}
                onRestore={restoreSingleVersion}
              />
            </div>
          )}
          {lightboxIndex !== null && <Lightbox items={lightboxItems} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} />}
        </div>
      );
    }
    return (
      <div>
        {isEditing && <ModeToggle />}
        {descriptionBlock}
        {isEditing ? (
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-12 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300" style={{ borderColor: 'var(--border)' }}>
            <ImageIcon size={32} />
            <span className="text-sm">Cliquez pour uploader une image</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleSingleInput(e.target.files)} />
          </label>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300 dark:text-gray-500">
            <ImageIcon size={28} />
            <span className="text-sm">Aucune image</span>
          </div>
        )}
      </div>
    );
  }

  const hasSelection = selected.size > 0;

  // ——— Gallery ———
  return (
    <div>
      {isEditing && <ModeToggle />}
      {isEditing && <FitToggle />}
      {descriptionBlock}

      {/* Download bar */}
      {imageItems.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          {selectMode && hasSelection && (
            <>
              <span className="text-xs text-gray-500">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
              <button
                onClick={() => downloadZip([...selected])}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <Download size={12} /> Télécharger la sélection ({selected.size})
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300">
                Tout désélectionner
              </button>
              {isEditing && imageCategories.length > 0 && (
                <Select
                  value=""
                  placeholder="Ranger dans…"
                  className="text-xs"
                  onChange={v => assignSelection(v === '__none' ? undefined : v)}
                  options={[{ value: '__none', label: 'Sans catégorie' }, ...imageCategories.map(c => ({ value: c.id, label: `${c.emoji ?? '📁'} ${c.name}` }))]}
                />
              )}
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setSelectMode(s => !s); setSelected(new Set()); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
              style={selectMode
                ? { borderColor: brandColor, color: brandColor, background: `${brandColor}10` }
                : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {selectMode ? 'Annuler' : 'Sélectionner'}
            </button>
            <button
              onClick={() => downloadZip()}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <Download size={12} /> {downloading ? 'Génération…' : 'Tout télécharger (.zip)'}
            </button>
          </div>
        </div>
      )}

      {!isEditing && obsoleteCount > 0 && (
        <button onClick={() => setShowObsolete(o => !o)} className="mb-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          {showObsolete ? 'Masquer' : 'Afficher'} les obsolètes ({obsoleteCount})
        </button>
      )}
      <CategorySections
        items={imageItems}
        categories={imageCategories}
        isEditing={!!isEditing}
        brandColor={brandColor}
        onSave={saveCategories}
        renderGroup={renderGroup}
        itemDragging={dragIdx !== null}
        onDropItem={catId => { if (dragIdx !== null) moveItem(dragIdx, imageItems.length, catId); setDragIdx(null); setDragOverIdx(null); }}
        headerExtra={(cat, catItems) => {
          const published = catItems.filter(i => isPublished(i));
          if (published.length === 0) return null;
          const name = cat ? (categoryFolders(imageCategories).get(cat.id) ?? cat.name) : 'Sans catégorie';
          return (
            <button
              onClick={() => downloadZip(published.map(i => i.id), { name })}
              disabled={downloading}
              title="Télécharger cette catégorie (.zip)"
              className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
            >
              <Download size={12} />
            </button>
          );
        }}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleGalleryInput(e.target.files)} />
      {lightboxIndex !== null && <Lightbox items={lightboxItems} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </div>
  );
}
