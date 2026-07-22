import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getFile } from '@/lib/files';
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
    for (const item of items) {
      const file = await getFile(item.filename);
      if (file) zip.file(`${item.name}.svg`, file.data);
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
