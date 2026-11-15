# Accessibility: pending work (15 Nov 2026)

Internal note. What the accessibility pass on 15 Nov delivered is in the README ("Accessibility"); this file lists what
did **not** fit in the time box, so nobody claims it.

## Done later the same day
- **Light theme (part C):** built. Tokens per theme (`:root[data-theme="light"]` in `tokens.css`), Display panel in the
  top bar (Theme, Higher contrast, Text size, Pause animations), saved theme applied before the first paint by an
  inline script in `index.html` (`color-scheme` and `theme-color` follow it), `.dark-zone` keeps the scene dark, stars
  only in Dark, `prefers-contrast: more` turns on Higher contrast. axe passes in both themes, Lighthouse
  accessibility 100 in both, token contrast checked by `scripts/check_contrast.mjs`. Screenshots:
  `docs/screenshots/theme-<view>-<theme>.png`, reviewed by eye.

## Still not done
1. **Colour-blindness simulation** (protanopia / deuteranopia / tritanopia screenshots) not run. Status labels carry
   text (Exact / Near / Not near, "Tests nearby" / "No matching tests", "AI-extracted", "Unverified source"), but the
   chart palettes were not checked under simulation.
2. **Zoom 200 % and reflow at 400 %** not tested as such; only the 390 / 768 / 1280 px widths.
3. **Focus trap and focus return** not tested dialog by dialog; the audit checks the skip link, its focus ring,
   Ctrl K and Escape on the assistant, and Escape on the Display panel.
4. **Tap targets of 44×44 px**: the Display controls meet it; elsewhere only the WCAG 2.2 AA minimum (24×24 px).
5. **Lighthouse Performance** on mobile is 70–83 on the demo laptop, before and after this work.
6. Higher contrast was checked by token design only, not by its own axe run.
7. No tooltip screenshot: no QC chip is visible on the dashboard by default.

## Decisions taken in this pass
- Body text 16 px and no label under 14 px, all in rem. The dense console keeps its layout: the side rails scroll
  instead of overlapping, the top bar wraps on narrow screens.
- Dark surfaces written as `rgba(var(--surf, R, G, B), a)`: unset in Dark (identical colours), light in Light, and
  unset again inside `.dark-zone`.
- "Pause animations" uses the same path as `prefers-reduced-motion` (the flame is drawn still), plus a CSS rule that
  stops every CSS animation.
- The English check and the accessibility audit use `playwright-core` and `axe-core` from outside the repository, like
  `check_static_site.mjs`; they are not dependencies.
