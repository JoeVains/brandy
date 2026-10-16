import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getFile } from '@/lib/files';
import { recolorSvg } from '@/lib/svg';
import { launchBrowser, renderSvgToPdf } from '@/lib/pdfBrowser';
import { categoryFolders, iconZipPath } from '@/lib/iconCategories';
import { isPublished } from '@/lib/assetStatus';
import { recordDownloads } from '@/lib/stats';
import JSZip from 'jszip';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const module = (await db.modules.all()).find(m => m.id === id);
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const idsParam = req.nextUrl.searchParams.get('ids');
  const selectedIds = idsParam ? new Set(idsParam.split(',')) : null;
  const zip = new JSZip();
  const downloaded: string[] = [];  // éléments réellement inclus dans le zip (statistiques)

  if (module.type === 'image') {
    // Single image
    if (module.imageMode !== 'gallery' && module.imageFilename && (selectedIds || isPublished({ status: module.imageStatus }))) {
      const file = await getFile(module.imageFilename);
      if (file) { zip.file(module.imageFilename, file.data); downloaded.push('__single'); }
    }
    // Gallery
    const imageItems = (module.imageItems ?? []).filter(i => selectedIds ? selectedIds.has(i.id) : isPublished(i));
    // Une catégorie par dossier ; flat=1 : zip d'une seule catégorie, fichiers à la racine.
    const imageFolders = req.nextUrl.searchParams.get('flat') === '1' ? new Map<string, string>() : categoryFolders(module.imageCategories ?? []);
    for (const item of imageItems) {
      const file = await getFile(item.filename);
      if (file) { zip.file(iconZipPath(item, imageFolders, item.filename), file.data); downloaded.push(item.id); }
    }
  } else if (module.type === 'attachments') {
    const items = (module.attachmentItems ?? []).filter(i => selectedIds ? selectedIds.has(i.id) : isPublished(i));
    if (items.length === 0) return NextResponse.json({ error: 'No files' }, { status: 400 });
    const folders = req.nextUrl.searchParams.get('flat') === '1' ? new Map<string, string>() : categoryFolders(module.attachmentCategories ?? []);
    const used = new Set<string>();
    for (const item of items) {
      const file = await getFile(item.filename);
      if (!file) continue;
      // Deux fichiers de même nom dans un même dossier : le second reçoit un suffixe.
      let path = iconZipPath(item, folders, item.name);
      for (let n = 2; used.has(path.toLowerCase()); n++) {
        const dot = item.name.lastIndexOf('.');
        const name = dot > 0 ? `${item.name.slice(0, dot)} (${n})${item.name.slice(dot)}` : `${item.name} (${n})`;
        path = iconZipPath(item, folders, name);
      }
      used.add(path.toLowerCase());
      zip.file(path, file.data);
      downloaded.push(item.id);
    }
  } else {
    // Icons
    // Sans sélection explicite, seuls les fichiers validés sont inclus (ni brouillons, ni obsolètes).
    const items = (module.iconItems ?? []).filter(i => selectedIds ? selectedIds.has(i.id) : isPublished(i));
    if (items.length === 0) return NextResponse.json({ error: 'No icons' }, { status: 400 });
    const colorParam = req.nextUrl.searchParams.get('color');
    const color = colorParam && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorParam) ? colorParam : null;
    // flat=1 : zip d'une seule catégorie, icônes à la racine (sans dossier).
    const folders = req.nextUrl.searchParams.get('flat') === '1' ? new Map<string, string>() : categoryFolders(module.iconCategories ?? []);
    // Couleur propre à chaque catégorie (mémorisée dans le module), prioritaire sur la couleur globale.
    const catColors: Record<string, string> = {};
    for (const c of module.iconCategories ?? []) {
      if (c.color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.color)) catColors[c.id] = c.color;
    }
    const asPdf = req.nextUrl.searchParams.get('format') === 'pdf';
    // Un seul navigateur pour tous les PDF (lancer Chromium par icône serait trop lent).
    const browser = asPdf ? await launchBrowser() : null;
    try {
      const page = browser ? await browser.newPage() : null;
      for (const item of items) {
        const file = await getFile(item.filename);
        if (!file) continue;
        const svg = new TextDecoder().decode(file.data);
        const itemColor = (item.categoryId && catColors[item.categoryId]) || color;
        const svgOut = itemColor ? recolorSvg(svg, itemColor) : svg;
        downloaded.push(item.id);
        if (page) zip.file(iconZipPath(item, folders, `${item.name}.pdf`), await renderSvgToPdf(page, svgOut));
        else zip.file(iconZipPath(item, folders, `${item.name}.svg`), itemColor ? svgOut : file.data);
      }
    } finally {
      await browser?.close();
    }
  }

  await recordDownloads(module.id, downloaded, !selectedIds);
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const zipName = (module.title || module.type).replace(/[^a-z0-9]/gi, '_').toLowerCase();

  return new NextResponse(buffer as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}.zip"`,
    },
  });
}
