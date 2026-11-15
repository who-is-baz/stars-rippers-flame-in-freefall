// Recorre el sitio ESTÁTICO (frontend/dist servido sin backend) y falla si hay errores de consola, peticiones
// fallidas, peticiones a otro origen (API, Ollama, CDNs) o desborde horizontal.
// Uso:  (cd frontend/dist && python3 -m http.server 8099) &
//       NODE_PATH=<carpeta con playwright-core>/node_modules node scripts/check_static_site.mjs http://127.0.0.1:8099/
// playwright-core NO es dependencia del repo (npm i --prefix /tmp/pw playwright-core); usa el Chrome del sistema.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const urls = process.argv.slice(2).length ? process.argv.slice(2) : ['http://127.0.0.1:8099/'];
const VIEWS = ['Experiments', 'Charts', 'Coverage', 'Scenarios', 'Fuels', 'Materials', 'Gaps', 'Sources'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failures = 0;
for (const url of urls) {
  for (const width of [390, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const problems = [];
    const origin = new URL(url).origin;
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
    page.on('request', (r) => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) problems.push(`external request: ${r.url()}`); });
    const overflow = async (where) => {
      // Can a USER scroll the page sideways? Only if the root's overflow-x is visible/auto/scroll (with hidden/clip the
      // content past the edge is unreachable; window.scrollTo can still move it programmatically, so it is not tested).
      const x = await page.evaluate(() => {
        const ox = getComputedStyle(document.documentElement).overflowX, ob = getComputedStyle(document.body).overflowX;
        if (['hidden', 'clip'].includes(ox) || (ox === 'visible' && ['hidden', 'clip'].includes(ob))) return 0;
        window.scrollTo(9999, window.scrollY); const v = window.scrollX; window.scrollTo(0, window.scrollY); return v;
      });
      if (x > 0) problems.push(`page scrolls horizontally at ${where}: ${x}px`);
      if (width <= 768) {
        const o = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        if (o[0] > o[1]) problems.push(`scrollWidth > innerWidth at ${where}: ${o[0]} > ${o[1]}`);
      }
    };
    await page.goto(url, { waitUntil: 'networkidle' });
    await overflow('overview');
    const seen = [];
    // full-view panels: open the first one from the top nav, then walk the section switcher
    await page.getByRole('button', { name: 'Coverage', exact: true }).first().click();
    const seg = page.getByRole('group', { name: 'Full view sections' });
    await seg.waitFor();
    for (const v of VIEWS) {
      await seg.getByRole('button', { name: v, exact: true }).click();
      await page.waitForTimeout(350);
      await overflow(v);
      seen.push(v);
    }
    await page.getByRole('button', { name: 'Close view' }).click();
    // dock tabs and Custom explorer
    for (const t of ['Explore tests', 'Investigations', 'Scenarios']) await page.getByRole('tab', { name: t }).click();
    await page.getByRole('button', { name: /^Custom Observed tests/ }).click();
    await page.getByRole('region', { name: 'Custom atmosphere explorer' }).waitFor();
    await overflow('custom');
    // assistant (Basic): a trap question and an out-of-scope one; no network call may happen
    await page.getByRole('button', { name: 'Ask the SI assistant' }).click();
    const panel = page.getByRole('complementary', { name: 'SI Assistant' });
    await panel.getByLabel('Your question').fill('What happens to a fire in lunar gravity?');
    await panel.getByRole('button', { name: 'Send question' }).click();
    await panel.getByRole('article', { name: 'Answer' }).first().waitFor();
    for (const n of ['Flash', 'Medium', 'Heavy']) if (!(await panel.getByRole('button', { name: n, exact: true }).isDisabled())) problems.push(`${n} should be disabled`);
    // reload on a "sub-route" (the site has no router; the only deep link is #assistant)
    await page.goto(`${url}#assistant`, { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('complementary', { name: 'SI Assistant' }).waitFor();
    await overflow('reload #assistant');
    console.log(`${problems.length ? 'FAIL' : 'OK  '} ${url} @${width}px views=${seen.length + 3} problems=${problems.length}`);
    for (const p of [...new Set(problems)].slice(0, 10)) console.log('   ', p);
    failures += problems.length;
    await page.close();
  }
}
await browser.close();
console.log(failures ? 'STATIC SITE CHECK FAILED' : 'STATIC SITE CHECK PASSED');
process.exit(failures ? 1 : 0);
