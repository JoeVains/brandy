'use client';

import { useRef, useState } from 'react';
import { Module, FontItem } from '@/types';
import { Plus, Trash2, Upload, Type } from 'lucide-react';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
}

const SAMPLE_TEXT = 'The quick brown fox jumps over the lazy dog';
const GOOGLE_FONT_SIZES = [12, 16, 24, 36, 48];

function GoogleFontPreview({ family }: { family: string }) {
  return (
    <div>
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`} />
      <div style={{ fontFamily: `'${family}', sans-serif` }} className="space-y-1">
        {GOOGLE_FONT_SIZES.map(size => (
          <p key={size} style={{ fontSize: size }} className="text-gray-800 leading-tight truncate">
            {SAMPLE_TEXT}
          </p>
        ))}
      </div>
    </div>
  );
}

function UploadFontPreview({ filename, name }: { filename: string; name: string }) {
  const fontFace = `@font-face { font-family: '${name}'; src: url('/uploads/${filename}'); }`;
  return (
    <div>
      <style>{fontFace}</style>
      <div style={{ fontFamily: `'${name}', sans-serif` }} className="space-y-1">
        {GOOGLE_FONT_SIZES.map(size => (
          <p key={size} style={{ fontSize: size }} className="text-gray-800 leading-tight truncate">
            {SAMPLE_TEXT}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function TypographyModule({ module, brandColor, onUpdate }: Props) {
  const [showAddGoogle, setShowAddGoogle] = useState(false);
  const [googleFamily, setGoogleFamily] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const items = module.fontItems ?? [];

  async function addGoogleFont() {
    if (!googleFamily.trim()) return;
    const item: FontItem = {
      id: crypto.randomUUID(),
      name: googleFamily.trim(),
      source: 'google',
      family: googleFamily.trim(),
    };
    const newItems = [...items, item];
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fontItems: newItems }),
    });
    onUpdate(await res.json());
    setGoogleFamily('');
    setShowAddGoogle(false);
  }

  async function uploadFont(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'font');
    fd.append('name', file.name.replace(/\.[^.]+$/, ''));
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  async function deleteItem(id: string) {
    const newItems = items.filter(i => i.id !== id);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fontItems: newItems }),
    });
    onUpdate(await res.json());
  }

  return (
    <div className="space-y-6">
      {items.map(item => (
        <div key={item.id} className="border rounded-xl p-5 group relative" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-semibold text-gray-800">{item.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.source === 'google' ? 'Google Fonts' : 'Police uploadée'}</p>
            </div>
            <button onClick={() => deleteItem(item.id)}
              className="p-1.5 rounded-lg border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 text-gray-400" style={{ borderColor: 'var(--border)' }}>
              <Trash2 size={13} />
            </button>
          </div>
          {item.source === 'google' && item.family ? (
            <GoogleFontPreview family={item.family} />
          ) : item.filename ? (
            <UploadFontPreview filename={item.filename} name={item.name} />
          ) : null}
        </div>
      ))}

      <div className="flex gap-3">
        {showAddGoogle ? (
          <div className="flex-1 flex gap-2 border rounded-xl px-4 py-3 items-center" style={{ borderColor: 'var(--border)' }}>
            <Type size={16} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              className="flex-1 outline-none text-sm"
              placeholder="Nom de la police (ex: Roboto, Playfair Display)"
              value={googleFamily}
              onChange={e => setGoogleFamily(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addGoogleFont(); if (e.key === 'Escape') setShowAddGoogle(false); }}
            />
            <button onClick={addGoogleFont} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: brandColor }}>
              Ajouter
            </button>
            <button onClick={() => setShowAddGoogle(false)} className="text-xs px-3 py-1.5 rounded-lg border text-gray-500" style={{ borderColor: 'var(--border)' }}>
              Annuler
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowAddGoogle(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Plus size={14} /> Google Fonts
            </button>
            <button onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Upload size={14} /> Uploader une police
            </button>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={e => e.target.files?.[0] && uploadFont(e.target.files[0])} />
    </div>
  );
}
