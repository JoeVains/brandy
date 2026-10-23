import { recolorSvg } from '@/lib/svg';
import { useEffect, useState } from 'react';

export type RasterFormat = 'png' | 'webp';
export type BulkFormat = 'svg' | 'pdf' | RasterFormat;

const svgCache = new Map<string, Promise<string>>();
export function fetchSvg(filename: string): Promise<string> {
  let p = svgCache.get(filename);
  if (!p) {
    p = fetch(`/uploads/${filename}`).then(r => r.text());
    svgCache.set(filename, p);
  }
  return p;
}

// Miniature d'icône, recolorée côté client quand une couleur est fournie.
export function TintedImg({ filename, alt, color }: { filename: string; alt: string; color: string | null }) {
  // Version recolorée, valable pour un couple (fichier, couleur) donné ; sinon on affiche l'original.
  const key = `${filename}|${color}`;
  const [tinted, setTinted] = useState<{ key: string; src: string } | null>(null);
  useEffect(() => {
    if (!color) return;
    let cancelled = false;
    fetchSvg(filename).then(text => {
      if (!cancelled) setTinted({ key, src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolorSvg(text, color))}` });
    });
    return () => { cancelled = true; };
  }, [filename, color, key]);
  const src = color && tinted?.key === key ? tinted.src : `/uploads/${filename}`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} className="w-full h-full object-contain" />;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

export async function renderRaster(filename: string, size: number, color: string | null, format: RasterFormat): Promise<Blob | null> {
  let src = `/uploads/${filename}`;
  let objectUrl: string | null = null;
  if (color) {
    const svgText = await fetchSvg(filename);
    objectUrl = URL.createObjectURL(new Blob([recolorSvg(svgText, color)], { type: 'image/svg+xml' }));
    src = objectUrl;
  }
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Impossible de charger le SVG'));
      img.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise(resolve => canvas.toBlob(resolve, format === 'webp' ? 'image/webp' : 'image/png'));
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.style.display = 'none';
  // Chrome/Edge : lien attaché au DOM et URL révoquée avec délai, sinon le téléchargement peut échouer.
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(a.href);
  }, 10000);
}

export async function downloadRaster(filename: string, name: string, size: number, color: string | null, format: RasterFormat) {
  const blob = await renderRaster(filename, size, color, format);
  if (blob) saveBlob(blob, `${name}-${size}.${format}`);
}
