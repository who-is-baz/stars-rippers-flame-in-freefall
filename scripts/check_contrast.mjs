// Contrast of the colour tokens in BOTH themes (frontend/src/design/tokens.css), computed here (WCAG 2.x formula),
// independently of axe: text >= 4.5:1 on every surface, focus ring and data-series colours >= 3:1.
// Usage: node scripts/check_contrast.mjs   (no dependencies, no browser)
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../frontend/src/design/tokens.css', import.meta.url), 'utf8');
const block = (sel) => { const i = css.indexOf(sel); const b = css.indexOf('{', i); return css.slice(b + 1, css.indexOf('\n}', b)); };
const parse = (txt) => Object.fromEntries([...txt.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
const dark = parse(block(':root, .dark-zone {'));
const light = { ...dark, ...parse(block(':root[data-theme="light"] {')) };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const SURFACES = ['graphite-9', 'graphite-8', 'panel-solid', 'view-bg', 'page-bg'];
const TEXT = ['ink', 'silver', 'ink-dim', 'mint', 'caution', 'info'];
const UI = ['mint', 'prog-flex', 'prog-bass2', 'out-extinction', 'out-disruption', 'out-completion', 'out-blowoff', 'out-noflame', 'fuel-heptane', 'fuel-methanol'];
let fails = 0, checks = 0;
for (const [name, t] of [['dark', dark], ['light', light]]) {
  const test = (fg, bg, min) => {
    if (!t[fg] || !t[bg]) return;
    checks++;
    const r = ratio(t[fg], t[bg]);
    if (r < min) { fails++; console.log(`FAIL ${name}: --${fg} ${t[fg]} on --${bg} ${t[bg]} = ${r.toFixed(2)}:1 (min ${min})`); }
  };
  for (const bg of SURFACES) { for (const fg of TEXT) test(fg, bg, 4.5); for (const fg of UI) test(fg, bg, 3); }
  test('on-mint', 'mint', 4.5);
}
console.log(fails ? `CONTRAST CHECK FAILED (${fails} of ${checks})` : `CONTRAST CHECK PASSED (${checks} token pairs, dark + light)`);
process.exit(fails ? 1 : 0);
