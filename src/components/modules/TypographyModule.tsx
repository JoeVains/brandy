'use client';

import { useRef, useState, useEffect } from 'react';
import { Module, FontItem, FontVariant } from '@/types';
import { Plus, Trash2, Upload, Type, ChevronDown } from 'lucide-react';
import ModuleDescription from './ModuleDescription';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
}

const SAMPLE_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SAMPLE_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const SAMPLE_NUMS  = '1234567890(..::?!$&*)';

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-gray-400 font-medium">{lang}</span>
        <button onClick={copy} className="text-gray-400 hover:text-gray-700 transition-colors">
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <pre className="px-3 py-2.5 bg-white text-gray-700 overflow-x-auto leading-relaxed font-mono">{code}</pre>
    </div>
  );
}

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
  500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
};

const ALL_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function buildGoogleUrl(family: string, variants: FontVariant[]) {
  if (!variants.length) return null;
  const normals = variants.filter(v => v.style === 'normal').map(v => v.weight).sort((a, b) => a - b);
  const italics = variants.filter(v => v.style === 'italic').map(v => v.weight).sort((a, b) => a - b);
  const parts: string[] = [];
  normals.forEach(w => parts.push(`0,${w}`));
  italics.forEach(w => parts.push(`1,${w}`));
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@${parts.join(';')}&display=swap`;
}

function FontVariantRow({ family, variant, fontFace, onDelete, isEditing }: {
  family: string;
  variant: FontVariant;
  fontFace?: string;
  onDelete: () => void;
  isEditing?: boolean;
}) {
  const style: React.CSSProperties = {
    fontFamily: `'${family}', sans-serif`,
    fontWeight: variant.weight,
    fontStyle: variant.style,
  };
  const weightLabel = WEIGHT_NAMES[variant.weight] ?? String(variant.weight);
  const styleLabel = variant.style === 'italic' ? 'Italic' : '';
  const label = [weightLabel, styleLabel].filter(Boolean).join(' ');

  return (
    <div className="flex items-start gap-6 py-5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      {/* Big Aa */}
      <div className="flex-shrink-0 w-20 text-5xl leading-none text-gray-900" style={style}>Aa</div>

      {/* Alphabet preview */}
      <div className="flex-1 min-w-0 space-y-0.5 border-l pl-6" style={{ borderColor: 'var(--border)' }}>
        {fontFace && <style>{fontFace}</style>}
        <p className="text-sm text-gray-700 truncate" style={style}>{SAMPLE_UPPER}</p>
        <p className="text-sm text-gray-700 truncate" style={style}>{SAMPLE_LOWER}</p>
        <p className="text-sm text-gray-700 truncate" style={style}>{SAMPLE_NUMS}</p>
      </div>

      {/* Info + delete */}
      <div className="flex-shrink-0 w-32 text-right">
        <p className="text-sm font-medium text-gray-800">{family}</p>
        <p className="text-xs text-gray-400 mt-0.5">Weight: {variant.weight}</p>
        <p className="text-xs text-gray-400">Style: {variant.style}</p>
        {isEditing && (
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 mt-1 transition-colors">
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function AddVariantPicker({ existing, onAdd, onClose }: {
  existing: FontVariant[];
  onAdd: (v: FontVariant) => void;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState(400);
  const [style, setStyle] = useState<'normal' | 'italic'>('normal');

  const alreadyExists = existing.some(v => v.weight === weight && v.style === style);

  return (
    <div className="flex items-center gap-2 mt-3 p-3 border rounded-xl bg-gray-50" style={{ borderColor: 'var(--border)' }}>
      <select value={weight} onChange={e => setWeight(Number(e.target.value))}
        className="text-sm border rounded-lg px-2 py-1.5 bg-white outline-none" style={{ borderColor: 'var(--border)' }}>
        {ALL_WEIGHTS.map(w => <option key={w} value={w}>{w} – {WEIGHT_NAMES[w]}</option>)}
      </select>
      <select value={style} onChange={e => setStyle(e.target.value as 'normal' | 'italic')}
        className="text-sm border rounded-lg px-2 py-1.5 bg-white outline-none" style={{ borderColor: 'var(--border)' }}>
        <option value="normal">Normal</option>
        <option value="italic">Italic</option>
      </select>
      <button
        disabled={alreadyExists}
        onClick={() => { onAdd({ weight, style }); onClose(); }}
        className="text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-opacity"
        style={{ background: alreadyExists ? '#9ca3af' : '#111' }}>
        Ajouter
      </button>
      <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg border text-gray-500" style={{ borderColor: 'var(--border)' }}>
        Annuler
      </button>
    </div>
  );
}

export default function TypographyModule({ module, brandColor, onUpdate, isEditing }: Props) {
  const [showAddGoogle, setShowAddGoogle] = useState(false);
  const [googleFamily, setGoogleFamily] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [addingVariantFor, setAddingVariantFor] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const items = module.fontItems ?? [];
  const SAMPLE_DEFAULT = 'The quick brown fox jumps over the lazy dog';

  async function patch(fontItems: FontItem[]) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fontItems }),
    });
    onUpdate(await res.json());
  }

  useEffect(() => {
    if (googleFamily.length < 2) { setSuggestions([]); return; }
    const controller = new AbortController();
    fetch(`/api/fonts/search?q=${encodeURIComponent(googleFamily)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(setSuggestions)
      .catch(() => {});
    return () => controller.abort();
  }, [googleFamily]);

  async function addGoogleFont() {
    if (!googleFamily.trim()) return;
    const item: FontItem = {
      id: crypto.randomUUID(),
      name: googleFamily.trim(),
      source: 'google',
      family: googleFamily.trim(),
      variants: [{ weight: 400, style: 'normal' }],
    };
    await patch([...items, item]);
    setGoogleFamily('');
    setShowAddGoogle(false);
  }

  async function uploadFont(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'font');
    fd.append('name', file.name.replace(/\.[^.]+$/, ''));
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    onUpdate(await res.json());
  }

  async function deleteFontItem(id: string) {
    await patch(items.filter(i => i.id !== id));
  }

  async function addVariant(itemId: string, variant: FontVariant) {
    const newItems = items.map(i => i.id !== itemId ? i : {
      ...i, variants: [...(i.variants ?? []), variant],
    });
    await patch(newItems);
  }

  async function deleteVariant(itemId: string, variant: FontVariant) {
    const newItems = items.map(i => {
      if (i.id !== itemId) return i;
      const remaining = (i.variants ?? []).filter(v => !(v.weight === variant.weight && v.style === variant.style));
      return { ...i, variants: remaining };
    });
    await patch(newItems);
  }

  return (
    <div>
      <ModuleDescription
        moduleId={module.id}
        value={module.description}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, description: desc })}
      />
      <div className="space-y-8">
        {items.map(item => {
          const variants = item.variants ?? (item.source === 'google' ? [{ weight: 400, style: 'normal' as const }] : []);
          const googleUrl = item.source === 'google' && item.family ? buildGoogleUrl(item.family, variants) : null;
          const fontFaceUpload = item.source === 'upload' && item.filename
            ? `@font-face { font-family: '${item.name}'; src: url('/uploads/${item.filename}'); }`
            : undefined;

          return (
            <div key={item.id} data-item-id={item.id} className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {/* Font header */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.source === 'google' ? 'Google Fonts' : 'Police uploadée'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.source === 'google' && item.family && (
                    <a href={`https://fonts.google.com/specimen/${encodeURIComponent(item.family.replace(/ /g, '+'))}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-gray-800 transition-colors border rounded-lg px-3 py-1.5"
                      style={{ borderColor: 'var(--border)' }}>
                      Voir sur Google Fonts ↗
                    </a>
                  )}
                  {item.source === 'upload' && item.filename && (
                    <a href={`/uploads/${item.filename}`} download={item.filename}
                      className="text-xs text-gray-500 hover:text-gray-800 transition-colors border rounded-lg px-3 py-1.5"
                      style={{ borderColor: 'var(--border)' }}>
                      Télécharger ↓
                    </a>
                  )}
                  {isEditing && (
                    <button onClick={() => deleteFontItem(item.id)}
                      className="p-1.5 rounded-lg border hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Load Google font for all variants */}
              {googleUrl && <link rel="stylesheet" href={googleUrl} />}
              {fontFaceUpload && <style>{fontFaceUpload}</style>}

              {/* Size preview */}
              <div className="border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="px-5 pt-3 pb-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <input
                    className="flex-1 text-sm text-gray-500 outline-none placeholder-gray-300 bg-transparent"
                    placeholder={SAMPLE_DEFAULT}
                    value={previewText}
                    onChange={e => setPreviewText(e.target.value)}
                  />
                  {previewText && (
                    <button onClick={() => setPreviewText('')} className="text-xs text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
                      Réinitialiser
                    </button>
                  )}
                </div>
                <div className="px-5 py-4 space-y-1" style={{ fontFamily: `'${item.family ?? item.name}', sans-serif` }}>
                  {[12, 16, 24, 36, 48].map(size => (
                    <p key={size} style={{ fontSize: size }} className="text-gray-800 leading-tight truncate">
                      {previewText || SAMPLE_DEFAULT}
                    </p>
                  ))}
                </div>
              </div>

              {/* Variant rows */}
              <div className="px-5">
                {variants
                  .slice()
                  .sort((a, b) => a.weight - b.weight || (a.style === 'italic' ? 1 : -1))
                  .map(v => (
                    <FontVariantRow
                      key={`${v.weight}-${v.style}`}
                      family={item.family ?? item.name}
                      variant={v}
                      fontFace={fontFaceUpload}
                      isEditing={isEditing}
                      onDelete={() => deleteVariant(item.id, v)}
                    />
                  ))}
              </div>

              {/* Add variant */}
              {isEditing && item.source === 'google' && (
                <div className="px-5 pb-4">
                  {addingVariantFor === item.id ? (
                    <AddVariantPicker
                      existing={variants}
                      onAdd={v => addVariant(item.id, v)}
                      onClose={() => setAddingVariantFor(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingVariantFor(item.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mt-2">
                      <Plus size={12} /> Ajouter une variante
                    </button>
                  )}
                </div>
              )}

              {/* Usage */}
              <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Usage</p>

                  {item.source === 'google' && item.family ? (
                    <>
                      <CodeBlock lang="HTML" code={`<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(item.family)}" rel="stylesheet" type="text/css">`} />
                      <CodeBlock lang="CSS" code={`font-family: "${item.family}", sans-serif;`} />
                    </>
                  ) : item.filename ? (
                    <>
                      <CodeBlock lang="CSS" code={`@font-face {\n  font-family: "${item.name}";\n  src: url("${item.filename}");\n}`} />
                      <CodeBlock lang="CSS" code={`font-family: "${item.name}", sans-serif;`} />
                    </>
                  ) : null}
                </div>
              </div>

            </div>
          );
        })}

        {/* Add font buttons */}
        {isEditing && (
          <div className="flex gap-3">
            {showAddGoogle ? (
              <div className="flex-1 relative">
                <div className="flex gap-2 border rounded-xl px-4 py-3 items-center" style={{ borderColor: 'var(--border)' }}>
                  <Type size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    autoFocus
                    className="flex-1 outline-none text-sm"
                    placeholder="Nom de la police (ex: Rubik, Playfair Display)"
                    value={googleFamily}
                    onChange={e => setGoogleFamily(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { addGoogleFont(); setSuggestions([]); }
                      if (e.key === 'Escape') { if (suggestions.length) setSuggestions([]); else setShowAddGoogle(false); }
                    }}
                  />
                  <button onClick={() => { addGoogleFont(); setSuggestions([]); }} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: brandColor }}>
                    Ajouter
                  </button>
                  <button onClick={() => { setShowAddGoogle(false); setSuggestions([]); }} className="text-xs px-3 py-1.5 rounded-lg border text-gray-500" style={{ borderColor: 'var(--border)' }}>
                    Annuler
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-lg overflow-hidden z-10" style={{ borderColor: 'var(--border)' }}>
                    {suggestions.map(name => (
                      <button
                        key={name}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                        style={{ borderColor: 'var(--border)' }}
                        onMouseDown={e => { e.preventDefault(); setGoogleFamily(name); setSuggestions([]); }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => setShowAddGoogle(true)}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                  style={{ borderColor: 'var(--border)' }}>
                  <Plus size={14} /> Google Fonts
                </button>
                <button onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                  style={{ borderColor: 'var(--border)' }}>
                  <Upload size={14} /> Uploader une police
                </button>
              </>
            )}
          </div>
        )}
        {isEditing && (
          <input ref={inputRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={e => e.target.files?.[0] && uploadFont(e.target.files[0])} />
        )}
      </div>
    </div>
  );
}
