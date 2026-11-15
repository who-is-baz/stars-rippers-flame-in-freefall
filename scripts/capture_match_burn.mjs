// Capturas de la animación del palito/llama por escenario en t = 0, 3 y 8 s → docs/screenshots/match-burn-<escenario>-t<seg>.png
// Requiere el sitio en marcha (npm run dev o preview) y playwright-core (no es dependencia del repo):
//   NODE_PATH=<carpeta>/node_modules node scripts/capture_match_burn.mjs   [FRONT_URL=http://127.0.0.1:5173/]
// Después: python scripts/diff_match_burn.py  (diferencia de píxeles entre capturas del mismo escenario).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.FRONT_URL ?? 'http://127.0.0.1:5173/';
const OUT = path.join(ROOT, 'docs', 'screenshots');
const CLIP = { x: 280, y: 90, width: 740, height: 610 };
const TIMES = [0, 3, 8];
const SCEN = [['earth-iss', /^Earth \/ ISS/], ['moon-base', /^Moon base/], ['lunar-habitat', /^NASA lunar habitat/], ['exploration', /^Exploration/], ['spacesuit', /^Spacesuit/]];
const STATES = { stable: { fuel: 'Both', o2: 0.34, psi: 10.3 }, mixed: { fuel: 'Both', o2: 0.2, psi: 14.6 }, out: { fuel: 'Methanol', o2: 0.14, psi: 14.6 }, small_n: { fuel: 'Both', o2: 0.15, psi: 10.3 }, empty: { fuel: 'Both', o2: 0.27, psi: 20 } };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; page.on('console', (m) => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const dock = page.getByRole('group', { name: 'Choose an atmosphere' });
async function series(name, clip = CLIP) {
  const t0 = Date.now();
  for (const t of TIMES) {
    const wait = t * 1000 - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(OUT, `match-burn-${name}-t${t}.png`), ...(clip ? { clip } : {}) });
  }
  console.log('saved', name);
}
for (const [name, re] of SCEN) { await dock.getByRole('button', { name: re }).click(); await page.waitForTimeout(700); await series(name); }
await dock.getByRole('button', { name: /^Earth \/ ISS/ }).click(); await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Compare with 1 g' }).click(); await page.waitForTimeout(300); await series('earth-1g');
await page.getByRole('button', { name: 'Earth 1 g (illustration)' }).click();
await page.getByRole('button', { name: /^Custom Observed tests/ }).click();
const panel = page.getByRole('region', { name: 'Custom atmosphere explorer' }); await panel.waitFor();
const setRange = (label, v) => panel.getByLabel(label).evaluate((el, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
for (const [name, s] of Object.entries(STATES)) {
  await panel.getByRole('group', { name: 'Fuel' }).getByRole('button', { name: s.fuel }).click();
  await setRange('Oxygen (O₂)', s.o2); await setRange('Pressure', s.psi);
  await page.waitForSelector(`[data-obs-state="${name}"]`, { timeout: 5000 }); await page.waitForTimeout(400);
  await series(`custom-${name}`, null);   // Custom: the explorer panel is part of the view, so the whole viewport is captured
}
console.log('console errors:', errs.length, errs.slice(0, 3));
await browser.close();
