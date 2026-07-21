'use client';

import { useEffect, useState, use } from 'react';
import { Brand, Section, Module } from '@/types';
import { ChevronRight, ChevronDown, Hash, LayoutGrid } from 'lucide-react';
import ColorsModule from '@/components/modules/ColorsModule';
import TypographyModule from '@/components/modules/TypographyModule';
import TextModule from '@/components/modules/TextModule';
import ImageModule from '@/components/modules/ImageModule';
import AttachmentsModule from '@/components/modules/AttachmentsModule';
import DividerModule from '@/components/modules/DividerModule';
import HeadingModule from '@/components/modules/HeadingModule';
import IconsModule from '@/components/modules/IconsModule';
import SpacingModule from '@/components/modules/SpacingModule';
import DoDontModule from '@/components/modules/DoDontModule';
import GradientsModule from '@/components/modules/GradientsModule';
import VideoModule from '@/components/modules/VideoModule';
import AudioModule from '@/components/modules/AudioModule';

const noop = () => {};

function ModuleView({ module, brandColor }: { module: Module; brandColor: string }) {
  if (module.type === 'divider') {
    return (
      <div className="border rounded-2xl px-5 py-4" style={{ borderColor: 'var(--border)' }}>
        <DividerModule />
      </div>
    );
  }
  return (
    <div className="border rounded-2xl" style={{ borderColor: 'var(--border)', background: module.backgroundColor ? `${module.backgroundColor}1a` : 'var(--card-bg)' }}>
      {module.title && (
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{module.title}</span>
        </div>
      )}
      <div className="p-5">
        {module.type === 'colors' && <ColorsModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'typography' && <TypographyModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'heading' && <HeadingModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'text' && <TextModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'image' && <ImageModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'attachments' && <AttachmentsModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'icons' && <IconsModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'spacing' && <SpacingModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'dodont' && <DoDontModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'gradients' && <GradientsModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'video' && <VideoModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
        {module.type === 'audio' && <AudioModule module={module} brandColor={brandColor} onUpdate={noop} isEditing={false} />}
      </div>
    </div>
  );
}

function SectionNode({ section, allSections, activeId, onSelect, depth }: {
  section: Section; allSections: Section[]; activeId: string | null; onSelect: (id: string) => void; depth: number;
}) {
  const children = allSections.filter(s => s.parentId === section.id).sort((a, b) => a.order - b.order);
  const [expanded, setExpanded] = useState(true);
  const isActive = activeId === section.id;

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors"
        style={{
          marginLeft: `${depth * 14}px`,
          background: isActive ? 'var(--accent)' : undefined,
          color: isActive ? 'white' : 'var(--text-secondary)',
        }}
        onClick={() => onSelect(section.id)}
      >
        {children.length > 0 ? (
          <button onClick={e => { e.stopPropagation(); setExpanded(x => !x); }} className="flex-shrink-0">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <Hash size={12} className="flex-shrink-0 opacity-50" />
        )}
        <span className="truncate">{section.name}</span>
      </div>
      {expanded && children.map(child => (
        <SectionNode key={child.id} section={child} allSections={allSections} activeId={activeId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<{ brand: Brand; sections: Section[]; modules: Module[] } | null | 'not-found'>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setData(d);
        const firstRoot = d.sections.filter((s: Section) => s.parentId === null).sort((a: Section, b: Section) => a.order - b.order)[0];
        setActiveSectionId(firstRoot?.id ?? null);
      })
      .catch(() => setData('not-found'));
  }, [token]);

  if (data === null) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }} />;
  }

  if (data === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2" style={{ background: 'var(--background)' }}>
        <LayoutGrid size={28} className="text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Ce lien de partage n&apos;existe plus.</p>
      </div>
    );
  }

  const { brand, sections, modules } = data;
  const roots = sections.filter(s => s.parentId === null).sort((a, b) => a.order - b.order);
  const sectionModules = modules.filter(m => m.sectionId === activeSectionId).sort((a, b) => a.order - b.order);
  const activeSection = sections.find(s => s.id === activeSectionId);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      <aside className="w-56 flex-shrink-0 flex flex-col border-r overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}>
        <div className="flex-shrink-0">
          <div className="h-16 flex items-center justify-center" style={{ background: brand.color }}>
            <div className="w-12 h-12 rounded-full border-2 border-white/40 overflow-hidden flex items-center justify-center"
              style={{ background: brand.logoImage ? 'white' : 'rgba(255,255,255,0.25)' }}>
              {brand.logoImage
                ? <img src={`/uploads/${brand.logoImage}`} alt="logo" className="w-full h-full object-contain p-2" />
                : <span className="text-white text-lg font-bold leading-none">{brand.name.charAt(0).toUpperCase()}</span>}
            </div>
          </div>
          <div className="px-4 py-2 border-b text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{brand.name}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Lecture seule</p>
          </div>
        </div>
        <div className="p-3 flex-1">
          {roots.map(s => (
            <SectionNode key={s.id} section={s} allSections={sections} activeId={activeSectionId} onSelect={setActiveSectionId} depth={0} />
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10 flex flex-col gap-3">
          {activeSection && (
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{activeSection.name}</h1>
          )}
          {sectionModules.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-12 text-center">Cette rubrique est vide.</p>
          )}
          {sectionModules.map(module => (
            <ModuleView key={module.id} module={module} brandColor={brand.color} />
          ))}
        </div>
      </main>
    </div>
  );
}
