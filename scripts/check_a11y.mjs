// Accessibility audit of the STATIC site with axe-core (WCAG 2.2 A/AA rules) in every view and state, at 390 and
// 1280 px, in every theme the site offers. Fails on any "serious" or "critical" violation. Also checks keyboard basics.
// axe-core and playwright-core are NOT dependencies of the repo:
//   npm i --prefix /tmp/pw playwright-core axe-core
//   (cd frontend/dist && python3 -m http.server 8099) &
//   NODE_PATH=/tmp/pw/node_modules node scripts/check_a11y.mjs http://127.0.0.1:8099/
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { walk } from './site_walk.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const url = process.argv[2] ?? 'http://127.0.0.1:8099/';
const THEMES = (process.env.THEMES ?? 'dark,light').split(',');
const WIDTHS = [390, 1280];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const failures = new Map();
const fail = (key, where) => { if (!failures.has(key)) failures.set(key, where); };

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addInitScript((t) => { try { localStorage.setItem('fif.theme', t); } catch { /* */ } }, theme);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => fail(`pageerror: ${e.message}`, `${theme} ${width}`));
    await page.goto(`${url}?intro=off`, { waitUntil: 'networkidle' });
    let states = 0;
    const audit = async (where) => {
      states++;
      // let entrance fades finish: axe must measure the final colours, not a frame of a fade-in
      await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
      await page.waitForTimeout(150);
      await page.evaluate(AXE);
      const res = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
        return r.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
          .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} :: ${(n.failureSummary || '').split('\n').slice(1, 2).join(' ').slice(0, 140)}`) }));
      });
      for (const v of res) for (const n of v.nodes) fail(`${v.impact} ${v.id}: ${n}`, `${theme} ${width}px ${where}`);
    };
    await walk(page, audit);
    // keyboard: skip link is the first stop and moves focus to <main>; focus ring is visible
    await page.goto(`${url}?intro=off`, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), outline: getComputedStyle(document.activeElement).outlineStyle, ow: parseFloat(getComputedStyle(document.activeElement).outlineWidth) }));
    if (!/skip to main content/i.test(first.text ?? '')) fail(`first Tab stop is not the skip link (got "${first.text}")`, `${theme} ${width}`);
    if (first.outline === 'none' || first.ow < 2) fail('skip link has no visible focus ring (>= 2px)', `${theme} ${width}`);
    // Ctrl+K opens the assistant, Escape closes it and focus returns to the page
    await page.keyboard.press('Control+k');
    await page.getByRole('complementary', { name: 'SI Assistant' }).waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await page.locator('#assistant[data-open="true"]').count()) fail('Escape does not close the assistant', `${theme} ${width}`);
    console.log(`${theme} @${width}px: ${states} states audited`);
    await ctx.close();
  }
}
await browser.close();
for (const [k, where] of failures) console.log(`A11Y [${where}] ${k}`);
console.log(failures.size ? `A11Y CHECK FAILED (${failures.size})` : 'A11Y CHECK PASSED');
process.exit(failures.size ? 1 : 0);
