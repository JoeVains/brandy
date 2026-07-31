'use client';

import { useState, useEffect, useRef } from 'react';
import { Module, ColorItem } from '@/types';
import { textModuleToHtml } from '@/lib/textContent';
import { Bold, Italic, Underline, Strikethrough, Superscript, Subscript, Link2, Palette, Eraser } from 'lucide-react';

interface Props {
  moduleId: string;
  brandId: string;
  value: string | undefined;
  isEditing?: boolean;
  onUpdate: (description: string) => void;
  /** Field name to PATCH on the module — defaults to 'description'. */
  field?: string;
  placeholder?: string;
}

const TEXT_COLORS = ['#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

type FormatKey = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'superscript' | 'subscript' | 'uppercase';

function ToolbarButton({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="p-1 rounded-md transition-colors"
      style={active ? { background: 'var(--accent)', color: 'white' } : { color: '#9ca3af' }}
    >
      {children}
    </button>
  );
}

export default function ModuleDescription({ moduleId, brandId, value, isEditing, onUpdate, field = 'description', placeholder = 'Ajouter une description…' }: Props) {
  const [focused, setFocused] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [activeFormats, setActiveFormats] = useState<Record<FormatKey, boolean>>({
    bold: false, italic: false, underline: false, strikeThrough: false, superscript: false, subscript: false, uppercase: false,
  });
  const [brandColors, setBrandColors] = useState<ColorItem[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const linkMenuRef = useRef<HTMLDivElement>(null);
  const prevEditing = useRef(isEditing);
  const pendingHtml = useRef('');

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = textModuleToHtml(value);
      pendingHtml.current = editorRef.current.innerHTML;
    }
  }, [isEditing]);

  useEffect(() => {
    if (prevEditing.current && !isEditing) {
      const html = pendingHtml.current.trim();
      if (html !== textModuleToHtml(value).trim()) {
        fetch(`/api/modules/${moduleId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ [field]: html }),
        }).then(r => r.json()).then(updated => onUpdate(updated[field] ?? ''));
      }
    }
    prevEditing.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    fetch(`/api/modules?brandId=${brandId}`)
      .then(r => r.json())
      .then((modules: Module[]) => {
        const seen = new Map<string, ColorItem>();
        modules.filter(m => m.type === 'colors').flatMap(m => m.colorItems ?? []).forEach(item => seen.set(item.id, item));
        setBrandColors([...seen.values()]);
      });
  }, [isEditing, brandId]);

  useEffect(() => {
    if (!isEditing) return;
    function handleSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editorRef.current?.contains(sel.anchorNode)) return;
      savedRange.current = sel.getRangeAt(0).cloneRange();
      const anchorEl = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : (sel.anchorNode as HTMLElement | null);
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        superscript: document.queryCommandState('superscript'),
        subscript: document.queryCommandState('subscript'),
        uppercase: anchorEl ? getComputedStyle(anchorEl).textTransform === 'uppercase' : false,
      });
    }
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isEditing]);

  useEffect(() => {
    if (!colorMenuOpen && !linkMenuOpen) return;
    function handler(e: MouseEvent) {
      if (colorMenuOpen && colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) setColorMenuOpen(false);
      if (linkMenuOpen && linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) setLinkMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colorMenuOpen, linkMenuOpen]);

  function restoreSelection() {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function syncPendingHtml() {
    if (editorRef.current) pendingHtml.current = editorRef.current.innerHTML;
  }

  function exec(command: string) {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncPendingHtml();
  }

  function toggleUppercase() {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const anchorEl = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : (sel.anchorNode as HTMLElement | null);
    const isUppercase = anchorEl ? getComputedStyle(anchorEl).textTransform === 'uppercase' : false;
    const contents = range.extractContents();
    const wrapper = document.createElement('span');
    wrapper.style.textTransform = isUppercase ? 'none' : 'uppercase';
    wrapper.appendChild(contents);
    range.insertNode(wrapper);
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    sel.removeAllRanges();
    sel.addRange(newRange);
    syncPendingHtml();
  }

  function applyColor(color: string) {
    restoreSelection();
    document.execCommand('foreColor', false, color);
    syncPendingHtml();
    setColorMenuOpen(false);
  }

  function applyLink() {
    restoreSelection();
    if (linkUrl.trim()) {
      const url = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
      document.execCommand('createLink', false, url);
      syncPendingHtml();
    }
    setLinkMenuOpen(false);
    setLinkUrl('');
  }

  function removeLink() {
    restoreSelection();
    document.execCommand('unlink');
    syncPendingHtml();
    setLinkMenuOpen(false);
  }

  if (isEditing) {
    return (
      <div className="mb-4 rounded-lg transition-colors" style={focused ? { background: '#f9fafb', border: '1px solid var(--border)' } : { background: 'transparent', border: '1px solid transparent' }}>
        <div className="flex items-center gap-0.5 px-1.5 py-1 border-b flex-wrap" style={{ borderColor: 'var(--border)' }}>
          <ToolbarButton title="Gras" active={activeFormats.bold} onClick={() => exec('bold')}><Bold size={12} /></ToolbarButton>
          <ToolbarButton title="Italique" active={activeFormats.italic} onClick={() => exec('italic')}><Italic size={12} /></ToolbarButton>
          <ToolbarButton title="Souligné" active={activeFormats.underline} onClick={() => exec('underline')}><Underline size={12} /></ToolbarButton>
          <ToolbarButton title="Barré" active={activeFormats.strikeThrough} onClick={() => exec('strikeThrough')}><Strikethrough size={12} /></ToolbarButton>
          <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border)' }} />
          <ToolbarButton title="Exposant" active={activeFormats.superscript} onClick={() => exec('superscript')}><Superscript size={12} /></ToolbarButton>
          <ToolbarButton title="Indice" active={activeFormats.subscript} onClick={() => exec('subscript')}><Subscript size={12} /></ToolbarButton>
          <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border)' }} />
          <ToolbarButton title="Majuscules" active={activeFormats.uppercase} onClick={toggleUppercase}><span className="text-[10px] font-bold leading-none px-0.5">AA</span></ToolbarButton>
          <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border)' }} />
          <div className="relative" ref={colorMenuRef}>
            <ToolbarButton title="Couleur du texte" onClick={() => setColorMenuOpen(o => !o)}>
              <Palette size={12} />
            </ToolbarButton>
            {colorMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 rounded-xl border shadow-lg px-2.5 py-2 z-50 w-[180px]" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TEXT_COLORS.map(color => (
                    <button
                      key={color}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => applyColor(color)}
                      className="w-5 h-5 rounded-full flex-shrink-0 hover:scale-110 transition-transform border"
                      style={{ background: color, borderColor: 'var(--border)' }}
                      title={color}
                    />
                  ))}
                </div>
                {brandColors.length > 0 && (
                  <>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 mb-1.5">Couleurs de la marque</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {brandColors.map(item => (
                        <button
                          key={item.id}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => applyColor(item.value)}
                          className="w-5 h-5 rounded-full flex-shrink-0 hover:scale-110 transition-transform border"
                          style={{ background: item.value, borderColor: 'var(--border)' }}
                          title={item.name || item.value}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={linkMenuRef}>
            <ToolbarButton title="Lien hypertexte" onClick={() => setLinkMenuOpen(o => !o)}>
              <Link2 size={12} />
            </ToolbarButton>
            {linkMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 rounded-xl border shadow-lg p-2.5 z-50 w-56" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <input
                  autoFocus
                  className="w-full border rounded-lg px-2 py-1 text-xs outline-none mb-2"
                  style={{ borderColor: 'var(--border)' }}
                  placeholder="https://exemple.com"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyLink(); }}
                />
                <div className="flex gap-2">
                  <button onMouseDown={e => e.preventDefault()} onClick={applyLink} className="flex-1 px-2 py-1 rounded-lg text-xs text-white" style={{ background: 'var(--accent)' }}>
                    Appliquer
                  </button>
                  <button onMouseDown={e => e.preventDefault()} onClick={removeLink} className="flex-1 px-2 py-1 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>
                    Retirer
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border)' }} />
          <ToolbarButton title="Effacer la mise en forme" onClick={() => exec('removeFormat')}><Eraser size={12} /></ToolbarButton>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="w-full text-sm text-muted outline-none px-3 py-2 [&_a]:underline [&_a]:text-blue-600"
          data-placeholder={placeholder}
          onInput={e => { pendingHtml.current = (e.target as HTMLDivElement).innerHTML; }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onDragStart={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        />
      </div>
    );
  }

  return value ? (
    <div className="text-sm text-muted mb-4 [&_a]:underline [&_a]:text-blue-600" dangerouslySetInnerHTML={{ __html: textModuleToHtml(value) }} />
  ) : null;
}
