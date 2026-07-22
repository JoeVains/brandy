'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import emojiGroups from 'unicode-emoji-json/data-by-group.json';

interface EmojiEntry { emoji: string; name: string }

const GROUP_LABELS: Record<string, string> = {
  'Smileys & Emotion': 'Smileys',
  'People & Body': 'Personnes',
  'Animals & Nature': 'Animaux',
  'Food & Drink': 'Nourriture',
  'Travel & Places': 'Voyages',
  'Activities': 'Activités',
  'Objects': 'Objets',
  'Symbols': 'Symboles',
  'Flags': 'Drapeaux',
};

const GROUPS = emojiGroups.map(g => ({
  name: g.name,
  label: GROUP_LABELS[g.name] ?? g.name,
  icon: g.emojis[0].emoji,
  emojis: g.emojis.map(e => ({ emoji: e.emoji, name: e.name })) as EmojiEntry[],
}));

const ALL_EMOJIS: EmojiEntry[] = GROUPS.flatMap(g => g.emojis);

interface Props {
  anchorRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ anchorRect, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollingToTab = useRef(false);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => (q ? ALL_EMOJIS.filter(e => e.name.includes(q)) : null), [q]);

  // Sync active tab with scroll position (continuous scroll through all categories)
  useEffect(() => {
    if (q) return;
    const container = scrollRef.current;
    if (!container) return;

    function onScroll() {
      if (scrollingToTab.current) return;
      const containerTop = container!.getBoundingClientRect().top;
      let current = 0;
      sectionRefs.current.forEach((el, i) => {
        if (!el) return;
        // A section becomes "current" once it has scrolled past the sticky header threshold
        if (el.getBoundingClientRect().top - containerTop <= 24) current = i;
      });
      setActiveGroup(current);
    }
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [q]);

  function goToGroup(i: number) {
    setActiveGroup(i);
    const el = sectionRefs.current[i];
    const container = scrollRef.current;
    if (!el || !container) return;
    scrollingToTab.current = true;
    container.scrollTop = el.offsetTop - container.offsetTop;
    setTimeout(() => { scrollingToTab.current = false; }, 150);
  }

  const style = {
    position: 'fixed' as const,
    top: anchorRect.bottom + 6,
    left: anchorRect.left,
    zIndex: 10000,
    width: 300,
  };

  return createPortal(
    <div ref={ref} style={style} className="bg-card rounded-xl shadow-xl border flex flex-col overflow-hidden">
      <div className="relative p-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un emoji…"
          className="w-full pl-7 pr-2 py-1.5 rounded-lg text-xs outline-none bg-transparent"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {!q && (
        <div className="flex items-center gap-0.5 px-1.5 py-1 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          {GROUPS.map((g, i) => (
            <button
              key={g.name}
              onClick={() => goToGroup(i)}
              title={g.label}
              className={`flex-shrink-0 w-7 h-7 flex items-center justify-center text-sm rounded-lg transition-colors ${activeGroup === i ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              {g.icon}
            </button>
          ))}
        </div>
      )}

      {results ? (
        <div className="grid grid-cols-7 gap-0.5 p-2 h-56 overflow-y-auto content-start">
          {results.length === 0 ? (
            <p className="col-span-7 text-center text-xs text-gray-400 dark:text-gray-500 py-6">Aucun résultat</p>
          ) : results.map(e => (
            <button
              key={e.emoji}
              onClick={() => { onSelect(e.emoji); onClose(); }}
              className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
              title={e.name}
            >
              {e.emoji}
            </button>
          ))}
        </div>
      ) : (
        <div ref={scrollRef} className="h-56 overflow-y-auto">
          {GROUPS.map((g, i) => (
            <div key={g.name} ref={el => { sectionRefs.current[i] = el; }}>
              <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 sticky top-0 bg-card">{g.label}</p>
              <div className="grid grid-cols-7 gap-0.5 px-2 pb-1">
                {g.emojis.map(e => (
                  <button
                    key={e.emoji}
                    onClick={() => { onSelect(e.emoji); onClose(); }}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                    title={e.name}
                  >
                    {e.emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
