# Detailed Project Description

## Problem
The challenge *Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data* asks how decades of
microgravity combustion experiments can inform fire safety for Moon and Mars missions. Future habitats are expected to use
"intermediate" atmospheres (the challenge text: 30% oxygen or more at 10.2 psi or less). The data exist in NASA Physical
Sciences Informatics (PSI), but they are spread across spreadsheets and documents, with different units, free-text notes
and conditions that were chosen to find extinction limits, not to sample atmospheres evenly. It is hard to see what the
evidence actually covers.

## What the site does
A one-page dashboard (works fully as a static site, with no server and no AI model):
- **Atmosphere scenarios:** Earth/ISS air (21% O2, 14.7 psi), the challenge's expected Moon-base air, a NASA lunar habitat
  atmosphere (26.5% O2, 10.2 psi), the NASA Exploration Atmosphere (34% O2, 8.2 psi) and a spacesuit atmosphere (100% O2,
  4.3 psi). For each one the site counts exact and near FLEX tests (tolerance ±0.01 O2 and ±0.5 psi). Earth/ISS: 49 tests.
  Moon-base air: **0 exact and 17 near** tests (10.33–10.50 psi, 30–34% O2; outcomes: 15 disruption, 2 completion). The other
  three: 0, and the site shows the closest tested condition, labelled "not this scenario". Three scenario sources are
  marked "Unverified source" until a team member confirms the citation.
- **Custom explorer:** the user sets fuel, O2, pressure and suppressant (CO2/He). The site retrieves the FLEX tests observed
  within the tolerance and shows n, outcome counts, mean burning rate and mean extinction diameter (extinction tests only).
  A chamber illustration responds to those observed tests: brightness follows the observed mean burning rate on one fixed
  scale; it is grey when n < 5 and empty (hatched, no numbers) when no test is close, with up to 3 closest tested
  conditions. It never interpolates or extrapolates.
- **Coverage map:** FLEX fuel × O2 band × pressure level. 20 of 30 cells have tests; 10 are empty.
- **Experiment table:** all 403 tests, filterable, with quality flags and CSV export.
- **Fuels:** heptane vs methanol burning rate by O2 band (descriptive, with n).
- **Materials (context):** BASS-II solid materials (PMMA rods, films and sheets, fabrics, a candle). A category is
  "flammable_demonstrated" only if at least one test with a stated outcome shows a flame; no material is called non-flammable.
- **Gaps:** 8 stated gaps, e.g. no FLEX test below 10.18 psi, none above 34% O2, none between 25% and 30% O2, and no
  partial-gravity data at all.
- **SI assistant:** "Basic" mode (no model) answers 10 suggested questions with precomputed, cited answers and a fixed
  template for any test ID. Optional local modes (Flash/Medium/Heavy) use a local LLM through Ollama on the demo machine.

## How it works
NASA PSI files (FLEX PSI-69 and BASS-II PSI-25, CC0-1.0) → Python scripts that keep raw files untouched and verify them
by SHA-256 → processed tables (`experiments.csv`, 403 rows, one schema) → read-only SQLite → parameterised queries
(`src/psi_queries.py`) → static JSON files for the website. Every number in the site is computed by code from these
files; nothing is typed by hand. Doubtful values are not corrected but flagged (`qc_flags`). BASS-II outcomes were
extracted by AI from free-text notes and are labelled as such.

The optional API (Python, FastAPI) serves the same queries. Its `/ask` endpoint lets a local model **choose one of a fixed
list of query functions** (it cannot write SQL or run anything else) and draft at most 3 sentences from the result. Code
then checks the text: every number must appear in the query result, and words such as "safe", "will" or "predict" are
rejected, as are claims about the Moon, Mars or a single gas causing an effect. If the check fails, a fixed template
built from the data is shown instead. Citations (DOI and test IDs) are always added by code, never by the model.

**Honest status of the local AI:** the pipeline is tested with a simulated model (automated tests) and was run with two real local models on the demo laptop: Llama 3.2 3B and Qwen3 8B (12-question benchmark in `docs/bench/`). Qwen3 14B was not downloaded and is not evaluated. Model text is checked by code and, when it fails, a fixed template is shown; this does not guarantee that every sentence is correct.
The public site does not depend on it.

## What it does not do (limitations)
- **No predictive model.** Percentages of extinction in FLEX are descriptive, not probabilities: FLEX chose conditions
  step by step to find the extinction limit.
- **All data are microgravity on the ISS.** There is no partial-gravity (Moon/Mars) or normal-gravity data in PSI, so the
  site makes no claim about how fire behaves on the Moon.
- The expected Moon-base air has **no exact test**; the 17 "near" tests are near, not lunar.
- CO2 and helium effects are confounded with oxygen; we do not attribute effects to one gas.
- Cells with n < 5 always carry a warning. "Disruption" is not defined by the FLEX documents.
- BASS-II has no recorded pressure, and 103 of 129 tests have no stated outcome ("not stated" does not mean the flame went out).
- These are exploratory findings by a student team, not NASA guidance.

## Benefits
It shows planners and researchers, in one place, which cabin atmospheres have real test evidence, how strong it is (n),
and where new experiments would fill gaps, for example at lunar-habitat pressure and 25–30% oxygen.

## What we hope to achieve / next steps
Add more PSI combustion investigations, confirm the unverified atmosphere sources, review every AI-extracted outcome by
hand, test the local assistant with real models, and use future partial-gravity data when it exists.

## Tools and languages
Python 3.12 (pandas, numpy, openpyxl, sqlite3, FastAPI, Pydantic, httpx, pytest), TypeScript + React 18 + Vite + Vitest,
SVG/CSS for all graphics (no 3D library), Ollama for optional local models, GitHub. AI assistants: Anthropic Claude
(Claude Code and claude.ai). Team: Stars Rippers, Universidad Politécnica de Querétaro (UPQ), NASA Space Apps 2026, UNAQ.

---
Length: ~6,050 characters (~990 words). No limit stated in the 2026 guide: **MANUAL — check the live form counter**; if it is shorter, cut the "Benefits" and "Tools" sections first.
