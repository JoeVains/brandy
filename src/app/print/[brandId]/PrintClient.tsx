'use client';

import { Brand, Section, Module, ColorItem } from '@/types';
import { useEffect } from 'react';
import { contrastRatio } from '@/lib/colorUtils';
import { textModuleToHtml } from '@/lib/textContent';

interface Props {
  brand: Brand;
  sections: Section[];
  modulesMap: Record<string, Module[]>;
}

function ratioLevel(ratio: number): { label: string; color: string } {
  if (ratio >= 7) return { label: 'AAA', color: '#16a34a' };
  if (ratio >= 4.5) return { label: 'AA', color: '#16a34a' };
  if (ratio >= 3) return { label: 'AA Large', color: '#d97706' };
  return { label: 'Échec', color: '#dc2626' };
}

function ModulePrint({ module, brandColor, colorModules }: { module: Module; brandColor: string; colorModules: Module[] }) {
  const bg = module.backgroundColor ? `${module.backgroundColor}1a` : 'transparent';

  if (module.type === 'divider') {
    return <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />;
  }

  if (module.type === 'heading') {
    return (
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{module.content || module.title}</p>
        {module.description && (
          <div style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}
            dangerouslySetInnerHTML={{ __html: textModuleToHtml(module.description) }} />
        )}
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: bg, marginBottom: 16, overflow: 'hidden', pageBreakInside: 'avoid' as const }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{module.title || module.type}</span>
      </div>
      {/* Body */}
      <div style={{ padding: '14px 16px' }}>

        {module.type === 'text' && (
          <div style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: textModuleToHtml(module.content) }} />
        )}

        {module.type === 'colors' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {(module.colorItems ?? []).map(item => (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {module.colorMode === 'drops' ? (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: item.value, border: '1px solid #e5e7eb' }} />
                ) : (
                  <div style={{ width: 80, height: 56, borderRadius: 8, background: item.value, border: '1px solid #e5e7eb' }} />
                )}
                <span style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>{item.name || item.value}</span>
                <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'monospace' }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {module.type === 'gradients' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {(module.gradientItems ?? []).map(item => {
              const stops = (item.stops ?? []).map(s => `${s.color} ${s.position}%`).join(', ');
              const gradient = item.type === 'radial'
                ? `radial-gradient(${stops})`
                : `linear-gradient(${item.angle ?? 90}deg, ${stops})`;
              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 80, height: 56, borderRadius: 8, background: gradient, border: '1px solid #e5e7eb' }} />
                  <span style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>{item.name || 'Dégradé'}</span>
                </div>
              );
            })}
          </div>
        )}

        {module.type === 'typography' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(module.fontItems ?? []).map(item => (
              <div key={item.id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 12 }}>
                <p style={{ fontFamily: item.family ?? item.name, fontSize: 28, margin: '0 0 4px', color: '#111827' }}>Aa</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: '0 0 2px' }}>{item.name}</p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{item.source === 'google' ? 'Google Fonts' : 'Police locale'}</p>
              </div>
            ))}
          </div>
        )}

        {module.type === 'image' && module.imageMode === 'single' && module.imageFilename && (
          <img src={`/uploads/${module.imageFilename}`} alt="" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }} />
        )}

        {module.type === 'image' && module.imageMode === 'gallery' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {(module.imageItems ?? []).map(item => (
              <img key={item.id} src={`/uploads/${item.filename}`} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
            ))}
          </div>
        )}

        {module.type === 'icons' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 12 }}>
            {(module.iconItems ?? []).map(item => (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <img src={`/uploads/${item.filename}`} alt={item.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                <span style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }}>{item.name}</span>
              </div>
            ))}
          </div>
        )}

        {module.type === 'spacing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(module.spacingSteps ?? []).map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: Math.min(step, 320), height: 16, background: brandColor + '33', borderRadius: 3 }} />
                <span style={{ fontSize: 10, color: '#374151', fontFamily: 'monospace' }}>{step}px</span>
              </div>
            ))}
          </div>
        )}

        {module.type === 'attachments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(module.attachmentItems ?? []).map(item => (
              <div key={item.id} style={{ padding: '6px 10px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 11, color: '#374151' }}>{item.name || item.filename}</span>
              </div>
            ))}
          </div>
        )}

        {module.type === 'dodont' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 10 }}>✓ À faire</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(module.doItems ?? []).map(item => (
                  <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    {item.type === 'image' && item.filename && (
                      <img src={`/uploads/${item.filename}`} alt="" style={{ width: '100%', height: 100, objectFit: item.fit ?? 'cover', display: 'block' }} />
                    )}
                    {item.type === 'text' && item.content && (
                      <p style={{ fontSize: 11, color: '#374151', padding: '8px 10px' }}>{item.content}</p>
                    )}
                    {item.caption && <p style={{ fontSize: 10, color: '#6b7280', padding: '4px 10px 8px', borderTop: '1px solid #f3f4f6' }}>{item.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>✗ À éviter</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(module.dontItems ?? []).map(item => (
                  <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    {item.type === 'image' && item.filename && (
                      <img src={`/uploads/${item.filename}`} alt="" style={{ width: '100%', height: 100, objectFit: item.fit ?? 'cover', display: 'block' }} />
                    )}
                    {item.type === 'text' && item.content && (
                      <p style={{ fontSize: 11, color: '#374151', padding: '8px 10px' }}>{item.content}</p>
                    )}
                    {item.caption && <p style={{ fontSize: 10, color: '#6b7280', padding: '4px 10px 8px', borderTop: '1px solid #f3f4f6' }}>{item.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {module.type === 'video' && (
          <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
            {module.videoTitle || 'Vidéo'}{module.videoUrl ? ` — ${module.videoUrl}` : ''}
          </p>
        )}

        {module.type === 'audio' && (
          <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
            {module.audioTitle || 'Audio'}
          </p>
        )}

        {module.type === 'button' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(module.buttonItems ?? []).map(item => (
              <span key={item.id} style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 8, background: item.color || brandColor, color: 'white', fontSize: 12, fontWeight: 600 }}>
                {item.label}
              </span>
            ))}
          </div>
        )}

        {module.type === 'accessibility' && (() => {
          const source = module.accessibilitySourceModuleId
            ? colorModules.find(m => m.id === module.accessibilitySourceModuleId)
            : null;
          const seen = new Map<string, ColorItem>();
          (source ? [source] : colorModules).flatMap(m => m.colorItems ?? []).forEach(item => seen.set(item.id, item));
          const allColors = [...seen.values()];
          return allColors.length < 2 ? (
            <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Pas assez de couleurs pour calculer les contrastes.</p>
          ) : (
            <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
              <thead>
                <tr>
                  <td />
                  {allColors.map(col => (
                    <td key={col.id} style={{ fontSize: 8, fontWeight: 600, color: '#6b7280', textAlign: 'center', padding: '0 4px 4px' }}>{col.name}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allColors.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontSize: 8, fontWeight: 600, color: '#6b7280', textAlign: 'right', paddingRight: 6, whiteSpace: 'nowrap' }}>{row.name}</td>
                    {allColors.map(col => {
                      if (col.id === row.id) return <td key={col.id} style={{ width: 56, height: 40, borderRadius: 6, background: '#f9fafb' }} />;
                      const ratio = contrastRatio(row.value, col.value);
                      const level = ratio !== null ? ratioLevel(ratio) : null;
                      return (
                        <td key={col.id} style={{ textAlign: 'center' }}>
                          <div style={{ width: 56, height: 40, borderRadius: 6, border: '1px solid #e5e7eb', background: row.value, color: col.value, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700 }}>Aa</span>
                            {ratio !== null && <span style={{ fontSize: 7, fontFamily: 'monospace' }}>{ratio.toFixed(2)}</span>}
                          </div>
                          {level && <p style={{ fontSize: 6.5, marginTop: 2, color: level.color, fontWeight: 600 }}>{level.label}</p>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}

export default function PrintClient({ brand, sections, modulesMap }: Props) {
  useEffect(() => {
    document.title = `${brand.name} — Brand Book`;
  }, [brand.name]);

  const depthMap: Record<string, number> = {};
  for (const s of sections) {
    const parent = sections.find(p => p.id === s.parentId);
    depthMap[s.id] = parent ? (depthMap[parent.id] ?? 0) + 1 : 0;
  }

  const colorModules = Object.values(modulesMap).flat().filter(m => m.type === 'colors');

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>
      {/* Cover page */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: brand.color, color: 'white', padding: 48 }}>
        {brand.logoImage && (
          <img src={`/uploads/${brand.logoImage}`} alt="" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 32, borderRadius: '50%', background: 'white', padding: 8 }} />
        )}
        <h1 style={{ fontSize: 48, fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>{brand.name}</h1>
        <p style={{ fontSize: 16, opacity: 0.7 }}>Brand Book</p>
        <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>
          {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Sections */}
      {sections.map((section, i) => {
        const modules = modulesMap[section.id] ?? [];
        const d = depthMap[section.id] ?? 0;
        const isRoot = d === 0;

        return (
          <div key={section.id} className={isRoot && i > 0 ? 'page-break' : ''} style={{ padding: isRoot ? '48px 56px 0' : '0 56px' }}>
            <div style={{
              marginBottom: isRoot ? 24 : 16,
              marginTop: isRoot ? 0 : (d === 1 ? 32 : 20),
              paddingBottom: isRoot ? 12 : 0,
              borderBottom: isRoot ? `2px solid ${brand.color}` : 'none',
            }}>
              <h2 style={{
                fontSize: isRoot ? 28 : d === 1 ? 18 : 14,
                fontWeight: isRoot ? 800 : 700,
                color: isRoot ? brand.color : '#374151',
                letterSpacing: isRoot ? '-0.5px' : 0,
              }}>
                {section.name}
              </h2>
            </div>
            <div>
              {modules.map(m => (
                <ModulePrint key={m.id} module={m} brandColor={brand.color} colorModules={colorModules} />
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ height: 64 }} />
    </div>
  );
}
