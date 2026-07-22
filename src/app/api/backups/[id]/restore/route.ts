import { NextRequest, NextResponse } from 'next/server';
import { restoreBackup } from '@/lib/db';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await restoreBackup(id);
  if (!ok) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
