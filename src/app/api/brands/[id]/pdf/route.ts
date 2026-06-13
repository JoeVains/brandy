import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import puppeteer from 'puppeteer';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = db.brands.all().find(b => b.id === id);
  if (!brand) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:3000/print/${id}`, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${brand.name.replace(/[^a-z0-9]/gi, '_')}_brand_book.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
