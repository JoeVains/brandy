'use client';

import { useMemo, useState } from 'react';
import { Check, GitMerge, Pencil, Search, Trash2, X } from 'lucide-react';
import type { IconItem } from '@/types';
import { byAlpha, norm } from './utils';

interface Entry { key: string; label: string; count: number }

// Applique `fn` aux mots-clés de chaque icône ; renvoie null si rien ne change.
function mapKeywords(items: IconItem[], fn: (keywords: string[]) => string[]): IconItem[] | null {
  let changed = false;
  const next = items.map(item => {
    const before = item.keywords ?? [];
    if (before.length === 0) return item;
    const after = fn(before);
    if (after.length === before.length && after.every((k, i) => k === before[i])) return item;
    changed = true;
    const copy: IconItem = { ...item };
    if (after.length) copy.keywords = after; else delete copy.keywords;
    return copy;
  });
  return changed ? next : null;
}

// Gestionnaire des mots-clés du module : nombre d'icônes, renommage (fusion si le mot existe déjà), suppression.
export default function KeywordManager({ items, onApply, onFilter, onClose }: {
  items: IconItem[];
  onApply: (items: IconItem[]) => Promise<void> | void;
  onFilter: (keyword: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  const [mergeQuery, setMergeQuery] = useState('');

  const entries = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const item of items) {
      for (const k of new Set((item.keywords ?? []).map(k => k.toLowerCase()))) {
        const label = (item.keywords ?? []).find(x => x.toLowerCase() === k)!;
        const e = map.get(k);
        if (e) e.count++; else map.set(k, { key: k, label, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => byAlpha(a.label, b.label));
  }, [items]);

  const shown = query.trim() ? entries.filter(e => norm(e.label).includes(norm(query.trim()))) : entries;

  async function apply(next: IconItem[] | null) {
    if (!next) return;
    setBusy(true);
    try { await onApply(next); } finally { setBusy(false); }
  }

  // Renomme `entry` en `name` ; si ce mot-clé existe déjà, les deux sont fusionnés.
  async function renameTo(entry: Entry, name: string, askMerge: boolean) {
    const target = name.toLowerCase();
    const merging = target !== entry.key && entries.some(e => e.key === target);
    if (merging && askMerge && !confirm(`« ${name} » existe déjà : les deux mots-clés seront fusionnés. Continuer ?`)) return;
    await apply(mapKeywords(items, kws => {
      if (!kws.some(k => k.toLowerCase() === entry.key)) return kws;
      const out: string[] = [];
      for (const k of kws) {
        const v = k.toLowerCase() === entry.key ? name : k;
        if (!out.some(o => o.toLowerCase() === v.toLowerCase())) out.push(v);
      }
      return out.sort(byAlpha);
    }));
  }

  async function rename(entry: Entry) {
    const name = draft.trim().replace(/,/g, ' ');
    setEditing(null);
    if (!name || name === entry.label) return;
    await renameTo(entry, name, true);
  }

  async function mergeInto(entry: Entry, target: Entry) {
    if (!confirm(`Fusionner « ${entry.label} » avec « ${target.label} » ? Les ${entry.count} icône${entry.count > 1 ? 's' : ''} de « ${entry.label} » recevront « ${target.label} ».`)) return;
    setMerging(null);
    await renameTo(entry, target.label, false);
  }

  async function remove(entry: Entry) {
    if (!confirm(`Supprimer « ${entry.label} » de ${entry.count} icône${entry.count > 1 ? 's' : ''} ?`)) return;
    await apply(mapKeywords(items, kws => kws.filter(k => k.toLowerCase() !== entry.key)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl flex flex-col max-h-[80vh]" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Gérer les mots-clés</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={15} /></button>
        </div>
        <div className="px-5 pb-3 relative">
          <Search size={13} className="absolute left-8 top-1/2 -translate-y-1/2 -mt-1.5 text-gray-400 pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none bg-transparent focus:border-gray-400"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {shown.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">{entries.length ? 'Aucun résultat' : 'Aucun mot-clé'}</p>
          )}
          {shown.map(entry => (
            <div key={entry.key} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 px-2 py-2">
              {editing === entry.key ? (
                <>
                  <input
                    autoFocus
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') rename(entry); if (e.key === 'Escape') setEditing(null); }}
                    className="flex-1 min-w-0 text-sm px-2 py-1 rounded-md border outline-none bg-transparent"
                    style={{ borderColor: 'var(--accent)' }}
                  />
                  <button onClick={() => rename(entry)} title="Valider" className="p-1 text-emerald-500"><Check size={14} /></button>
                  <button onClick={() => setEditing(null)} title="Annuler" className="p-1 text-red-400"><X size={14} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => { onFilter(entry.label); onClose(); }} title="Afficher les icônes avec ce mot-clé"
                    className="flex-1 min-w-0 text-left text-sm font-medium truncate text-gray-800 dark:text-gray-200 hover:underline">
                    {entry.label}
                  </button>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{entry.count} icône{entry.count > 1 ? 's' : ''}</span>
                  <button disabled={busy} onClick={() => { setEditing(entry.key); setDraft(entry.label); }} title="Renommer"
                    className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40"><Pencil size={13} /></button>
                  {entries.length > 1 && (
                    <button disabled={busy} onClick={() => { setMerging(merging === entry.key ? null : entry.key); setMergeQuery(''); }} title="Fusionner avec…"
                      className={`p-1 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-40 ${merging === entry.key ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}><GitMerge size={13} /></button>
                  )}
                  <button disabled={busy} onClick={() => remove(entry)} title="Supprimer"
                    className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-40"><Trash2 size={13} /></button>
                </>
              )}
              </div>
              {merging === entry.key && (
                <div className="mx-2 mb-2 p-2 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Fusionner « {entry.label} » avec :</p>
                  <input
                    autoFocus
                    value={mergeQuery}
                    onChange={e => setMergeQuery(e.target.value)}
                    placeholder="Rechercher un mot-clé…"
                    className="w-full mb-1.5 text-xs px-2 py-1 rounded-md border outline-none bg-transparent"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <div className="max-h-36 overflow-y-auto">
                    {entries.filter(t => t.key !== entry.key && norm(t.label).includes(norm(mergeQuery.trim()))).map(t => (
                      <button key={t.key} disabled={busy} onClick={() => mergeInto(entry, t)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">
                        <span className="truncate">{t.label}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{t.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t text-right" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-sm text-white" style={{ background: 'var(--accent)' }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
