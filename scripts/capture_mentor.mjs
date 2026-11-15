// Capturas de la tarea de la mentora → docs/screenshots/mentor-*.png (indicadores + interpretación, vista Experiments con detalle,
// instrumentos del centro). Requiere el sitio en marcha (cd frontend && npm run build && npm run preview) y playwright-core:
//   NODE_PATH=<carpeta>/node_modules node scripts/capture_mentor.mjs      [FRONT_URL=http://127.0.0.1:4173/]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.env.FRONT_URL ?? 'http://127.0.0.1:4173/';
const out = (n) => path.join(ROOT, 'docs', 'screenshots', `mentor-${n}.png`);
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto(URL, { waitUntil: 'networkidle' });
const dock = p.getByRole('group', { name: 'Choose an atmosphere' });
await dock.getByRole('button', { name: /^Moon base/ }).click(); await p.waitForTimeout(1800);
await p.screenshot({ path: out('dashboard-moon-interpretation') }); console.log('saved dashboard-moon-interpretation');
await dock.getByRole('button', { name: /^Earth \/ ISS/ }).click(); await p.waitForTimeout(1800);
await p.screenshot({ path: out('dashboard-earth-instruments') }); console.log('saved dashboard-earth-instruments');
await dock.getByRole('button', { name: /^Spacesuit/ }).click(); await p.waitForTimeout(1800);
await p.screenshot({ path: out('dashboard-spacesuit-no-tests') }); console.log('saved dashboard-spacesuit-no-tests');
await dock.getByRole('button', { name: /^Moon base/ }).click();
await p.getByRole('button', { name: 'Experiments', exact: true }).first().click(); await p.waitForTimeout(900);
await p.screenshot({ path: out('experiments-relevance') }); console.log('saved experiments-relevance');
await p.locator('table.data tbody th[scope=row] button').first().click(); await p.waitForTimeout(500);
await p.screenshot({ path: out('experiments-detail') }); console.log('saved experiments-detail');
await b.close();
