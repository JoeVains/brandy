import { NextResponse } from 'next/server';
import { listBackups, createBackupNow } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await listBackups());
}

export async function POST() {
  const backup = await createBackupNow();
  return NextResponse.json(backup, { status: 201 });
}
