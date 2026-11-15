// Capturas de las llamas ilustrativas por escenario → docs/screenshots/flame-*.png (+ referencia 1 g).
// Requiere el sitio en marcha (cd frontend && npm run build && npm run preview) y playwright-core (no es dependencia del repo):
//   NODE_PATH=<carpeta>/node_modules node scripts/capture_flames.mjs      [FRONT_URL=http://127.0.0.1:4173/]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.FRONT_URL ?? 'http://127.0.0.1:4173/';
const SHOTS = [
  ['flame-earth-iss', /^Earth \/ ISS/], ['flame-moon', /^Moon base/], ['flame-lunar-habitat', /^NASA lunar habitat/],
  ['flame-exploration', /^Exploration/], ['flame-spacesuit', /^Spacesuit/],
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(URL, { waitUntil: 'networkidle' });
const dock = page.getByRole('group', { name: 'Choose an atmosphere' });
for (const [name, re] of SHOTS) {
  await dock.getByRole('button', { name: re }).click();
  await page.waitForTimeout(2500); // transición de escala + partículas en movimiento
  await page.screenshot({ path: path.join(ROOT, 'docs', 'screenshots', `${name}.png`) });
  console.log('saved', name);
}
await dock.getByRole('button', { name: /^Earth \/ ISS/ }).click();
await page.getByRole('button', { name: 'Compare with 1 g' }).click();
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(ROOT, 'docs', 'screenshots', 'flame-earth-1g-reference.png') });
console.log('saved flame-earth-1g-reference');
await browser.close();
