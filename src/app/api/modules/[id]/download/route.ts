import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const module = db.modules.all().find(m => m.id === id);
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const idsParam = req.nextUrl.searchParams.get('ids');
  const selectedIds = idsParam ? new Set(idsParam.split(',')) : null;
  const items = (module.iconItems ?? []).filter(i => !selectedIds || selectedIds.has(i.id));
  if (items.length === 0) return NextResponse.json({ error: 'No icons' }, { status: 400 });

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const zip = new JSZip();

  for (const item of items) {
    const filePath = path.join(uploadsDir, item.filename);
    if (fs.existsSync(filePath)) {
      zip.file(`${item.name}.svg`, fs.readFileSync(filePath));
    }
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const zipName = (module.title || 'icons').replace(/[^a-z0-9]/gi, '_').toLowerCase();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}.zip"`,
    },
  });
}
