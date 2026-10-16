import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getFile } from '@/lib/files';
import { recolorSvg } from '@/lib/svg';
import { launchBrowser, renderSvgToPdf } from '@/lib/pdfBrowser';
import { categoryFolders, iconZipPath } from '@/lib/iconCategories';
import JSZip from 'jszip';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const module = (await db.modules.all()).find(m => m.id === id);
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const idsParam = req.nextUrl.searchParams.get('ids');
  const selectedIds = idsParam ? new Set(idsParam.split(',')) : null;
  const zip = new JSZip();

  if (module.type === 'image') {
    // Single image
    if (module.imageMode !== 'gallery' && module.imageFilename) {
      const file = await getFile(module.imageFilename);
      if (file) zip.file(module.imageFilename, file.data);
    }
    // Gallery
    const imageItems = (module.imageItems ?? []).filter(i => !selectedIds || selectedIds.has(i.id));
    for (const item of imageItems) {
      const file = await getFile(item.filename);
      if (file) zip.file(item.filename, file.data);
    }
  } else {
    // Icons
    const items = (module.iconItems ?? []).filter(i => !selectedIds || selectedIds.has(i.id));
    if (items.length === 0) return NextResponse.json({ error: 'No icons' }, { status: 400 });
    const colorParam = req.nextUrl.searchParams.get('color');
    const color = colorParam && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorParam) ? colorParam : null;
    // flat=1 : zip d'une seule catégorie, icônes à la racine (sans dossier).
    const folders = req.nextUrl.searchParams.get('flat') === '1' ? new Map<string, string>() : categoryFolders(module.iconCategories ?? []);
    // Couleurs par catégorie (JSON {idCatégorie: "#hex"}), prioritaires sur la couleur globale.
    const catColors: Record<string, string> = {};
    try {
      const raw = JSON.parse(req.nextUrl.searchParams.get('cc') ?? '{}') as Record<string, unknown>;
      for (const [id, v] of Object.entries(raw)) {
        if (typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) catColors[id] = v;
      }
    } catch { /* paramètre ignoré s'il est invalide */ }
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
        if (page) zip.file(iconZipPath(item, folders, `${item.name}.pdf`), await renderSvgToPdf(page, svgOut));
        else zip.file(iconZipPath(item, folders, `${item.name}.svg`), itemColor ? svgOut : file.data);
      }
    } finally {
      await browser?.close();
    }
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const zipName = (module.title || module.type).replace(/[^a-z0-9]/gi, '_').toLowerCase();

  return new NextResponse(buffer as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}.zip"`,
    },
  });
}
