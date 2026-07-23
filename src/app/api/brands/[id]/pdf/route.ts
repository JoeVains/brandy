import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Browser } from 'puppeteer-core';

// Hébergé par le mainteneur de @sparticuz/chromium — doit rester aligné avec
// la version du package installée (voir package.json).
const CHROMIUM_PACK_URL = 'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar';

async function launchBrowser(): Promise<Browser> {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.LAMBDA_TASK_ROOT;

  if (isLambda) {
    const { default: puppeteer } = await import('puppeteer-core');
    const { default: chromium } = await import('@sparticuz/chromium-min');
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
    }) as Promise<Browser>;
  }

  // Dev local : Chromium complet fourni par le paquet `puppeteer`
  const { default: puppeteerFull } = await import('puppeteer');
  return puppeteerFull.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }) as unknown as Promise<Browser>;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = (await db.brands.all()).find(b => b.id === id);
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(`${req.nextUrl.origin}/print/${id}`, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${brand.name.replace(/[^a-z0-9]/gi, '_')}_brand_book.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
