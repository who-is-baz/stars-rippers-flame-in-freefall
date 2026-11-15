// Capturas de los 5 estados del explorador "Custom" → docs/screenshots/explorer-*.png
// Requiere: front corriendo (cd frontend && npm run dev) y playwright-core accesible (NO es dependencia del repo):
//   npm i --prefix /tmp/pw playwright-core && NODE_PATH=/tmp/pw/node_modules node scripts/capture_explorer.mjs
// Usa el Chrome del sistema (channel: 'chrome'). Los valores de cada estado son los de
// frontend/src/sections/AtmosphereExplorer.test.tsx (STATES), encontrados en experiments.json.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.FRONT_URL ?? 'http://127.0.0.1:5173/';
const STATES = {
  stable: { fuel: 'Both', o2: 0.34, psi: 10.3 },
  mixed: { fuel: 'Both', o2: 0.2, psi: 14.6 },
  out: { fuel: 'Methanol', o2: 0.14, psi: 14.6 },
  small_n: { fuel: 'Both', o2: 0.15, psi: 10.3 },
  empty: { fuel: 'Both', o2: 0.27, psi: 20 },
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /^Custom Observed tests/ }).click();
const panel = page.getByRole('region', { name: 'Custom atmosphere explorer' });
await panel.waitFor();
const setRange = (label, v) => panel.getByLabel(label).evaluate((el, value) => {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  set.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, v);
for (const [name, s] of Object.entries(STATES)) {
  await panel.getByRole('group', { name: 'Fuel' }).getByRole('button', { name: s.fuel }).click();
  await setRange('Oxygen (O₂)', s.o2);
  await setRange('Pressure', s.psi);
  await page.waitForSelector(`[data-obs-state="${name}"]`, { timeout: 5000 });
  await page.waitForTimeout(700); // transición de escala
  const file = path.join(ROOT, 'docs', 'screenshots', `explorer-${name}.png`);
  await page.screenshot({ path: file });
  console.log('saved', path.relative(ROOT, file));
}
await browser.close();
