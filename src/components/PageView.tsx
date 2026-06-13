'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Module, ModuleType, Section, Brand } from '@/types';
import { Plus, GripVertical, Trash2, Palette, Type, AlignLeft, Image, Paperclip, Minus, Pencil, Check, X, PenLine, MoreHorizontal, Copy, FolderSymlink, ArrowRight } from 'lucide-react';
import ColorsModule from './modules/ColorsModule';
import TypographyModule from './modules/TypographyModule';
import TextModule from './modules/TextModule';
import ImageModule from './modules/ImageModule';
import AttachmentsModule from './modules/AttachmentsModule';
import DividerModule from './modules/DividerModule';
import HeadingModule from './modules/HeadingModule';
import IconsModule from './modules/IconsModule';
import SpacingModule from './modules/SpacingModule';
import DoDontModule from './modules/DoDontModule';
import GradientsModule from './modules/GradientsModule';
import VideoModule from './modules/VideoModule';
import AudioModule from './modules/AudioModule';

interface Props {
  brand: Brand;
  section: Section;
  sections: Section[];
  onModuleDragStart?: (module: Module) => void;
  onModuleDragEnd?: () => void;
}

const MODULE_TYPES: { type: ModuleType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'colors', label: 'Couleurs', icon: <Palette size={18} />, description: 'Nuancier de couleurs avec valeurs HEX, RVB et TSL' },
  { type: 'typography', label: 'Typographie', icon: <Type size={18} />, description: 'Polices Google Fonts ou fichiers locaux' },
  { type: 'heading', label: 'Titre', icon: <span className="font-bold text-base leading-none">H</span>, description: 'Titre de section en grand format' },
  { type: 'text', label: 'Texte', icon: <AlignLeft size={18} />, description: 'Bloc de texte libre' },
  { type: 'image', label: 'Image', icon: <Image size={18} />, description: 'Une image par module' },
  { type: 'attachments', label: 'Fichiers', icon: <Paperclip size={18} />, description: 'ZIP, PDF et autres pièces jointes' },
  { type: 'icons', label: 'Icônes', icon: <span className="font-bold text-base leading-none">❖</span>, description: 'Bibliothèque d\'icônes SVG téléchargeables en ZIP' },
  { type: 'spacing', label: 'Espacements', icon: <span className="font-bold text-base leading-none">⇥</span>, description: 'Grille d\'espacements et unité de base' },
  { type: 'dodont', label: 'Do & Don\'t', icon: <span className="font-bold text-base leading-none">✓✗</span>, description: 'Bonnes et mauvaises pratiques côte à côte' },
  { type: 'gradients', label: 'Dégradés', icon: <span className="font-bold text-base leading-none">◑</span>, description: 'Palette de dégradés CSS linéaires et radiaux' },
  { type: 'video', label: 'Vidéo', icon: <span className="font-bold text-base leading-none">▶</span>, description: 'Embed YouTube / Vimeo ou upload d\'un fichier vidéo' },
  { type: 'audio', label: 'Audio', icon: <span className="font-bold text-base leading-none">♪</span>, description: 'Embed SoundCloud / Spotify ou upload d\'un fichier audio' },
  { type: 'divider', label: 'Séparateur', icon: <Minus size={18} />, description: 'Ligne de séparation horizontale' },
];

