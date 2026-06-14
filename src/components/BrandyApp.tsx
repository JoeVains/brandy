'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Brand, Section, Module } from '@/types';
import Sidebar from './Sidebar';
import PageView from './PageView';
import HomeView from './HomeView';
import { Plus, Trash2, Check, X, Pencil, FolderOpen, ChevronLeft, Clock, Search, Upload, Trash, FileDown, Moon, Sun } from 'lucide-react';
import HistoryPanel from './HistoryPanel';
import SearchModal from './SearchModal';
import { useTheme } from '@/hooks/useTheme';

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
      className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border p-3"
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
            className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : 'hover:scale-110'}`}
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
          <span className="px-2 text-xs text-gray-400 dark:text-gray-500 font-mono select-none">#</span>
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

function BrandHeader({ brand, onUpdate }: { brand: Brand; onUpdate: (updated: Brand) => void }) {
  const headerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  async function handleHeaderFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/brands/${brand.id}/header`, { method: 'POST', body: fd });
    onUpdate(await res.json());
    setUploading(false);
  }

  async function removeHeader() {
    const res = await fetch(`/api/brands/${brand.id}/header`, { method: 'DELETE' });
    onUpdate(await res.json());
  }

  async function handleLogoFile(file: File) {
    setLogoUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/brands/${brand.id}/logo`, { method: 'POST', body: fd });
    onUpdate(await res.json());
    setLogoUploading(false);
  }

  async function removeLogo() {
    const res = await fetch(`/api/brands/${brand.id}/logo`, { method: 'DELETE' });
    onUpdate(await res.json());
  }

  const bgStyle = brand.headerImage
    ? { backgroundImage: `url(/uploads/${brand.headerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: brand.color };

  return (
    <div className="relative w-full flex-shrink-0" style={{ paddingBottom: 40 }}>
      {/* Header band */}
      <div
        className="relative w-full h-[200px] group"
        style={bgStyle}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onDragOver={e => { e.preventDefault(); setHovering(true); }}
        onDragLeave={() => setHovering(false)}
        onDrop={e => { e.preventDefault(); setHovering(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleHeaderFile(f); }}
      >
        {hovering && !uploading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-3">
            <button onClick={() => headerInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900/90 hover:bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 dark:text-gray-700 text-sm font-medium shadow">
              <Upload size={14} />
              {brand.headerImage ? 'Remplacer' : 'Ajouter une image'}
            </button>
            {brand.headerImage && (
              <button onClick={removeHeader}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900/90 hover:bg-white dark:bg-gray-900 text-red-500 text-sm font-medium shadow">
                <Trash size={14} /> Supprimer
              </button>
            )}
          </div>
        )}
        {/* Brand name centered */}
        {!hovering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white text-3xl font-bold tracking-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.35)' }}>
              {brand.name}
            </span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <input ref={headerInputRef} type="file" accept="image/*" className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleHeaderFile(f); e.target.value = ''; }} />
      </div>

      {/* Logo circle — straddles the bottom edge of the header */}
      <div className="absolute left-8 group/logo" style={{ bottom: 0, width: 80, height: 80 }}>
        <div
          className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden cursor-pointer flex items-center justify-center"
          style={{ background: brand.logoImage ? 'white' : brand.color }}
          onClick={() => logoInputRef.current?.click()}
        >
          {logoUploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : brand.logoImage ? (
            <img src={`/uploads/${brand.logoImage}`} alt="logo" className="w-full h-full object-contain" />
          ) : (
            <span className="text-white text-2xl font-bold select-none">
              {brand.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {/* Hover overlay on the logo */}
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center gap-1 pointer-events-none">
          <Upload size={14} className="text-white" />
        </div>
        {brand.logoImage && (
          <button
            onClick={e => { e.stopPropagation(); removeLogo(); }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-900 shadow flex items-center justify-center text-red-400 hover:text-red-600 opacity-0 group-hover/logo:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
        )}
        <input ref={logoInputRef} type="file" accept="image/*" className="sr-only"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value = ''; }} />
      </div>
    </div>
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
  const [view, setView] = useState<'home' | 'brand'>('home');
  const [dragId, setDragId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingModule, setDraggingModule] = useState<Module | null>(null);
  const [pageViewKey, setPageViewKey] = useState(0);
  const { dark, toggle } = useTheme();

  const fetchAll = useCallback(async () => {
    const [b, s] = await Promise.all([
      fetch('/api/brands').then(r => r.json()),
      fetch('/api/sections').then(r => r.json()),
    ]);
    setBrands(b);
    setSections(s);
    if (!activeBrandId && b.length > 0) { setActiveBrandId(b[0].id); }
  }, [activeBrandId]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setActiveSectionId(null); }, [activeBrandId]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(v => !v); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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

  if (view === 'home') {
    return (
      <HomeView
        brands={brands}
        sections={sections}
        onOpenBrand={id => { setActiveBrandId(id); setActiveSectionId(null); setView('brand'); }}
        onBrandsChange={setBrands}
        onSectionsChange={setSections}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-gray-900 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mr-4">
          <button onClick={() => setView('home')} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--accent)' }}>B</div>
            <span className="font-semibold text-lg tracking-tight">Brandy</span>
          </button>
        </div>
        <button onClick={() => setView('home')} className="flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-600 transition-colors mr-2">
          <ChevronLeft size={14} /> Accueil
        </button>

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
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-grab active:cursor-grabbing text-sm font-medium transition-all select-none ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-gray-800'}`}
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
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="flex gap-1">
                {BRAND_COLORS.map(c => (
                  <button key={c} className={`w-3.5 h-3.5 rounded-full transition-transform ${newBrandColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : ''}`} style={{ background: c }} onClick={() => setNewBrandColor(c)} />
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
              <button onClick={() => setShowNewBrand(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBrand(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
            >
              <Plus size={14} /> Marque
            </button>
          )}
        </div>

        {/* Search button */}
        {activeBrandId && (
          <button onClick={() => setShowSearch(v => !v)}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:bg-gray-800 transition-colors text-sm border"
            style={{ borderColor: 'var(--border)' }}
            title="Rechercher (⌘K)">
            <Search size={13} />
            <span className="text-xs hidden sm:inline">Rechercher</span>
            <kbd className="text-[10px] font-mono hidden sm:inline">⌘K</kbd>
          </button>
        )}

        {/* Export PDF */}
        {activeBrandId && (
          <a href={`/api/brands/${activeBrandId}/pdf`} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
            title="Exporter en PDF">
            <FileDown size={15} />
          </a>
        )}

        {/* Dark mode toggle */}
        <button onClick={toggle}
          className="flex-shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={dark ? 'Mode clair' : 'Mode sombre'}>
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* History button */}
        <button onClick={() => setShowHistory(v => !v)}
          className="flex-shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
          title="Historique">
          <Clock size={15} />
        </button>
      </header>

      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
      {showSearch && activeBrandId && (
        <SearchModal
          brandId={activeBrandId}
          sections={brandSections}
          onNavigate={(sectionId, moduleId, itemId) => {
            setActiveSectionId(sectionId);
            setTimeout(() => {
              const el = (
                (itemId ? document.querySelector(`[data-item-id="${itemId}"]`) : null) ??
                document.querySelector(`[data-module-id="${moduleId}"]`)
              ) as HTMLElement | null;
              if (!el) return;
              const color = activeBrand?.color ?? '#6366f1';
              const radius = itemId ? '12px' : '16px';
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.transition = 'none';
              el.style.outline = `2px solid ${color}`;
              el.style.outlineOffset = '4px';
              el.style.borderRadius = radius;
              setTimeout(() => {
                el.style.transition = 'outline 0.6s, outline-offset 0.6s, border-radius 0.6s';
                el.style.outline = '2px solid transparent';
                setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; el.style.borderRadius = ''; el.style.transition = ''; }, 700);
              }, 1600);
            }, 150);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

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
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Content below the header */}
              {activeSection && brandSections.filter(s => s.parentId === activeSection.id).length === 0 ? (
                <PageView
                  key={pageViewKey}
                  brand={activeBrand}
                  section={activeSection}
                  sections={brandSections}
                  onModuleDragStart={setDraggingModule}
                  onModuleDragEnd={() => setDraggingModule(null)}
                  brandHeader={<BrandHeader brand={activeBrand} onUpdate={updated => setBrands(prev => prev.map(b => b.id === updated.id ? updated : b))} />}
                />
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <BrandHeader brand={activeBrand} onUpdate={updated => setBrands(prev => prev.map(b => b.id === updated.id ? updated : b))} />
                  <div className="max-w-4xl mx-auto px-8 py-8">
                    <div className="pb-2 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {activeSection ? activeSection.name : 'Rubriques'}
                      </h1>
                    </div>
                    {(() => {
                      const children = activeSection
                        ? brandSections.filter(s => s.parentId === activeSection.id)
                        : brandSections.filter(s => s.parentId === null);
                      const sorted = children.sort((a, b) => a.order - b.order);
                      if (sorted.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400 dark:text-gray-500">
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
                                className="flex items-center gap-3 p-4 border rounded-xl bg-white dark:bg-gray-900 text-left hover:shadow-md transition-all"
                                style={{ borderColor: 'var(--border)' }}
                              >
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                                  style={{ background: activeBrand.color }}>
                                  {section.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 dark:text-gray-700 truncate">{section.name}</p>
                                  {childCount > 0 && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 dark:text-gray-500">
            <p className="text-sm">Aucune marque sélectionnée.</p>
            <button onClick={() => setView('home')} className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors">
              ← Retour à l'accueil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
