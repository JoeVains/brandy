import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { GET as downloadZip } from '@/app/api/modules/[id]/download/route';
import { GET as downloadIconPdf } from '@/app/api/modules/[id]/icons/[iconId]/pdf/route';

// Téléchargements d'icônes pour les pages partagées (accessibles sans mot de passe) :
// le jeton de partage donne accès uniquement aux modules de la marque partagée.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brand = (await db.brands.all()).find(b => b.shareToken === token);
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const moduleId = req.nextUrl.searchParams.get('module');
  const module = (await db.modules.all()).find(m => m.id === moduleId && m.brandId === brand.id && m.type === 'icons');
  if (!module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const iconId = req.nextUrl.searchParams.get('icon');
  if (iconId) return downloadIconPdf(req, { params: Promise.resolve({ id: module.id, iconId }) });
  return downloadZip(req, { params: Promise.resolve({ id: module.id }) });
}
