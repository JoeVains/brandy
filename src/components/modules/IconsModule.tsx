'use client';

import { useEffect, useRef, useState } from 'react';
import type { Module, IconItem, IconCategory, AssetStatus } from '@/types';
import { Plus, Trash2, Download, Check, X, Search, ChevronDown, ChevronUp, Pencil, FolderPlus, RotateCcw, ArrowDownAZ, ArrowUpAZ, GripVertical, FolderUp } from 'lucide-react';
import { trackDownload } from '@/lib/trackDownload';
import { categoryFolders, iconZipPath } from '@/lib/iconCategories';
import { isPublished, restoreVersion, statusOf, visibleItems } from '@/lib/assetStatus';
import ModuleDescription from './ModuleDescription';
import Select from '../Select';
import EmojiPicker from '../EmojiPicker';
import { StatusBadge } from '../AssetStatus';
import { DEFAULT_CATEGORY_EMOJI } from '../CategorySections';
import IconInspector from './icons/IconInspector';
import BulkExportMenu from './icons/BulkExportMenu';
import { renderRaster, saveBlob, TintedImg, type BulkFormat } from './icons/rendering';
import { normalizeHex } from './icons/colorUtils';
import { TintControl, useBrandPalettes } from './icons/palettes';
import { readDirectory, readZip, type ImportItem } from './icons/importFiles';
import { byAlpha } from './icons/utils';

const END_DROP = '__end';

interface Props {
  module: Module;
  brandColor: string;
  onUpdate: (updated: Module) => void;
  isEditing?: boolean;
  shareToken?: string;
}

