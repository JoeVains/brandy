'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Module, ImageItem } from '@/types';
import { ImageIcon, Trash2, Upload, Plus, LayoutGrid, Square, X, Download, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
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

interface LightboxItem { src: string; filename: string; mimeType?: string; }

function Lightbox({ items, index, onNavigate, onClose }: {
  items: LightboxItem[];
  index: number;
  onNavigate: (i: number) => void;
  onClose: () => void;
}) {
  const { src, filename, mimeType } = items[index];
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
  }, [index, hasPrev, hasNext, onNavigate, onClose]);

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

      {/* Counter */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs">
          {index + 1} / {items.length}
        </div>
      )}
    </div>,
    document.body
  );
}

export default function ImageModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const mode = module.imageMode ?? 'single';
  const fit = module.imageFit ?? 'contain';
  const imageItems = module.imageItems ?? [];

  const lightboxItems: LightboxItem[] = mode === 'gallery'
    ? imageItems.map(i => ({ src: `/uploads/${i.filename}`, filename: i.filename, mimeType: i.mimeType }))
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
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slot', 'image-item');
      const r = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
      onUpdate(await r.json());
    }
  }

  async function removeSingle() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageFilename: null, imageMimeType: null, imageSize: null }),
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
    <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
      <button
        onClick={() => setMode('single')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={mode === 'single' ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}
      >
        <Square size={12} /> Image unique
      </button>
      <button
        onClick={() => setMode('gallery')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={mode === 'gallery' ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}
      >
        <LayoutGrid size={12} /> Galerie
      </button>
    </div>
  );

  const FitToggle = () => (
    <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
      <button
        onClick={() => setFit('contain')}
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={fit === 'contain' ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}
      >
        Ajuster
      </button>
      <button
        onClick={() => setFit('cover')}
        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        style={fit === 'cover' ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}
      >
        Remplir
      </button>
    </div>
  );

  const descriptionBlock = (
    <ModuleDescription
      moduleId={module.id}
      value={module.description}
      isEditing={isEditing}
      onUpdate={desc => onUpdate({ ...module, description: desc })}
    />
  );

  // ——— Single ———
  if (mode === 'single') {
    if (module.imageFilename) {
      return (
        <div>
          {isEditing && <ModeToggle />}
          {isEditing && <FitToggle />}
          {descriptionBlock}
          <div className="relative group rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <img src={`/uploads/${module.imageFilename}`} alt="" className="w-full max-h-[500px] bg-gray-50" style={{ objectFit: fit }} />
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setLightboxIndex(0)}
                className="p-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                <ZoomIn size={14} />
              </button>
              <a href={`/uploads/${module.imageFilename}`} download={module.imageFilename}
                className="p-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50 flex items-center" style={{ borderColor: 'var(--border)' }}>
                <Download size={14} />
              </a>
              {isEditing && (
                <>
                  <button onClick={() => inputRef.current?.click()}
                    className="p-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                    <Upload size={14} />
                  </button>
                  <button onClick={removeSingle} className="p-2 rounded-lg bg-white border shadow-sm hover:bg-red-50 text-red-500" style={{ borderColor: 'var(--border)' }}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleSingleInput(e.target.files)} />
          </div>
          {lightboxIndex !== null && <Lightbox items={lightboxItems} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} />}
        </div>
      );
    }
    return (
      <div>
        {isEditing && <ModeToggle />}
        {descriptionBlock}
        {isEditing ? (
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-12 cursor-pointer hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600" style={{ borderColor: 'var(--border)' }}>
            <ImageIcon size={32} />
            <span className="text-sm">Cliquez pour uploader une image</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleSingleInput(e.target.files)} />
          </label>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
            <ImageIcon size={28} />
            <span className="text-sm">Aucune image</span>
          </div>
        )}
      </div>
    );
  }

  // ——— Gallery ———
  return (
    <div>
      {isEditing && <ModeToggle />}
      {isEditing && <FitToggle />}
      {descriptionBlock}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {imageItems.map(item => (
          <div key={item.id} className="relative group rounded-xl overflow-hidden border bg-gray-50 cursor-pointer" style={{ borderColor: 'var(--border)' }}
            onClick={() => setLightboxIndex(imageItems.indexOf(item))}>
            <img src={`/uploads/${item.filename}`} alt="" className="w-full h-40" style={{ objectFit: fit }} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
            </div>
            {isEditing && (
              <button
                onClick={e => { e.stopPropagation(); removeGalleryItem(item.id); }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 hover:bg-white text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}

        {isEditing && (
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus size={20} />
            <span className="text-xs">Ajouter une image</span>
          </button>
        )}

        {!isEditing && imageItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
            <ImageIcon size={28} />
            <span className="text-sm">Aucune image</span>
          </div>
        )}
      </div>
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleGalleryInput(e.target.files)} />
      {lightboxIndex !== null && <Lightbox items={lightboxItems} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </div>
  );
}
