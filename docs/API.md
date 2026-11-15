# API contract (aligned with `src/psi_queries.py`)

Base: `/api`. FastAPI + Pydantic generate the OpenAPI document (`/docs`). Implementation: `src/backend/` (`uvicorn backend.app:app --app-dir src`).
The same routes also answer **without** `/api` (an alias hidden from OpenAPI) because the front end calls `<VITE_LLM_URL>/ask`.
Without the backend, the front end reads its static files (`frontend/public/data/*.json`), built from
`data/processed/experiments.csv` and `coverage_grid.json`.

**Naming standard:** fields have the same names as in `src/psi_queries.py`, `experiments.csv` and `coverage_grid.json`.
The API **renames** nothing; if a name changes, it changes in the code first and then here, so the static files and
the API return the same thing.

## Rules for every response
- Each response is an object with the endpoint data plus two common fields added by the API layer:
  - `sources`: list of DOIs (union of the `source_doi` of the returned rows).
  - `limitations`: a short list of English texts (from `docs/data-dictionary.md`, "Known limitations").
- Every row carries its own `source_doi` (a list in aggregated rows, text in `/experiments` rows) and `qc_flags` (list).
- Nulls are never imputed.
- Every row with a `pct_*` field carries `pct_note: "descriptive, not a probability"` and `warning`: `null` if `n ≥ 5`, or
  `"n<5: unstable percentage; do not read it as a rate"` if `n < 5`.
- If a row includes AI extractions flagged `low_confidence` (BASS-II P5, P13a, O6), it carries
  `low_confidence_warning: "includes low-confidence AI-extracted outcomes (pending human review); show them with a warning"`.
  The UI shows it and the assistant mentions it in its answer.
- The UI and every response text are in **English**. The texts come from the constants `PCT_NOTE`, `SMALL_N_WARNING` and
  `LOW_CONFIDENCE_WARNING` in `src/psi_queries.py`; they are never typed in the API.

## O₂ bands (fraction)
`<0.15` = [0, 0.15) · `0.15-0.18` · `0.18-0.21` · `0.21-0.24` (0.21 = air opens this band) · `>=0.24`.
Rows are ordered by O₂ value, not alphabetically by label.

## Endpoints → functions
Range → tuple: `o2_min`/`o2_max` → `o2_range=(o2_min, o2_max)` and `pressure_min`/`pressure_max` → `pressure_range`
(either end may be missing). `con` is supplied by the API (`psi_queries.connect()`, read only).

