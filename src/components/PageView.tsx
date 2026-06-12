'use client';

import { useState, useEffect, useRef } from 'react';
import { Module, ModuleType, Section, Brand } from '@/types';
import { Plus, GripVertical, Trash2, Palette, Type, AlignLeft, Image, Paperclip, Minus, Pencil, Check, X, PenLine } from 'lucide-react';
import ColorsModule from './modules/ColorsModule';
import TypographyModule from './modules/TypographyModule';
import TextModule from './modules/TextModule';
import ImageModule from './modules/ImageModule';
import AttachmentsModule from './modules/AttachmentsModule';
import DividerModule from './modules/DividerModule';

interface Props {
  brand: Brand;
  section: Section;
  onModuleDragStart?: (module: Module) => void;
  onModuleDragEnd?: () => void;
}

const MODULE_TYPES: { type: ModuleType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'colors', label: 'Couleurs', icon: <Palette size={18} />, description: 'Nuancier de couleurs avec valeurs HEX, RVB et TSL' },
  { type: 'typography', label: 'Typographie', icon: <Type size={18} />, description: 'Polices Google Fonts ou fichiers locaux' },
  { type: 'text', label: 'Texte', icon: <AlignLeft size={18} />, description: 'Bloc de texte libre' },
  { type: 'image', label: 'Image', icon: <Image size={18} />, description: 'Une image par module' },
  { type: 'attachments', label: 'Fichiers', icon: <Paperclip size={18} />, description: 'ZIP, PDF et autres pièces jointes' },
  { type: 'divider', label: 'Séparateur', icon: <Minus size={18} />, description: 'Ligne de séparation horizontale' },
];

