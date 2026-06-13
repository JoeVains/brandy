'use client';

import { useState, useRef } from 'react';
import { Module } from '@/types';
import { Upload, Link, X, Check, Pencil } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  if (url.includes('/embed/') || url.includes('player.vimeo.com')) return url;
  return null;
}

export default function VideoModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'embed' | 'upload'>(module.videoMode ?? 'embed');
  const [urlInput, setUrlInput] = useState(module.videoUrl ?? '');
  const [title, setTitle] = useState(module.videoTitle ?? '');
  const [caption, setCaption] = useState(module.videoCaption ?? '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const embedUrl = toEmbedUrl(module.videoUrl ?? '');
  const previewEmbedUrl = toEmbedUrl(urlInput);

  async function save() {
    const body: Partial<Module> = { videoMode: mode, videoTitle: title, videoCaption: caption };
    if (mode === 'embed') body.videoUrl = urlInput;
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    onUpdate(await res.json());
    setEditing(false);
  }

  function cancel() {
    setMode(module.videoMode ?? 'embed');
    setUrlInput(module.videoUrl ?? '');
    setTitle(module.videoTitle ?? '');
    setCaption(module.videoCaption ?? '');
    setEditing(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'video');
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    const updated = await res.json();
    // also save title/caption/mode
    const res2 = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ videoMode: 'upload', videoTitle: title, videoCaption: caption }),
    });
    onUpdate(await res2.json());
    setUploading(false);
    setEditing(false);
  }

  const hasContent = (module.videoMode === 'embed' && module.videoUrl) ||
    (module.videoMode === 'upload' && module.videoFilename);

  if (editing) {
    return (
      <div className="border rounded-xl p-4 space-y-4" style={{ borderColor: brandColor, outline: `2px solid ${brandColor}` }}>
        {/* Mode toggle */}
        <div className="flex items-center gap-3">
          <div className="flex p-0.5 bg-gray-100 rounded-lg">
            {(['embed', 'upload'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={mode === m ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}>
                {m === 'embed' ? <><Link size={11} /> Embed</> : <><Upload size={11} /> Upload</>}
              </button>
            ))}
          </div>
        </div>

        {mode === 'embed' ? (
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
              placeholder="URL YouTube ou Vimeo…"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
            />
            {urlInput && (previewEmbedUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe src={previewEmbedUrl} className="w-full h-full" allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            ) : (
              <p className="text-xs text-red-400">URL non reconnue (YouTube ou Vimeo uniquement)</p>
            ))}
          </div>
        ) : (
          <div>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Upload size={20} />
              <span className="text-xs">{uploading ? 'Envoi en cours…' : 'Choisir une vidéo'}</span>
              {module.videoFilename && <span className="text-[10px] text-gray-300">{module.videoFilename}</span>}
            </button>
          </div>
        )}

        {/* Title & caption */}
        <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--border)' }}
          placeholder="Titre (optionnel)" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--border)' }}
          placeholder="Légende (optionnelle)" value={caption} onChange={e => setCaption(e.target.value)} />

        <div className="flex gap-2">
          <button onClick={save} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: brandColor }}>
            <Check size={11} /> Sauvegarder
          </button>
          <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>
            <X size={11} /> Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />

      {!hasContent ? (
        isEditing ? (
          <button onClick={() => setEditing(true)}
            className="w-full border-2 border-dashed rounded-xl py-12 flex flex-col items-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Upload size={24} />
            <span className="text-sm">Ajouter une vidéo</span>
            <span className="text-xs text-gray-300">Embed YouTube / Vimeo ou upload</span>
          </button>
        ) : (
          <div className="aspect-video rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
            Aucune vidéo
          </div>
        )
      ) : (
        <div className="group relative">
          {module.videoMode === 'embed' && embedUrl ? (
            <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          ) : module.videoMode === 'upload' && module.videoFilename ? (
            <div className="rounded-xl overflow-hidden bg-black shadow-sm">
              <video controls className="w-full max-h-[560px]"
                src={`/uploads/${module.videoFilename}`}>
              </video>
            </div>
          ) : null}

          {isEditing && (
            <button onClick={() => setEditing(true)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil size={13} />
            </button>
          )}

          {(module.videoTitle || module.videoCaption) && (
            <div className="mt-3 space-y-0.5">
              {module.videoTitle && <p className="text-sm font-medium text-gray-800">{module.videoTitle}</p>}
              {module.videoCaption && <p className="text-xs text-gray-400">{module.videoCaption}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
