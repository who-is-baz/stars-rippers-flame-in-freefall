# Frontend · Flame in Freefall

Single-page dashboard for the Stars Rippers entry to the NASA Space Apps Challenge 2026.
Vite + React 18 + TypeScript (strict). The site is **100% static**: everything it shows is read from
`public/data/*.json`. No backend, no model and no network call is needed for it to work.

## Run

```bash
cd frontend
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # Vitest + Testing Library (28 tests)
npm run build      # type-check + build → dist/
npm run preview    # serves dist/ at http://127.0.0.1:4173
```

## Publish (GitHub Pages, Netlify, Vercel)

`npm run build` and upload `dist/`. The default base is `./` (relative paths), so the build works from the
domain root and from any sub-directory without changes. To force a base path:

```bash
VITE_BASE=/nasa-psi-hackathon/ npm run build
```

## Assistant levels and `VITE_LLM_URL`

| Level | What answers | Public site |
|---|---|---|
| Basic | No model. Precomputed answers from `answers.json`, plus a fixed template for a single test ID | Works |
| Flash, Medium, Heavy | Local AI endpoint | Disabled: "Local AI — runs on the demo machine" |

To enable the local levels on the demo machine, set the endpoint **at build time** (or in `.env.local` for `npm run dev`):

```bash
VITE_LLM_URL=http://127.0.0.1:8000 npm run build
```

Without a build variable, the panel has a **Connect local AI** button: it calls `GET http://127.0.0.1:8000/llm/status`
(the browser never talks to Ollama directly) and unlocks only the levels whose model is installed. States:
connecting · connected (model list, `ollama pull <tag>` for missing ones) · API not detected · Ollama not detected.
`VITE_API_URL` is accepted as an alias of `VITE_LLM_URL`; `VITE_LLM_TIMEOUT_MS` changes the 15 s timeout.

The site calls `POST <VITE_LLM_URL>/ask` with `{"question", "level", "model"}` and reads
`{"answer", "citations": [{"query", "source_doi", "test_ids", "test_ids_total"}], "no_data", "meta": {"mode", "warnings"}}`
(see `docs/07-api-contract.md`).

- Level → API: Basic → `low`; Flash → `medium` + `llama3.2:3b`; Medium → `medium` + `qwen3:8b`; Heavy → `high` + `qwen3:14b`
  (tags come from `/llm/status`).
- `meta.mode`: `ollama` → "AI-generated text"; `fallback` (model text failed verification) and `low` (fixed rule)
  are shown as "no model" with a notice.
- If the endpoint fails, returns an error (503 = no local model) or takes more than 15 s, the answer comes from Basic and says so.
- Citations from the endpoint are shown only if their DOI is one of the two datasets and their test IDs exist in
  `experiments.json`. The API sends at most 20 IDs per citation; `n` uses `test_ids_total`.
- The endpoint must allow cross-origin requests (CORS) from the page.

## Structure

```
src/
  design/tokens.css      all design tokens (colour, radius, blur, spacing, type) — the only place with raw values
  design/global.css      layout and component styles
  data/                  types written from the real JSON files, one cached load, hooks
  lib/                   honesty.ts (rule texts), format.ts (units), filters.ts, table.ts (filter/sort/CSV), scenario.ts
  components/ui.tsx      Badge, Warn, QcChip, Segmented, Section, Skeleton, ErrorState…
  sections/              Hero, ScenarioExplorer, CoverageMap, ExperimentTable, FuelComparison, Materials, Gaps
  assistant/             engine.ts (Basic routing, remote call, fallback) and Sidebar.tsx
  state/ui.tsx           "show these tests in the table" and "open the assistant"
  test/                  test setup and the five honesty tests
```

Keyboard: `Ctrl/⌘ + K` opens and closes the assistant, `Esc` closes it. Opening the page at `#assistant` shows it directly.

## Data honesty rules enforced in code

- Every number is read from a data file. The browser only counts, filters, sorts and formats; it computes no averages or percentages.
- FLEX "% ended in extinction" always appears with its `pct_note` and its n. Cells with n < `meta.min_n` are grey with a warning. Empty cells say "No data".
- BASS-II shows counts only: no percentage appears in the Materials section (there is a test for this).
- "Disruption" is always followed by "not defined by the source". AI-extracted outcomes carry a badge.
- Tests near a lunar atmosphere are shown as "near match" and are never called lunar tests.

## Known differences between the data files and `docs/07-api-contract.md`

- `coverage.json` uses `pressure_level`; the contract says `pressure_atm_level` (TODO in `src/data/types.ts`).
- `low_confidence_warning` is not in any JSON; the UI shows the contract's fixed text when a row or group has the `low_confidence` flag.
- `experiments.json` has no `suppressant` column; it is derived from `co2_fraction` / `he_fraction` (FLEX only). A test checks that this reproduces the counts in `answers.json`.

## Credits

Data: NASA Physical Sciences Informatics (PSI), CC0-1.0 — FLEX (PSI-69) doi:10.60555/mbq8-0451, BASS-II (PSI-25) doi:10.60555/4qc4-de67.
Code: Apache-2.0. Interface design assisted by AI. Font: Inter (SIL OFL 1.1, bundled). Icons: lucide (ISC).
