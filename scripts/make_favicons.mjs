// Regenera los iconos del sitio desde frontend/public/favicon.svg (emblema de la cabecera, BrandEmblem en App.tsx):
// favicon.ico (16/32/48), favicon-32.png, apple-touch-icon.png (180), icon-192.png, icon-512.png y site.webmanifest.
// Uso: NODE_PATH=<carpeta>/node_modules node scripts/make_favicons.mjs   (playwright-core NO es dependencia del repo:
//      npm i --prefix /tmp/pw playwright-core). Usa el Chrome del sistema. El ICO se arma a mano (entradas PNG).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'public');
const svg = fs.readFileSync(path.join(PUB, 'favicon.svg'), 'utf8');
const BG = '#040506';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
async function png(size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('width="64" height="64"', `width="${size}" height="${size}"`)}</body></html>`);
  return page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
const out = {};
for (const s of [16, 32, 48, 180, 192, 512]) out[s] = await png(s);
await browser.close();

fs.writeFileSync(path.join(PUB, 'favicon-32.png'), out[32]);
fs.writeFileSync(path.join(PUB, 'apple-touch-icon.png'), out[180]);
fs.writeFileSync(path.join(PUB, 'icon-192.png'), out[192]);
fs.writeFileSync(path.join(PUB, 'icon-512.png'), out[512]);

// ICO container with PNG-compressed entries (16, 32, 48)
const sizes = [16, 32, 48];
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = [], data = [];
for (const s of sizes) {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(out[s].length, 8); e.writeUInt32LE(offset, 12);
  dir.push(e); data.push(out[s]); offset += out[s].length;
}
fs.writeFileSync(path.join(PUB, 'favicon.ico'), Buffer.concat([head, ...dir, ...data]));

fs.writeFileSync(path.join(PUB, 'site.webmanifest'), JSON.stringify({
  name: 'Flame in Freefall Explorer', short_name: 'Flame', start_url: './', scope: './', display: 'standalone',
  theme_color: BG, background_color: BG,
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2) + '\n');
console.log('icons written to', path.relative(process.cwd(), PUB));