function ModuleCard({ module, brandColor, onUpdate, onDelete, dragHandleProps, isDragging }: {
  module: Module;
  brandColor: string;
  onUpdate: (m: Module) => void;
  onDelete: () => void;
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
  isDragging: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(module.title);
  const meta = MODULE_TYPES.find(t => t.type === module.type)!;

  async function saveTitle() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: titleDraft }),
    });
    onUpdate(await res.json());
    setEditingTitle(false);
  }

  return (
    <div className={`border rounded-2xl bg-white transition-shadow ${isDragging ? 'shadow-xl opacity-50' : 'shadow-sm'} ${isEditing ? 'ring-2' : ''}`}
      style={{ borderColor: 'var(--border)', ...(isEditing ? { ringColor: brandColor, outline: `2px solid ${brandColor}` } : {}) }}>
      {/* Module header */}
      {module.type !== 'divider' && (
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0">
            <GripVertical size={16} />
          </div>
          <span className="text-gray-400 flex-shrink-0">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 outline-none text-sm font-semibold text-gray-800 border-b"
                  style={{ borderColor: brandColor }}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(module.title); } }}
                />
                <button onClick={saveTitle} className="text-green-600"><Check size={13} /></button>
                <button onClick={() => { setEditingTitle(false); setTitleDraft(module.title); }} className="text-gray-400"><X size={13} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <span className="text-sm font-semibold text-gray-800">{module.title || meta.label}</span>
                {isEditing && (
                  <button onClick={() => setEditingTitle(true)} className="text-gray-400 hover:text-gray-700">
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing && (
              <button onClick={onDelete} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => setIsEditing(e => !e)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
              style={isEditing
                ? { background: brandColor, color: 'white' }
                : { background: 'var(--border)', color: '#6b7280' }}
            >
              {isEditing ? <><Check size={11} /> Terminé</> : <><PenLine size={11} /> Éditer</>}
            </button>
          </div>
        </div>
      )}

      {/* Module content */}
      <div className={module.type === 'divider' ? 'px-5 py-4' : 'p-5'}>
        {module.type === 'colors' && <ColorsModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'typography' && <TypographyModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'text' && <TextModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'image' && <ImageModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'attachments' && <AttachmentsModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'divider' && (
          <div className="flex items-center gap-3">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
              <GripVertical size={16} />
            </div>
            <DividerModule />
            <button onClick={onDelete} className="text-gray-300 hover:text-red-500 flex-shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModulePicker({ brandColor, onAdd, onClose }: { brandColor: string; onAdd: (type: ModuleType) => void; onClose: () => void }) {
  return (
    <div className="border rounded-2xl bg-white shadow-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <p className="font-semibold text-gray-800">Ajouter un module</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {MODULE_TYPES.map(({ type, label, icon, description }) => (
          <button key={type} onClick={() => { onAdd(type); onClose(); }}
            className="flex items-start gap-3 p-4 border rounded-xl text-left hover:bg-gray-50 transition-colors group"
            style={{ borderColor: 'var(--border)' }}>
            <span className="mt-0.5 text-gray-400 group-hover:text-gray-700 transition-colors flex-shrink-0">{icon}</span>
            <div>
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PageView({ brand, section, onModuleDragStart, onModuleDragEnd }: Props) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/modules?sectionId=${section.id}`)
      .then(r => r.json())
      .then(data => { setModules(data); setLoading(false); });
  }, [section.id]);

  async function addModule(type: ModuleType) {
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sectionId: section.id, brandId: brand.id, type, title: '' }),
    });
    const m = await res.json();
    setModules(prev => [...prev, m]);
  }

  function updateModule(updated: Module) {
    setModules(prev => prev.map(m => m.id === updated.id ? updated : m));
  }

  async function deleteModule(id: string) {
    if (!confirm('Supprimer ce module ?')) return;
    await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    setModules(prev => prev.filter(m => m.id !== id));
  }

  // Drag-and-drop reordering + cross-section move
  function onDragStart(e: React.DragEvent, module: Module) {
    setDragId(module.id);
    e.dataTransfer.setData('brandy/module', module.id);
    e.dataTransfer.effectAllowed = 'move';
    onModuleDragStart?.(module);
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id !== dragId) setDragOverId(id);
  }
  function onDragLeave() { setDragOverId(null); }

  async function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const reordered = [...modules];
    const fromIdx = reordered.findIndex(m => m.id === dragId);
    const toIdx = reordered.findIndex(m => m.id === targetId);
    const [item] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, item);
    setModules(reordered);
    setDragId(null);
    setDragOverId(null);
    await fetch('/api/modules/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sectionId: section.id, ids: reordered.map(m => m.id) }),
    });
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Chargement...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Page header */}
        <div className="pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-2xl font-bold text-gray-900">{section.name}</h1>
        </div>

        {/* Modules */}
        {modules.length === 0 && !showPicker && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <div className="p-4 rounded-2xl bg-gray-100">
              <Plus size={28} />
            </div>
            <p className="text-sm">Cette page est vide. Ajoutez votre premier module.</p>
          </div>
        )}

        {modules.map(module => (
          <div
            key={module.id}
            draggable
            onDragStart={e => onDragStart(e, module)}
            onDragOver={e => onDragOver(e, module.id)}
            onDragLeave={onDragLeave}
            onDrop={() => onDrop(module.id)}
            onDragEnd={() => { setDragId(null); setDragOverId(null); onModuleDragEnd?.(); }}
            className={`transition-all ${dragOverId === module.id ? 'scale-[0.98]' : ''}`}
            style={dragOverId === module.id ? { outline: `2px solid ${brand.color}`, outlineOffset: 4, borderRadius: 16 } : {}}
          >
            <ModuleCard
              module={module}
              brandColor={brand.color}
              onUpdate={updateModule}
              onDelete={() => deleteModule(module.id)}
              isDragging={dragId === module.id}
              dragHandleProps={{
                onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
              }}
            />
          </div>
        ))}

        {/* Add module */}
        {showPicker ? (
          <ModulePicker brandColor={brand.color} onAdd={addModule} onClose={() => setShowPicker(false)} />
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-2xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus size={16} /> Ajouter un module
          </button>
        )}
      </div>
    </div>
  );
}
