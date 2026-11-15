// Shared walker for the static-site audits (check_english.mjs, check_a11y.mjs).
// Opens every view and state a visitor can reach and calls `visit(name)` in each one.
// playwright-core is NOT a dependency of the repo; see check_static_site.mjs for how to run it.

export const SCENARIO_BUTTONS = /^(Earth|ISS|Moon|Lunar|Exploration|Suit|Spacesuit)/i;

// Questions that cover every answer type of the Basic assistant: fixed answers, about-the-site, no data and refusals.
export const QUESTIONS = [
  'How many experiments does this dashboard cover?',
  'Which tests match Moon-base air?',
  'Is heptane or methanol faster?',
  'What does this dashboard show?',
  'What happens to a fire in lunar gravity?', // trap: no partial-gravity data
  'Is a Moon base safe?', // trap: no safety rating
  'Write me a poem about the sea', // out of scope → refusal
];

const settle = (page, ms = 250) => page.waitForTimeout(ms);

export async function closeView(page) {
  const btn = page.getByRole('button', { name: 'Close view' });
  if (await btn.count()) {
    await btn.first().click();
    await page.getByRole('dialog').first().waitFor({ state: 'detached' }).catch(() => {});
  }
}

export async function walk(page, visit, { assistant = true } = {}) {
  await visit('dashboard');
  // every scenario on the dock
  const dock = page.getByRole('group', { name: 'Choose an atmosphere' });
  const n = await dock.getByRole('button').count();
  for (let i = 0; i < n; i++) {
    const b = dock.getByRole('button').nth(i);
    const label = ((await b.locator('h4').textContent()) ?? `card ${i}`).trim();
    await b.click();
    await settle(page);
    await visit(`dashboard: ${label}`);
    if (label === 'Custom') { await b.click(); await settle(page); }
  }
  // About, Tour (3 steps), Customize
  await page.getByRole('button', { name: 'About this dashboard' }).click();
  await visit('about');
  await page.getByRole('button', { name: 'About this dashboard' }).click();
  await page.getByRole('button', { name: 'Tour', exact: true }).click();
  for (let s = 1; s <= 3; s++) {
    await visit(`tour step ${s}`);
    await page.getByRole('dialog', { name: '30-second guided tour' }).getByRole('button').last().click();
  }
  await page.getByRole('button', { name: 'Customize' }).first().click();
  await settle(page);
  await visit('customize');
  await page.getByRole('button', { name: 'Done' }).click();
  // full views from the top nav + every section of the switcher
  await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Experiments', exact: true }).click();
  const seg = page.getByRole('group', { name: 'Full view sections' });
  await seg.waitFor();
  await visit('experiments');
  const row = page.getByRole('button', { name: /^Open details of test / }).first();
  if (await row.count()) {
    await row.click();
    await page.getByRole('dialog', { name: 'Test details' }).waitFor();
    await visit('experiments: test details');
    await page.getByRole('button', { name: 'Close test details' }).click();
  }
  const names = await seg.getByRole('button').allTextContents();
  for (const v of names.map((s) => s.trim()).filter((s) => s && s !== 'Experiments')) {
    await seg.getByRole('button', { name: v, exact: true }).click();
    await settle(page, 350);
    await visit(`view: ${v}`);
  }
  await closeView(page);
  await page.getByRole('button', { name: 'Investigations', exact: true }).click();
  await page.getByRole('dialog', { name: /Investigations/ }).waitFor();
  await visit('view: Investigations (dock)');
  await closeView(page);
  if (!assistant) return;
  await page.getByRole('button', { name: 'Ask the SI assistant' }).click();
  const panel = page.getByRole('complementary', { name: 'SI Assistant' });
  await visit('assistant: empty');
  for (const q of QUESTIONS) {
    const before = await panel.locator('.msg-a').count();
    await panel.getByLabel('Your question').fill(q);
    await panel.getByRole('button', { name: 'Send question' }).click();
    await panel.locator('.msg-a').nth(before).waitFor();
    await page.waitForFunction(() => !document.querySelector('#assistant [aria-label="Looking up the answer"]'));
    await visit(`assistant: ${q}`);
  }
  await page.keyboard.press('Escape');
  await settle(page);
}
