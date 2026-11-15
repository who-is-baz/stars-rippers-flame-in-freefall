# Decisions (15 Nov 2026, submission day)

The earlier decision log was condensed into `docs/AI_USAGE.md` before publishing; this file records the decisions
taken after that.

| Decision | Why |
|---|---|
| Dark stays the default theme; a soft Light theme is optional (Display panel, remembered, `?theme=light` for links). | The design is built around the dark chamber scene; Light helps visitors who need it. |
| The flame scene keeps a dark zone in both themes. | The fire and its glow are only legible on a dark background. |
| Body text 16 px, no label under 14 px, sizes in rem; Text size control A− / A / A+. | Low-vision readers; zoom and the control scale everything. |
| Pause animations uses the same path as `prefers-reduced-motion`. | One still, readable flame instead of two code paths. |
| Audit tools (axe-core, playwright-core, Lighthouse) stay outside the repository. | They are test tools, not dependencies of the site. |
| Performance figures are reported from the build served **with compression** (gzip, like Netlify), 3 Lighthouse runs. | Serving without compression (`python -m http.server`) gave 70 for every version, including the one before these changes; that measures the test server, not the site. |
| Lighthouse mobile, 15 Nov: Dark 92–93 / 100 / 100 / 100, Light 92 / 100 / 100 / 100 (performance / accessibility / best practices / SEO). Same build before the accessibility work: 93 / 100 / 96 / 100. Deployed site: performance 97, 77, 98 (network variance). | Real, current numbers; no "95+" claim. |
| Preloading `experiments.json` was tried and **not** kept. | 92–93 with and without it: no gain, so no change. |
| The repository homepage, description and topics point to the live site. | Anyone landing on GitHub can open the demo. |
