'use client';

import { useRef } from 'react';
import { Module } from '@/types';
import { ImageIcon, Trash2, Upload } from 'lucide-react';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
}

export default function ImageModule({ module, brandColor, onUpdate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'image');
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  async function removeImage() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageFilename: null, imageMimeType: null, imageSize: null }),
    });
    onUpdate(await res.json());
  }

  if (module.imageFilename) {
    return (
      <div className="relative group rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <img src={`/uploads/${module.imageFilename}`} alt="" className="w-full object-contain max-h-[500px] bg-gray-50" />
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => inputRef.current?.click()}
            className="p-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}>
            <Upload size={14} />
          </button>
          <button onClick={removeImage} className="p-2 rounded-lg bg-white border shadow-sm hover:bg-red-50 text-red-500" style={{ borderColor: 'var(--border)' }}>
            <Trash2 size={14} />
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div>
      <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-12 cursor-pointer hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600" style={{ borderColor: 'var(--border)' }}>
        <ImageIcon size={32} />
        <span className="text-sm">Cliquez pour uploader une image</span>
        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
    </div>
  );
}