function ModuleCard({ module, brandColor, sections, currentSectionId, onUpdate, onDelete, onDuplicate, onMoveTo, onCopyTo, dragHandleProps, isDragging, defaultEditing }: {
  module: Module;
  brandColor: string;
  sections: Section[];
  currentSectionId: string;
  onUpdate: (m: Module) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveTo: (targetSectionId: string) => void;
  onCopyTo: (targetSectionId: string) => void;
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
  isDragging: boolean;
  defaultEditing?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(defaultEditing ?? false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(module.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<'move' | 'copy' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultEditing && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);
  const meta = MODULE_TYPES.find(t => t.type === module.type)!;
  const otherSections = (sections ?? []).filter(s => s.id !== currentSectionId);

  useEffect(() => {
    if (!menuOpen) { setSubMenu(null); return; }
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  async function saveTitle() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: titleDraft }),
    });
    onUpdate(await res.json());
    setEditingTitle(false);
  }

  function sectionLabel(id: string) {
    const s = sections.find(x => x.id === id);
    return s?.name ?? id;
  }

  return (
    <div ref={cardRef} className={`border rounded-2xl bg-white transition-shadow ${isDragging ? 'shadow-xl opacity-50' : 'shadow-sm'}`}
      style={{ borderColor: 'var(--border)', ...(isEditing ? { outline: `2px solid ${brandColor}` } : {}) }}>
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
                  onDragStart={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                />
                <button onClick={saveTitle} className="text-green-600"><Check size={13} /></button>
                <button onClick={() => { setEditingTitle(false); setTitleDraft(module.title); }} className="text-gray-400"><X size={13} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{module.title || meta.label}</span>
                {isEditing && (
                  <button onClick={() => setEditingTitle(true)} className="text-gray-400 hover:text-gray-700">
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsEditing(e => !e)}
              className="p-1.5 rounded-lg transition-colors"
              title={isEditing ? 'Terminé' : 'Éditer'}
              style={isEditing ? { background: brandColor, color: 'white' } : { color: '#9ca3af' }}
            >
              {isEditing ? <Check size={14} /> : <PenLine size={14} />}
            </button>

            {/* Context menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg z-50 py-1 min-w-[200px]" style={{ borderColor: 'var(--border)' }}>
                  {/* Duplicate */}
                  <button
                    onClick={() => { onDuplicate(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Copy size={14} className="text-gray-400" /> Dupliquer le module
                  </button>

                  {/* Move to */}
                  <button
                    onClick={() => setSubMenu(subMenu === 'move' ? null : 'move')}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FolderSymlink size={14} className="text-gray-400" />
                    <span className="flex-1 text-left">Déplacer vers…</span>
                    <ArrowRight size={12} className="text-gray-400" />
                  </button>
                  {subMenu === 'move' && (
                    <div className="mx-2 mb-1 bg-gray-50 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                      {otherSections.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-400 italic">Aucune autre rubrique</p>
                      ) : otherSections.map(s => (
                        <button key={s.id} onClick={() => { onMoveTo(s.id); setMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-white transition-colors truncate">
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Copy to */}
                  <button
                    onClick={() => setSubMenu(subMenu === 'copy' ? null : 'copy')}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Copy size={14} className="text-gray-400" />
                    <span className="flex-1 text-left">Copier vers…</span>
                    <ArrowRight size={12} className="text-gray-400" />
                  </button>
                  {subMenu === 'copy' && (
                    <div className="mx-2 mb-1 bg-gray-50 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                      {otherSections.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-400 italic">Aucune autre rubrique</p>
                      ) : otherSections.map(s => (
                        <button key={s.id} onClick={() => { onCopyTo(s.id); setMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-white transition-colors truncate">
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="h-px mx-3 my-1" style={{ background: 'var(--border)' }} />

                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} /> Supprimer le module
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Module content */}
      <div className={module.type === 'divider' ? 'px-5 py-4' : 'p-5'}>
        {module.type === 'colors' && <ColorsModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'typography' && <TypographyModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'heading' && <HeadingModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'text' && <TextModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'image' && <ImageModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'attachments' && <AttachmentsModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'icons' && <IconsModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'spacing' && <SpacingModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'dodont' && <DoDontModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'gradients' && <GradientsModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'video' && <VideoModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'audio' && <AudioModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
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
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose}>
      <div className="border rounded-2xl bg-white shadow-xl overflow-hidden w-[480px] max-w-[90vw]" style={{ borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
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
    </div>,
    document.body
  );
}

export default function PageView({ brand, section, sections, onModuleDragStart, onModuleDragEnd }: Props) {
  const [modules, setModules] = useState<Module[]>([]);
  const [newModuleId, setNewModuleId] = useState<string | null>(null);
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
    setNewModuleId(m.id);
  }

  function updateModule(updated: Module) {
    setModules(prev => prev.map(m => m.id === updated.id ? updated : m));
  }

  async function deleteModule(id: string) {
    if (!confirm('Supprimer ce module ?')) return;
    await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    setModules(prev => prev.filter(m => m.id !== id));
  }

  async function duplicateModule(module: Module) {
    const { id, createdAt, order, ...rest } = module;
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...rest, title: rest.title ? `${rest.title} (copie)` : '' }),
    });
    const created = await res.json();
    // Patch the full content fields that POST doesn't set
    const patch = await fetch(`/api/modules/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        colorItems: rest.colorItems,
        fontItems: rest.fontItems,
        content: rest.content,
        attachmentItems: rest.attachmentItems,
      }),
    });
    const full = await patch.json();
    setModules(prev => [...prev, full]);
  }

  async function moveModuleTo(module: Module, targetSectionId: string) {
    await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sectionId: targetSectionId }),
    });
    setModules(prev => prev.filter(m => m.id !== module.id));
  }

  async function copyModuleTo(module: Module, targetSectionId: string) {
    const { id, createdAt, order, sectionId, ...rest } = module;
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...rest, sectionId: targetSectionId }),
    });
    const created = await res.json();
    await fetch(`/api/modules/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        colorItems: rest.colorItems,
        fontItems: rest.fontItems,
        content: rest.content,
        attachmentItems: rest.attachmentItems,
      }),
    });
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
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
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
            data-module-id={module.id}
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
              sections={sections}
              currentSectionId={section.id}
              onUpdate={updateModule}
              onDelete={() => deleteModule(module.id)}
              onDuplicate={() => duplicateModule(module)}
              onMoveTo={targetId => moveModuleTo(module, targetId)}
              onCopyTo={targetId => copyModuleTo(module, targetId)}
              isDragging={dragId === module.id}
              defaultEditing={newModuleId === module.id}
              dragHandleProps={{
                draggable: true,
                onDragStart: (e: React.DragEvent) => onDragStart(e, module),
              }}
            />
          </div>
        ))}

        {/* Add module */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-2xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
          style={{ borderColor: 'var(--border)' }}
        >
          <Plus size={16} /> Ajouter un module
        </button>
        {showPicker && <ModulePicker brandColor={brand.color} onAdd={addModule} onClose={() => setShowPicker(false)} />}
      </div>
    </div>
  );
}
