import { NextRequest, NextResponse } from 'next/server';
import { cleanupFiles } from '@/lib/gc';

// Simulation par défaut : la suppression exige { dryRun: false } explicitement.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun !== false;
  const report = await cleanupFiles(dryRun);
  return NextResponse.json({ ...report, orphans: report.orphans.slice(0, 200) });
}
