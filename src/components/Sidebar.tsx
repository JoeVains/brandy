'use client';

import { useState, useEffect } from 'react';
import { Brand, Section, Module } from '@/types';
import { Plus, ChevronRight, ChevronDown, Trash2, Pencil, Check, X, LayoutGrid, GripVertical, Hash } from 'lucide-react';

interface Props {
  brand: Brand;
  sections: Section[];
  activeSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onSectionsChange: (sections: Section[]) => void;
  draggingModuleId?: string | null;
  onModuleDrop?: (targetSectionId: string) => void;
}

interface SectionNodeProps {
  section: Section;
  allSections: Section[];
  activeSectionId: string | null;
  onSelect: (id: string | null) => void;
  onSectionsChange: (sections: Section[]) => void;
  brandId: string;
  brandColor: string;
  depth: number;
  draggingModuleId?: string | null;
  onModuleDrop?: (targetSectionId: string) => void;
  dragSectionId: string | null;
  dragOverSectionId: string | null;
  onSectionDragStart: (id: string) => void;
  onSectionDragOver: (id: string) => void;
  onSectionDragEnd: () => void;
  onSectionDrop: (targetId: string) => void;
  headings: Module[];
  onScrollToHeading: (moduleId: string) => void;
}

function SectionNode({
  section, allSections, activeSectionId, onSelect, onSectionsChange,
  brandId, brandColor, depth, draggingModuleId, onModuleDrop,
  dragSectionId, dragOverSectionId,
  onSectionDragStart, onSectionDragOver, onSectionDragEnd, onSectionDrop,
  headings, onScrollToHeading,
}: SectionNodeProps) {
  const children = allSections.filter(s => s.parentId === section.id).sort((a, b) => a.order - b.order);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isModuleDropTarget, setIsModuleDropTarget] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const isActive = activeSectionId === section.id;
  const isDragging = dragSectionId === section.id;
  const isOver = dragOverSectionId === section.id && dragSectionId !== section.id;

  async function renameSection() {
    if (!editName.trim()) return;
    await fetch(`/api/sections/${section.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    onSectionsChange(allSections.map(s => s.id === section.id ? { ...s, name: editName.trim() } : s));
    setEditing(false);
  }

  async function deleteSection() {
    if (!confirm(`Supprimer "${section.name}" et tout son contenu ?`)) return;
    await fetch(`/api/sections/${section.id}`, { method: 'DELETE' });
    const toDelete = new Set<string>();
    const queue = [section.id];
    while (queue.length) {
      const cur = queue.shift()!;
      toDelete.add(cur);
      allSections.filter(s => s.parentId === cur).forEach(s => queue.push(s.id));
    }
    onSectionsChange(allSections.filter(s => !toDelete.has(s.id)));
  }

  async function addChild() {
    if (!childName.trim()) return;
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandId, name: childName.trim(), parentId: section.id }),
    });
    const newSection = await res.json();
    onSectionsChange([...allSections, newSection]);
    setChildName('');
    setShowAddChild(false);
    setExpanded(true);
  }

  const sharedProps = {
    allSections, activeSectionId, onSelect, onSectionsChange, brandId, brandColor,
    draggingModuleId, onModuleDrop,
    dragSectionId, dragOverSectionId,
    onSectionDragStart, onSectionDragOver, onSectionDragEnd, onSectionDrop,
    headings, onScrollToHeading,
  };

  return (
    <div style={{ opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.15s' }}>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${isActive ? 'text-white' : isModuleDropTarget ? '' : 'text-gray-600 dark:text-gray-200 hover:bg-[var(--section-hover)]'}`}
        style={{
          paddingLeft: `${8 + depth * 14}px`,
          '--section-hover': `${brandColor}26`,
          ...(isActive ? { background: brandColor } : {}),
          ...(isModuleDropTarget ? { background: `${brandColor}20`, color: brandColor, outline: `2px solid ${brandColor}`, outlineOffset: '-2px' } : {}),
          ...(isOver && !isModuleDropTarget ? { outline: `2px solid ${brandColor}`, outlineOffset: '-2px', borderRadius: 8 } : {}),
        } as React.CSSProperties}
        onClick={() => onSelect(section.id)}
        draggable
        onDragStart={e => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('brandy/section', section.id);
          onSectionDragStart(section.id);
        }}
        onDragOver={e => {
          if (e.dataTransfer.types.includes('brandy/section')) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            onSectionDragOver(section.id);
          } else if (draggingModuleId) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setIsModuleDropTarget(true);
          }
        }}
        onDragLeave={e => {
          setIsModuleDropTarget(false);
        }}
        onDrop={e => {
          e.preventDefault();
          e.stopPropagation();
          setIsModuleDropTarget(false);
          const sectionId = e.dataTransfer.getData('brandy/section');
          if (sectionId) {
            onSectionDrop(section.id);
          } else {
            const moduleId = e.dataTransfer.getData('brandy/module');
            if (moduleId) onModuleDrop?.(section.id);
          }
        }}
        onDragEnd={() => onSectionDragEnd()}
      >
        {/* Grip handle */}
        <span className={`flex-shrink-0 opacity-0 group-hover:opacity-30 cursor-grab -ml-1 ${isActive ? 'opacity-30' : ''}`}>
          <GripVertical size={12} />
        </span>

        {children.length > 0 ? (
          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} className="flex-shrink-0 opacity-50">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : <span className="w-3 flex-shrink-0" />}

        {editing ? (
          <input
            autoFocus
            className={`flex-1 bg-transparent outline-none text-sm ${isActive ? 'text-white placeholder-white/60' : ''}`}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') renameSection(); if (e.key === 'Escape') setEditing(false); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{section.name}</span>
        )}

        <div className={`flex items-center gap-1.5 ${editing ? 'flex' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} onClick={e => e.stopPropagation()}>
          {editing ? (
            <>
              <button onClick={renameSection} className={isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}><Check size={11} /></button>
              <button onClick={() => setEditing(false)} className={isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}><X size={11} /></button>
            </>
          ) : (
            <>
              <button onClick={() => setShowAddChild(!showAddChild)} className={isActive ? 'text-white/70 hover:text-white' : 'text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}><Plus size={11} /></button>
              <button onClick={() => { setEditing(true); setEditName(section.name); }} className={isActive ? 'text-white/70 hover:text-white' : 'text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}><Pencil size={11} /></button>
              <button onClick={deleteSection} className={isActive ? 'text-white/70 hover:text-white' : 'text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}><Trash2 size={11} /></button>
            </>
          )}
        </div>
      </div>

      {showAddChild && (
        <div className="flex items-center gap-1 px-2 py-1 mx-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border" style={{ marginLeft: `${8 + (depth + 1) * 14}px`, borderColor: 'var(--border)' }}>
          <input
            autoFocus
            placeholder="Nom..."
            className="flex-1 bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addChild(); if (e.key === 'Escape') setShowAddChild(false); }}
          />
          <button onClick={addChild} className="text-accent"><Check size={12} /></button>
          <button onClick={() => setShowAddChild(false)} className="text-gray-400 dark:text-gray-400"><X size={12} /></button>
        </div>
      )}

      {expanded && children.map(child => (
        <SectionNode
          key={child.id}
          section={child}
          depth={depth + 1}
          {...sharedProps}
        />
      ))}
      {expanded && activeSectionId === section.id && headings.map(h => (
        <button
          key={h.id}
          onClick={() => onScrollToHeading(h.id)}
          className="w-full flex items-center gap-1.5 py-1 rounded-lg text-xs text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[var(--section-hover)] transition-colors text-left"
          style={{ paddingLeft: `${8 + (depth + 1) * 14 + 8}px`, '--section-hover': `${brandColor}26` } as React.CSSProperties}
        >
          <Hash size={10} className="flex-shrink-0 opacity-50" />
          <span className="truncate">{h.content || h.title || 'Sans titre'}</span>
        </button>
      ))}
    </div>
  );
}


export default function Sidebar({ brand, sections, activeSectionId, onSelectSection, onSectionsChange, draggingModuleId, onModuleDrop }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [headings, setHeadings] = useState<Module[]>([]);

  useEffect(() => {
    if (!activeSectionId) { setHeadings([]); return; }
    function refresh() {
      fetch(`/api/modules?sectionId=${activeSectionId}`)
        .then(r => r.json())
        .then((modules: Module[]) => setHeadings(modules.filter(m => m.type === 'heading')));
    }
    refresh();
    window.addEventListener('brandy:modules-changed', refresh);
    return () => window.removeEventListener('brandy:modules-changed', refresh);
  }, [activeSectionId]);

  function scrollToHeading(moduleId: string) {
    const el = document.querySelector(`[data-module-id="${moduleId}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const roots = sections.filter(s => s.parentId === null).sort((a, b) => a.order - b.order);

  async function addRoot() {
    if (!newName.trim()) return;
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandId: brand.id, name: newName.trim(), parentId: null }),
    });
    const section = await res.json();
    onSectionsChange([...sections, section]);
    setNewName('');
    setShowAdd(false);
  }

  function handleSectionDrop(targetId: string) {
    if (!dragSectionId || dragSectionId === targetId) return;

    const dragged = sections.find(s => s.id === dragSectionId);
    const target = sections.find(s => s.id === targetId);
    if (!dragged || !target || dragged.parentId !== target.parentId) return;

    // Reorder within the same parent group
    const siblings = sections
      .filter(s => s.parentId === dragged.parentId)
      .sort((a, b) => a.order - b.order);

    const fromIdx = siblings.findIndex(s => s.id === dragSectionId);
    const toIdx = siblings.findIndex(s => s.id === targetId);
    siblings.splice(toIdx, 0, siblings.splice(fromIdx, 1)[0]);

    const updatedIds = siblings.map(s => s.id);
    const updated = sections.map(s => {
      const idx = updatedIds.indexOf(s.id);
      return idx === -1 ? s : { ...s, order: idx };
    });

    onSectionsChange(updated);
    fetch('/api/sections/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: updatedIds }),
    });

    setDragSectionId(null);
    setDragOverSectionId(null);
  }

  const nodeProps = {
    allSections: sections,
    activeSectionId,
    onSelect: onSelectSection,
    onSectionsChange,
    brandId: brand.id,
    brandColor: brand.color,
    draggingModuleId,
    onModuleDrop,
    dragSectionId,
    dragOverSectionId,
    onSectionDragStart: setDragSectionId,
    onSectionDragOver: setDragOverSectionId,
    onSectionDragEnd: () => { setDragSectionId(null); setDragOverSectionId(null); },
    onSectionDrop: handleSectionDrop,
    headings,
    onScrollToHeading: scrollToHeading,
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r bg-sidebar overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
      {/* Brand thumbnail */}
      <div className="flex-shrink-0">
        <div className="h-16 flex items-center justify-center" style={{ background: brand.color }}>
          <div
            className="w-12 h-12 rounded-full border-2 border-white/40 overflow-hidden flex items-center justify-center"
            style={{ background: brand.logoImage ? 'white' : 'rgba(255,255,255,0.25)' }}
          >
            {brand.logoImage
              ? <img src={`/uploads/${brand.logoImage}`} alt="logo" className="w-full h-full object-contain p-2" />
              : <span className="text-white text-lg font-bold leading-none">{brand.name.charAt(0).toUpperCase()}</span>
            }
          </div>
        </div>
        <div className="px-4 py-2 border-b text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{brand.name}</p>
        </div>
      </div>

      <div className="p-3 flex-1">
        {/* All assets */}
        <button
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors mb-1 ${!activeSectionId ? 'text-white' : 'text-gray-600 dark:text-gray-200 hover:bg-[var(--section-hover)]'}`}
          style={!activeSectionId ? { background: brand.color } : { '--section-hover': `${brand.color}26` } as React.CSSProperties}
          onClick={() => onSelectSection(null)}
        >
          <LayoutGrid size={13} />
          <span className="font-medium">Tous les assets</span>
        </button>

        <div className="h-px my-2" style={{ background: 'var(--border)' }} />

        {/* Sections */}
        <div className="space-y-0.5">
          {roots.map(section => (
            <SectionNode
              key={section.id}
              section={section}
              depth={0}
              {...nodeProps}
            />
          ))}
        </div>


        {showAdd ? (
          <div className="flex items-center gap-1 px-2 py-1 mt-1 rounded-lg bg-gray-50 dark:bg-gray-800/50 border" style={{ borderColor: 'var(--border)' }}>
            <input
              autoFocus
              placeholder="Nouvelle rubrique..."
              className="flex-1 bg-transparent outline-none text-sm text-gray-700 dark:text-gray-200"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addRoot(); if (e.key === 'Escape') setShowAdd(false); }}
            />
            <button onClick={addRoot} className="text-accent"><Check size={12} /></button>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 dark:text-gray-400"><X size={12} /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 mt-1 text-sm text-gray-400 dark:text-gray-300 font-medium rounded-lg transition-colors cursor-pointer hover:text-white hover:bg-[var(--accent)]"
          >
            <Plus size={13} /> Ajouter une rubrique
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[10px] text-gray-500 dark:text-gray-500 leading-relaxed">
          Made with 🩷 in Paris<br />
          by{' '}
          <a href="https://joevains.com" target="_blank" rel="noopener noreferrer"
            className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline underline-offset-2">
            Sylvain &ldquo;Joe Vains&rdquo; Guizard
          </a>
          {' '}© {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
