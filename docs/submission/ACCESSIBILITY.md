# Accessibility statement

Only what was checked is listed here (15 Nov 2026).

## What the site offers
- **Themes:** Dark (default) and a soft Light theme (off-white surfaces, near-black text, darker accents). The flame
  scene keeps its own dark panel in both. The saved theme is applied before the first paint.
- **Higher contrast** switch (on automatically when the system asks for more contrast).
- **Text size** A− / A / A+ that scales the whole interface; body text 16 px, no label under 14 px.
- **Pause animations** (flame, stars, particles), plus the system's reduced-motion setting.
- **Keyboard:** "Skip to main content", visible focus ring, Ctrl K / ⌘K opens the assistant, Esc closes it and the
  Display panel. Status labels carry text, not only colour. The flame scene has a text alternative and says it is an
  illustration, not a simulation.

## How it was checked
- **axe-core** (WCAG 2.2 AA rules) in 32 views and states (every scenario, Custom, About, Tour, Customize, Display
  panel, every full view, test details, assistant answers and refusals), at 390 and 1280 px, in Dark and Light:
  **0 serious or critical violations** (`scripts/check_a11y.mjs`).
- Contrast of the colour tokens computed for both themes: 146 pairs pass (`scripts/check_contrast.mjs`).
- **Lighthouse** mobile accessibility: **100** in Dark and in Light. Best practices 100, SEO 100.
- Every view captured in both themes and reviewed by eye: `docs/screenshots/theme-*.png`.

## Not tested yet
- Colour-blindness simulation (protanopia, deuteranopia, tritanopia).
- Browser zoom at 200 % and reflow at 400 %.
- Focus trap and focus return, dialog by dialog.
- An axe run with Higher contrast switched on.
