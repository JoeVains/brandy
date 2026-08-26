import type { Browser } from 'puppeteer-core';

// Hébergé par le mainteneur de @sparticuz/chromium — doit rester aligné avec
// la version du package installée (voir package.json).
const CHROMIUM_PACK_URL = 'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar';

export async function launchBrowser(): Promise<Browser> {
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
