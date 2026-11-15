# Flarefall

## Live demo

- **Site:** https://flame-in-freefall-explorer.netlify.app/ (add `?theme=light` for the light theme)
- **Demo slides:** https://canva.link/gaifyja4tjt8bor
- **Repository:** https://github.com/who-is-baz/stars-rippers-flame-in-freefall

An evidence-first dashboard of NASA's ISS fire tests (FLEX, BASS-II) by cabin atmosphere. The public site runs in Basic
mode (no model, no server); the local AI assistant (Ollama) is optional.

**An evidence map, not a guess: it shows what NASA's microgravity combustion data can and cannot tell a Moon-base designer.**

Flarefall is an interactive dashboard built for the NASA Space Apps Challenge 2026 challenge *Flame in Freefall*.
It organises **403 fire tests run on the International Space Station** (274 FLEX fuel-droplet tests and 129 BASS-II
solid-material tests, from NASA Physical Sciences Informatics) by cabin atmosphere. For each atmosphere it shows which
tests are closest, how they ended, what is covered, what is missing, and which investigations NASA has run on each
fire-safety pillar (prevention, detection, suppression).

**Main finding:** for the Moon-base air expected in the challenge (30% O₂ or more at 10.2 psi or less) the FLEX data has
**0 exact tests and 17 near ones**, and no FLEX test below 10.18 psi or between 25% and 30% O₂. All PSI data are
microgravity: there is no partial-gravity (Moon or Mars) combustion data yet.

| Dashboard (Moon-base air) | Experiments ordered by relevance |
|---|---|
| ![Dashboard with the Moon-base atmosphere selected](docs/screenshots/dashboard-moon.png) | ![Experiments view ordered by relevance](docs/screenshots/experiments.png) |

Every number on the site is computed from the data files and shows its sample size (n) and source DOI. The site is
descriptive: **no safety rating, no risk score, no forecast.** Where there is no test it says "No data".

## Run it

```bash
cd frontend
npm ci
npm run dev        # http://127.0.0.1:5173  (add ?intro=off to skip the opening animation)
npm run build      # static site in frontend/dist, works on any static host (relative paths)
npm test
```

Optional Python pipeline and API (Python 3.12):

```bash
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt   # Windows: .venv\Scripts\pip
python scripts/build_experiments.py          # rebuilds data/processed/psi.sqlite from the CSVs (no network)
python -m pytest
```

Full setup, data regeneration and the optional local assistant (Ollama): [`docs/SETUP.md`](docs/SETUP.md).

## Repository

```
frontend/          React + TypeScript site (Vite). public/data/*.json = the data the site reads
src/               Python: read-only queries over SQLite, scenarios, relevance, optional FastAPI backend
scripts/           data pipeline (fetch, process, build), audit_numbers.py (independent recomputation), smoke tests
data/processed/    processed tables (CSV, JSON) built from the NASA files
tests/             Python tests
docs/              setup, data dictionary, API, data sources, AI use, challenge text, submission links
```

## Data and licences

- **Data:** NASA Physical Sciences Informatics, **CC0-1.0**. FLEX (PSI-69) DOI
  [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451) · BASS-II (PSI-25) DOI
  [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67). Details: [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md),
  column definitions: [`docs/data-dictionary.md`](docs/data-dictionary.md).
- **Code:** Apache-2.0 ([`LICENSE`](LICENSE)). Third-party software and fonts: [`THIRD_PARTY.md`](THIRD_PARTY.md).

## Use of AI

- **Design and code with AI assistance:** AI tools (Anthropic Claude) wrote most of the code, tests and documentation
  under the team's direction. The logo was generated with Gemini.
- **AI-extracted data:** BASS-II has no outcome column; AI-written rules extracted an outcome for **26 of 129** tests (and
  air speeds) from free-text notes. These are labelled "AI-extracted" in the data and on the site.
- **Optional local assistant:** the API can use a local model through Ollama; its text is checked by code against the
  data and replaced by a fixed template if the check fails. The public static site does not use a model.
- **What the team reviewed:** the data files and processing decisions, the material mapping, design decisions and
  dependencies. Most code is checked by automated tests and an independent recomputation of every figure
  (`scripts/audit_numbers.py`) rather than line by line.

Full statement: [`docs/AI_USAGE.md`](docs/AI_USAGE.md); session log: [`docs/AI_USAGE_LOG.md`](docs/AI_USAGE_LOG.md).

## Accessibility

All display settings are in the **Display** button of the top bar and are remembered:
- **Theme:** Dark (default) or a soft Light theme (off-white surfaces, near-black text, darker accents). The flame
  scene keeps its own dark panel in both themes. `?theme=light` in the address shows it without saving.
- **Higher contrast** (stronger borders and secondary text; on automatically with the system's "more contrast" setting).
- **Text size** A− / A / A+, scaling the whole interface; body text is 16 px and no label is smaller than 14 px.
- **Pause animations** stops the flame, stars and particles; the site also follows the system's reduced-motion setting.
- Keyboard: "Skip to main content" link, visible focus ring, Ctrl K / ⌘K opens the assistant, Esc closes it and the
  Display panel. Status labels carry text, not only colour; the flame scene has a text alternative.

Checked on the static site: **axe-core** (WCAG 2.2 AA rules) in 32 views and states, at 390 and 1280 px, in both
themes: 0 serious or critical violations. Contrast of the colour tokens computed for both themes (146 pairs).
**Lighthouse** (mobile, 15 Nov 2026, built site served with gzip like a production host, 3 runs each):

| Theme | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Dark | 92–93 | 100 | 100 | 100 |
| Light | 92 | 100 | 100 | 100 |

The deployed Netlify site measured 97 / 77 / 98 for performance in three runs (network variance). Scripts:
`scripts/check_a11y.mjs`, `scripts/check_contrast.mjs`, `scripts/check_english.mjs`; screenshots of every view in both
themes: `docs/screenshots/theme-*.png`. Accessibility statement: [`docs/submission/ACCESSIBILITY.md`](docs/submission/ACCESSIBILITY.md).

## Limits

Microgravity on the ISS only (no partial-gravity data in PSI). FLEX extinction shares are descriptive, not probabilities.
Cells with n < 5 carry a warning. CO₂ and helium effects are confounded with oxygen. "Disruption" is not defined by the
source. BASS-II records no pressure and 103 of 129 of its tests have no stated outcome ("not stated" does not mean the
flame went out). These are exploratory findings by a student team, not NASA guidance.

## Team

Stars Rippers, Universidad Politécnica de Querétaro (UPQ), NASA Space Apps Challenge 2026, UNAQ (Querétaro).
Uses NASA open data. **Not endorsed by NASA.**
