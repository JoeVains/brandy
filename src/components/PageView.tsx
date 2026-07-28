'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Module, ModuleType, Section, Brand } from '@/types';
import { Plus, GripVertical, Trash2, Palette, Type, AlignLeft, Image, Paperclip, Minus, Pencil, Check, X, PenLine, MoreHorizontal, Copy, FolderSymlink, ArrowRight, Paintbrush } from 'lucide-react';
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
import AccessibilityModule from './modules/AccessibilityModule';

interface Props {
  brand: Brand;
  section: Section;
  sections: Section[];
  onModuleDragStart?: (module: Module) => void;
  onModuleDragEnd?: () => void;
  brandHeader?: React.ReactNode;
  subsections?: React.ReactNode;
}

const MODULE_TYPES: { type: ModuleType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'accessibility', label: 'Accessibilité', icon: <span className="font-bold text-base leading-none">AA</span>, description: 'Vérificateur de contraste WCAG entre les couleurs de la marque' },
  { type: 'audio', label: 'Audio', icon: <span className="font-bold text-base leading-none">♪</span>, description: 'Embed SoundCloud / Spotify ou upload d\'un fichier audio' },
  { type: 'colors', label: 'Couleurs', icon: <Palette size={18} />, description: 'Nuancier de couleurs avec valeurs HEX, RVB et TSL' },
  { type: 'gradients', label: 'Dégradés', icon: <span className="font-bold text-base leading-none">◑</span>, description: 'Palette de dégradés CSS linéaires et radiaux' },
  { type: 'dodont', label: 'Do & Don\'t', icon: <span className="font-bold text-base leading-none">✓✗</span>, description: 'Bonnes et mauvaises pratiques côte à côte' },
  { type: 'spacing', label: 'Espacements', icon: <span className="font-bold text-base leading-none">⇥</span>, description: 'Grille d\'espacements et unité de base' },
  { type: 'attachments', label: 'Fichiers', icon: <Paperclip size={18} />, description: 'ZIP, PDF et autres pièces jointes' },
  { type: 'icons', label: 'Icônes', icon: <span className="font-bold text-base leading-none">❖</span>, description: 'Bibliothèque d\'icônes SVG téléchargeables en ZIP' },
  { type: 'image', label: 'Image', icon: <Image size={18} />, description: 'Une image par module' },
  { type: 'divider', label: 'Séparateur', icon: <Minus size={18} />, description: 'Ligne de séparation horizontale' },
  { type: 'text', label: 'Texte', icon: <AlignLeft size={18} />, description: 'Bloc de texte libre' },
  { type: 'heading', label: 'Titre', icon: <span className="font-bold text-base leading-none">H</span>, description: 'Titre de section en grand format' },
  { type: 'typography', label: 'Typographie', icon: <Type size={18} />, description: 'Polices Google Fonts ou fichiers locaux' },
  { type: 'video', label: 'Vidéo', icon: <span className="font-bold text-base leading-none">▶</span>, description: 'Embed YouTube / Vimeo ou upload d\'un fichier vidéo' },
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
  const [showBgPalette, setShowBgPalette] = useState(false);
  const bgPaletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) setShowBgPalette(false);
  }, [isEditing]);

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
    <div ref={cardRef} className={`border rounded-2xl transition-shadow ${isDragging ? 'shadow-xl opacity-50' : 'shadow-sm'}`}
      style={{ borderColor: 'var(--border)', background: module.backgroundColor ? `${module.backgroundColor}1a` : 'var(--card-bg)', ...(isEditing ? { outline: `2px solid ${brandColor}` } : {}) }}>
      {/* Module header */}
      {module.type !== 'divider' && (
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 flex-shrink-0">
            <GripVertical size={16} />
          </div>
          <span className="text-gray-400 dark:text-gray-400 flex-shrink-0">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 outline-none text-sm font-semibold text-gray-800 dark:text-gray-200 border-b"
                  style={{ borderColor: brandColor }}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(module.title); } }}
                  onDragStart={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                />
                <button onClick={saveTitle} className="text-green-600"><Check size={13} /></button>
                <button onClick={() => { setEditingTitle(false); setTitleDraft(module.title); }} className="text-gray-400 dark:text-gray-400"><X size={13} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{module.title || meta.label}</span>
                {isEditing && (
                  <button onClick={() => setEditingTitle(true)} className="text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300">
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isEditing && (
              <div className="relative" ref={bgPaletteRef}>
                <button
                  className="p-1.5 rounded-lg transition-colors"
                  title="Couleur de fond"
                  style={{ color: module.backgroundColor ? brandColor : '#9ca3af' }}
                  onClick={() => setShowBgPalette(o => !o)}
                >
                  <Paintbrush size={14} />
                </button>
                {showBgPalette && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-card border rounded-xl shadow-lg px-2.5 py-2 z-50" style={{ borderColor: 'var(--border)' }}>
                    {/* Reset */}
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/modules/${module.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ backgroundColor: null }) });
                        onUpdate(await res.json());
                      }}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform"
                      style={{ borderColor: '#d1d5db' }}
                      title="Aucune teinte"
                    >
                      <X size={9} className="text-gray-400 dark:text-gray-400" />
                    </button>
                    {['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899','#78716c','#6b7280'].map(color => (
                      <button
                        key={color}
                        onClick={async () => {
                          const res = await fetch(`/api/modules/${module.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ backgroundColor: color }) });
                          onUpdate(await res.json());
                        }}
                        className="w-5 h-5 rounded-full flex-shrink-0 hover:scale-110 transition-transform"
                        style={{ background: color, outline: module.backgroundColor === color ? `2px solid ${color}` : 'none', outlineOffset: 2 }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setIsEditing(e => !e)}
              className={`p-1.5 rounded-lg transition-colors ${isEditing ? '' : 'hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              title={isEditing ? 'Terminé' : 'Éditer'}
              style={isEditing ? { background: brandColor, color: 'white' } : { color: '#9ca3af' }}
            >
              {isEditing ? <Check size={14} /> : <PenLine size={14} />}
            </button>

            {/* Context menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 rounded-2xl border shadow-xl z-50 py-2 min-w-[224px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  {/* Duplicate */}
                  <button
                    onClick={() => { onDuplicate(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      <Copy size={14} />
                    </span>
                    Dupliquer le module
                  </button>

                  {/* Move to */}
                  <div className="relative">
                    <button
                      onClick={() => setSubMenu(subMenu === 'move' ? null : 'move')}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        <FolderSymlink size={14} />
                      </span>
                      <span className="flex-1 text-left">Déplacer vers…</span>
                      <ArrowRight size={12} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    </button>
                    {subMenu === 'move' && (
                      <div className="absolute left-full top-0 ml-1.5 rounded-2xl border shadow-xl z-50 py-2 min-w-[170px] max-w-[240px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                        {otherSections.length === 0 ? (
                          <p className="px-3.5 py-2 text-sm text-gray-400 dark:text-gray-500 italic">Aucune autre rubrique</p>
                        ) : otherSections.map(s => (
                          <button key={s.id} onClick={() => { onMoveTo(s.id); setMenuOpen(false); }}
                            className="w-full text-left px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors truncate">
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Copy to */}
                  <div className="relative">
                    <button
                      onClick={() => setSubMenu(subMenu === 'copy' ? null : 'copy')}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        <Copy size={14} />
                      </span>
                      <span className="flex-1 text-left">Copier vers…</span>
                      <ArrowRight size={12} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    </button>
                    {subMenu === 'copy' && (
                      <div className="absolute left-full top-0 ml-1.5 rounded-2xl border shadow-xl z-50 py-2 min-w-[170px] max-w-[240px] overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                        {otherSections.length === 0 ? (
                          <p className="px-3.5 py-2 text-sm text-gray-400 dark:text-gray-500 italic">Aucune autre rubrique</p>
                        ) : otherSections.map(s => (
                          <button key={s.id} onClick={() => { onCopyTo(s.id); setMenuOpen(false); }}
                            className="w-full text-left px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors truncate">
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-px mx-3 my-1.5" style={{ background: 'var(--border)' }} />

                  <button
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 dark:bg-red-950/40 text-red-500">
                      <Trash2 size={14} />
                    </span>
                    Supprimer le module
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
        {module.type === 'accessibility' && <AccessibilityModule module={module} brandColor={brandColor} onUpdate={onUpdate} isEditing={isEditing} />}
        {module.type === 'divider' && (
          <div className="flex items-center gap-3">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500">
              <GripVertical size={16} />
            </div>
            <DividerModule />
            <button onClick={onDelete} className="text-gray-300 dark:text-gray-600 hover:text-red-500 flex-shrink-0">
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
      <div className="border rounded-2xl bg-card shadow-xl overflow-hidden w-[480px] max-w-[90vw]" style={{ borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <p className="font-semibold text-gray-800 dark:text-gray-200">Ajouter un module</p>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"><X size={16} /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {MODULE_TYPES.map(({ type, label, icon, description }) => (
            <button key={type} onClick={() => { onAdd(type); onClose(); }}
              className="flex items-start gap-3 p-4 border rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              style={{ borderColor: 'var(--border)' }}>
              <span className="mt-0.5 text-gray-400 dark:text-gray-400 group-hover:text-gray-700 dark:text-gray-300 transition-colors flex-shrink-0">{icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5 leading-tight">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

function InsertSeparator({ color, onClick, isDropTarget }: { color: string; onClick: () => void; isDropTarget?: boolean }) {
  return (
    <div className="group relative flex items-center justify-center h-6 z-10">
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full transition-all group-hover:bg-gray-200 dark:group-hover:bg-gray-600 ${isDropTarget ? 'h-0.5' : 'h-px'}`}
        style={{ background: isDropTarget ? color : undefined }}
      />
      <button
        onClick={onClick}
        className="relative opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 active:scale-95"
        style={{ background: color }}
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

export default function PageView({ brand, section, sections, onModuleDragStart, onModuleDragEnd, brandHeader, subsections }: Props) {
  const [modules, setModules] = useState<Module[]>([]);
  const [newModuleId, setNewModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'left' | 'right' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/modules?sectionId=${section.id}`)
      .then(r => r.json())
      .then(data => { setModules(data); setLoading(false); });
  }, [section.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ZONE = 80;   // px from edge that triggers scroll
    const SPEED = 12;  // px per frame

    function onDragOver(e: DragEvent) {
      const { top, bottom } = el!.getBoundingClientRect();
      const y = e.clientY;
      if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; }
      if (y < top + ZONE) {
        const ratio = 1 - (y - top) / ZONE;
        const step = () => { el!.scrollTop -= SPEED * ratio; scrollRafRef.current = requestAnimationFrame(step); };
        scrollRafRef.current = requestAnimationFrame(step);
      } else if (y > bottom - ZONE) {
        const ratio = 1 - (bottom - y) / ZONE;
        const step = () => { el!.scrollTop += SPEED * ratio; scrollRafRef.current = requestAnimationFrame(step); };
        scrollRafRef.current = requestAnimationFrame(step);
      }
    }
    function onDragEnd() {
      if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; }
    }

    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragend', onDragEnd);
    el.addEventListener('drop', onDragEnd);
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragend', onDragEnd);
      el.removeEventListener('drop', onDragEnd);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [loading]);

  async function addModule(type: ModuleType) {
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sectionId: section.id, brandId: brand.id, type, title: '' }),
    });
    const m = await res.json();

    if (insertAfterIdx !== null) {
      // Insert at specific position: splice into list then reorder
      const next = [...modules];
      next.splice(insertAfterIdx + 1, 0, m);
      setModules(next);
      setNewModuleId(m.id);
      await fetch('/api/modules/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sectionId: section.id, ids: next.map(x => x.id) }),
      });
    } else {
      setModules(prev => [...prev, m]);
      setNewModuleId(m.id);
    }

    setInsertAfterIdx(null);
    setShowPicker(false);
    window.dispatchEvent(new Event('brandy:modules-changed'));
  }

  function updateModule(updated: Module) {
    setModules(prev => prev.map(m => m.id === updated.id ? updated : m));
    if (updated.type === 'heading') window.dispatchEvent(new Event('brandy:modules-changed'));
  }

  async function deleteModule(id: string) {
    if (!confirm('Supprimer ce module ?')) return;
    await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    setModules(prev => prev.filter(m => m.id !== id));
    window.dispatchEvent(new Event('brandy:modules-changed'));
  }

  async function duplicateModule(module: Module) {
    const { id, createdAt, order, ...rest } = module;
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...rest, title: rest.title ? `${rest.title} (copie)` : '' }),
    });
    const created = await res.json();
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
    // Insert right after the original
    setModules(prev => {
      const idx = prev.findIndex(m => m.id === module.id);
      const next = [...prev];
      next.splice(idx + 1, 0, full);
      fetch('/api/modules/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sectionId: section.id, ids: next.map(m => m.id) }),
      });
      return next;
    });
    setNewModuleId(full.id);
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
    const cardEl = (e.currentTarget as HTMLElement).closest('[data-module-id]') as HTMLElement | null;
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      e.dataTransfer.setDragImage(cardEl, e.clientX - rect.left, e.clientY - rect.top);
    }
    onModuleDragStart?.(module);
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id === dragId) { setDragOverId(null); setDragOverSide(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setDragOverId(id);
    setDragOverSide(ratio < 0.25 ? 'left' : ratio > 0.75 ? 'right' : null);
  }
  function onDragLeave() { setDragOverId(null); setDragOverSide(null); }

  async function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); setDragOverSide(null); return; }
    if (dragOverSide) {
      await placeSideBySide(dragId, targetId, dragOverSide);
      return;
    }
    const reordered = [...modules];
    const fromIdx = reordered.findIndex(m => m.id === dragId);
    const toIdx = reordered.findIndex(m => m.id === targetId);
    const [item] = reordered.splice(fromIdx, 1);
    reordered.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, item);
    setModules(reordered);
    setDragId(null);
    setDragOverId(null);
    setDragOverSide(null);
    await fetch('/api/modules/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sectionId: section.id, ids: reordered.map(m => m.id) }),
    });
    if (reordered.some(m => m.type === 'heading')) {
      window.dispatchEvent(new Event('brandy:modules-changed'));
    }
  }

  async function placeSideBySide(draggedId: string, targetId: string, side: 'left' | 'right') {
    const reordered = [...modules];
    const fromIdx = reordered.findIndex(m => m.id === draggedId);
    const [item] = reordered.splice(fromIdx, 1);
    const targetIdx = reordered.findIndex(m => m.id === targetId);
    reordered.splice(side === 'left' ? targetIdx : targetIdx + 1, 0, item);
    const updated = reordered.map(m => (m.id === draggedId || m.id === targetId) ? { ...m, layoutWidth: 'half' as const } : m);
    setModules(updated);
    setDragId(null);
    setDragOverId(null);
    setDragOverSide(null);
    await fetch('/api/modules/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sectionId: section.id, ids: updated.map(m => m.id) }),
    });
    // Sequential on purpose: the PATCH endpoint reads-modifies-writes the whole
    // modules list, so two concurrent PATCHes here would race and drop one write.
    for (const id of [draggedId, targetId]) {
      await fetch(`/api/modules/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ layoutWidth: 'half' }),
      });
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-400 dark:text-gray-400">Chargement...</div>;
  }

  // Group consecutive 'half' modules into side-by-side pairs; everything else stays full-width.
  const moduleRows: Module[][] = [];
  for (let i = 0; i < modules.length; i++) {
    const current = modules[i];
    const next = modules[i + 1];
    if (current.layoutWidth === 'half' && next?.layoutWidth === 'half') {
      moduleRows.push([current, next]);
      i++;
    } else {
      moduleRows.push([current]);
    }
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {brandHeader}
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        {/* Page header */}
        <div className="pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{section.name}</h1>
        </div>

        {/* Sous-rubriques */}
        {subsections && <div>{subsections}</div>}

        {/* Modules */}
        {modules.length === 0 && !showPicker && (
          <button
            onClick={() => { setInsertAfterIdx(-1); setShowPicker(true); }}
            className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 w-full transition-colors"
          >
            <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Plus size={28} />
            </div>
            <p className="text-sm">Cette page est vide. Ajoutez votre premier module.</p>
          </button>
        )}

        <div className="flex flex-col gap-3">
          <InsertSeparator
            color={brand.color}
            onClick={() => { setInsertAfterIdx(-1); setShowPicker(true); }}
            isDropTarget={!!dragId && dragOverId === modules[0]?.id && !dragOverSide && dragId !== modules[0]?.id}
          />

          {moduleRows.map(row => {
            const lastIdx = modules.findIndex(m => m.id === row[row.length - 1].id);
            return (
              <React.Fragment key={row[0].id}>
                <div className={row.length === 2 ? 'grid grid-cols-2 gap-3 items-start' : ''}>
                  {row.map(module => (
                    <div
                      key={module.id}
                      data-module-id={module.id}
                      className="relative"
                      onDragOver={e => onDragOver(e, module.id)}
                      onDragLeave={onDragLeave}
                      onDrop={() => onDrop(module.id)}
                      onDragEnd={() => { setDragId(null); setDragOverId(null); setDragOverSide(null); onModuleDragEnd?.(); }}
                    >
                      {dragId && dragId !== module.id && dragOverId === module.id && dragOverSide === 'left' && (
                        <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full z-10" style={{ background: brand.color }} />
                      )}
                      {dragId && dragId !== module.id && dragOverId === module.id && dragOverSide === 'right' && (
                        <div className="absolute -right-2 top-0 bottom-0 w-0.5 rounded-full z-10" style={{ background: brand.color }} />
                      )}
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
                </div>

                <InsertSeparator
                  color={brand.color}
                  onClick={() => { setInsertAfterIdx(lastIdx); setShowPicker(true); }}
                  isDropTarget={!!dragId && dragOverId === modules[lastIdx + 1]?.id && !dragOverSide && dragId !== modules[lastIdx + 1]?.id}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* Add module — only shown when page has modules */}
        {modules.length > 0 && (
          <button
            onClick={() => { setInsertAfterIdx(null); setShowPicker(true); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-2xl text-sm text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus size={16} /> Ajouter un module
          </button>
        )}
        {showPicker && <ModulePicker brandColor={brand.color} onAdd={addModule} onClose={() => { setShowPicker(false); setInsertAfterIdx(null); }} />}
      </div>
    </div>
  );
}
