import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Delete old header if present
  const old = brands[idx].headerImage;
  if (old) {
    const oldPath = path.join(uploadsDir, old);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));

  brands[idx] = { ...brands[idx], headerImage: filename };
  db.brands.save(brands);

  return NextResponse.json(brands[idx]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'No url' }, { status: 400 });

  let buffer: Buffer;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    buffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'Could not fetch image' }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const old = brands[idx].headerImage;
  if (old) {
    const oldPath = path.join(uploadsDir, old);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const ext = url.split('?')[0].split('.').pop()?.replace(/[^a-z]/gi, '') || 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);

  brands[idx] = { ...brands[idx], headerImage: filename };
  db.brands.save(brands);

  return NextResponse.json(brands[idx]);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = db.brands.all();
  const idx = brands.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const old = brands[idx].headerImage;
  if (old) {
    const oldPath = path.join(uploadsDir, old);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  brands[idx] = { ...brands[idx], headerImage: undefined };
  db.brands.save(brands);

  return NextResponse.json(brands[idx]);
}
