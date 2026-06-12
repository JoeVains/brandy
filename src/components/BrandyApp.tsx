'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Brand, Section, Module } from '@/types';
import Sidebar from './Sidebar';
import PageView from './PageView';
import { Plus, Trash2, Check, X, Pencil, FolderOpen } from 'lucide-react';

const BRAND_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

interface EditPopoverProps {
  brand: Brand;
  anchorRect: DOMRect;
  onSave: (name: string, color: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

function EditPopover({ brand, anchorRect, onSave, onDelete, onClose }: EditPopoverProps) {
  const [name, setName] = useState(brand.name);
  const [color, setColor] = useState(brand.color);
  const [hexInput, setHexInput] = useState(brand.color.replace('#', ''));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const style = {
    position: 'fixed' as const,
    top: anchorRect.bottom + 6,
    left: anchorRect.left,
    zIndex: 9999,
    width: 256,
  };

  return createPortal(
    <div
      ref={ref}
      style={style}
      className="bg-white rounded-xl shadow-xl border p-3"
      onClick={e => e.stopPropagation()}
    >
      <input
        autoFocus
        className="w-full px-2.5 py-1.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-300 mb-2"
        style={{ borderColor: 'var(--border)' }}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(name, color); if (e.key === 'Escape') onClose(); }}
        placeholder="Nom de la marque"
      />
      {/* Preset colors */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {BRAND_COLORS.map(c => (
          <button
            key={c}
            className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
            style={{ background: c }}
            onClick={() => { setColor(c); setHexInput(c.replace('#', '')); }}
          />
        ))}
      </div>
      {/* Custom color picker + hex input */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="color"
          value={color}
          onChange={e => { setColor(e.target.value); setHexInput(e.target.value.replace('#', '')); }}
          className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 flex-shrink-0"
          title="Couleur personnalisée"
        />
        <div className="flex items-center flex-1 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <span className="px-2 text-xs text-gray-400 font-mono select-none">#</span>
          <input
            className="flex-1 py-1.5 pr-2 text-xs font-mono outline-none bg-transparent"
            value={hexInput}
            maxLength={6}
            placeholder="6366f1"
            onChange={e => {
              const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
              setHexInput(val);
              if (val.length === 6) setColor('#' + val);
            }}
          />
          <div className="w-6 h-6 mr-1.5 rounded flex-shrink-0" style={{ background: color }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(name, color)}
          className="flex-1 py-1.5 rounded-lg text-white text-sm font-medium"
          style={{ background: color }}
        >
          Enregistrer
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Supprimer la marque"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function BrandyApp() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandColor, setNewBrandColor] = useState(BRAND_COLORS[0]);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingAnchorRect, setEditingAnchorRect] = useState<DOMRect | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingModule, setDraggingModule] = useState<Module | null>(null);
  const [pageViewKey, setPageViewKey] = useState(0);

  const fetchAll = useCallback(async () => {
    const [b, s] = await Promise.all([
      fetch('/api/brands').then(r => r.json()),
      fetch('/api/sections').then(r => r.json()),
    ]);
    setBrands(b);
    setSections(s);
    if (!activeBrandId && b.length > 0) setActiveBrandId(b[0].id);
  }, [activeBrandId]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setActiveSectionId(null); }, [activeBrandId]);

  async function createBrand() {
    if (!newBrandName.trim()) return;
    const res = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newBrandName.trim(), color: newBrandColor }),
    });
    const brand = await res.json();
    setBrands(prev => [...prev, brand]);
    setActiveBrandId(brand.id);
    setNewBrandName('');
    setShowNewBrand(false);
  }

  async function deleteBrand(id: string) {
    if (!confirm('Supprimer cette marque et tout son contenu ?')) return;
    await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    setBrands(prev => prev.filter(b => b.id !== id));
    setSections(prev => prev.filter(s => s.brandId !== id));
    setEditingBrandId(null);
    setEditingAnchorRect(null);
    if (activeBrandId === id) setActiveBrandId(brands.find(b => b.id !== id)?.id ?? null);
  }

  async function reorderBrands(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const next = [...brands];
    const from = next.findIndex(b => b.id === draggedId);
    const to = next.findIndex(b => b.id === targetId);
    next.splice(to, 0, next.splice(from, 1)[0]);
    setBrands(next);
    fetch('/api/brands/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: next.map(b => b.id) }),
    });
  }

  async function updateBrand(id: string, name: string, color: string) {
    await fetch(`/api/brands/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    setBrands(prev => prev.map(b => b.id === id ? { ...b, name, color } : b));
    setEditingBrandId(null);
    setEditingAnchorRect(null);
  }

  async function handleModuleDrop(targetSectionId: string) {
    if (!draggingModule || draggingModule.sectionId === targetSectionId) return;
    await fetch(`/api/modules/${draggingModule.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sectionId: targetSectionId }),
    });
    setDraggingModule(null);
    setPageViewKey(k => k + 1);
  }

  const activeBrand = brands.find(b => b.id === activeBrandId) ?? null;
  const brandSections = sections.filter(s => s.brandId === activeBrandId);
  const activeSection = brandSections.find(s => s.id === activeSectionId) ?? null;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--accent)' }}>B</div>
          <span className="font-semibold text-lg tracking-tight">Brandy</span>
        </div>

        {/* Brand tabs */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {brands.map(brand => {
            const isActive = activeBrandId === brand.id;
            const isEditing = editingBrandId === brand.id;
            const isDragging = dragId === brand.id;
            const isOver = dragOverId === brand.id;
            return (
              <div
                key={brand.id}
                className="relative flex-shrink-0"
                draggable
                onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragId(brand.id); }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(brand.id); }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={e => { e.preventDefault(); if (dragId) reorderBrands(dragId, brand.id); setDragId(null); setDragOverId(null); }}
                onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                style={{ opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.15s' }}
              >
                {isOver && !isDragging && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 -translate-x-1 rounded-full" style={{ background: 'var(--accent)' }} />
                )}
                <div
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-grab active:cursor-grabbing text-sm font-medium transition-all select-none ${isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  style={isActive ? { background: brand.color } : {}}
                  onClick={() => { setActiveBrandId(brand.id); setEditingBrandId(null); }}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: isActive ? 'rgba(255,255,255,0.5)' : brand.color }} />
                  <span>{brand.name}</span>
                  <button
                    className={`transition-opacity ml-0.5 ${isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'}`}
                    onClick={e => { e.stopPropagation(); setActiveBrandId(brand.id); if (isEditing) { setEditingBrandId(null); setEditingAnchorRect(null); } else { setEditingBrandId(brand.id); setEditingAnchorRect(e.currentTarget.getBoundingClientRect()); } }}
                    title="Modifier"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
                {isEditing && editingAnchorRect && (
                  <EditPopover
                    brand={brand}
                    anchorRect={editingAnchorRect}
                    onSave={(name, color) => updateBrand(brand.id, name, color)}
                    onDelete={() => deleteBrand(brand.id)}
                    onClose={() => { setEditingBrandId(null); setEditingAnchorRect(null); }}
                  />
                )}
              </div>
            );
          })}

          {showNewBrand ? (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-100">
              <div className="flex gap-1">
                {BRAND_COLORS.map(c => (
                  <button key={c} className={`w-3.5 h-3.5 rounded-full transition-transform ${newBrandColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`} style={{ background: c }} onClick={() => setNewBrandColor(c)} />
                ))}
              </div>
              <input
                autoFocus
                placeholder="Nom de la marque"
                className="bg-transparent outline-none text-sm w-32"
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createBrand(); if (e.key === 'Escape') setShowNewBrand(false); }}
              />
              <button onClick={createBrand} className="text-indigo-600 hover:text-indigo-800"><Check size={14} /></button>
              <button onClick={() => setShowNewBrand(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBrand(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus size={14} /> Marque
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {activeBrand ? (
          <>
            <Sidebar
              brand={activeBrand}
              sections={brandSections}
              activeSectionId={activeSectionId}
              onSelectSection={setActiveSectionId}
              onSectionsChange={updated => setSections(prev => [...prev.filter(s => s.brandId !== activeBrand.id), ...updated])}
              draggingModuleId={draggingModule?.id ?? null}
              onModuleDrop={handleModuleDrop}
            />
            {activeSection && brandSections.filter(s => s.parentId === activeSection.id).length === 0 ? (
              <PageView
                key={pageViewKey}
                brand={activeBrand}
                section={activeSection}
                sections={brandSections}
                onModuleDragStart={setDraggingModule}
                onModuleDragEnd={() => setDraggingModule(null)}
              />
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-8 py-8">
                  <div className="pb-2 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {activeSection ? activeSection.name : activeBrand.name}
                    </h1>
                  </div>
                  {(() => {
                    const children = activeSection
                      ? brandSections.filter(s => s.parentId === activeSection.id)
                      : brandSections.filter(s => s.parentId === null);
                    const sorted = children.sort((a, b) => a.order - b.order);
                    if (sorted.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                          <FolderOpen size={36} />
                          <p className="text-sm">Aucune rubrique. Créez-en une dans la sidebar.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {sorted.map(section => {
                          const childCount = brandSections.filter(s => s.parentId === section.id).length;
                          return (
                            <button
                              key={section.id}
                              onClick={() => setActiveSectionId(section.id)}
                              className="flex items-center gap-3 p-4 border rounded-xl bg-white text-left hover:shadow-md transition-all"
                              style={{ borderColor: 'var(--border)' }}
                            >
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                                style={{ background: activeBrand.color }}>
                                {section.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{section.name}</p>
                                {childCount > 0 && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {childCount} sous-rubrique{childCount > 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--border)' }}>B</div>
            <p className="text-sm">Créez votre première marque pour commencer</p>
            <button
              onClick={() => setShowNewBrand(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'var(--accent)' }}
            >
              <Plus size={16} /> Nouvelle marque
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
