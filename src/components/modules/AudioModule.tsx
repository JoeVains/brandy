'use client';

import { useState, useRef } from 'react';
import { Module } from '@/types';
import { Upload, Link, X, Check, Pencil, Music } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

function toEmbedUrl(url: string): { src: string; height: number } | null {
  // SoundCloud
  if (url.includes('soundcloud.com')) {
    const encoded = encodeURIComponent(url);
    return {
      src: `https://w.soundcloud.com/player/?url=${encoded}&color=%23${''}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      height: 166,
    };
  }
  // Spotify track / album / playlist
  const spotifyMatch = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    return {
      src: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`,
      height: 152,
    };
  }
  return null;
}

export default function AudioModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'embed' | 'upload'>(module.audioMode ?? 'embed');
  const [urlInput, setUrlInput] = useState(module.audioUrl ?? '');
  const [title, setTitle] = useState(module.audioTitle ?? '');
  const [caption, setCaption] = useState(module.audioCaption ?? '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const savedEmbed = module.audioUrl ? toEmbedUrl(module.audioUrl) : null;
  const previewEmbed = urlInput ? toEmbedUrl(urlInput) : null;

  async function save() {
    const body: Partial<Module> = { audioMode: mode, audioTitle: title, audioCaption: caption };
    if (mode === 'embed') body.audioUrl = urlInput;
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    onUpdate(await res.json());
    setEditing(false);
  }

  function cancel() {
    setMode(module.audioMode ?? 'embed');
    setUrlInput(module.audioUrl ?? '');
    setTitle(module.audioTitle ?? '');
    setCaption(module.audioCaption ?? '');
    setEditing(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'audio');
    await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ audioMode: 'upload', audioTitle: title, audioCaption: caption }),
    });
    onUpdate(await res.json());
    setUploading(false);
    setEditing(false);
  }

  const hasContent = (module.audioMode === 'embed' && module.audioUrl) ||
    (module.audioMode === 'upload' && module.audioFilename);

  if (editing) {
    return (
      <div className="border rounded-xl p-4 space-y-4" style={{ borderColor: brandColor, outline: `2px solid ${brandColor}` }}>
        <div className="flex p-0.5 bg-gray-100 rounded-lg w-fit">
          {(['embed', 'upload'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={mode === m ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}>
              {m === 'embed' ? <><Link size={11} /> Embed</> : <><Upload size={11} /> Upload</>}
            </button>
          ))}
        </div>

        {mode === 'embed' ? (
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
              placeholder="URL SoundCloud ou Spotify…"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
            />
            {urlInput && (previewEmbed ? (
              <iframe src={previewEmbed.src} height={previewEmbed.height}
                className="w-full rounded-lg" frameBorder="0" allow="autoplay" />
            ) : (
              <p className="text-xs text-red-400">URL non reconnue (SoundCloud ou Spotify uniquement)</p>
            ))}
          </div>
        ) : (
          <div>
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <Music size={20} />
              <span className="text-xs">{uploading ? 'Envoi en cours…' : 'Choisir un fichier audio'}</span>
              <span className="text-[10px] text-gray-300">MP3, WAV, OGG, AAC…</span>
              {module.audioFilename && <span className="text-[10px] text-gray-300">{module.audioFilename}</span>}
            </button>
          </div>
        )}

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
            className="w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}>
            <Music size={22} />
            <span className="text-sm">Ajouter un audio</span>
            <span className="text-xs text-gray-300">Embed SoundCloud / Spotify ou upload</span>
          </button>
        ) : (
          <div className="rounded-xl bg-gray-100 py-8 flex items-center justify-center text-gray-300 text-sm gap-2">
            <Music size={16} /> Aucun audio
          </div>
        )
      ) : (
        <div className="group relative">
          {module.audioMode === 'embed' && savedEmbed ? (
            <iframe src={savedEmbed.src} height={savedEmbed.height}
              className="w-full rounded-xl" frameBorder="0" allow="autoplay" />
          ) : module.audioMode === 'upload' && module.audioFilename ? (
            <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: brandColor + '20' }}>
                <Music size={16} style={{ color: brandColor }} />
              </div>
              <div className="flex-1 min-w-0">
                {module.audioTitle && <p className="text-sm font-medium text-gray-800 truncate">{module.audioTitle}</p>}
                <audio controls className="w-full mt-1" src={`/uploads/${module.audioFilename}`} />
              </div>
            </div>
          ) : null}

          {isEditing && (
            <button onClick={() => setEditing(true)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil size={13} />
            </button>
          )}

          {module.audioMode !== 'upload' && (module.audioTitle || module.audioCaption) && (
            <div className="mt-3 space-y-0.5">
              {module.audioTitle && <p className="text-sm font-medium text-gray-800">{module.audioTitle}</p>}
              {module.audioCaption && <p className="text-xs text-gray-400">{module.audioCaption}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
