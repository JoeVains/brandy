'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Palette, Type, Image, Paperclip, Hash, AlignLeft, FolderOpen } from 'lucide-react';
import { Module, Section } from '@/types';

interface SearchResult {
  moduleId: string;
  moduleType: string;
  moduleTitle: string;
  sectionId: string;
  sectionName: string;
  match: string;
  matchLabel: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  colors:      <Palette size={12} />,
  typography:  <Type size={12} />,
  image:       <Image size={12} />,
  attachments: <Paperclip size={12} />,
  icons:       <Hash size={12} />,
  gradients:   <span className="text-[10px] font-bold leading-none">◑</span>,
  text:        <AlignLeft size={12} />,
  heading:     <span className="text-[10px] font-bold leading-none">H</span>,
  audio:       <span className="text-[10px] font-bold leading-none">♪</span>,
  video:       <span className="text-[10px] font-bold leading-none">▶</span>,
  dodont:      <span className="text-[10px] font-bold leading-none">✓✗</span>,
  spacing:     <span className="text-[10px] font-bold leading-none">⇥</span>,
};

function searchModules(modules: Module[], sections: Section[], q: string): SearchResult[] {
  const query = q.toLowerCase().trim();
  if (!query) return [];
  const results: SearchResult[] = [];
  const section = (m: Module) => sections.find(s => s.id === m.sectionId);

  function push(m: Module, match: string, matchLabel: string) {
    const s = section(m);
    results.push({ moduleId: m.id, moduleType: m.type, moduleTitle: m.title, sectionId: m.sectionId, sectionName: s?.name ?? '', match, matchLabel });
  }

  for (const m of modules) {
    // Module title
    if (m.title?.toLowerCase().includes(query)) push(m, m.title, 'titre');

    // Colors
    m.colorItems?.forEach(c => {
      if (c.name.toLowerCase().includes(query)) push(m, c.name, 'couleur');
      else if (c.value.toLowerCase().includes(query)) push(m, c.value, 'hex');
    });

    // Typography
    m.fontItems?.forEach(f => {
      if (f.name.toLowerCase().includes(query)) push(m, f.name, 'police');
      else if (f.family?.toLowerCase().includes(query)) push(m, f.family, 'famille');
    });

    // Icons
    m.iconItems?.forEach(i => {
      if (i.name.toLowerCase().includes(query)) push(m, i.name, 'icône');
    });

    // Attachments
    m.attachmentItems?.forEach(a => {
      if (a.name.toLowerCase().includes(query)) push(m, a.name, 'fichier');
    });

    // Images
    m.imageItems?.forEach(img => {
      if (img.filename.toLowerCase().includes(query)) push(m, img.filename, 'image');
    });
    if (m.imageFilename?.toLowerCase().includes(query)) push(m, m.imageFilename, 'image');

    // Gradients
    m.gradientItems?.forEach(g => {
      if (g.name.toLowerCase().includes(query)) push(m, g.name, 'dégradé');
    });

    // Text content
    if (m.content?.toLowerCase().includes(query)) push(m, m.content.slice(0, 60), 'contenu');

    // Do & Don't captions
    [...(m.doItems ?? []), ...(m.dontItems ?? [])].forEach(item => {
      if (item.caption?.toLowerCase().includes(query)) push(m, item.caption, 'légende');
    });

    // Audio / video titles
    if (m.audioTitle?.toLowerCase().includes(query)) push(m, m.audioTitle, 'audio');
    if (m.videoTitle?.toLowerCase().includes(query)) push(m, m.videoTitle!, 'vidéo');
  }

  // Deduplicate by moduleId (keep first match per module)
  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.moduleId + r.match;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}

interface Props {
  brandId: string;
  sections: Section[];
  onNavigate: (sectionId: string) => void;
  onClose: () => void;
}

export default function SearchModal({ brandId, sections, onNavigate, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/modules?brandId=${brandId}`)
      .then(r => r.json())
      .then(setModules);
  }, [brandId]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = searchModules(modules, sections, query);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const go = useCallback((result: SearchResult) => {
    onNavigate(result.sectionId);
    onClose();
  }, [onNavigate, onClose]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx]);
    else if (e.key === 'Escape') onClose();
  }

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function highlight(text: string) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1 || !query) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-yellow-100 text-yellow-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </span>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '65vh' }}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Rechercher couleurs, icônes, polices…"
            className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400" />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-gray-300 border rounded px-1.5 py-0.5 font-mono" style={{ borderColor: 'var(--border)' }}>Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {!query ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-300">
              <Search size={24} />
              <p className="text-xs">Tapez pour rechercher dans tous les modules</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-300">
              <p className="text-xs">Aucun résultat pour « {query} »</p>
            </div>
          ) : results.map((r, i) => (
            <button key={`${r.moduleId}-${r.match}`}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{ background: i === activeIdx ? '#f9fafb' : 'white' }}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => go(r)}>
              {/* Type icon */}
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-500"
                style={{ background: '#f3f4f6' }}>
                {TYPE_ICONS[r.moduleType] ?? <FolderOpen size={12} />}
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-800 truncate">{highlight(r.match)}</span>
                  <span className="text-[10px] text-gray-300 flex-shrink-0">{r.matchLabel}</span>
                </div>
                <p className="text-[10px] text-gray-400 truncate">
                  {r.moduleTitle || r.moduleType} · {r.sectionName}
                </p>
              </div>
              {i === activeIdx && (
                <kbd className="text-[10px] text-gray-300 border rounded px-1 py-0.5 font-mono flex-shrink-0" style={{ borderColor: 'var(--border)' }}>↵</kbd>
              )}
            </button>
          ))}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 border-t text-[10px] text-gray-300 flex gap-3" style={{ borderColor: 'var(--border)' }}>
            <span>↑↓ naviguer</span><span>↵ ouvrir</span><span>Esc fermer</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
