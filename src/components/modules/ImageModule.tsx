'use client';

import { useRef } from 'react';
import { Module, ImageItem } from '@/types';
import { ImageIcon, Trash2, Upload, Plus, LayoutGrid, Square } from 'lucide-react';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

export default function ImageModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mode = module.imageMode ?? 'single';
  const imageItems = module.imageItems ?? [];

  async function setMode(newMode: 'single' | 'gallery') {
    const patch: Record<string, unknown> = { imageMode: newMode };

    if (newMode === 'gallery' && module.imageFilename) {
      // Migrate single image into gallery items
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

  // — Single mode —

  async function uploadSingle(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'image');
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  async function removeSingle() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageFilename: null, imageMimeType: null, imageSize: null }),
    });
    onUpdate(await res.json());
  }

  // — Gallery mode —

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

  // — Mode toggle (edit only) —
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

  // ——— Single ———
  if (mode === 'single') {
    if (module.imageFilename) {
      return (
        <div>
          {isEditing && <ModeToggle />}
          <div className="relative group rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            <img src={`/uploads/${module.imageFilename}`} alt="" className="w-full object-contain max-h-[500px] bg-gray-50" />
            {isEditing && (
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => inputRef.current?.click()}
                  className="p-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                  <Upload size={14} />
                </button>
                <button onClick={removeSingle} className="p-2 rounded-lg bg-white border shadow-sm hover:bg-red-50 text-red-500" style={{ borderColor: 'var(--border)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadSingle(e.target.files[0])} />
          </div>
        </div>
      );
    }
    return (
      <div>
        {isEditing && <ModeToggle />}
        {isEditing ? (
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-12 cursor-pointer hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600" style={{ borderColor: 'var(--border)' }}>
            <ImageIcon size={32} />
            <span className="text-sm">Cliquez pour uploader une image</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadSingle(e.target.files[0])} />
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
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {imageItems.map(item => (
          <div key={item.id} className="relative group rounded-xl overflow-hidden border bg-gray-50" style={{ borderColor: 'var(--border)' }}>
            <img src={`/uploads/${item.filename}`} alt="" className="w-full h-40 object-cover" />
            {isEditing && (
              <button
                onClick={() => removeGalleryItem(item.id)}
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
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadGalleryItem(e.target.files[0])} />
    </div>
  );
}
