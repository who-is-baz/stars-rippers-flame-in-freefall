// Screenshots of every main view in both themes, for review: docs/screenshots/theme-<view>-<theme>.png (1280 × 860,
// plus the dashboard at 390 px). Static site, no backend. playwright-core lives outside the repo (see docs/SETUP.md).
// Usage: NODE_PATH=/tmp/pw/node_modules node scripts/capture_themes.mjs http://127.0.0.1:8099/
import { createRequire } from 'node:module';
import { closeView } from './site_walk.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const url = process.argv[2] ?? 'http://127.0.0.1:8099/';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const theme of ['dark', 'light']) {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 860 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((t) => { try { localStorage.setItem('fif.theme', t); } catch { /* */ } }, theme);
    const page = await ctx.newPage();
    const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}theme-${name}-${theme}.png` }); };
    await page.goto(`${url}?intro=off`, { waitUntil: 'networkidle' });
    if (width === 390) { await shot('dashboard-mobile'); await ctx.close(); continue; }
    await shot('dashboard');
    const dock = page.getByRole('group', { name: 'Choose an atmosphere' });
    await dock.getByRole('button', { name: /^Custom/ }).click(); await shot('custom');
    await dock.getByRole('button', { name: /^Custom/ }).click();
    await page.getByRole('button', { name: 'Display', exact: true }).click(); await shot('display-panel');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Customize' }).first().click(); await shot('customize');
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Experiments', exact: true }).click();
    await page.getByRole('group', { name: 'Full view sections' }).waitFor(); await shot('experiments');
    await page.getByRole('button', { name: /^Open details of test / }).first().click();
    await page.getByRole('dialog', { name: 'Test details' }).waitFor(); await shot('experiments-detail');
    await page.getByRole('button', { name: 'Close test details' }).click();
    const seg = page.getByRole('group', { name: 'Full view sections' });
    for (const [v, name] of [['Coverage', 'coverage'], ['Gaps', 'gaps'], ['Charts', 'charts']]) {
      await seg.getByRole('button', { name: v, exact: true }).click(); await shot(name);
    }
    await closeView(page);
    const chip = page.locator('.chip[data-tip]').first();
    if (await chip.count()) { await chip.focus(); await shot('tooltip'); }
    await page.getByRole('button', { name: 'Ask the SI assistant' }).click();
    const panel = page.getByRole('complementary', { name: 'SI Assistant' });
    await panel.getByLabel('Your question').fill('Which tests match Moon-base air?');
    await panel.getByRole('button', { name: 'Send question' }).click();
    await panel.getByRole('article', { name: 'Answer' }).first().waitFor(); await shot('assistant');
    await ctx.close();
  }
}
await browser.close();
console.log('screenshots written to', OUT);
