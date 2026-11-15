// The exact experiments are shown: on the STATIC site, Earth/ISS shows "49 exact" and its button opens the
// Experiments view with those 49 tests, all marked Exact; the relevance filter lists Exact / Near / Not near with
// counts; Moon base (0 exact, 17 near) lists the near tests labelled Near and never as Exact.
// Usage: NODE_PATH=/tmp/pw/node_modules node scripts/check_exact_tests.mjs http://127.0.0.1:8099/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const url = process.argv[2] ?? 'http://127.0.0.1:8099/';
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${url}?intro=off`, { waitUntil: 'networkidle' });
const dock = page.getByRole('group', { name: 'Choose an atmosphere' });
const rows = () => page.locator('table.data tbody tr:not(.group-row) td:first-child').allTextContents();
const counter = () => page.locator('p[aria-live="polite"]').first().textContent();

async function openFor(card, button) {
  await dock.getByRole('button', { name: new RegExp(`^${card}`) }).click();
  await page.waitForTimeout(300);
  const right = page.getByRole('complementary', { name: 'Scenario inspector and coverage' });
  const text = await right.innerText();
  const btn = right.getByRole('button', { name: button });
  check(await btn.count() > 0, `${card}: no "${button}" button in the inspector`);
  await btn.first().click();
  await page.getByRole('dialog', { name: 'Experiments' }).waitFor();
  await page.waitForTimeout(300);
  return text;
}

// Earth / ISS: 49 exact
const earth = await openFor('Earth / ISS', /^Show 49/);
check(/49/.test(earth) && /exact/i.test(earth), `Earth/ISS inspector does not say 49 exact: ${earth.replace(/\s+/g, ' ').slice(0, 200)}`);
check(/Showing\s*49\s*of/.test(await counter()), `Earth/ISS: Experiments counter is "${await counter()}", expected 49`);
const er = await rows();
check(er.length > 0 && er.every((t) => /Exact/.test(t)), `Earth/ISS: rows not all Exact (${er.slice(0, 5).join(', ')})`);
// relevance filter with counts
const opts = await page.getByLabel('Relevance to this atmosphere').locator('option').allTextContents();
for (const re of [/^Exact \(49\)$/, /^Near \(\d+\)$/, /^Not near \(\d+\)$/]) check(opts.some((o) => re.test(o)), `relevance filter lacks ${re} (has ${opts.join(' | ')})`);
await page.getByRole('button', { name: 'Close view' }).click();
await page.getByRole('dialog').first().waitFor({ state: 'detached' });

// Moon base: 0 exact, 17 near, labelled Near
const moon = await openFor('Moon base', /closest tests/);
check(/0\s*·\s*17/.test(moon) || /0 exact/.test(moon), `Moon base inspector does not show 0 exact / 17 near`);
check(/Showing\s*17\s*of/.test(await counter()), `Moon base: counter is "${await counter()}", expected 17`);
const mr = await rows();
check(mr.length === 17 && mr.every((t) => /^Near/.test(t.trim())), `Moon base: rows not all Near (${mr.slice(0, 5).join(', ')})`);
check(!mr.some((t) => /Exact/.test(t)), 'Moon base: a near test is labelled Exact');
const dlg = await page.getByRole('dialog', { name: 'Experiments' }).innerText();
check(/no exact|0 exact|not exact|near/i.test(dlg), 'Moon base: no notice that these are near, not exact, tests');

await browser.close();
for (const p of problems) console.log('FAIL', p);
console.log(problems.length ? `EXACT TESTS CHECK FAILED (${problems.length})` : 'EXACT TESTS CHECK PASSED');
process.exit(problems.length ? 1 : 0);
