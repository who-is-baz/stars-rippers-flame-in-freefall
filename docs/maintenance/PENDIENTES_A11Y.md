# Accessibility: pending work (15 Nov 2026)

Internal note. What the accessibility pass on 15 Nov delivered is in the README ("Accessibility"); this file lists what
did **not** fit in the time box, so nobody claims it.

## Not done
1. **Light theme (part C).** Not built. The site has one theme, Dark (the current design). Pending: colour tokens per
   theme on `:root[data-theme]`, a Dark / Light switch in the top bar remembered in localStorage (try/catch, Dark when
   nothing is saved), an inline script in `index.html` that applies the saved theme before the first paint, matching
   `<meta name="color-scheme">` / `theme-color`, a dark panel kept around the chamber scene in both themes, stars only in
   Dark, and a "Higher contrast" option that follows `prefers-contrast: more`. `scripts/check_a11y.mjs` already takes
   `THEMES=dark,light` and sets `localStorage['fif.theme']`, so the audit is ready once the theme exists.
2. **Colour-blindness simulation** (protanopia / deuteranopia / tritanopia screenshots) not run. Status labels carry
   text (Exact / Near / Not near, "Tests nearby" / "No matching tests", "AI-extracted", "Unverified source"), but the
   chart palettes were not checked under simulation.
3. **Zoom 200 % and reflow at 400 %** not tested as such; only the 390 / 768 / 1280 px widths
   (`check_static_site.mjs`, no horizontal page scroll).
4. **Focus trap and focus return** for each dialog not tested one by one; the audit only checks the skip link, the focus
   ring on it, Ctrl K and Escape on the assistant.
5. **Tap targets of 44×44 px**: the new controls (text size, pause) meet it; elsewhere only the WCAG 2.2 AA minimum
   of 24×24 px is enforced by axe (`target-size`).
6. **Lighthouse Performance** on mobile is 70–83 on the demo laptop, both before and after this pass (not caused by it).

## Decisions taken in this pass
- Body text 16 px and no label under 14 px, all in rem. The dense console keeps its layout: the side rails scroll
  instead of overlapping, the top bar wraps on narrow screens.
- "Pause animations" uses the same path as `prefers-reduced-motion` (the flame is drawn still), plus a CSS rule that
  stops every CSS animation.
- The English check and the accessibility audit use `playwright-core` and `axe-core` from outside the repository, like
  `check_static_site.mjs`; they are not dependencies.
