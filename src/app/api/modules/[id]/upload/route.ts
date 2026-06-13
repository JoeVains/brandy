import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AttachmentItem, DoDontItem, FontItem, IconItem, ImageItem } from '@/types';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = db.modules.all();
  const idx = all.findIndex(m => m.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const module = all[idx];
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const slot = formData.get('slot') as string | null; // 'image' | 'font' | 'attachment'
  const itemName = formData.get('name') as string | null;

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const ext = file.name.split('.').pop() ?? 'bin';
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);

  if (slot === 'image') {
    // Delete old image if present
    if (module.imageFilename) {
      const old = path.join(uploadsDir, module.imageFilename);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    module.imageFilename = filename;
    module.imageMimeType = file.type;
    module.imageSize = file.size;
  } else if (slot === 'image-item') {
    const item: ImageItem = {
      id: randomUUID(),
      filename,
      mimeType: file.type,
      size: file.size,
    };
    module.imageItems = [...(module.imageItems ?? []), item];
  } else if (slot === 'font') {
    const item: FontItem = {
      id: randomUUID(),
      name: itemName ?? file.name,
      source: 'upload',
      filename,
      mimeType: file.type,
      size: file.size,
    };
    module.fontItems = [...(module.fontItems ?? []), item];
  } else if (slot === 'icon') {
    const item: IconItem = {
      id: randomUUID(),
      name: (itemName ?? file.name).replace(/\.svg$/i, ''),
      filename,
      size: file.size,
    };
    module.iconItems = [...(module.iconItems ?? []), item];
  } else if (slot === 'do' || slot === 'dont') {
    const item: DoDontItem = { id: randomUUID(), type: 'image', filename, mimeType: file.type };
    if (slot === 'do') module.doItems = [...(module.doItems ?? []), item];
    else module.dontItems = [...(module.dontItems ?? []), item];
  } else if (slot === 'attachment') {
    const item: AttachmentItem = {
      id: randomUUID(),
      name: itemName ?? file.name,
      filename,
      mimeType: file.type,
      size: file.size,
    };
    module.attachmentItems = [...(module.attachmentItems ?? []), item];
  }

  all[idx] = module;
  db.modules.save(all);
  return NextResponse.json(module);
}
