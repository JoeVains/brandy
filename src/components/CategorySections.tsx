'use client';

import { useState } from 'react';
import { ArrowDownAZ, ChevronDown, ChevronUp, FolderPlus, GripVertical, Pencil, Trash2 } from 'lucide-react';
import type { IconCategory } from '@/types';
import EmojiPicker from './EmojiPicker';
import Select from './Select';

export const DEFAULT_CATEGORY_EMOJI = '📁';
const END_DROP = '__end';
const byAlpha = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' });

export interface CategoryPatch<T> {
  categories?: IconCategory[];
  items?: T[];
}

interface Props<T extends { id: string; categoryId?: string }> {
  items: T[];                // éléments à afficher (visibles)
  categories: IconCategory[];
  isEditing: boolean;
  brandColor: string;
  // Enregistre en une seule requête (le module envoie le PATCH). `items` est la liste complète.
  onSave: (patch: CategoryPatch<T>) => Promise<void>;
  // Contenu d'un groupe : l'appelant dessine sa grille / sa liste.
  renderGroup: (items: T[], category: IconCategory | null) => React.ReactNode;
  // Boutons supplémentaires dans l'en-tête (téléchargement du zip de la catégorie…).
  headerExtra?: (category: IconCategory | null, items: T[]) => React.ReactNode;
  // Glisser-déposer d'un élément vers un en-tête de catégorie (géré par l'appelant).
  itemDragging?: boolean;
  onDropItem?: (categoryId?: string) => void;
}

