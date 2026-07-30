'use client';

import { useState, useRef, useEffect } from 'react';
import { Brand, BrandCategory, Section } from '@/types';
import { Plus, Copy, Trash2, ArrowRight, Pencil, Check, Moon, Sun, Upload, X, Link, LogOut, GripVertical, FolderPlus } from 'lucide-react';
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

interface BrandCardProps {
  brand: Brand;
  sectionCount: number;
  isDragging: boolean;
  indicatorOnLeft: boolean;
  indicatorOnRight: boolean;
  indicatorColor: string;
  editingId: string | null;
  editName: string;
  editColor: string;
  editHexInput: string;
  editDescription: string;
  duplicating: string | null;
  logoUploading: boolean;
  headerUploading: boolean;
  showHeaderUrl: boolean;
  headerUrlInput: string;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  setEditName: (v: string) => void;
  setEditColor: (v: string) => void;
  setEditHexInput: (v: string) => void;
  setEditDescription: (v: string) => void;
  setShowHeaderUrl: (v: boolean) => void;
  setHeaderUrlInput: (v: string) => void;
  uploadHeaderFromUrl: (brandId: string, url: string) => void;
  removeHeader: (brandId: string) => void;
  removeLogo: (brandId: string) => void;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  headerInputRef: React.RefObject<HTMLInputElement | null>;
}