| Method | Route | Function | Parameters | Returns |
|---|---|---|---|---|
| GET | `/meta` | `meta(con)` | — | `{programs:[{program, n, o2_min, o2_max, pressure_min, pressure_max, source_doi, materials, material_categories}], suppressants, outcomes, o2_bands, min_n, queries, source_doi}` |
| GET | `/experiments` | `list_experiments(con, …)` | `program`, `fuel`, `o2_min`, `o2_max`, `pressure_min`, `pressure_max`, `suppressant`, `outcome`, `limit`, `offset` | `{total, items:[row of experiments.csv]}`; in each row `qc_flags` is a list and, when it applies, `low_confidence_warning` |
| GET | `/coverage` | `flex_coverage_grid(con)` | `fuel`, `suppressant` ∈ `none`,`co2`,`he`,`co2+he` (the API filters the returned cells in memory) | `{program:"FLEX", cells:[…]}`, see below |
| GET | `/queries/q1_extinction_rate_by_o2_pressure` | Q1 `extinction_rate_by_o2_pressure` | `program`=FLEX, `fuel`=methanol, `o2_*`, `pressure_*`, `suppressant`=none | `{pressure_atm, o2_fraction, n, n_extinction, pct_extinction, …common}` |
| GET | `/queries/q2_co2_effect` | Q2 `co2_effect` | `fuel`, `o2_*`, `pressure_*` (default 0.9–1.1) | `{fuel, pressure_atm, co2_fraction, n, pct_extinction, avg_o2_fraction, avg_burning_rate_mm2_s, …common}` |
| GET | `/queries/q3_he_effect` | Q3 `he_effect` | `fuel`, `o2_*`, `pressure_*` (default: all) | same as Q2 with `he_fraction` |
| GET | `/queries/q4_burning_rate_by_o2` | Q4 `burning_rate_by_o2` | `fuel`, `o2_*`, `pressure_*` (default 0.9–1.1), `suppressant`=none | `{fuel, o2_fraction, n, n_k, min_burning_rate_mm2_s, avg_burning_rate_mm2_s, max_burning_rate_mm2_s, …common}` |
| GET | `/queries/q5_extinction_diameter_by_pressure` | Q5 `extinction_diameter_by_pressure` | `fuel`, `o2_*`, `pressure_*`, `suppressant`=any | `{fuel, pressure_atm, n, n_d, avg_extinction_diameter_mm, min_extinction_diameter_mm, max_extinction_diameter_mm, …common}` |
| GET | `/queries/q6_bass2_outcomes_by_o2_band` | Q6 `bass2_outcomes_by_o2_band` | `material`, `o2_*` | `{o2_band, n, n_low_flow_extinction, n_blowoff, n_no_ignition_or_not_sustained, n_not_stated, pct_outcome_stated, …common}`. **No extinction %.** |
| GET | `/queries/{name}` | Q1–Q6 by name (the shape actually implemented) | those of each row above; a parameter the query does not accept → 400 | `{query, params, rows:[…], sources, limitations}` |
| GET | `/ranking` | **Not implemented.** The front end does not use it | `fuel`, `w_burning_rate`, `w_ext_diameter`, `w_confidence` (proposal) | — |
| GET | `/compare` | `get_experiment(con, test_id, program)` | `a`, `b` = `test_id` or `PROGRAM:test_id` (193F001 is repeated in FLEX: both rows are returned) | `{a:[rows], b:[rows], same, different}` (`same`/`different` compare the first row of each side); 404 if it does not exist |
| GET | `/gaps` | `build_gaps` from `scripts/build_frontend_data.py` (same content as `gaps.json`) | — | `{gaps:[{id, text, evidence, source_doi}]}` |
| POST | `/ask` | picks among the tools of `src/backend/tools.py` (Q1–Q6, `list_experiments`, `get_experiment`, `scenario`, `meta`) | `{question (1–500 chars), level: "low"\|"medium"\|"high", model?: string}` | `{answer, citations:[{query, params, source_doi, test_ids, test_ids_total}], tool_calls, no_data, meta:{level, model, mode, ms, warnings}}`; `query` is the tool key (e.g. `q4_burning_rate_by_o2`) |
| GET | `/llm/status` | queries Ollama's `GET /api/tags` (1.5 s timeout) | — | `{available, ollama_url, models:[{tag, tier: "flash"\|"medium"\|"heavy", installed}]}`; if Ollama does not answer: `available:false` with **200** |

"…common" = `n`, `qc_flags`, `source_doi` and, when they apply, `pct_note`, `warning` and `low_confidence_warning`.

**PROVISIONAL** = the route and its shape may change without counting as a contract change. Before implementing it,
its function must be added to `src/psi_queries.py` (there is no SQL outside that file) and the mark removed here.

### `outcome`, `limit` and `offset` in `/experiments`
They are implemented in `list_experiments`:
- `outcome` ∈ `extinction`, `disruption`, `completion`, `blowoff`, `no_ignition`, `not_sustained`, `not_stated`.
  `not_stated` returns the BASS-II tests whose notes state no outcome: **it does not mean they did not go out**.
- `limit` between 1 and 500 (default 100); `offset` ≥ 0 (default 0). Stable order: `program`, `test_id`.
- `total` counts every row that matches the filters, not only the page.

