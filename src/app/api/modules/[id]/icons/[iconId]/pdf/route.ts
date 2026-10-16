import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getFile } from '@/lib/files';
import { recolorSvg } from '@/lib/svg';
import { launchBrowser, renderSvgToPdf } from '@/lib/pdfBrowser';
import { recordDownloads } from '@/lib/stats';

const HEX_RE = /^#[0-9a-f]{3,8}$/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; iconId: string }> }) {
  const { id, iconId } = await params;
  const module = (await db.modules.all()).find(m => m.id === id);
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const item = (module.iconItems ?? []).find(i => i.id === iconId);
  if (!item) return NextResponse.json({ error: 'Icon not found' }, { status: 404 });

  const file = await getFile(item.filename);
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  let svgText = new TextDecoder().decode(file.data);
  const color = req.nextUrl.searchParams.get('color');
  if (color && HEX_RE.test(color)) svgText = recolorSvg(svgText, color);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const pdf = await renderSvgToPdf(page, svgText);
    await recordDownloads(module.id, [item.id]);
    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${item.name.replace(/[^a-z0-9]/gi, '_')}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
