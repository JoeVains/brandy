import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDirs } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';

function detectType(mime: string): 'image' | 'document' | 'font' | 'other' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) return 'document';
  if (mime.includes('font') || mime.includes('woff') || mime.includes('ttf')) return 'font';
  return 'other';
}

export async function GET(req: NextRequest) {
  const sectionId = req.nextUrl.searchParams.get('sectionId');
  const brandId = req.nextUrl.searchParams.get('brandId');
  const assets = db.assets.all();
  if (sectionId) return NextResponse.json(assets.filter(a => a.sectionId === sectionId));
  if (brandId) return NextResponse.json(assets.filter(a => a.brandId === brandId));
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  ensureDirs();
  const form = await req.formData();
  const brandId = form.get('brandId') as string;
  const sectionId = form.get('sectionId') as string;
  const colorValue = form.get('colorValue') as string | null;
  const colorName = form.get('colorName') as string | null;
  const file = form.get('file') as File | null;

  const assets = db.assets.all();

  // color-only asset
  if (colorValue && !file) {
    const asset = {
      id: uuid(), brandId, sectionId,
      name: colorName || colorValue,
      filename: '', type: 'color' as const,
      mimeType: '', size: 0, colorValue,
      createdAt: new Date().toISOString(),
    };
    db.assets.save([...assets, asset]);
    return NextResponse.json(asset, { status: 201 });
  }

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = path.extname(file.name);
  const filename = `${uuid()}${ext}`;
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const bytes = await file.arrayBuffer();
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(bytes));

  const asset = {
    id: uuid(), brandId, sectionId,
    name: file.name,
    filename,
    type: detectType(file.type),
    mimeType: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
  };
  db.assets.save([...assets, asset]);
  return NextResponse.json(asset, { status: 201 });
}
