import { NextResponse } from 'next/server';
import { listBackups, createBackup } from '@/lib/backup';

export async function GET() {
  return NextResponse.json(listBackups());
}

export async function POST() {
  const backup = await createBackup(true);
  return NextResponse.json(backup ?? { error: 'No data to back up' }, { status: backup ? 201 : 400 });
}