export default function IconsModule({ module, brandColor, onUpdate, isEditing, shareToken }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [exportMenu, setExportMenu] = useState<string | null>(null)  // 'all' | 'selection' | 'cat:<id>' (id vide = sans catégorie);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  // Couleur globale : enregistrée dans le module (valeur de départ pour tous les visiteurs) ; en lecture, la modifier n'est qu'un aperçu.
  const [tintInput, setTintInput] = useState(module.iconColor ?? '');
  const [catTintInputs, setCatTintInputs] = useState<Record<string, string>>({});
  // Nuancier choisi : conservé à la fermeture du menu et partagé avec l'inspecteur.
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const palettes = useBrandPalettes(module.brandId, shareToken);
  const categories = module.iconCategories ?? [];
  const tint = normalizeHex(tintInput);
  // Couleur d'une catégorie (si définie) prioritaire sur la couleur globale.
  // Mémorisée dans la catégorie ; la saisie en cours (catTintInputs) prime tant qu'elle n'est pas enregistrée.
  const catInput = (cat: IconCategory) => catTintInputs[cat.id] ?? cat.color ?? '';
  const catTints: Record<string, string> = {};
  for (const c of categories) { const col = normalizeHex(catInput(c)); if (col) catTints[c.id] = col; }
  const colorFor = (item: IconItem): string | null => (item.categoryId && catTints[item.categoryId]) || tint;
  const uploadTarget = useRef<string | undefined>(undefined);
  const colorTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const categoriesRef = useRef<IconCategory[]>([]);
  // Dernière liste de catégories, lue par les enregistrements différés (délai de 400 ms).
  useEffect(() => { categoriesRef.current = categories; });
  const gridRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<string | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [emojiPicker, setEmojiPicker] = useState<{ catId: string; rect: DOMRect } | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const [dragCatId, setDragCatId] = useState<string | null>(null);
  const [overCatId, setOverCatId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catDraft, setCatDraft] = useState('');
  const items = module.iconItems ?? [];
  const [showObsolete, setShowObsolete] = useState(false);
  const obsoleteCount = items.filter(i => statusOf(i) === 'obsolete').length;
  const shown = visibleItems(items, !!isEditing, showObsolete);
  const filtered = search.trim() ? shown.filter(i => [i.name, ...(i.keywords ?? [])].some(t => t.toLowerCase().includes(search.toLowerCase()))) : shown;

  async function patchModule(patch: Partial<Module>) {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const updated = await res.json();
    onUpdate(updated);
    return updated as Module;
  }

  function pickFiles(categoryId?: string) {
    uploadTarget.current = categoryId;
    inputRef.current?.click();
  }

  // --- Import de fichiers SVG : sélection, dossiers (sous-dossiers = catégories) et archives .zip ---

  // Une icône à importer + le dossier d'origine (devient sa catégorie).
  async function importItems(list: ImportItem[], defaultCategoryId?: string) {
    const svgs = list.filter(i => /\.svg$/i.test(i.file.name) && !i.file.name.startsWith('.'));
    if (svgs.length === 0) { alert('Aucun fichier SVG trouvé.'); return; }
    setImporting({ done: 0, total: svgs.length });
    try {
      const before = new Set(items.map(i => i.id));
      let updated = module;
      const added: { id: string; folder?: string }[] = [];
      for (const it of svgs) {
        const fd = new FormData();
        fd.append('file', it.file);
        fd.append('slot', 'icon');
        fd.append('name', it.file.name);
        const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
        if (res.ok) {
          updated = await res.json();
          const list = updated.iconItems ?? [];
          const last = list[list.length - 1];
          if (last && !before.has(last.id)) { before.add(last.id); added.push({ id: last.id, folder: it.folder }); }
        }
        setImporting(p => p && { ...p, done: p.done + 1 });
      }

      // Catégories : réutilise celles qui existent déjà (même nom), crée les autres.
      const cats = [...(updated.iconCategories ?? [])];
      const catFor = (name: string) => {
        const found = cats.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (found) return found.id;
        const created: IconCategory = { id: crypto.randomUUID(), name };
        cats.push(created);
        return created.id;
      };
      const byId = new Map(added.map(a => [a.id, a.folder]));
      const iconItems = (updated.iconItems ?? []).map(i => {
        if (!byId.has(i.id)) return i;
        const folder = byId.get(i.id);
        const categoryId = folder ? catFor(folder) : defaultCategoryId;
        return categoryId ? { ...i, categoryId } : i;
      });
      const res = await fetch(`/api/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ iconItems, iconCategories: cats }),
      });
      onUpdate(await res.json());
    } finally {
      setImporting(null);
    }
  }

  // Sélecteur de fichiers classique (.svg et .zip), éventuellement depuis une catégorie.
  async function uploadIcons(files: FileList) {
    const categoryId = uploadTarget.current;
    const list: ImportItem[] = [];
    for (const file of Array.from(files)) {
      if (/\.zip$/i.test(file.name)) list.push(...await readZip(file));
      else list.push({ file });
    }
    await importItems(list, categoryId);
  }

  // Sélecteur de dossier : le dossier choisi est la racine, ses sous-dossiers deviennent des catégories.
  async function importFolder(files: FileList) {
    const list: ImportItem[] = Array.from(files).map(file => {
      const segs = (file.webkitRelativePath || file.name).split('/').slice(1, -1);
      return { file, folder: segs.length ? segs.join(' / ') : undefined };
    });
    await importItems(list);
  }

  // Glisser-déposer de fichiers, dossiers et zips depuis le Finder/l'Explorateur.
  async function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setFileDrag(false);
    // Les entrées doivent être lues de façon synchrone, avant le premier await.
    const dropped = Array.from(e.dataTransfer.items)
      .filter(i => i.kind === 'file')
      .map(i => ({ entry: i.webkitGetAsEntry?.() ?? null, file: i.getAsFile() }));
    const list: ImportItem[] = [];
    for (const { entry, file } of dropped) {
      if (entry?.isDirectory) list.push(...await readDirectory(entry as FileSystemDirectoryEntry, []));
      else if (file && /\.zip$/i.test(file.name)) list.push(...await readZip(file));
      else if (file) list.push({ file });
    }
    await importItems(list);
  }

  // Déplace une icône avant l'index `toIdx` (items.length = à la fin) et l'affecte à une catégorie.
  async function moveItem(fromIdx: number, toIdx: number, categoryId?: string) {
    const moved: IconItem = { ...items[fromIdx] };
    if (categoryId) moved.categoryId = categoryId; else delete moved.categoryId;
    const reordered = items.filter((_, i) => i !== fromIdx);
    reordered.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved);
    await patchModule({ iconItems: reordered });
  }

  // Enregistre la couleur d'une catégorie (avec délai : le sélecteur natif envoie un flux de valeurs).
  function setCategoryColor(id: string, value: string) {
    setCatTintInputs(prev => ({ ...prev, [id]: value }));
    clearTimeout(colorTimers.current[id]);
    colorTimers.current[id] = setTimeout(() => {
      const color = normalizeHex(value);
      if (value && !color) return;
      patchModule({
        iconCategories: categoriesRef.current.map(c => {
          if (c.id !== id) return c;
          const { color: _old, ...rest } = c;
          return color ? { ...rest, color } : rest;
        }),
      });
    }, 400);
  }

  // Saisie de la couleur globale ; elle n'est mémorisée qu'en mode édition (avec délai : le sélecteur natif envoie un flux de valeurs).
  function setGlobalTint(value: string) {
    setTintInput(value);
    if (!isEditing) return;
    clearTimeout(colorTimers.current['__global']);
    colorTimers.current['__global'] = setTimeout(() => {
      const color = normalizeHex(value);
      if (value && !color) return;
      patchModule({ iconColor: color ?? null });
    }, 400);
  }

  // Rétablit les couleurs d'origine : couleur globale et couleurs de toutes les catégories.
  async function resetColors() {
    Object.values(colorTimers.current).forEach(clearTimeout);
    setTintInput('');
    if (isEditing && module.iconColor) await patchModule({ iconColor: null });
    setCatTintInputs(Object.fromEntries(categories.map(c => [c.id, ''])));
    if (categories.some(c => c.color)) {
      await patchModule({ iconCategories: categories.map(({ color: _c, ...rest }) => rest) });
    }
  }

  async function setItemStatus(id: string, status: AssetStatus) {
    await patchModule({
      iconItems: items.map(i => {
        if (i.id !== id) return i;
        const { status: _old, ...rest } = i;
        return status === 'validated' ? rest : { ...rest, status };
      }),
    });
  }

  async function setSelectionStatus(status: AssetStatus) {
    await patchModule({
      iconItems: items.map(i => {
        if (!selected.has(i.id)) return i;
        const { status: _old, ...rest } = i;
        return status === 'validated' ? rest : { ...rest, status };
      }),
    });
  }

  // Remplace le fichier d'une icône ; l'ancienne version est conservée dans l'historique.
  async function replaceIconFile(id: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('slot', 'icon');
    fd.append('replaceItemId', id);
    const res = await fetch(`/api/modules/${module.id}/upload`, { method: 'POST', body: fd });
    if (res.ok) onUpdate(await res.json());
    else alert('Le remplacement du fichier a échoué.');
  }

  async function restoreIconVersion(id: string, index: number) {
    await patchModule({ iconItems: items.map(i => i.id === id ? restoreVersion(i, index) : i) });
  }

  async function updateKeywords(id: string, keywords: string[]) {
    await patchModule({
      iconItems: items.map(i => {
        if (i.id !== id) return i;
        const { keywords: _old, ...rest } = i;
        return keywords.length ? { ...rest, keywords } : rest;
      }),
    });
  }

  async function addCategory() {
    const cat: IconCategory = { id: crypto.randomUUID(), name: 'Nouvelle catégorie' };
    await patchModule({ iconCategories: [...categories, cat] });
    setEditingCatId(cat.id);
    setCatDraft(cat.name);
  }

  async function setCategoryEmoji(id: string, emoji: string) {
    await patchModule({ iconCategories: categories.map(c => c.id === id ? { ...c, emoji } : c) });
  }

  async function renameCategory(id: string, name: string) {
    setEditingCatId(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    await patchModule({ iconCategories: categories.map(c => c.id === id ? { ...c, name: trimmed } : c) });
  }

  async function moveCategory(id: string, dir: -1 | 1) {
    const i = categories.findIndex(c => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[i], next[j]] = [next[j], next[i]];
    await patchModule({ iconCategories: next });
  }

  // Glisser-déposer d'une catégorie (avec son contenu) : elle se place avant/après la cible selon le sens du déplacement.
  async function dropCategory(targetId: string) {
    const fromId = dragCatId;
    setDragCatId(null);
    setOverCatId(null);
    if (!fromId || fromId === targetId) return;
    const fromIdx = categories.findIndex(c => c.id === fromId);
    if (fromIdx < 0) return;
    // Cible spéciale : zone sous la dernière catégorie → dernière position.
    if (targetId === END_DROP) {
      await patchModule({ iconCategories: [...categories.filter(c => c.id !== fromId), categories[fromIdx]] });
      return;
    }
    const toIdx = categories.findIndex(c => c.id === targetId);
    if (toIdx < 0) return;
    const next = categories.filter(c => c.id !== fromId);
    next.splice(fromIdx < toIdx ? next.findIndex(c => c.id === targetId) + 1 : next.findIndex(c => c.id === targetId), 0, categories[fromIdx]);
    await patchModule({ iconCategories: next });
  }

  // Déjà classées de A à Z → le clic inverse (Z à A) ; sinon A à Z.
  const categoriesAscending = categories.every((c, i) => i === 0 || byAlpha(categories[i - 1].name, c.name) <= 0);

  async function sortCategories() {
    const dir = categoriesAscending ? -1 : 1;
    await patchModule({ iconCategories: [...categories].sort((a, b) => dir * byAlpha(a.name, b.name)) });
  }

  // Trie les icônes d'une catégorie (ou « sans catégorie ») : A→Z, puis Z→A si déjà triées. Les autres catégories ne bougent pas.
  function itemsAscending(list: IconItem[]) {
    return list.every((it, i) => i === 0 || byAlpha(list[i - 1].name, it.name) <= 0);
  }

  async function sortCategoryItems(groupItems: IconItem[]) {
    const dir = itemsAscending(groupItems) ? -1 : 1;
    const sorted = [...groupItems].sort((a, b) => dir * byAlpha(a.name, b.name));
    const ids = new Set(groupItems.map(i => i.id));
    let k = 0;
    await patchModule({ iconItems: items.map(i => (ids.has(i.id) ? sorted[k++] : i)) });
  }

  async function deleteCategory(id: string) {
    // Les icônes de la catégorie supprimée repassent « sans catégorie ».
    const iconItems = items.map(i => {
      if (i.categoryId !== id) return i;
      const { categoryId: _removed, ...rest } = i;
      return rest;
    });
    await patchModule({ iconCategories: categories.filter(c => c.id !== id), iconItems });
  }

  // Crée une catégorie et y range directement la sélection.
  async function assignSelectionToNewCategory() {
    const cat: IconCategory = { id: crypto.randomUUID(), name: 'Nouvelle catégorie' };
    const iconItems = items.map(i => selected.has(i.id) ? { ...i, categoryId: cat.id } : i);
    await patchModule({ iconCategories: [...categories, cat], iconItems });
    setEditingCatId(cat.id);
    setCatDraft(cat.name);
  }

  async function assignSelection(categoryId: string) {
    const iconItems = items.map(i => {
      if (!selected.has(i.id)) return i;
      const { categoryId: _old, ...rest } = i;
      return categoryId ? { ...rest, categoryId } : rest;
    });
    await patchModule({ iconItems });
  }

  async function deleteIcon(id: string) {
    const newItems = items.filter(i => i.id !== id);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ iconItems: newItems }),
    });
    onUpdate(await res.json());
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  async function renameIcon(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) { setEditingId(null); return; }
    const newItems = items.map(i => i.id === id ? { ...i, name: trimmed } : i);
    const res = await fetch(`/api/modules/${module.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ iconItems: newItems }),
    });
    onUpdate(await res.json());
    setEditingId(null);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  // Clic sur une icône avec modificateur : Maj = plage depuis la dernière icône cochée, Cmd/Ctrl = bascule.
  // Renvoie true si le clic a été traité comme une sélection.
  function selectWithModifier(id: string, e: React.MouseEvent): boolean {
    if (e.shiftKey && anchorRef.current) {
      // Ordre d'affichage : « sans catégorie » d'abord, puis chaque catégorie.
      const known = new Set(categories.map(c => c.id));
      const order = [
        ...filtered.filter(i => !i.categoryId || !known.has(i.categoryId)),
        ...categories.flatMap(c => filtered.filter(i => i.categoryId === c.id)),
      ].map(i => i.id);
      const a = order.indexOf(anchorRef.current);
      const b = order.indexOf(id);
      if (a >= 0 && b >= 0) {
        const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
        setSelected(prev => new Set([...prev, ...range]));
        return true;
      }
    }
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleSelect(id);
      anchorRef.current = id;
      return true;
    }
    return false;
  }

  // Cadre de sélection : glisser depuis une zone vide de la grille.
  function startMarquee(e: React.MouseEvent) {
    if (e.button !== 0 || !gridRef.current) return;
    if ((e.target as HTMLElement).closest('[data-icon-card], button, input, [draggable="true"]')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const base = additive ? new Set(selected) : new Set<string>();
    let active = false;

    const move = (ev: MouseEvent) => {
      if (!active && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
      active = true;
      const grid = gridRef.current;
      if (!grid) return;
      const box = grid.getBoundingClientRect();
      const left = Math.min(startX, ev.clientX);
      const top = Math.min(startY, ev.clientY);
      const right = Math.max(startX, ev.clientX);
      const bottom = Math.max(startY, ev.clientY);
      setMarquee({ x: left - box.left, y: top - box.top, w: right - left, h: bottom - top });
      const hit = new Set(base);
      grid.querySelectorAll<HTMLElement>('[data-icon-card]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.left < right && r.right > left && r.top < bottom && r.bottom > top && el.dataset.iconId) hit.add(el.dataset.iconId);
      });
      setSelected(hit);
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      setMarquee(null);
      // Simple clic dans le vide : on désélectionne tout.
      if (!active && !additive) setSelected(new Set());
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  function downloadSingle(filename: string, name: string, itemId: string) {
    trackDownload(module.id, [itemId]);
    const a = document.createElement('a');
    a.href = `/uploads/${filename}`;
    a.download = `${name}.svg`;
    a.click();
  }

  async function downloadZip(format: BulkFormat, size: number, ids?: string[], category?: { name: string }) {
    setDownloading(true);
    try {
      // Zip d'une seule catégorie : icônes à plat à la racine, nommé d'après la catégorie.
      const zipName = `${module.title || 'icons'}${category ? ` - ${category.name.replace(/\//g, '-')}` : ''}.zip`;
      if (format === 'png' || format === 'webp') {
        // Rastérisation côté client (canvas), puis zip dans le navigateur.
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        const folders = category ? new Map<string, string>() : categoryFolders(categories);
        const included: string[] = [];
        for (const item of items.filter(i => ids?.length ? ids.includes(i.id) : isPublished(i))) {
          const blob = await renderRaster(item.filename, size, colorFor(item), format);
          if (blob) { zip.file(iconZipPath(item, folders, `${item.name}-${size}.${format}`), blob); included.push(item.id); }
        }
        trackDownload(module.id, included, !ids?.length);
        saveBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), zipName);
      } else {
        const params = new URLSearchParams({ format });
        if (ids?.length) params.set('ids', ids.join(','));
        if (tint) params.set('color', tint);
        if (category) params.set('flat', '1');
        const res = await fetch(shareToken
          ? `/api/share/${shareToken}/download?${new URLSearchParams({ module: module.id })}&${params}`
          : `/api/modules/${module.id}/download?${params}`);
        if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
        saveBlob(await res.blob(), zipName);
      }
      setExportMenu(null);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Le téléchargement a échoué.');
    } finally {
      setDownloading(false);
    }
  }

  function renderCard(item: IconItem) {
          const idx = items.indexOf(item);
          const isSelected = selected.has(item.id);
          return (
            <div
              key={item.id}
              data-item-id={item.id}
              className="relative group flex flex-col items-center gap-2"
              style={{ opacity: dragIdx === idx ? 0.4 : statusOf(item) === 'obsolete' ? 0.55 : 1 }}
              draggable={isEditing}
              onDragStart={isEditing ? e => { e.dataTransfer.effectAllowed = 'move'; setDragIdx(idx); } : undefined}
              onDragOver={isEditing ? e => { e.preventDefault(); setDragOverIdx(idx); } : undefined}
              onDragLeave={isEditing ? () => setDragOverIdx(null) : undefined}
              onDrop={isEditing ? e => { e.preventDefault(); e.stopPropagation(); if (dragIdx !== null && dragIdx !== idx) moveItem(dragIdx, idx, item.categoryId); setDragIdx(null); setDragOverIdx(null); } : undefined}
              onDragEnd={isEditing ? () => { setDragIdx(null); setDragOverIdx(null); } : undefined}
            >
              {dragOverIdx === idx && dragIdx !== null && dragIdx !== idx && (
                <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full z-10" style={{ background: brandColor }} />
              )}
              {/* Card */}
              <div
                onMouseDown={e => { if (e.shiftKey) e.preventDefault(); }}
                onClick={e => { if (!selectWithModifier(item.id, e)) setInspectedId(item.id); }}
                data-icon-card
                data-icon-id={item.id}
                className="relative w-full aspect-square rounded-xl border flex items-center justify-center p-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer transition-all"
                style={{
                  borderColor: isSelected ? brandColor : 'var(--border)',
                  background: isSelected ? `${brandColor}10` : '#f9fafb',
                  boxShadow: isSelected ? `0 0 0 2px ${brandColor}` : undefined,
                }}
              >
                <TintedImg filename={item.filename} alt={item.name} color={colorFor(item)} />

                {statusOf(item) !== 'validated' && (
                  <StatusBadge status={statusOf(item)} className="absolute bottom-1.5 left-1.5" />
                )}

                {/* Selection checkbox */}
                <div
                  onClick={e => { e.stopPropagation(); if (!selectWithModifier(item.id, e)) { toggleSelect(item.id); anchorRef.current = item.id; } }}
                  className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                  style={{ background: isSelected ? brandColor : 'var(--card-bg)', borderColor: isSelected ? brandColor : '#d1d5db' }}>
                  {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                </div>

                {/* Action buttons */}
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); downloadSingle(item.filename, item.name, item.id); }}
                    className="p-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100"
                  >
                    <Download size={11} />
                  </button>
                  {isEditing && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteIcon(item.id); }}
                      className="p-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              {isEditing && editingId === item.id ? (
                <input
                  autoFocus
                  className="w-full text-center text-xs outline-none border-b"
                  style={{ borderColor: brandColor }}
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={() => renameIcon(item.id, nameDraft)}
                  onKeyDown={e => { if (e.key === 'Enter') renameIcon(item.id, nameDraft); if (e.key === 'Escape') setEditingId(null); }}
                />
              ) : (
                <span
                  className="text-xs text-gray-500 dark:text-gray-300 truncate w-full text-center"
                  title={item.name}
                  onDoubleClick={() => { if (isEditing) { setEditingId(item.id); setNameDraft(item.name); } }}
                >
                  {item.name}
                </span>
              )}
            </div>
          );
  }

  // Menu « Ranger dans… » (sélection → catégorie), affiché près de la barre d'outils et des catégories.
  function renderMoveMenu() {
    return (
      <Select
        direction="up"
        value=""
        placeholder="Ranger dans…"
        title="Ranger la sélection dans une catégorie"
        className="text-xs"
        onChange={v => {
          if (v === '__new') assignSelectionToNewCategory();
          else assignSelection(v === '__none' ? '' : v);
        }}
        options={[
          { value: '__new', label: '+ Nouvelle catégorie' },
          ...(categories.length > 0 ? [{ value: '__none', label: 'Sans catégorie' }] : []),
          ...categories.map(c => ({ value: c.id, label: c.name })),
        ]}
      />
    );
  }

  function renderSortButton() {
    if (!isEditing || categories.length < 2) return null;
    return (
      <button
        onClick={sortCategories}
        title={categoriesAscending ? 'Trier les catégories de Z à A' : 'Trier les catégories de A à Z'}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        style={{ borderColor: 'var(--border)' }}
      >
        <ArrowDownAZ size={13} />
        {categoriesAscending ? 'Trier les catégories Z → A' : 'Trier les catégories A → Z'}
      </button>
    );
  }

  function renderGroups() {
    const known = new Set(categories.map(c => c.id));
    const groups: { cat: IconCategory | null; items: IconItem[] }[] = [
      { cat: null, items: filtered.filter(i => !i.categoryId || !known.has(i.categoryId)) },
      ...categories.map(c => ({ cat: c, items: filtered.filter(i => i.categoryId === c.id) })),
    ];
    const grouped = categories.length > 0;
    const dropToEnd = (catId?: string) => (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIdx !== null) moveItem(dragIdx, items.length, catId);
      setDragIdx(null); setDragOverIdx(null);
    };

    return (
      <div ref={gridRef} className="space-y-6 relative" onMouseDown={startMarquee}>
        {marquee && (
          <div
            className="absolute z-20 rounded-sm border pointer-events-none"
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, borderColor: brandColor, background: `${brandColor}20` }}
          />
        )}
        {filtered.length === 0 && search && (
          <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Aucune icône ne correspond à « {search} »</div>
        )}
        {groups.map(({ cat, items: groupItems }) => {
          // « Sans catégorie » n'apparaît que s'il contient des icônes (ou en édition) ; pendant une recherche, les groupes vides sont masqués.
          if (grouped && cat === null && groupItems.length === 0 && !isEditing) return null;
          if (search && groupItems.length === 0) return null;
          const catIndex = cat ? categories.findIndex(c => c.id === cat.id) : -1;
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
                  style={{
                    background: brandColor,
                    ...(categories.findIndex(c => c.id === dragCatId) < catIndex ? { bottom: -12 } : { top: -12 }),
                  }}
                />
              )}
              {grouped && (
                <div
                  className="flex items-center gap-2 mb-3 pb-1.5 border-b"
                  style={{ borderColor: 'var(--border)' }}
                  onDragOver={isEditing ? e => e.preventDefault() : undefined}
                  onDrop={isEditing ? dropToEnd(cat?.id) : undefined}
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
                      onClick={e => setEmojiPicker({ catId: cat.id, rect: e.currentTarget.getBoundingClientRect() })}
                      title="Choisir un émoji"
                      className="text-base leading-none rounded-md px-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {cat.emoji ?? DEFAULT_CATEGORY_EMOJI}
                    </button>
                  ) : (
                    <span className="text-base leading-none">{cat.emoji ?? DEFAULT_CATEGORY_EMOJI}</span>
                  ))}
                  {cat && isEditing && editingCatId === cat.id ? (
                    <input
                      autoFocus
                      value={catDraft}
                      onChange={e => setCatDraft(e.target.value)}
                      onBlur={() => renameCategory(cat.id, catDraft)}
                      onKeyDown={e => { if (e.key === 'Enter') renameCategory(cat.id, catDraft); if (e.key === 'Escape') setEditingCatId(null); }}
                      className="text-sm font-semibold outline-none border-b bg-transparent text-gray-800 dark:text-gray-200"
                      style={{ borderColor: brandColor }}
                    />
                  ) : (
                    <span
                      className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                      onDoubleClick={() => { if (isEditing && cat) { setEditingCatId(cat.id); setCatDraft(cat.name); } }}
                    >
                      {cat ? cat.name : 'Sans catégorie'}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">{groupItems.length}</span>
                  {cat && !shareToken && (
                    <TintControl
                      compact
                      value={catInput(cat)}
                      onChange={v => setCategoryColor(cat.id, v)}
                      palettes={palettes}
                      paletteId={paletteId}
                      onPaletteChange={setPaletteId}
                      title="Couleur des icônes de cette catégorie (hexadécimal)"
                    />
                  )}
                  {(() => {
                    const catItems = items.filter(i => isPublished(i) && (cat ? i.categoryId === cat.id : !i.categoryId || !known.has(i.categoryId)));
                    if (catItems.length === 0) return null;
                    const key = `cat:${cat?.id ?? ''}`;
                    const folderName = cat ? categoryFolders(categories).get(cat.id)! : 'Sans catégorie';
                    return (
                      <div className="relative">
                        <button
                          data-bulk-trigger
                          onClick={() => setExportMenu(m => m === key ? null : key)}
                          disabled={downloading}
                          title="Télécharger cette catégorie (.zip)"
                          className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50"
                        >
                          <Download size={12} />
                        </button>
                        {exportMenu === key && (
                          <div className="absolute left-0 top-full">
                            <BulkExportMenu
                              align="left"
                              label={`${cat?.name ?? 'Sans catégorie'} (${catItems.length} icône${catItems.length > 1 ? 's' : ''})`}
                              busy={downloading}
                              onClose={() => setExportMenu(null)}
                              onConfirm={(format, size) => downloadZip(format, size, catItems.map(i => i.id), { name: folderName })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {isEditing && groupItems.length > 1 && (() => {
                    const asc = itemsAscending(groupItems);
                    return (
                      <button
                        onClick={() => sortCategoryItems(groupItems)}
                        title={asc ? 'Trier les icônes de Z à A' : 'Trier les icônes de A à Z'}
                        className={`ml-auto p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200`}
                      >
                        {asc ? <ArrowUpAZ size={13} /> : <ArrowDownAZ size={13} />}
                      </button>
                    );
                  })()}
                  {cat && isEditing && (
                    <div className="flex items-center gap-0.5 text-gray-400 dark:text-gray-500">
                      <button onClick={() => { setEditingCatId(cat.id); setCatDraft(cat.name); }} title="Renommer" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200"><Pencil size={12} /></button>
                      <button onClick={() => moveCategory(cat.id, -1)} disabled={catIndex === 0} title="Monter" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ChevronUp size={13} /></button>
                      <button onClick={() => moveCategory(cat.id, 1)} disabled={catIndex === categories.length - 1} title="Descendre" className="p-1 rounded hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"><ChevronDown size={13} /></button>
                      <button onClick={() => deleteCategory(cat.id)} title="Supprimer la catégorie (les icônes sont conservées)" className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
                {groupItems.map(renderCard)}
                {isEditing && dragIdx !== null && (
                  <div
                    className="relative min-h-[24px]"
                    onDragOver={e => { e.preventDefault(); setDragOverIdx(items.length); }}
                    onDrop={dropToEnd(cat?.id)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  />
                )}
                {isEditing && (
                  <button
                    onClick={() => pickFiles(cat?.id)}
                    className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:border-gray-600 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Plus size={20} />
                    <span className="text-xs">Ajouter</span>
                  </button>
                )}
              </div>
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
            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={!!importing}
              title="Les sous-dossiers deviennent des catégories"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
            >
              <FolderUp size={13} />
              Importer un dossier
            </button>
            {renderSortButton()}
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0 && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300 dark:text-gray-500">
        <span className="text-2xl">❖</span>
        <span className="text-sm">Aucune icône</span>
      </div>
    );
  }

  const hasSelection = selected.size > 0;

  const isFileDrag = (e: React.DragEvent) => isEditing && e.dataTransfer.types.includes('Files');

  return (
    <div
      className="relative"
      onDragOver={e => { if (isFileDrag(e)) { e.preventDefault(); setFileDrag(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFileDrag(false); }}
      onDrop={e => { if (isFileDrag(e)) handleFileDrop(e); }}
    >
      {fileDrag && (
        <div className="absolute inset-0 z-40 rounded-xl border-2 border-dashed flex items-center justify-center text-sm font-medium pointer-events-none"
          style={{ borderColor: brandColor, background: `${brandColor}14`, color: brandColor }}>
          Déposez des SVG, des dossiers ou des .zip
        </div>
      )}
      {importing && (
        <div className="mb-3 px-3 py-2 rounded-lg border text-xs text-gray-600 dark:text-gray-300" style={{ borderColor: 'var(--border)' }}>
          Import en cours… {importing.done} / {importing.total}
          <div className="mt-1.5 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className="h-full transition-all" style={{ width: `${(importing.done / importing.total) * 100}%`, background: brandColor }} />
          </div>
        </div>
      )}
      {/* Description */}
      <ModuleDescription
        moduleId={module.id}
        brandId={module.brandId}
        field="iconDescription"
        value={module.iconDescription}
        isEditing={isEditing}
        onUpdate={desc => onUpdate({ ...module, iconDescription: desc })}
      />

      {/* Search */}
      {items.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border outline-none bg-white dark:bg-gray-900 transition-colors focus:border-gray-400 dark:border-gray-600"
            style={{ borderColor: 'var(--border)' }}
            placeholder="Rechercher une icône…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      {items.length > 0 && (
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <TintControl
              value={tintInput}
              onChange={setGlobalTint}
              palettes={palettes}
              paletteId={paletteId}
              onPaletteChange={setPaletteId}
              title="Couleur des icônes (hexadécimal)"
            />
            {(tintInput || categories.some(c => catInput(c))) && (
              <button
                onClick={resetColors}
                title="Rétablir les couleurs d'origine de toutes les icônes"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <RotateCcw size={12} />
                Réinitialiser les couleurs
              </button>
            )}
            {renderSortButton()}
            {!isEditing && obsoleteCount > 0 && (
              <button
                onClick={() => setShowObsolete(o => !o)}
                className="px-2 py-1.5 rounded-lg border text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                {showObsolete ? 'Masquer' : 'Afficher'} les obsolètes ({obsoleteCount})
              </button>
            )}
          </div>
          <div className="relative flex items-center gap-2">
            {hasSelection && (
              <button
                data-bulk-trigger
                onClick={() => setExportMenu(m => m === 'selection' ? null : 'selection')}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
                style={{ background: brandColor }}
              >
                <Download size={12} />
                Télécharger la sélection ({selected.size})
              </button>
            )}
            <button
              data-bulk-trigger
              onClick={() => setExportMenu(m => m === 'all' ? null : 'all')}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
            >
              <Download size={12} />
              {downloading ? 'Génération…' : 'Tout télécharger (.zip)'}
            </button>
            {(exportMenu === 'all' || exportMenu === 'selection') && (
              <BulkExportMenu
                label={exportMenu === 'selection' ? `Sélection (${selected.size} icône${selected.size > 1 ? 's' : ''})` : `Toutes les icônes (${items.length})`}
                busy={downloading}
                onClose={() => setExportMenu(null)}
                onConfirm={(format, size) => downloadZip(format, size, exportMenu === 'selection' ? [...selected] : undefined)}
              />
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {renderGroups()}

      <input ref={inputRef} type="file" accept=".svg,.zip" multiple className="hidden"
        onChange={e => { if (e.target.files) uploadIcons(e.target.files); e.target.value = ''; }} />
      <input ref={folderInputRef} type="file" multiple className="hidden"
        {...({ webkitdirectory: '' } as object)}
        onChange={e => { if (e.target.files) importFolder(e.target.files); e.target.value = ''; }} />

      {/* Barre de sélection flottante : reste visible en bas de l'écran pendant qu'on fait défiler le module. */}
      {hasSelection && (
        <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none mt-4">
          <div
            className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-xl"
            style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
          >
            <span className="text-xs text-gray-600 dark:text-gray-300">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
            {isEditing && renderMoveMenu()}
            {isEditing && (
              <Select
                direction="up"
                value=""
                placeholder="Statut…"
                title="Changer le statut de la sélection"
                className="text-xs"
                onChange={v => setSelectionStatus(v as AssetStatus)}
                options={[
                  { value: 'draft', label: 'Brouillon' },
                  { value: 'validated', label: 'Validé' },
                  { value: 'obsolete', label: 'Obsolète' },
                ]}
              />
            )}
            <button onClick={() => setSelected(new Set())}
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <X size={12} /> Désélectionner
            </button>
          </div>
        </div>
      )}

      {emojiPicker && (
        <EmojiPicker
          anchorRect={emojiPicker.rect}
          onSelect={emoji => setCategoryEmoji(emojiPicker.catId, emoji)}
          onClose={() => setEmojiPicker(null)}
        />
      )}

      {inspectedId && (() => {
        const item = items.find(i => i.id === inspectedId);
        if (!item) return null;
        return (
          <IconInspector
            item={item}
            moduleId={module.id}
            brandId={module.brandId}
            shareToken={shareToken}
            paletteId={paletteId}
            onPaletteChange={setPaletteId}
            onKeywordsChange={keywords => updateKeywords(item.id, keywords)}
            onStatusChange={status => setItemStatus(item.id, status)}
            onReplaceFile={file => replaceIconFile(item.id, file)}
            onRestoreVersion={index => restoreIconVersion(item.id, index)}
            onRename={name => renameIcon(item.id, name)}
            allKeywords={[...new Map(items.flatMap(i => i.keywords ?? []).map(k => [k.toLowerCase(), k])).values()].sort(byAlpha)}
            initialColor={colorFor(item)}
            isEditing={isEditing}
            onClose={() => setInspectedId(null)}
            onDelete={() => { deleteIcon(item.id); setInspectedId(null); }}
          />
        );
      })()}
    </div>
  );
}
