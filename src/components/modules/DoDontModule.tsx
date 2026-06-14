'use client';

import { useRef, useState } from 'react';
import { Module, DoDontItem } from '@/types';
import { Plus, Trash2, Copy, Pencil, Image as ImageIcon, Type } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

const DO_COLOR = '#16a34a';
const DONT_COLOR = '#dc2626';

function Column({
  label, icon, color, items, isEditing, layout, onAdd, onAddText, onUpdateCaption, onUpdateContent, onUpdateFit, onDelete, onDuplicate, onReplaceImage,
}: {
  label: string;
  icon: string;
  color: string;
  items: DoDontItem[];
  isEditing?: boolean;
  layout: 'stacked' | 'sidebyside';
  onAdd: (file: File) => void;
  onAddText: () => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateFit: (id: string, fit: 'cover' | 'contain') => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReplaceImage: (id: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRefs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-3" style={{ background: `${color}15` }}>
        <span className="text-lg font-bold" style={{ color }}>{icon}</span>
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className={`group relative border-2 rounded-xl overflow-hidden ${layout === 'sidebyside' ? 'flex h-40' : ''}`} style={{ borderColor: color }}>

            {/* Image item */}
            {item.type === 'image' && item.filename && (
              <div className={`relative overflow-hidden ${layout === 'sidebyside' ? 'w-1/2 shrink-0' : 'h-48'}`}>
                <img src={`/uploads/${item.filename}`} alt=""
                  className="block w-full h-full bg-gray-50"
                  style={{ objectFit: item.fit ?? 'cover' }} />
                {color === DONT_COLOR && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                    <line x1="5%" y1="95%" x2="95%" y2="5%" stroke={DONT_COLOR} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                {isEditing && (
                  <div className="flex p-1 gap-1 bg-black/5 absolute top-2 left-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {(['cover', 'contain'] as const).map(f => (
                      <button key={f} onClick={() => onUpdateFit(item.id, f)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                        style={item.fit === f || (!item.fit && f === 'cover') ? { background: 'white', color: '#111' } : { color: 'white' }}>
                        {f === 'cover' ? 'Remplir' : 'Ajuster'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Text item (stacked) */}
            {item.type === 'text' && layout === 'stacked' && (
              <div className="p-4 min-h-[80px]" style={{ background: `${color}08` }}>
                {isEditing ? (
                  <textarea className="w-full bg-transparent outline-none text-sm text-gray-700 resize-none" rows={3}
                    placeholder="Décrivez ce cas…" value={item.content ?? ''}
                    onChange={e => onUpdateContent(item.id, e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content || <span className="text-gray-300 italic">Vide</span>}</p>
                )}
              </div>
            )}

            {/* Caption + text (side-by-side: right column) */}
            {layout === 'sidebyside' ? (
              <div className="flex-1 flex flex-col justify-center p-4 gap-2 min-w-0 border-l" style={{ background: item.type === 'text' ? `${color}08` : undefined, borderColor: `${color}30` }}>
                {item.type === 'text' && (
                  isEditing ? (
                    <textarea className="w-full bg-transparent outline-none text-sm text-gray-700 resize-none" rows={3}
                      placeholder="Décrivez ce cas…" value={item.content ?? ''}
                      onChange={e => onUpdateContent(item.id, e.target.value)} />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content || <span className="text-gray-300 italic">Vide</span>}</p>
                  )
                )}
                {isEditing ? (
                  <input className="w-full outline-none text-xs text-gray-500 placeholder-gray-300"
                    placeholder="Légende…" value={item.caption ?? ''}
                    onChange={e => onUpdateCaption(item.id, e.target.value)} />
                ) : (
                  item.caption ? <p className="text-xs text-gray-400">{item.caption}</p> : null
                )}
              </div>
            ) : (
              /* Caption (stacked) */
              <div className="px-3 py-2 bg-white border-t" style={{ borderColor: `${color}30` }}>
                {isEditing ? (
                  <input className="w-full outline-none text-xs text-gray-500 placeholder-gray-300"
                    placeholder="Légende…" value={item.caption ?? ''}
                    onChange={e => onUpdateCaption(item.id, e.target.value)} />
                ) : (
                  <p className="text-xs text-gray-400">{item.caption || ''}</p>
                )}
              </div>
            )}

            {/* Actions */}
            {isEditing && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === 'image' && (
                  <>
                    <button onClick={() => replaceRefs.current[item.id]?.click()}
                      className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-gray-400 hover:text-gray-700 shadow-sm">
                      <Pencil size={12} />
                    </button>
                    <input type="file" accept="image/*" className="hidden"
                      ref={el => { replaceRefs.current[item.id] = el; }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) onReplaceImage(item.id, f); e.target.value = ''; }} />
                  </>
                )}
                <button onClick={() => onDuplicate(item.id)}
                  className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-gray-400 hover:text-gray-700 shadow-sm">
                  <Copy size={12} />
                </button>
                <button onClick={() => onDelete(item.id)}
                  className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-gray-400 hover:text-red-500 shadow-sm">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add buttons */}
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed rounded-xl text-xs transition-colors"
              style={{ borderColor: `${color}40`, color: `${color}80` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}40`; (e.currentTarget as HTMLElement).style.color = `${color}80`; }}
            >
              <ImageIcon size={13} /> Image
            </button>
            <button
              onClick={onAddText}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed rounded-xl text-xs transition-colors"
              style={{ borderColor: `${color}40`, color: `${color}80` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}40`; (e.currentTarget as HTMLElement).style.color = `${color}80`; }}
            >
              <Type size={13} /> Texte
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onAdd(e.target.files[0])} />
          </div>
        )}

        {!isEditing && items.length === 0 && (
          <div className="py-8 flex items-center justify-center border-2 border-dashed rounded-xl" style={{ borderColor: `${color}20` }}>
            <span className="text-xs text-gray-300">Aucun exemple</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DoDontModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const doItems = module.doItems ?? [];
  const dontItems = module.dontItems ?? [];
  const layout = module.doDontLayout ?? 'stacked';

  async function setLayout(value: 'stacked' | 'sidebyside') {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ doDontLayout: value }),
    });
    onUpdate(await res.json());
  }

  async function patch(patch: Partial<Module>) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    onUpdate(await res.json());
  }

  async function uploadItem(slot: 'do' | 'dont', file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', slot);
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  async function replaceImage(col: 'do' | 'dont', id: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', col);
    fd.append('replaceId', id);
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  function addTextItem(col: 'do' | 'dont') {
    const item: DoDontItem = { id: crypto.randomUUID(), type: 'text', content: '', caption: '' };
    if (col === 'do') patch({ doItems: [...doItems, item] });
    else patch({ dontItems: [...dontItems, item] });
  }

  function updateItem(col: 'do' | 'dont', id: string, changes: Partial<DoDontItem>) {
    const items = col === 'do' ? doItems : dontItems;
    const updated = items.map(i => i.id === id ? { ...i, ...changes } : i);
    patch(col === 'do' ? { doItems: updated } : { dontItems: updated });
  }

  function deleteItem(col: 'do' | 'dont', id: string) {
    const items = col === 'do' ? doItems : dontItems;
    const updated = items.filter(i => i.id !== id);
    patch(col === 'do' ? { doItems: updated } : { dontItems: updated });
  }

  function duplicateItem(col: 'do' | 'dont', id: string) {
    const items = col === 'do' ? doItems : dontItems;
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    const copy = { ...items[idx], id: crypto.randomUUID() };
    const updated = [...items];
    updated.splice(idx + 1, 0, copy);
    patch(col === 'do' ? { doItems: updated } : { dontItems: updated });
  }

  return (
    <div>
      {isEditing && (
        <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
          <button onClick={() => setLayout('stacked')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={layout === 'stacked' ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}>
            Empilé
          </button>
          <button onClick={() => setLayout('sidebyside')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={layout === 'sidebyside' ? { background: 'white', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: '#6b7280' }}>
            Côte à côte
          </button>
        </div>
      )}
      <ModuleDescription
        moduleId={module.id}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />
      <div className="flex gap-5">
        <Column
          label="À faire" icon="✓" color={DO_COLOR}
          items={doItems} isEditing={isEditing} layout={layout}
          onAdd={f => uploadItem('do', f)}
          onAddText={() => addTextItem('do')}
          onUpdateCaption={(id, caption) => updateItem('do', id, { caption })}
          onUpdateContent={(id, content) => updateItem('do', id, { content })}
          onUpdateFit={(id, fit) => updateItem('do', id, { fit })}
          onDelete={id => deleteItem('do', id)}
          onDuplicate={id => duplicateItem('do', id)}
          onReplaceImage={(id, f) => replaceImage('do', id, f)}
        />
        <Column
          label="À ne pas faire" icon="✗" color={DONT_COLOR}
          items={dontItems} isEditing={isEditing} layout={layout}
          onAdd={f => uploadItem('dont', f)}
          onAddText={() => addTextItem('dont')}
          onUpdateCaption={(id, caption) => updateItem('dont', id, { caption })}
          onUpdateContent={(id, content) => updateItem('dont', id, { content })}
          onUpdateFit={(id, fit) => updateItem('dont', id, { fit })}
          onDelete={id => deleteItem('dont', id)}
          onDuplicate={id => duplicateItem('dont', id)}
          onReplaceImage={(id, f) => replaceImage('dont', id, f)}
        />
      </div>
    </div>
  );
}
