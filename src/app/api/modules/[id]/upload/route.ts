import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveFile, deleteFile } from '@/lib/files';
import { AttachmentItem, DoDontItem, FileVersion, FontItem, IconItem, ImageItem } from '@/types';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = await db.modules.all();
  const idx = all.findIndex(m => m.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const module = all[idx];
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const slot = formData.get('slot') as string | null; // 'image' | 'font' | 'attachment'
  const itemName = formData.get('name') as string | null;
  const replaceItemId = formData.get('replaceItemId') as string | null;

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop() ?? 'bin';
  const filename = `${randomUUID()}.${ext}`;
  await saveFile(filename, await file.arrayBuffer(), file.type || 'application/octet-stream');

  // Remplacement du fichier d'un élément existant : l'ancien fichier est conservé dans l'historique des versions.
  if (replaceItemId && (slot === 'icon' || slot === 'image-item' || slot === 'attachment')) {
    const key = slot === 'icon' ? 'iconItems' : slot === 'image-item' ? 'imageItems' : 'attachmentItems';
    const list = (module[key] ?? []) as { id: string; filename: string; size: number; mimeType?: string; versions?: FileVersion[] }[];
    const target = list.find(i => i.id === replaceItemId);
    if (!target) {
      await deleteFile(filename);
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const previous: FileVersion = { filename: target.filename, size: target.size, ...(target.mimeType ? { mimeType: target.mimeType } : {}), date: new Date().toISOString() };
    target.versions = [previous, ...(target.versions ?? [])];
    target.filename = filename;
    target.size = file.size;
    if ('mimeType' in target || slot !== 'icon') target.mimeType = file.type;
    all[idx] = module;
    await db.modules.save(all);
    return NextResponse.json(module);
  }

  if (slot === 'image') {
    if (module.imageFilename) await deleteFile(module.imageFilename);
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
    const replaceId = formData.get('replaceId') as string | null;
    const col = slot === 'do' ? 'doItems' : 'dontItems';
    if (replaceId) {
      const items = module[col] ?? [];
      const target = items.find(i => i.id === replaceId);
      if (target?.filename) await deleteFile(target.filename);
      module[col] = items.map(i => i.id === replaceId ? { ...i, filename, mimeType: file.type } : i);
    } else {
      const item: DoDontItem = { id: randomUUID(), type: 'image', filename, mimeType: file.type };
      module[col] = [...(module[col] ?? []), item];
    }
  } else if (slot === 'audio') {
    if (module.audioFilename) await deleteFile(module.audioFilename);
    module.audioFilename = filename;
    module.audioMimeType = file.type;
    module.audioSize = file.size;
  } else if (slot === 'video') {
    if (module.videoFilename) await deleteFile(module.videoFilename);
    module.videoFilename = filename;
    module.videoMimeType = file.type;
    module.videoSize = file.size;
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
  await db.modules.save(all);
  return NextResponse.json(module);
}
