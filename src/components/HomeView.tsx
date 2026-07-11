'use client';

import { useState, useRef } from 'react';
import { Brand, Section } from '@/types';
import { Plus, Copy, Trash2, ArrowRight, Pencil, Check, Moon, Sun, Upload, X, Link } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  brands: Brand[];
  sections: Section[];
  onOpenBrand: (id: string) => void;
  onBrandsChange: (brands: Brand[]) => void;
  onSectionsChange: (sections: Section[]) => void;
}

const BRAND_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function HomeView({ brands, sections, onOpenBrand, onBrandsChange, onSectionsChange }: Props) {
  const [showNew, setShowNew] = useState(false);
  const { dark, toggle } = useTheme();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(BRAND_COLORS[0]);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editHexInput, setEditHexInput] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [headerUrlInput, setHeaderUrlInput] = useState('');
  const [showHeaderUrl, setShowHeaderUrl] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(brandId: string, file: File) {
    setLogoUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/brands/${brandId}/logo`, { method: 'POST', body: fd });
    const updated = await res.json();
    onBrandsChange(brands.map(b => b.id === brandId ? updated : b));
    setLogoUploading(false);
  }

  async function removeLogo(brandId: string) {
    const res = await fetch(`/api/brands/${brandId}/logo`, { method: 'DELETE' });
    const updated = await res.json();
    onBrandsChange(brands.map(b => b.id === brandId ? updated : b));
  }

  async function uploadHeader(brandId: string, file: File) {
    setHeaderUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/brands/${brandId}/header`, { method: 'POST', body: fd });
    const updated = await res.json();
    onBrandsChange(brands.map(b => b.id === brandId ? updated : b));
    setHeaderUploading(false);
  }

  async function removeHeader(brandId: string) {
    const res = await fetch(`/api/brands/${brandId}/header`, { method: 'DELETE' });
    const updated = await res.json();
    onBrandsChange(brands.map(b => b.id === brandId ? updated : b));
  }

  async function uploadHeaderFromUrl(brandId: string, url: string) {
    setHeaderUploading(true);
    const res = await fetch(`/api/brands/${brandId}/header`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const updated = await res.json();
    onBrandsChange(brands.map(b => b.id === brandId ? updated : b));
    setHeaderUploading(false);
    setHeaderUrlInput('');
    setShowHeaderUrl(false);
  }

  async function createBrand() {
    if (!newName.trim()) return;
    const res = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const brand = await res.json();
    onBrandsChange([...brands, brand]);
    setNewName('');
    setShowNew(false);
    onOpenBrand(brand.id);
  }

  function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const next = [...brands];
    const from = next.findIndex(b => b.id === draggedId);
    const to = next.findIndex(b => b.id === targetId);
    next.splice(to, 0, next.splice(from, 1)[0]);
    onBrandsChange(next);
    fetch('/api/brands/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: next.map(b => b.id) }),
    });
  }

  async function duplicateBrand(id: string) {
    setDuplicating(id);
    const res = await fetch(`/api/brands/${id}/duplicate`, { method: 'POST' });
    const newBrand = await res.json();
    const newSections = await fetch('/api/sections').then(r => r.json());
    onBrandsChange([...brands, newBrand]);
    onSectionsChange(newSections);
    setDuplicating(null);
  }

  function startEdit(brand: Brand, e: React.MouseEvent) {
    e.stopPropagation();
    if (editingId === brand.id) {
      setEditingId(null);
      return;
    }
    setEditingId(brand.id);
    setEditName(brand.name);
    setEditColor(brand.color);
    setEditHexInput(brand.color.replace('#', ''));
  }

  async function saveBrand(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/brands/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    const updated = await res.json();
    onBrandsChange(brands.map(b => b.id === id ? updated : b));
    setEditingId(null);
  }

  async function deleteBrand(id: string) {
    if (!confirm('Supprimer cette marque et tout son contenu ?')) return;
    await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    onBrandsChange(brands.filter(b => b.id !== id));
    onSectionsChange(sections.filter(s => s.brandId !== id));
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="bg-card border-b px-8 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brandy-logo.svg" alt="Brandy" className="h-7 dark:[filter:brightness(0)_invert(1)]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle}
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={dark ? 'Mode clair' : 'Mode sombre'}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={15} /> Nouvelle marque
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Mes marques</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{brands.length} marque{brands.length !== 1 ? 's' : ''}</p>

        {/* New brand inline form */}
        {showNew && (
          <div className="mb-6 p-5 border-2 border-dashed rounded-2xl bg-card flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
            <input
              autoFocus
              className="w-full text-lg font-medium outline-none placeholder-gray-300"
              placeholder="Nom de la marque…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createBrand(); if (e.key === 'Escape') setShowNew(false); }}
            />
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {BRAND_COLORS.map(c => (
                  <button key={c}
                    className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : 'hover:scale-110'}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)} />
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <button onClick={() => setShowNew(false)} className="px-4 py-1.5 rounded-lg border text-sm text-gray-500 dark:text-gray-400" style={{ borderColor: 'var(--border)' }}>Annuler</button>
                <button onClick={createBrand} className="px-4 py-1.5 rounded-lg text-sm text-white font-medium" style={{ background: newColor }}>Créer</button>
              </div>
            </div>
          </div>
        )}

        {/* Brand grid */}
        {brands.length === 0 && !showNew ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-400 dark:text-gray-500">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold" style={{ background: 'var(--border)', color: 'white' }}>B</div>
            <p className="text-sm">Aucune marque pour l'instant.</p>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: 'var(--accent)' }}>
              <Plus size={15} /> Créer ma première marque
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {brands.map((brand, idx) => {
              const sectionCount = sections.filter(s => s.brandId === brand.id && s.parentId === null).length;
              const initial = brand.name.charAt(0).toUpperCase();
              const isDragging = dragId === brand.id;
              const isOver = dragOverId === brand.id;
              const dragIdx = brands.findIndex(b => b.id === dragId);
              // dragging forward → indicator on right of target; dragging backward → indicator on left
              const indicatorOnRight = isOver && !isDragging && dragIdx < idx;
              const indicatorOnLeft = isOver && !isDragging && dragIdx > idx;
              const indicatorColor = brands.find(b => b.id === dragId)?.color ?? brand.color;
              return (
                <div key={brand.id} className="relative">
                  {indicatorOnLeft && (
                    <div className="absolute -left-3 top-4 bottom-4 w-0.5 rounded-full z-10" style={{ background: indicatorColor }} />
                  )}
                  {indicatorOnRight && (
                    <div className="absolute -right-3 top-4 bottom-4 w-0.5 rounded-full z-10" style={{ background: indicatorColor }} />
                  )}
                <div
                  className={`group bg-card border rounded-2xl overflow-hidden transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col min-h-[220px] ${editingId === brand.id ? '' : 'hover:scale-[1.02] hover:shadow-lg'}`}
                  style={{ borderColor: 'var(--border)', opacity: isDragging ? 0.4 : 1 }}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragId(brand.id); }}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(brand.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={e => { e.preventDefault(); if (dragId) reorder(dragId, brand.id); setDragId(null); setDragOverId(null); }}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  onClick={() => onOpenBrand(brand.id)}
                >
                  {/* Header band with action buttons */}
                  <div className="h-24 flex items-center justify-center relative group/header" style={
                    brand.headerImage
                      ? { backgroundImage: `url(/uploads/${brand.headerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: editingId === brand.id ? editColor : brand.color }
                  }>
                    {/* Header upload controls — edit mode only, bottom-right corner */}
                    {editingId === brand.id && !showHeaderUrl && (
                      <div className="absolute bottom-3 right-3 flex gap-1.5" onClick={e => e.stopPropagation()}>
                        {headerUploading
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <>
                              <button
                                onClick={e => { e.stopPropagation(); headerInputRef.current!.dataset.brandId = brand.id; headerInputRef.current?.click(); }}
                                className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-700 shadow"
                                title="Importer un fichier"
                              >
                                <Upload size={13} />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setShowHeaderUrl(true); }}
                                className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-700 shadow"
                                title="Utiliser une URL"
                              >
                                <Link size={13} />
                              </button>
                              {brand.headerImage && (
                                <button
                                  onClick={e => { e.stopPropagation(); removeHeader(brand.id); }}
                                  className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-red-500 shadow"
                                  title="Supprimer l'image"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </>
                        }
                      </div>
                    )}
                    {editingId === brand.id && showHeaderUrl && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center px-4 gap-2" onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus
                          type="url"
                          value={headerUrlInput}
                          onChange={e => setHeaderUrlInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && headerUrlInput.trim()) uploadHeaderFromUrl(brand.id, headerUrlInput.trim()); if (e.key === 'Escape') { setShowHeaderUrl(false); setHeaderUrlInput(''); } }}
                          placeholder="https://exemple.com/image.jpg"
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white text-gray-800 outline-none min-w-0"
                        />
                        <button
                          onClick={() => { if (headerUrlInput.trim()) uploadHeaderFromUrl(brand.id, headerUrlInput.trim()); }}
                          className="px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-gray-800 flex-shrink-0"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => { setShowHeaderUrl(false); setHeaderUrlInput(''); }}
                          className="px-2 py-1.5 rounded-lg bg-white/20 text-white text-xs flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <div className="relative group/logo">
                      <div className="w-16 h-16 rounded-full border-2 border-white/60 overflow-hidden flex items-center justify-center"
                        style={{ background: brand.logoImage ? 'white' : 'rgba(255,255,255,0.2)' }}>
                        {logoUploading && editingId === brand.id
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : brand.logoImage
                            ? <img src={`/uploads/${brand.logoImage}`} alt="logo" className="w-full h-full object-contain p-3" />
                            : <span className="text-white text-2xl font-bold">{initial}</span>
                        }
                      </div>
                      {editingId === brand.id && (
                        <>
                          <div
                            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            onClick={e => { e.stopPropagation(); logoInputRef.current?.dataset.brandId !== brand.id && (logoInputRef.current!.dataset.brandId = brand.id); logoInputRef.current?.click(); }}
                          >
                            <Upload size={14} className="text-white" />
                          </div>
                          {brand.logoImage && (
                            <button
                              onClick={e => { e.stopPropagation(); removeLogo(brand.id); }}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center text-red-400 hover:text-red-600 opacity-0 group-hover/logo:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => startEdit(brand, e)}
                        className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-600 dark:text-white transition-colors"
                        title="Éditer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => duplicateBrand(brand.id)}
                        disabled={duplicating === brand.id}
                        className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-600 dark:text-white transition-colors disabled:opacity-40"
                        title="Dupliquer"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => deleteBrand(brand.id)}
                        className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/20 hover:bg-red-500/80 text-gray-600 dark:text-white hover:text-white transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Content / Edit form */}
                  {editingId === brand.id ? (
                    <div className="p-4 flex-1 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        className="w-full text-base font-medium outline-none border-b pb-1 placeholder-gray-300"
                        style={{ borderColor: 'var(--border)' }}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveBrand(brand.id); if (e.key === 'Escape') setEditingId(null); }}
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {BRAND_COLORS.map(c => (
                          <button key={c}
                            className={`w-5 h-5 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : 'hover:scale-110'}`}
                            style={{ background: c }}
                            onClick={() => { setEditColor(c); setEditHexInput(c.replace('#', '')); }} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={e => { setEditColor(e.target.value); setEditHexInput(e.target.value.replace('#', '')); }}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 flex-shrink-0"
                        />
                        <div className="flex items-center flex-1 rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                          <span className="px-2 text-xs text-gray-400 dark:text-gray-500 font-mono select-none">#</span>
                          <input
                            className="flex-1 py-1 pr-2 text-xs font-mono outline-none bg-transparent"
                            style={{ color: 'var(--text-primary)' }}
                            value={editHexInput}
                            maxLength={6}
                            placeholder="b14100"
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                              setEditHexInput(val);
                              if (val.length === 6) { setEditColor('#' + val); }
                            }}
                          />
                          <div className="w-5 h-5 mr-1.5 rounded flex-shrink-0" style={{ background: editColor }} />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 rounded-lg border text-xs text-gray-500 dark:text-gray-400" style={{ borderColor: 'var(--border)' }}>Annuler</button>
                        <button onClick={() => saveBrand(brand.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: editColor }}>
                          <Check size={12} /> Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 flex-1 flex flex-col gap-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">{brand.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {sectionCount} rubrique{sectionCount !== 1 ? 's' : ''} · Créée le {formatDate(brand.createdAt)}
                      </p>
                    </div>
                  )}

                  {/* Open button */}
                  {editingId !== brand.id && (
                    <div className="px-4 pb-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenBrand(brand.id)}
                        className="flex items-center gap-1.5 w-full justify-center py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-opacity"
                        style={{ background: brand.color }}
                      >
                        Ouvrir <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
                </div>
              );
            })}

            {/* New brand card */}
            {!showNew && (
              <button
                onClick={() => setShowNew(true)}
                className="w-full min-h-[220px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <Plus size={22} />
                <span className="text-sm font-medium">Nouvelle marque</span>
              </button>
            )}
          </div>
        )}
      </main>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          const brandId = logoInputRef.current?.dataset.brandId;
          if (file && brandId) uploadLogo(brandId, file);
          e.target.value = '';
        }}
      />
      <input
        ref={headerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          const brandId = headerInputRef.current?.dataset.brandId;
          if (file && brandId) uploadHeader(brandId, file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
