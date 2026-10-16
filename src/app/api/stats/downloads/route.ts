import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { countSince, readStats } from '@/lib/stats';

export interface DownloadStatRow {
  moduleId: string;
  sectionId: string;
  moduleTitle: string;
  moduleType: string;
  sectionName: string;
  itemId: string;
  name: string;
  filename?: string;
  total: number;
  last30: number;
  bulkTotal: number;
  bulkLast30: number;
  last?: string;
}

// Téléchargements par fichier pour une marque, y compris les fichiers jamais téléchargés.
export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get('brandId');
  if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 });

  const modules = (await db.modules.all()).filter(m => m.brandId === brandId);
  const sections = await db.sections.all();
  const rows: DownloadStatRow[] = [];

  for (const m of modules) {
    const stats = await readStats(m.id);
    const base = {
      moduleId: m.id,
      sectionId: m.sectionId,
      moduleTitle: m.title || '',
      moduleType: m.type,
      sectionName: sections.find(s => s.id === m.sectionId)?.name ?? '',
    };
    const add = (itemId: string, name: string, filename?: string) => {
      const s = stats[itemId];
      rows.push({ ...base, itemId, name, filename, total: s?.total ?? 0, last30: countSince(s, 30), bulkTotal: s?.bulk ?? 0, bulkLast30: countSince(s, 30, true), last: s?.last || undefined });
    };
    (m.iconItems ?? []).forEach(i => add(i.id, i.name, i.filename));
    (m.attachmentItems ?? []).forEach(i => add(i.id, i.name, i.filename));
    (m.imageItems ?? []).forEach(i => add(i.id, i.caption || i.filename, i.filename));
    (m.fontItems ?? []).forEach(i => add(i.id, i.name, i.filename));
    if (m.type === 'image' && m.imageMode !== 'gallery' && m.imageFilename) add('__single', m.title || 'Image', m.imageFilename);
  }

  return NextResponse.json(rows);
}
