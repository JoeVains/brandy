'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Brand, Section, Asset } from '@/types';
import Sidebar from './Sidebar';
import AssetGrid from './AssetGrid';
import { Plus, Trash2, Check, X, Pencil } from 'lucide-react';

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandColor, setNewBrandColor] = useState(BRAND_COLORS[0]);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingAnchorRect, setEditingAnchorRect] = useState<DOMRect | null>(null);

  const fetchAll = useCallback(async () => {
    const [b, s, a] = await Promise.all([
      fetch('/api/brands').then(r => r.json()),
      fetch('/api/sections').then(r => r.json()),
      fetch('/api/assets').then(r => r.json()),
    ]);
    setBrands(b);
    setSections(s);
    setAssets(a);
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
    if (!confirm('Supprimer cette marque et tous ses assets ?')) return;
    await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    setBrands(prev => prev.filter(b => b.id !== id));
    setSections(prev => prev.filter(s => s.brandId !== id));
    setAssets(prev => prev.filter(a => a.brandId !== id));
    setEditingBrandId(null);
    setEditingAnchorRect(null);
    if (activeBrandId === id) setActiveBrandId(brands.find(b => b.id !== id)?.id ?? null);
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

  const activeBrand = brands.find(b => b.id === activeBrandId) ?? null;
  const brandSections = sections.filter(s => s.brandId === activeBrandId);
  const displayedAssets = activeSectionId
    ? assets.filter(a => a.sectionId === activeSectionId)
    : assets.filter(a => a.brandId === activeBrandId);

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
            return (
              <div key={brand.id} className="relative">
                <div
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-sm font-medium transition-all select-none ${isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
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
            />
            <AssetGrid
              brand={activeBrand}
              sectionId={activeSectionId}
              assets={displayedAssets}
              sections={brandSections}
              onAssetsChange={updated => setAssets(prev => [...prev.filter(a => a.brandId !== activeBrand.id), ...updated])}
            />
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