function BrandCard({
  brand, sectionCount, isDragging, indicatorOnLeft, indicatorOnRight, indicatorColor,
  editingId, editName, editColor, editHexInput, editDescription, duplicating,
  logoUploading, headerUploading, showHeaderUrl, headerUrlInput,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onOpen, onStartEdit, onDuplicate, onDelete,
  onCancelEdit, onSaveEdit, setEditName, setEditColor, setEditHexInput, setEditDescription,
  setShowHeaderUrl, setHeaderUrlInput, uploadHeaderFromUrl, removeHeader, removeLogo, logoInputRef, headerInputRef,
}: BrandCardProps) {
  const initial = brand.name.charAt(0).toUpperCase();
  const isEditingThis = editingId === brand.id;

  return (
    <div className="relative">
      {indicatorOnLeft && (
        <div className="absolute -left-3 top-4 bottom-4 w-0.5 rounded-full z-10" style={{ background: indicatorColor }} />
      )}
      {indicatorOnRight && (
        <div className="absolute -right-3 top-4 bottom-4 w-0.5 rounded-full z-10" style={{ background: indicatorColor }} />
      )}
      <div
        className={`group bg-card border rounded-2xl overflow-hidden transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col min-h-[220px] ${isEditingThis ? '' : 'hover:scale-[1.02] hover:shadow-lg'}`}
        style={{ borderColor: 'var(--border)', opacity: isDragging ? 0.4 : 1 }}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={onOpen}
      >
        {/* Header band with action buttons */}
        <div className="h-24 flex items-center justify-center relative group/header" style={
          brand.headerImage
            ? { backgroundImage: `url(/uploads/${brand.headerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: isEditingThis ? editColor : brand.color }
        }>
          {isEditingThis && !showHeaderUrl && (
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
          {isEditingThis && showHeaderUrl && (
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
              {logoUploading && isEditingThis
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : brand.logoImage
                  ? <img src={`/uploads/${brand.logoImage}`} alt="logo" className="w-full h-full object-contain p-3" />
                  : <span className="text-white text-2xl font-bold">{initial}</span>
              }
            </div>
            {isEditingThis && (
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
              onClick={onStartEdit}
              className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-600 dark:text-white transition-colors"
              title="Éditer"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDuplicate}
              disabled={duplicating === brand.id}
              className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-600 dark:text-white transition-colors disabled:opacity-40"
              title="Dupliquer"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-900/20 hover:bg-red-500/80 text-gray-600 dark:text-white hover:text-white transition-colors"
              title="Supprimer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Content / Edit form */}
        {isEditingThis ? (
          <div className="p-4 flex-1 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              className="w-full text-base font-medium outline-none border-b pb-1 placeholder-gray-300"
              style={{ borderColor: 'var(--border)' }}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
            />
            <textarea
              className="w-full text-xs outline-none border rounded-lg px-2 py-1.5 resize-none placeholder-gray-300 dark:placeholder-gray-600"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              rows={2}
              maxLength={160}
              placeholder="Brève description de la marque…"
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') onCancelEdit(); }}
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
              <button onClick={onCancelEdit} className="flex-1 py-1.5 rounded-lg border text-xs text-gray-500 dark:text-gray-400" style={{ borderColor: 'var(--border)' }}>Annuler</button>
              <button onClick={onSaveEdit} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-white font-medium" style={{ background: editColor }}>
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
            {brand.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{brand.description}</p>
            )}
          </div>
        )}

        {/* Open button */}
        {!isEditingThis && (
          <div className="px-4 pb-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button
              onClick={onOpen}
              className="flex items-center gap-1.5 w-full justify-center py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
              style={{ background: brand.color }}
            >
              Ouvrir <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomeView({ brands, sections, onOpenBrand, onBrandsChange, onSectionsChange }: Props) {
  const [showNew, setShowNew] = useState(false);
  const { dark, toggle } = useTheme();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(BRAND_COLORS[0]);
  const [newHexInput, setNewHexInput] = useState(BRAND_COLORS[0].replace('#', ''));
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editHexInput, setEditHexInput] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [headerUrlInput, setHeaderUrlInput] = useState('');
  const [showHeaderUrl, setShowHeaderUrl] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  // Categories
  const [categories, setCategories] = useState<BrandCategory[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(BRAND_COLORS[0]);
  const [newCategoryHexInput, setNewCategoryHexInput] = useState(BRAND_COLORS[0].replace('#', ''));
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('');
  const [editCategoryHexInput, setEditCategoryHexInput] = useState('');
  const [dragCategoryId, setDragCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [dropZoneCategoryId, setDropZoneCategoryId] = useState<string | null | 'none'>(null);

  useEffect(() => {
    fetch('/api/brand-categories').then(r => r.json()).then(setCategories);
  }, []);

  async function createCategory() {
    if (!newCategoryName.trim()) return;
    const res = await fetch('/api/brand-categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.trim(), color: newCategoryColor }),
    });
    const category = await res.json();
    setCategories(prev => [...prev, category]);
    setNewCategoryName('');
    setNewCategoryColor(BRAND_COLORS[0]);
    setNewCategoryHexInput(BRAND_COLORS[0].replace('#', ''));
    setShowNewCategory(false);
  }

  function startEditCategory(category: BrandCategory) {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color);
    setEditCategoryHexInput(category.color.replace('#', ''));
  }

  async function saveCategory(id: string) {
    if (!editCategoryName.trim()) return;
    const res = await fetch(`/api/brand-categories/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: editCategoryName.trim(), color: editCategoryColor }),
    });
    const updated = await res.json();
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    setEditingCategoryId(null);
  }

  async function deleteCategory(id: string) {
    if (!confirm('Supprimer cette catégorie ? Les marques qu\'elle contient seront déplacées vers "Sans catégorie".')) return;
    await fetch(`/api/brand-categories/${id}`, { method: 'DELETE' });
    setCategories(prev => prev.filter(c => c.id !== id));
    onBrandsChange(brands.map(b => b.categoryId === id ? { ...b, categoryId: null } : b));
  }

  function reorderCategories(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const next = [...categories];
    const from = next.findIndex(c => c.id === draggedId);
    const to = next.findIndex(c => c.id === targetId);
    next.splice(to, 0, next.splice(from, 1)[0]);
    setCategories(next);
    fetch('/api/brand-categories/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: next.map(c => c.id) }),
    });
  }

  async function createBrand() {
    if (!newName.trim()) return;
    const res = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const brand = await res.json();
    if (newCategoryId) {
      await fetch(`/api/brands/${brand.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ categoryId: newCategoryId }),
      });
      brand.categoryId = newCategoryId;
    }
    onBrandsChange([...brands, brand]);
    setNewName('');
    setShowNew(false);
    onOpenBrand(brand.id);
  }

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
    setShowHeaderUrl(false);
    setHeaderUrlInput('');
  }

  // Reorders within/between categories: dragged brand is placed adjacent to the
  // target brand and inherits the target's category.
  function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const dragged = brands.find(b => b.id === draggedId);
    const target = brands.find(b => b.id === targetId);
    if (!dragged || !target) return;
    const next = [...brands];
    const from = next.findIndex(b => b.id === draggedId);
    const [item] = next.splice(from, 1);
    const to = next.findIndex(b => b.id === targetId);
    const categoryChanged = (item.categoryId ?? null) !== (target.categoryId ?? null);
    if (categoryChanged) item.categoryId = target.categoryId ?? null;
    next.splice(to, 0, item);
    onBrandsChange(next);
    fetch('/api/brands/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: next.map(b => b.id) }),
    });
    if (categoryChanged) {
      fetch(`/api/brands/${draggedId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ categoryId: item.categoryId }),
      });
    }
  }

  // Drops a brand into an (possibly empty) category group without a specific target card.
  function moveBrandToCategory(draggedId: string, categoryId: string | null) {
    const dragged = brands.find(b => b.id === draggedId);
    if (!dragged || (dragged.categoryId ?? null) === categoryId) return;
    onBrandsChange(brands.map(b => b.id === draggedId ? { ...b, categoryId } : b));
    fetch(`/api/brands/${draggedId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ categoryId }),
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
    setEditDescription(brand.description ?? '');
  }

  async function saveBrand(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/brands/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor, description: editDescription.trim() || null }),
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

  const uncategorized = brands.filter(b => !b.categoryId || !categories.some(c => c.id === b.categoryId));
  const groups: { category: BrandCategory | null; brands: Brand[] }[] = [
    ...categories.map(category => ({ category, brands: brands.filter(b => b.categoryId === category.id) })),
    ...(uncategorized.length > 0 || categories.length === 0 ? [{ category: null, brands: uncategorized }] : []),
  ];

  function renderBrandGrid(groupBrands: Brand[], categoryId: string | null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {groupBrands.map((brand, idx) => {
          const sectionCount = sections.filter(s => s.brandId === brand.id && s.parentId === null).length;
          const isDragging = dragId === brand.id;
          const isOver = dragOverId === brand.id;
          const dragIdx = groupBrands.findIndex(b => b.id === dragId);
          const indicatorOnRight = isOver && !isDragging && (dragIdx === -1 || dragIdx < idx);
          const indicatorOnLeft = isOver && !isDragging && dragIdx !== -1 && dragIdx > idx;
          const indicatorColor = brands.find(b => b.id === dragId)?.color ?? brand.color;
          return (
            <BrandCard
              key={brand.id}
              brand={brand}
              sectionCount={sectionCount}
              isDragging={isDragging}
              indicatorOnLeft={indicatorOnLeft}
              indicatorOnRight={indicatorOnRight}
              indicatorColor={indicatorColor}
              editingId={editingId}
              editName={editName}
              editColor={editColor}
              editHexInput={editHexInput}
              editDescription={editDescription}
              duplicating={duplicating}
              logoUploading={logoUploading}
              headerUploading={headerUploading}
              showHeaderUrl={showHeaderUrl}
              headerUrlInput={headerUrlInput}
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragId(brand.id); }}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(brand.id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragId) reorder(dragId, brand.id); setDragId(null); setDragOverId(null); setDropZoneCategoryId(null); }}
              onDragEnd={() => { setDragId(null); setDragOverId(null); setDropZoneCategoryId(null); }}
              onOpen={() => onOpenBrand(brand.id)}
              onStartEdit={e => startEdit(brand, e)}
              onDuplicate={() => duplicateBrand(brand.id)}
              onDelete={() => deleteBrand(brand.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={() => saveBrand(brand.id)}
              setEditName={setEditName}
              setEditColor={setEditColor}
              setEditHexInput={setEditHexInput}
              setEditDescription={setEditDescription}
              setShowHeaderUrl={setShowHeaderUrl}
              setHeaderUrlInput={setHeaderUrlInput}
              uploadHeaderFromUrl={uploadHeaderFromUrl}
              removeHeader={removeHeader}
              removeLogo={removeLogo}
              logoInputRef={logoInputRef}
              headerInputRef={headerInputRef}
            />
          );
        })}

        {/* Drop zone to move a brand into this (possibly empty) category */}
        {dragId && !groupBrands.some(b => b.id === dragId) && (
          <div
            className="min-h-[80px] border-2 border-dashed rounded-2xl flex items-center justify-center text-xs transition-colors"
            style={dropZoneCategoryId === (categoryId ?? 'none')
              ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-subtle)' }
              : { borderColor: 'var(--border)', color: '#9ca3af' }}
            onDragOver={e => { e.preventDefault(); setDropZoneCategoryId(categoryId ?? 'none'); }}
            onDragLeave={() => setDropZoneCategoryId(null)}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragId) moveBrandToCategory(dragId, categoryId); setDragId(null); setDragOverId(null); setDropZoneCategoryId(null); }}
          >
            Déposer ici
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="bg-card border-b px-8 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brandy-logo.svg" alt="Brandy" className="h-7 dark:[filter:brightness(0)_invert(1)]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle}
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title={dark ? 'Mode clair' : 'Mode sombre'}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => setShowNewCategory(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-600 dark:text-gray-300"
            style={{ borderColor: 'var(--border)' }}
          >
            <FolderPlus size={15} /> Nouvelle catégorie
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={15} /> Nouvelle marque
          </button>
          <button onClick={async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/login'; }}
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            title="Déconnexion">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-8 py-10 w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Mes marques</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{brands.length} marque{brands.length !== 1 ? 's' : ''}</p>

        {/* New category inline form */}
        {showNewCategory && (
          <div className="mb-6 p-4 border-2 border-dashed rounded-2xl bg-card flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
            <input
              autoFocus
              className="flex-1 min-w-[160px] text-sm font-medium outline-none placeholder-gray-300 bg-transparent"
              placeholder="Nom de la catégorie…"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCategory(); if (e.key === 'Escape') setShowNewCategory(false); }}
            />
            <div className="flex gap-1.5">
              {BRAND_COLORS.map(c => (
                <button key={c}
                  className={`w-5 h-5 rounded-full transition-transform ${newCategoryColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : 'hover:scale-110'}`}
                  style={{ background: c }}
                  onClick={() => { setNewCategoryColor(c); setNewCategoryHexInput(c.replace('#', '')); }} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={newCategoryColor}
                onChange={e => { setNewCategoryColor(e.target.value); setNewCategoryHexInput(e.target.value.replace('#', '')); }}
                className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 flex-shrink-0"
              />
              <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <span className="px-2 text-xs text-gray-400 dark:text-gray-500 font-mono select-none">#</span>
                <input
                  className="w-20 py-1 pr-2 text-xs font-mono outline-none bg-transparent"
                  style={{ color: 'var(--text-primary)' }}
                  value={newCategoryHexInput}
                  maxLength={6}
                  placeholder="b14100"
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                    setNewCategoryHexInput(val);
                    if (val.length === 6) setNewCategoryColor('#' + val);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') createCategory(); }}
                />
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setShowNewCategory(false)} className="px-3 py-1.5 rounded-lg border text-sm text-gray-500 dark:text-gray-400" style={{ borderColor: 'var(--border)' }}>Annuler</button>
              <button onClick={createCategory} className="px-3 py-1.5 rounded-lg text-sm text-white font-medium" style={{ background: newCategoryColor }}>Créer</button>
            </div>
          </div>
        )}

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
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1.5">
                {BRAND_COLORS.map(c => (
                  <button key={c}
                    className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-600' : 'hover:scale-110'}`}
                    style={{ background: c }}
                    onClick={() => { setNewColor(c); setNewHexInput(c.replace('#', '')); }} />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={newColor}
                  onChange={e => { setNewColor(e.target.value); setNewHexInput(e.target.value.replace('#', '')); }}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 flex-shrink-0"
                />
                <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <span className="px-2 text-xs text-gray-400 dark:text-gray-500 font-mono select-none">#</span>
                  <input
                    className="w-20 py-1 pr-2 text-xs font-mono outline-none bg-transparent"
                    style={{ color: 'var(--text-primary)' }}
                    value={newHexInput}
                    maxLength={6}
                    placeholder="b14100"
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                      setNewHexInput(val);
                      if (val.length === 6) setNewColor('#' + val);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') createBrand(); }}
                  />
                </div>
              </div>
              {categories.length > 0 && (
                <select
                  className="text-xs border rounded-lg px-2 py-1.5 outline-none bg-transparent"
                  style={{ borderColor: 'var(--border)' }}
                  value={newCategoryId ?? ''}
                  onChange={e => setNewCategoryId(e.target.value || null)}
                >
                  <option value="">Sans catégorie</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setShowNew(false)} className="px-4 py-1.5 rounded-lg border text-sm text-gray-500 dark:text-gray-400" style={{ borderColor: 'var(--border)' }}>Annuler</button>
              <button onClick={createBrand} className="px-4 py-1.5 rounded-lg text-sm text-white font-medium" style={{ background: newColor }}>Créer</button>
            </div>
          </div>
        )}

        {/* Brand groups */}
        {brands.length === 0 && !showNew ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-400 dark:text-gray-500">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold" style={{ background: 'var(--border)', color: 'white' }}>B</div>
            <p className="text-sm">Aucune marque pour l'instant.</p>
            <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer" style={{ background: 'var(--accent)' }}>
              <Plus size={15} /> Créer ma première marque
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map(({ category, brands: groupBrands }) => (
              <div
                key={category?.id ?? 'uncategorized'}
                className="relative"
                onDragOver={e => { if (dragId) { e.preventDefault(); setDropZoneCategoryId(category?.id ?? 'none'); } }}
              >
                {category ? (
                  <div
                    className="flex items-center gap-2 mb-3 pl-3 border-l-4 group/cat"
                    style={{ borderColor: category.color }}
                    draggable={editingCategoryId !== category.id}
                    onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; setDragCategoryId(category.id); }}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverCategoryId(category.id); }}
                    onDragLeave={() => setDragOverCategoryId(null)}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragCategoryId) reorderCategories(dragCategoryId, category.id); setDragCategoryId(null); setDragOverCategoryId(null); }}
                    onDragEnd={() => { setDragCategoryId(null); setDragOverCategoryId(null); }}
                  >
                    <GripVertical size={14} className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0" />
                    {editingCategoryId === category.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          autoFocus
                          className="text-lg font-bold outline-none border-b bg-transparent text-gray-900 dark:text-gray-100"
                          style={{ borderColor: category.color }}
                          value={editCategoryName}
                          onChange={e => setEditCategoryName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCategory(category.id); if (e.key === 'Escape') setEditingCategoryId(null); }}
                        />
                        <div className="flex gap-1">
                          {BRAND_COLORS.map(c => (
                            <button key={c}
                              className={`w-4 h-4 rounded-full transition-transform ${editCategoryColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                              style={{ background: c }}
                              onClick={() => { setEditCategoryColor(c); setEditCategoryHexInput(c.replace('#', '')); }} />
                          ))}
                        </div>
                        <input
                          type="color"
                          value={editCategoryColor}
                          onChange={e => { setEditCategoryColor(e.target.value); setEditCategoryHexInput(e.target.value.replace('#', '')); }}
                          className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 flex-shrink-0"
                        />
                        <div className="flex items-center rounded-lg border overflow-hidden flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                          <span className="px-1.5 text-xs text-gray-400 dark:text-gray-500 font-mono select-none">#</span>
                          <input
                            className="w-16 py-0.5 pr-1.5 text-xs font-mono outline-none bg-transparent"
                            style={{ color: 'var(--text-primary)' }}
                            value={editCategoryHexInput}
                            maxLength={6}
                            placeholder="b14100"
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                              setEditCategoryHexInput(val);
                              if (val.length === 6) setEditCategoryColor('#' + val);
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') saveCategory(category.id); if (e.key === 'Escape') setEditingCategoryId(null); }}
                          />
                        </div>
                        <button onClick={() => saveCategory(category.id)} className="p-1 rounded-lg text-white" style={{ background: editCategoryColor }}><Check size={13} /></button>
                        <button onClick={() => setEditingCategoryId(null)} className="p-1 rounded-lg text-gray-400"><X size={13} /></button>
                        <button onClick={() => deleteCategory(category.id)} className="p-1 rounded-lg text-red-400 hover:text-red-600 ml-auto"><Trash2 size={13} /></button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{category.name}</h2>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{groupBrands.length}</span>
                        <button
                          onClick={() => startEditCategory(category)}
                          className="p-1 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover/cat:opacity-100 transition-opacity"
                          title="Éditer la catégorie"
                        >
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                    {dragOverCategoryId === category.id && dragCategoryId && dragCategoryId !== category.id && (
                      <div className="absolute -top-1.5 left-0 right-0 h-0.5 rounded-full" style={{ background: category.color }} />
                    )}
                  </div>
                ) : categories.length > 0 ? (
                  <div className="flex items-center gap-2 mb-3 pl-3 border-l-4" style={{ borderColor: 'var(--border)' }}>
                    <h2 className="text-lg font-bold text-gray-400 dark:text-gray-500">Sans catégorie</h2>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{groupBrands.length}</span>
                  </div>
                ) : null}

                {renderBrandGrid(groupBrands, category?.id ?? null)}
              </div>
            ))}

            {/* New brand card */}
            {!showNew && (
              <button
                onClick={() => setShowNew(true)}
                className="w-full min-h-[100px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <Plus size={22} />
                <span className="text-sm font-medium">Nouvelle marque</span>
              </button>
            )}
          </div>
        )}
      </main>
      <div className="px-6 py-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
          Made with 🩷 in Paris
          {' '}by{' '}
          <a href="https://joevains.com" target="_blank" rel="noopener noreferrer"
            className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline underline-offset-2">
            Sylvain &ldquo;Joe Vains&rdquo; Guizard
          </a>
          {' '}© {new Date().getFullYear()}
        </p>
      </div>
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
