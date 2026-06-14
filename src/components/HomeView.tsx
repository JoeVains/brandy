'use client';

import { useState } from 'react';
import { Brand, Section } from '@/types';
import { Plus, Copy, Trash2, ArrowRight, Pencil, Check, Moon, Sun } from 'lucide-react';
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
    setEditingId(brand.id);
    setEditName(brand.name);
    setEditColor(brand.color);
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
      <header className="bg-white dark:bg-gray-900 border-b px-8 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-base" style={{ background: 'var(--accent)' }}>B</div>
          <span className="font-semibold text-xl tracking-tight">Brandy</span>
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
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">{brands.length} marque{brands.length !== 1 ? 's' : ''}</p>

        {/* New brand inline form */}
        {showNew && (
          <div className="mb-6 p-5 border-2 border-dashed rounded-2xl bg-white dark:bg-gray-900 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
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
                <button onClick={() => setShowNew(false)} className="px-4 py-1.5 rounded-lg border text-sm text-gray-500" style={{ borderColor: 'var(--border)' }}>Annuler</button>
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
            {brands.map(brand => {
              const sectionCount = sections.filter(s => s.brandId === brand.id && s.parentId === null).length;
              const initial = brand.name.charAt(0).toUpperCase();
              const isDragging = dragId === brand.id;
              const isOver = dragOverId === brand.id;
              return (
                <div key={brand.id}
                  className="group bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col hover:scale-[1.02] hover:shadow-lg"
                  style={{ borderColor: isOver && !isDragging ? brand.color : 'var(--border)', opacity: isDragging ? 0.4 : 1 }}
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragId(brand.id); }}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(brand.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={e => { e.preventDefault(); if (dragId) reorder(dragId, brand.id); setDragId(null); setDragOverId(null); }}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  onClick={() => onOpenBrand(brand.id)}
                >
                  {/* Header band with action buttons */}
                  <div className="h-24 flex items-center justify-center relative" style={
                    brand.headerImage && editingId !== brand.id
                      ? { backgroundImage: `url(/uploads/${brand.headerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: editingId === brand.id ? editColor : brand.color }
                  }>
                    <div className="w-16 h-16 rounded-full border-2 border-white/60 overflow-hidden flex items-center justify-center"
                      style={{ background: brand.logoImage ? 'white' : 'rgba(255,255,255,0.2)' }}>
                      {brand.logoImage
                        ? <img src={`/uploads/${brand.logoImage}`} alt="logo" className="w-full h-full object-contain" />
                        : <span className="text-white text-2xl font-bold">{initial}</span>
                      }
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => startEdit(brand, e)}
                        className="p-1.5 rounded-lg bg-white dark:bg-gray-900/20 hover:bg-white dark:bg-gray-900/40 text-white transition-colors"
                        title="Éditer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => duplicateBrand(brand.id)}
                        disabled={duplicating === brand.id}
                        className="p-1.5 rounded-lg bg-white dark:bg-gray-900/20 hover:bg-white dark:bg-gray-900/40 text-white transition-colors disabled:opacity-40"
                        title="Dupliquer"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => deleteBrand(brand.id)}
                        className="p-1.5 rounded-lg bg-white dark:bg-gray-900/20 hover:bg-red-500/80 text-white transition-colors"
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
                            onClick={() => setEditColor(c)} />
                        ))}
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 rounded-lg border text-xs text-gray-500" style={{ borderColor: 'var(--border)' }}>Annuler</button>
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
              );
            })}

            {/* New brand card */}
            {!showNew && (
              <button
                onClick={() => setShowNew(true)}
                className="border-2 border-dashed rounded-2xl h-48 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <Plus size={22} />
                <span className="text-sm font-medium">Nouvelle marque</span>
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
