// Fails if any text a visitor can see or hear (visible text, aria-label, aria-description, title, alt, placeholder,
// <title>, meta description) is not English. Walks every view and state of the STATIC site (frontend/dist, no backend).
// Usage:  (cd frontend/dist && python3 -m http.server 8099) &
//         NODE_PATH=<folder with playwright-core>/node_modules node scripts/check_english.mjs http://127.0.0.1:8099/
// Documented exception: the visitor's own question echoed in the assistant (.msg-q) is input, not site text.
import { createRequire } from 'node:module';
import { walk } from './site_walk.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const url = process.argv[2] ?? 'http://127.0.0.1:8099/';
const ACCENTS = /[áéíóúñ¿¡ÁÉÍÓÚÑ]/;
// Spanish function words that never appear in English UI text. ("de" and "la" are excluded on purpose: "Moon de..."
// does not occur, but proper names such as "La Niña" could; add them back if that changes.)
const STOP = /\b(el|los|las|del|que|para|con|una|por|pruebas|resultado|resultados|prueba|sin|datos|cabina|presión|oxígeno|combustible|ver|cerrar|abrir|buscar|también|aquí|esta|este|pero|como|más)\b/i;
// Names and identifiers that look Spanish but are not UI text.
const ALLOW = [/Universidad Politécnica de Querétaro/g, /Querétaro/g, /Politécnica/g];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => { console.log('pageerror:', e.message); process.exitCode = 1; });
await page.goto(`${url}?intro=off`, { waitUntil: 'networkidle' });

const found = new Map();
const states = [];
const collect = async (where) => {
  states.push(where);
  const items = await page.evaluate(() => {
    const out = [];
    const visible = (el) => {
      if (!el) return false;
      if (el.closest('[aria-hidden="true"]') && !el.closest('[aria-hidden="true"]').contains(document.activeElement)) return false;
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent.trim();
      if (!t || n.parentElement.closest('script,style,.msg-q')) continue;
      if (visible(n.parentElement)) out.push(['text', t]);
    }
    for (const el of document.querySelectorAll('[aria-label],[aria-description],[title],[alt],[placeholder]')) {
      if (el.closest('.msg-q')) continue;
      for (const a of ['aria-label', 'aria-description', 'title', 'alt', 'placeholder']) {
        const v = el.getAttribute(a); if (v) out.push([a, v]);
      }
    }
    out.push(['<title>', document.title]);
    out.push(['meta description', document.querySelector('meta[name=description]')?.content ?? '']);
    const lang = document.documentElement.lang;
    if (lang !== 'en') out.push(['html lang', `lang="${lang}" (expected "en") pruebas`]);
    return out;
  });
  for (const [kind, raw] of items) {
    let t = raw; for (const a of ALLOW) t = t.replace(a, '');
    if (ACCENTS.test(t) || STOP.test(t)) {
      const key = `${kind}: ${raw.slice(0, 160)}`;
      if (!found.has(key)) found.set(key, where);
    }
  }
};

await walk(page, collect);
await browser.close();
for (const [k, where] of found) console.log(`NOT ENGLISH [${where}] ${k}`);
console.log(`states checked: ${states.length} (${states.join(' | ')})`);
console.log(found.size ? `ENGLISH CHECK FAILED (${found.size})` : 'ENGLISH CHECK PASSED');
process.exit(found.size || process.exitCode ? 1 : 0);
