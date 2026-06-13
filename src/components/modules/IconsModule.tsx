'use client';

import { useRef, useState, useEffect } from 'react';
import { Module } from '@/types';
import { Plus, Trash2, Download, Check, X, Search } from 'lucide-react';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [search, setSearch] = useState('');
  const [descDraft, setDescDraft] = useState(module.iconDescription ?? '');
  const [descFocused, setDescFocused] = useState(false);
  const prevEditing = useRef(isEditing);
  const items = module.iconItems ?? [];
  const filtered = search.trim() ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;

  useEffect(() => {
    if (prevEditing.current && !isEditing) {
      const trimmed = descDraft.trim();
      if (trimmed !== (module.iconDescription ?? '')) {
        fetch(`/api/modules/${module.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ iconDescription: trimmed }),
        }).then(r => r.json()).then(onUpdate);
      }
    }
    prevEditing.current = isEditing;
  }, [isEditing]);

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
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300">
        <span className="text-2xl">❖</span>
        <span className="text-sm">Aucune icône</span>
      </div>
    );
  }

  const hasSelection = selected.size > 0;

  return (
    <div>
      {/* Description */}
      {isEditing ? (
        <textarea
          className="w-full text-sm text-gray-500 resize-none outline-none rounded-lg px-3 py-2 mb-4 transition-colors"
          style={descFocused ? { background: '#f9fafb', border: '1px solid var(--border)' } : { background: 'transparent', border: '1px solid transparent' }}
          rows={2}
          placeholder="Ajouter une description…"
          value={descDraft}
          onChange={e => setDescDraft(e.target.value)}
          onFocus={() => setDescFocused(true)}
          onBlur={() => setDescFocused(false)}
          onDragStart={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        />
      ) : module.iconDescription ? (
        <p className="text-sm text-gray-500 mb-4">{module.iconDescription}</p>
      ) : null}

      {/* Search */}
      {items.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border outline-none bg-white transition-colors focus:border-gray-400"
            style={{ borderColor: 'var(--border)' }}
            placeholder="Rechercher une icône…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
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
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700">
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
            >
              <Download size={12} />
              {downloading ? 'Génération…' : 'Tout télécharger'}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
        {filtered.length === 0 && search && (
          <div className="col-span-full py-8 text-center text-sm text-gray-400">Aucune icône ne correspond à « {search} »</div>
        )}
        {filtered.map(item => {
          const isSelected = selected.has(item.id);
          return (
            <div key={item.id} className="group flex flex-col items-center gap-2">
              {/* Card */}
              <div
                onClick={() => toggleSelect(item.id)}
                className="relative w-full aspect-square rounded-xl border flex items-center justify-center p-3 bg-gray-50 cursor-pointer transition-all"
                style={{
                  borderColor: isSelected ? brandColor : 'var(--border)',
                  background: isSelected ? `${brandColor}10` : '#f9fafb',
                  boxShadow: isSelected ? `0 0 0 2px ${brandColor}` : undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/uploads/${item.filename}`} alt={item.name} className="w-full h-full object-contain" />

                {/* Selection checkmark */}
                <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                  style={{ background: isSelected ? brandColor : 'white', borderColor: isSelected ? brandColor : '#d1d5db' }}>
                  {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                </div>

                {/* Action buttons */}
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); downloadSingle(item.filename, item.name); }}
                    className="p-1 rounded-lg bg-white/90 hover:bg-white shadow-sm text-gray-600 hover:text-gray-900"
                  >
                    <Download size={11} />
                  </button>
                  {isEditing && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteIcon(item.id); }}
                      className="p-1 rounded-lg bg-white/90 hover:bg-white shadow-sm text-red-400 hover:text-red-600"
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
                  className="text-xs text-gray-500 truncate w-full text-center"
                  title={item.name}
                  onDoubleClick={() => { if (isEditing) { setEditingId(item.id); setNameDraft(item.name); } }}
                >
                  {item.name}
                </span>
              )}
            </div>
          );
        })}

        {/* Add button */}
        {isEditing && (
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus size={20} />
            <span className="text-xs">Ajouter</span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept=".svg" multiple className="hidden"
        onChange={e => e.target.files && uploadIcons(e.target.files)} />
    </div>
  );
}
