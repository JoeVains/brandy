'use client';

import { useState } from 'react';
import { Brand, Section } from '@/types';
import { Plus, ChevronRight, ChevronDown, Trash2, Pencil, Check, X, LayoutGrid } from 'lucide-react';

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
}

function SectionNode({ section, allSections, activeSectionId, onSelect, onSectionsChange, brandId, brandColor, depth, draggingModuleId, onModuleDrop }: SectionNodeProps) {
  const children = allSections.filter(s => s.parentId === section.id).sort((a, b) => a.order - b.order);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const isActive = activeSectionId === section.id;

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

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${isActive ? 'text-white' : isDropTarget ? '' : 'text-gray-600 hover:bg-gray-100'}`}
        style={{
          paddingLeft: `${8 + depth * 14}px`,
          ...(isActive ? { background: brandColor } : {}),
          ...(isDropTarget ? { background: `${brandColor}20`, color: brandColor, outline: `2px solid ${brandColor}`, outlineOffset: '-2px' } : {}),
        }}
        onClick={() => onSelect(section.id)}
        onDragOver={e => {
          if (!draggingModuleId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setIsDropTarget(true);
        }}
        onDragLeave={() => setIsDropTarget(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDropTarget(false);
          const moduleId = e.dataTransfer.getData('brandy/module');
          if (moduleId) onModuleDrop?.(section.id);
        }}
      >
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

        <div className={`flex items-center gap-0.5 ${editing ? 'flex' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} onClick={e => e.stopPropagation()}>
          {editing ? (
            <>
              <button onClick={renameSection} className={isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-700'}><Check size={11} /></button>
              <button onClick={() => setEditing(false)} className={isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-700'}><X size={11} /></button>
            </>
          ) : (
            <>
              <button onClick={() => setShowAddChild(!showAddChild)} className={isActive ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-700'}><Plus size={11} /></button>
              <button onClick={() => { setEditing(true); setEditName(section.name); }} className={isActive ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-700'}><Pencil size={11} /></button>
              <button onClick={deleteSection} className={isActive ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-700'}><Trash2 size={11} /></button>
            </>
          )}
        </div>
      </div>

      {showAddChild && (
        <div className="flex items-center gap-1 px-2 py-1 mx-2 rounded-lg bg-gray-50 border" style={{ marginLeft: `${8 + (depth + 1) * 14}px`, borderColor: 'var(--border)' }}>
          <input
            autoFocus
            placeholder="Nom..."
            className="flex-1 bg-transparent outline-none text-sm text-gray-700"
            value={childName}
            onChange={e => setChildName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addChild(); if (e.key === 'Escape') setShowAddChild(false); }}
          />
          <button onClick={addChild} className="text-indigo-600"><Check size={12} /></button>
          <button onClick={() => setShowAddChild(false)} className="text-gray-400"><X size={12} /></button>
        </div>
      )}

      {expanded && children.map(child => (
        <SectionNode
          key={child.id}
          section={child}
          allSections={allSections}
          activeSectionId={activeSectionId}
          onSelect={onSelect}
          onSectionsChange={onSectionsChange}
          brandId={brandId}
          brandColor={brandColor}
          depth={depth + 1}
          draggingModuleId={draggingModuleId}
          onModuleDrop={onModuleDrop}
        />
      ))}
    </div>
  );
}


export default function Sidebar({ brand, sections, activeSectionId, onSelectSection, onSectionsChange, draggingModuleId, onModuleDrop }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
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

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r bg-white overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
      <div className="p-3 flex-1">
        {/* All assets */}
        <button
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors mb-1 ${!activeSectionId ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          style={!activeSectionId ? { background: brand.color } : {}}
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
              allSections={sections}
              activeSectionId={activeSectionId}
              onSelect={onSelectSection}
              onSectionsChange={onSectionsChange}
              brandId={brand.id}
              brandColor={brand.color}
              depth={0}
              draggingModuleId={draggingModuleId}
              onModuleDrop={onModuleDrop}
            />
          ))}
        </div>

        {showAdd ? (
          <div className="flex items-center gap-1 px-2 py-1 mt-1 rounded-lg bg-gray-50 border" style={{ borderColor: 'var(--border)' }}>
            <input
              autoFocus
              placeholder="Nouvelle rubrique..."
              className="flex-1 bg-transparent outline-none text-sm text-gray-700"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addRoot(); if (e.key === 'Escape') setShowAdd(false); }}
            />
            <button onClick={addRoot} className="text-indigo-600"><Check size={12} /></button>
            <button onClick={() => setShowAdd(false)} className="text-gray-400"><X size={12} /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 mt-1 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Plus size={13} /> Ajouter une rubrique
          </button>
        )}
      </div>

      <div className="px-4 py-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Made with 🩷 in Paris<br />
          by{' '}
          <a href="https://joevains.com" target="_blank" rel="noopener noreferrer"
            className="hover:text-gray-600 transition-colors underline underline-offset-2">
            Sylvain &ldquo;Joe Vains&rdquo; Guizard
          </a>
          {' '}© {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