Reason: the front-end table needs to filter by outcome and paginate, and the API cannot do it with SQL of its own.

## Example `/coverage` cell (real, from `coverage_grid.json`)
```json
{
  "fuel": "methanol", "o2_band": "0.21-0.24", "pressure_atm_level": "1.0", "suppressant": "none",
  "n": 12, "suppressant_fraction_min": 0.0, "suppressant_fraction_max": 0.0,
  "o2_fraction_min": 0.21, "o2_fraction_max": 0.21,
  "n_burning_rate": 12, "avg_burning_rate_mm2_s": 0.501,
  "n_extinction": 9, "n_extinction_diameter": 8, "avg_extinction_diameter_mm": 1.248,
  "n_disruption": 3, "n_completion": 0,
  "pct_extinction": 75.0, "pct_note": "descriptive, not a probability", "warning": null,
  "qc_flags": ["extinction_diameter_dropped_outcome_not_extinction"], "source_doi": ["10.60555/mbq8-0451"]
}
```
`pressure_atm_level` is text: pressure rounded to 0.1 atm, or `"unknown"` when it is null (C11M201).

## `/ask`
- `low`: no LLM; the question is routed by rules to one of the Q1–Q6 functions and answered with a template.
- `medium`: a small model picks the function and its parameters; it writes with citations.
- `high`: a larger model, in several steps, and every citation is checked to exist.
- No evidence: `{"answer": "No data available for that question.", "no_data": true}`.
- **The `low` mode must work without Ollama** (the public link has no local model).

### Additive extension (does not break consumers)
- **`model`** (optional) in the request: an Ollama tag. It must be one of those in `/llm/status`
  (`FLASH_MODEL`=llama3.2:3b, `MEDIUM_MODEL`=qwen3:8b, `HEAVY_MODEL`=qwen3:14b by default); otherwise **400**.
  Without `model`: `medium` uses `MEDIUM_MODEL` and `high` uses `HEAVY_MODEL`. Ignored in `low`.
- **`meta`** (additive) in the response: `level`, `model` (null in low), `mode` (`low` = rules without a model,
  `ollama` = text written by the model and verified, `fallback` = the model failed verification or gave no valid call
  and the template is shown), `ms`, `warnings` (mandatory notices: n<5, not a probability, CO₂/He–O₂ confounding,
  `not_stated`, low confidence, reason for the fallback).
- **`test_ids`**: at most 20 per citation; **`test_ids_total`** gives the total (e.g. Earth/ISS: 20 of 49).
- `citations`, `test_ids` and `no_data` are computed by **code**, never by the model. No tests → `citations: []`.
- Off topic → `"That is not in the PSI data shown on this page."` with `no_data: true`.
- Interface map: Basic=`low`; Flash=`medium`+`FLASH_MODEL`; Medium=`medium`+`MEDIUM_MODEL`;
  Heavy=`high`+`HEAVY_MODEL`.
- **`meta.kind`** (`"about"` | null), **`meta.section`** and **`meta.suggestions`** (list of suggested questions): additive. A question about the page itself is answered with fixed text (`tool_calls: [{tool: "about", id}]`, `citations: []`, `no_data: false`, no model); the fixed refusal ("I can only answer questions about the NASA PSI combustion data shown on this site.", `no_data: true`) carries `meta.suggestions`.
- `503` if Ollama does not answer, the model is not installed or the call fails; the front end falls back to Basic.

## Errors
`400` invalid parameters: the functions raise `ValueError` with the reason and the API returns it as is (`{"detail": "…"}`).
FastAPI/Pydantic validation errors (type, range) are also returned as `400`, not `422`.
`503` also when `psi.sqlite` is missing (the `detail` says which script to run).
`404` unknown test_id. `503` LLM not available (the client falls back to `low`).

## Changes to this contract
Any change to this contract must update the backend (`src/backend/`) and the front end (`frontend/src/data/types.ts`) together.
