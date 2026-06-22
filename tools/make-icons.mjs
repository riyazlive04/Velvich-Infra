// Rasterize the logo SVG into favicon/app-icon PNGs using Chromium.
// Inlines the SVG markup (avoids file:// img cross-origin blocking).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg = readFileSync(join(root, 'apps/web/public/logo.svg'), 'utf8');
const pub = join(root, 'apps/web/public');
const appDir = join(root, 'apps/web/src/app');

// All icons are branded navy tiles (the logo's navy text is invisible on a
// white browser tab otherwise). The logo overflows its own padding via a 1.5x
// inner scale so the mark fills the tile. logo.svg stays transparent for in-app use.
const targets = [
  [512, join(pub, 'icon-512.png')],
  [192, join(pub, 'icon-192.png')],
  [180, join(appDir, 'apple-icon.png')],
  [64, join(appDir, 'icon.png')],
  [600, join(__dirname, 'logo-preview.png')],
];

const browser = await chromium.launch();
for (const [size, out] of targets) {
  const ctx = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(
    `<html><body style="margin:0;background:#0f2742;display:flex;align-items:center;justify-content:center;height:${size}px;width:${size}px;overflow:hidden">
       <div style="width:${size}px;height:${size}px;transform:scale(1.5);display:flex;align-items:center;justify-content:center">
         <style>svg{width:100%!important;height:100%!important}</style>
         ${svg}
       </div>
     </body></html>`,
    { waitUntil: 'networkidle' },
  );
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('✓', out);
  await ctx.close();
}
// Tight, transparent wordmark crop for use on white/light surfaces (sidebar
// logo box, login card). Render large, then clip to the logo content bounds.
{
  const W = 1200;
  const ctx = await browser.newContext({ viewport: { width: W, height: W }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.setContent(
    `<html><body style="margin:0;width:${W}px;height:${W}px;display:flex;align-items:center;justify-content:center">
       <div style="width:${W}px;height:${W}px"><style>svg{width:100%!important;height:100%!important}</style>${svg}</div>
     </body></html>`,
    { waitUntil: 'networkidle' },
  );
  await new Promise((r) => setTimeout(r, 300));
  // Crop to the mark + "Velvich Infra" wordmark (exclude the small tagline).
  await page.screenshot({
    path: join(pub, 'logo-wordmark.png'),
    omitBackground: true,
    clip: { x: 298, y: 405, width: 604, height: 330 },
  });
  console.log('✓ logo-wordmark.png');
  await ctx.close();
}

await browser.close();
console.log('done');