// Sections par catégorie (émoji, renommage, réorganisation, tri) réutilisables par plusieurs modules.
export default function CategorySections<T extends { id: string; categoryId?: string }>({
  items, categories, isEditing, brandColor, onSave, renderGroup, headerExtra, itemDragging, onDropItem,
}: Props<T>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [emojiFor, setEmojiFor] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [dragCatId, setDragCatId] = useState<string | null>(null);
  const [overCatId, setOverCatId] = useState<string | null>(null);

  const known = new Set(categories.map(c => c.id));
  const groups: { cat: IconCategory | null; items: T[] }[] = [
    { cat: null, items: items.filter(i => !i.categoryId || !known.has(i.categoryId)) },
    ...categories.map(c => ({ cat: c, items: items.filter(i => i.categoryId === c.id) })),
  ];
  const grouped = categories.length > 0;
  const ascending = categories.every((c, i) => i === 0 || byAlpha(categories[i - 1].name, c.name) <= 0);

  async function addCategory() {
    const cat: IconCategory = { id: crypto.randomUUID(), name: 'Nouvelle catégorie' };
    await onSave({ categories: [...categories, cat] });
    setEditingId(cat.id);
    setDraft(cat.name);
  }

  async function rename(id: string, name: string) {
    setEditingId(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSave({ categories: categories.map(c => c.id === id ? { ...c, name: trimmed } : c) });
  }

  async function move(id: string, dir: -1 | 1) {
    const i = categories.findIndex(c => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[i], next[j]] = [next[j], next[i]];
    await onSave({ categories: next });
  }

  async function remove(id: string) {
    // Les éléments de la catégorie supprimée repassent « sans catégorie ».
    const next = items.map(i => {
      if (i.categoryId !== id) return i;
      const { categoryId: _c, ...rest } = i;
      return rest as T;
    });
    await onSave({ categories: categories.filter(c => c.id !== id), items: next });
  }

  async function sort() {
    const dir = ascending ? -1 : 1;
    await onSave({ categories: [...categories].sort((a, b) => dir * byAlpha(a.name, b.name)) });
  }

  async function dropCategory(targetId: string) {
    const fromId = dragCatId;
    setDragCatId(null);
    setOverCatId(null);
    if (!fromId || fromId === targetId) return;
    const from = categories.find(c => c.id === fromId);
    if (!from) return;
    const rest = categories.filter(c => c.id !== fromId);
    if (targetId === END_DROP) { await onSave({ categories: [...rest, from] }); return; }
    const fromIdx = categories.findIndex(c => c.id === fromId);
    const toIdx = categories.findIndex(c => c.id === targetId);
    if (toIdx < 0) return;
    const at = rest.findIndex(c => c.id === targetId);
    rest.splice(fromIdx < toIdx ? at + 1 : at, 0, from);
    await onSave({ categories: rest });
  }

  const sortButton = isEditing && categories.length > 1 && (
    <button
      onClick={sort}
      title={ascending ? 'Trier les catégories de Z à A' : 'Trier les catégories de A à Z'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      style={{ borderColor: 'var(--border)' }}
    >
      <ArrowDownAZ size={13} />
      {ascending ? 'Trier les catégories Z → A' : 'Trier les catégories A → Z'}
    </button>
  );

  if (!grouped) {
    return (
      <div>
        {renderGroup(items, null)}
        {isEditing && (
          <button
            onClick={addCategory}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <FolderPlus size={13} />
            Ajouter une catégorie
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ cat, items: groupItems }) => {
        if (cat === null && groupItems.length === 0 && !isEditing) return null;
        const catIndex = cat ? categories.findIndex(c => c.id === cat.id) : -1;
        const dropItem = isEditing && itemDragging && onDropItem;
        return (
          <div
            key={cat?.id ?? 'none'}
            className="relative"
            style={{ opacity: cat && dragCatId === cat.id ? 0.4 : 1 }}
            onDragOver={isEditing && cat && dragCatId ? e => { e.preventDefault(); setOverCatId(cat.id); } : undefined}
            onDrop={isEditing && cat && dragCatId ? e => { e.preventDefault(); dropCategory(cat.id); } : undefined}
          >
            {cat && dragCatId && overCatId === cat.id && dragCatId !== cat.id && (
              <div
                className="absolute left-0 right-0 h-0.5 rounded-full z-10"
                style={{ background: brandColor, ...(categories.findIndex(c => c.id === dragCatId) < catIndex ? { bottom: -12 } : { top: -12 }) }}
              />
            )}
            <div
              className="flex items-center gap-2 mb-3 pb-1.5 border-b"
              style={{ borderColor: 'var(--border)' }}
              onDragOver={dropItem ? e => e.preventDefault() : undefined}
              onDrop={dropItem ? e => { e.preventDefault(); onDropItem?.(cat?.id); } : undefined}
            >
              {cat && isEditing && categories.length > 1 && (
                <span
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', cat.id); setDragCatId(cat.id); }}
                  onDragEnd={() => { setDragCatId(null); setOverCatId(null); }}
                  title="Glisser pour déplacer la catégorie"
                  className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 -ml-1"
                >
                  <GripVertical size={14} />
                </span>
              )}
              {cat && (isEditing ? (
                <button
                  onClick={e => setEmojiFor({ id: cat.id, rect: e.currentTarget.getBoundingClientRect() })}
                  title="Choisir un émoji"
                  className="text-base leading-none rounded-md px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {cat.emoji ?? DEFAULT_CATEGORY_EMOJI}
                </button>
              ) : (
                <span className="text-base leading-none">{cat.emoji ?? DEFAULT_CATEGORY_EMOJI}</span>
              ))}
              {cat && isEditing && editingId === cat.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onBlur={() => rename(cat.id, draft)}
                  onKeyDown={e => { if (e.key === 'Enter') rename(cat.id, draft); if (e.key === 'Escape') setEditingId(null); }}
                  className="text-sm font-semibold outline-none border-b bg-transparent text-gray-800 dark:text-gray-200"
                  style={{ borderColor: brandColor }}
                />
              ) : (
                <span
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                  onDoubleClick={() => { if (isEditing && cat) { setEditingId(cat.id); setDraft(cat.name); } }}
                >
                  {cat ? cat.name : 'Sans catégorie'}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">{groupItems.length}</span>
              {headerExtra?.(cat, groupItems)}
              {cat && isEditing && (
                <div className="ml-auto flex items-center gap-0.5 text-gray-400 dark:text-gray-500">
                  <button onClick={() => { setEditingId(cat.id); setDraft(cat.name); }} title="Renommer" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200"><Pencil size={12} /></button>
                  <button onClick={() => move(cat.id, -1)} disabled={catIndex === 0} title="Monter" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ChevronUp size={13} /></button>
                  <button onClick={() => move(cat.id, 1)} disabled={catIndex === categories.length - 1} title="Descendre" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ChevronDown size={13} /></button>
                  <button onClick={() => remove(cat.id)} title="Supprimer la catégorie (le contenu est conservé)" className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              )}
            </div>
            {renderGroup(groupItems, cat)}
          </div>
        );
      })}

      {isEditing && (
        <div
          className="relative flex items-center gap-2 flex-wrap pt-6 -mt-6"
          onDragOver={dragCatId ? e => { e.preventDefault(); setOverCatId(END_DROP); } : undefined}
          onDrop={dragCatId ? e => { e.preventDefault(); dropCategory(END_DROP); } : undefined}
        >
          {dragCatId && overCatId === END_DROP && (
            <div className="absolute left-0 right-0 top-3 h-0.5 rounded-full z-10" style={{ background: brandColor }} />
          )}
          <button
            onClick={addCategory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            <FolderPlus size={13} />
            Ajouter une catégorie
          </button>
          {sortButton}
        </div>
      )}

      {emojiFor && (
        <EmojiPicker
          anchorRect={emojiFor.rect}
          onSelect={emoji => onSave({ categories: categories.map(c => c.id === emojiFor.id ? { ...c, emoji } : c) })}
          onClose={() => setEmojiFor(null)}
        />
      )}
    </div>
  );
}

// Menu « Catégorie » d'un élément (édition) : sans catégorie ou l'une des catégories existantes.
export function CategorySelect({ categories, value, onChange, className = 'text-xs' }: {
  categories: IconCategory[];
  value?: string;
  onChange: (categoryId: string | undefined) => void;
  className?: string;
}) {
  if (categories.length === 0) return null;
  return (
    <Select
      className={className}
      title="Catégorie"
      value={value && categories.some(c => c.id === value) ? value : ''}
      onChange={v => onChange(v || undefined)}
      options={[{ value: '', label: 'Sans catégorie' }, ...categories.map(c => ({ value: c.id, label: `${c.emoji ?? DEFAULT_CATEGORY_EMOJI} ${c.name}` }))]}
    />
  );
}
