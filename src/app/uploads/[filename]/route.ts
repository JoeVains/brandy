import { NextRequest, NextResponse } from 'next/server';
import { getFile } from '@/lib/files';

export async function GET(_: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const file = await getFile(filename);
  if (!file) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(file.data, {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
