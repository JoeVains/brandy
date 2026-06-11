'use client';

import { useState, useRef } from 'react';
import { Brand, Section, Asset } from '@/types';
import { Upload, Plus, Download, Trash2, FileText, Image, Palette, Type, File } from 'lucide-react';
import { suggestColorName } from '@/lib/colorNames';

interface Props {
  brand: Brand;
  sectionId: string | null;
  assets: Asset[];
  sections: Section[];
  onAssetsChange: (assets: Asset[]) => void;
}

function formatSize(bytes: number) {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AssetIcon({ type }: { type: Asset['type'] }) {
  const cls = 'w-5 h-5';
  if (type === 'image') return <Image className={cls} />;
  if (type === 'document') return <FileText className={cls} />;
  if (type === 'color') return <Palette className={cls} />;
  if (type === 'font') return <Type className={cls} />;
  return <File className={cls} />;
}

function hexToRgb(hex: string) {
  const v = hex.replace('#', '');
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function ColorSwatch({ asset }: { asset: Asset }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const hex = asset.colorValue ?? '#000000';
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const rgbStr = `rgb(${r}, ${g}, ${b})`;
  const hslStr = `hsl(${h}, ${s}%, ${l}%)`;

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border bg-white" style={{ borderColor: 'var(--border)' }}>
      <div className="h-20" style={{ background: hex }} />
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-medium text-gray-800 truncate">{asset.name}</p>
        {([
          { label: 'HEX', value: hex.toUpperCase() },
          { label: 'RVB', value: rgbStr },
          { label: 'TSL', value: hslStr },
        ] as { label: string; value: string }[]).map(({ label, value }) => (
          <button
            key={label}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors text-left group/row"
            onClick={() => copy(value, label)}
            title={`Copier ${label}`}
          >
            <span className="text-[10px] font-semibold text-gray-400 w-7 flex-shrink-0">{label}</span>
            <span className="text-xs font-mono text-gray-600 truncate flex-1">
              {copied === label ? '✓ Copié' : value}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AssetCard({ asset, onDelete }: { asset: Asset; onDelete: () => void }) {
  const isImage = asset.type === 'image';
  const isColor = asset.type === 'color';

  if (isColor) {
    return (
      <div className="relative group">
        <ColorSwatch asset={asset} />
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        >
          <Trash2 size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border bg-white group relative" style={{ borderColor: 'var(--border)' }}>
      <div className="h-32 flex items-center justify-center bg-gray-50 relative overflow-hidden">
        {isImage ? (
          <img src={`/uploads/${asset.filename}`} alt={asset.name} className="w-full h-full object-contain p-2" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <AssetIcon type={asset.type} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {asset.filename && (
            <a
              href={`/uploads/${asset.filename}`}
              download={asset.name}
              className="p-1.5 rounded-lg bg-white shadow text-gray-600 hover:text-gray-900"
              onClick={e => e.stopPropagation()}
            >
              <Download size={13} />
            </a>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-white shadow text-red-400 hover:text-red-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-gray-800 truncate">{asset.name}</p>
        {asset.size > 0 && <p className="text-xs text-gray-400 mt-0.5">{formatSize(asset.size)}</p>}
      </div>
    </div>
  );
}

export default function AssetGrid({ brand, sectionId, assets, sections, onAssetsChange }: Props) {
  const [showColorForm, setShowColorForm] = useState(false);
  const [colorName, setColorName] = useState('');
  const [colorNameTouched, setColorNameTouched] = useState(false);
  const [colorValue, setColorValue] = useState('#000000');
  const [colorHexInput, setColorHexInput] = useState('000000');

  function applyColor(hex: string) {
    setColorValue(hex);
    setColorHexInput(hex.replace('#', ''));
    if (!colorNameTouched) setColorName(suggestColorName(hex));
  }
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    if (!sectionId) return;
    const arr = Array.from(files);
    const newAssets: Asset[] = [];
    for (const file of arr) {
      const form = new FormData();
      form.append('brandId', brand.id);
      form.append('sectionId', sectionId);
      form.append('file', file);
      const res = await fetch('/api/assets', { method: 'POST', body: form });
      newAssets.push(await res.json());
    }
    onAssetsChange([...assets, ...newAssets]);
  }

  async function addColor() {
    if (!sectionId || !colorValue) return;
    const res = await fetch('/api/assets', {
      method: 'POST',
      body: (() => {
        const f = new FormData();
        f.append('brandId', brand.id);
        f.append('sectionId', sectionId);
        f.append('colorValue', colorValue);
        f.append('colorName', colorName || colorValue);
        return f;
      })(),
    });
    const asset = await res.json();
    onAssetsChange([...assets, asset]);
    setShowColorForm(false);
    setColorName('');
    setColorNameTouched(false);
    setColorValue('#000000');
    setColorHexInput('000000');
  }

  async function deleteAsset(id: string) {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    onAssetsChange(assets.filter(a => a.id !== id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!sectionId) return;
    uploadFiles(e.dataTransfer.files);
  }

  const noSection = !sectionId;

  return (
    <main className="flex-1 overflow-y-auto p-6" onDragOver={e => { e.preventDefault(); if (sectionId) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {sectionId ? sections.find(s => s.id === sectionId)?.name ?? 'Section' : `Tous les assets — ${brand.name}`}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
        </div>
        {sectionId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowColorForm(!showColorForm); if (!showColorForm) { setColorName(suggestColorName('#000000')); setColorNameTouched(false); } }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border text-gray-600 hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              <Palette size={14} /> Couleur
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white font-medium transition-colors"
              style={{ background: brand.color }}
            >
              <Upload size={14} /> Uploader
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />
          </div>
        )}
      </div>

      {/* Color form */}
      {showColorForm && (
        <div className="mb-4 p-4 rounded-xl border bg-white flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <input
            type="color"
            value={colorValue}
            onChange={e => applyColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-0 flex-shrink-0"
          />
          <div className="flex items-center rounded-lg border overflow-hidden flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <span className="px-2 text-xs text-gray-400 font-mono select-none">#</span>
            <input
              className="w-20 py-2 pr-2 text-sm font-mono outline-none bg-transparent"
              value={colorHexInput}
              maxLength={6}
              placeholder="000000"
              onChange={e => {
                const val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                setColorHexInput(val);
                if (val.length === 6) applyColor('#' + val);
              }}
            />
            <div className="w-6 h-6 mr-1.5 rounded flex-shrink-0" style={{ background: colorValue }} />
          </div>
          <input
            autoFocus
            placeholder="Nom de la couleur"
            className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-300"
            style={{ borderColor: 'var(--border)' }}
            value={colorName}
            onChange={e => { setColorName(e.target.value); setColorNameTouched(true); }}
            onKeyDown={e => { if (e.key === 'Enter') addColor(); if (e.key === 'Escape') setShowColorForm(false); }}
          />
          <button onClick={addColor} className="px-4 py-2 rounded-lg text-white text-sm font-medium flex-shrink-0" style={{ background: brand.color }}>Ajouter</button>
          <button onClick={() => setShowColorForm(false)} className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">Annuler</button>
        </div>
      )}

      {/* Drop zone or no section message */}
      {noSection ? (
        assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300">
            <p className="text-sm">Sélectionnez une rubrique dans la sidebar pour voir ou ajouter des assets</p>
          </div>
        ) : null
      ) : assets.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={32} className={dragging ? 'text-indigo-400' : 'text-gray-300'} />
          <p className="mt-2 text-sm text-gray-400">Déposez des fichiers ici ou cliquez pour uploader</p>
        </div>
      ) : null}

      {/* Grid */}
      {assets.length > 0 && (
        <div
          className={`grid gap-4 ${dragging ? 'ring-2 ring-indigo-300 ring-offset-2 rounded-2xl' : ''}`}
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
        >
          {assets.map(asset => (
            <AssetCard key={asset.id} asset={asset} onDelete={() => deleteAsset(asset.id)} />
          ))}
          {sectionId && (
            <div
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-300 cursor-pointer hover:border-gray-300 hover:text-gray-400 transition-colors min-h-[140px]"
              onClick={() => fileRef.current?.click()}
            >
              <Plus size={24} />
              <span className="text-xs mt-1">Ajouter</span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
