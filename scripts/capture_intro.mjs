// Capturas de la intro de apertura → docs/screenshots/intro-*.png, a 0.3 s, 1 s, 2 s y 3.5 s del clic "Click to ignite",
// y comprobación de 0 errores en consola. Requiere el sitio en marcha (cd frontend && npm run build && npm run preview)
// y playwright-core (no es dependencia del proyecto):
//   NODE_PATH=<carpeta>/node_modules node scripts/capture_intro.mjs      [FRONT_URL=http://127.0.0.1:4173/]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.FRONT_URL ?? 'http://127.0.0.1:4173/';
const out = (n) => path.join(ROOT, 'docs', 'screenshots', `intro-${n}.png`);
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(`${BASE}?intro=on`, { waitUntil: 'domcontentloaded' });
await p.getByText('Click to ignite').waitFor();
await p.screenshot({ path: out('0-wait') }); console.log('saved wait');
await p.mouse.click(720, 450);
const t0 = Date.now();
for (const [ms, name] of [[300, '1-0.3s'], [1000, '2-1.0s'], [2000, '3-2.0s'], [3500, '4-3.5s']]) {
  await p.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
  const at = Date.now() - t0;
  await p.screenshot({ path: out(name) });
  console.log(`saved ${name} (shot started at ${at} ms)`);
}
const state = await p.evaluate(() => ({
  overlay: !!document.getElementById('intro-root'),
  inert: document.getElementById('root')?.hasAttribute('inert') ?? null,
  htmlClass: document.documentElement.className,
}));
console.log('after intro', JSON.stringify(state));
// second load in the same session: must not show again; ?intro=off: never
await p.goto(BASE, { waitUntil: 'networkidle' });
console.log('same session shows intro again:', await p.evaluate(() => !!document.getElementById('intro-root')));
console.log('console errors:', errors.length, JSON.stringify(errors));
await b.close();
process.exit(errors.length || state.overlay || state.inert ? 1 : 0);
