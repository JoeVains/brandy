import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `puppeteer` (Chromium complet) ne sert qu'en dev local dans la route PDF ;
  // on l'exclut du bundle serverless pour rester sous les limites de taille.
  outputFileTracingExcludes: {
    '/api/brands/\\[id\\]/pdf': ['./node_modules/puppeteer/**'],
  },
};

export default nextConfig;
