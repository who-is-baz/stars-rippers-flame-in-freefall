# Space Agency Partner Data and Other References

No space agency partner data were used. Everything we used is listed below, including open-source tools.

## Data
- NASA Physical Sciences Informatics (PSI), https://psi.nasa.gov — CC0-1.0.
  - FLEX (Flame Extinguishment Experiment), PSI-69, DOI [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451): experiment table, two test result spreadsheets, a calibration sample, Science Documents (FLEX "DoD" document, FLEX Test Plan).
  - BASS-II (Burning and Suppression of Solids - II), PSI-25, DOI [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67): experiment table, Test Matrices, fan calibration, Science Documents (ReadMe, Science Requirements Document).
- Challenge statement: *Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data*, NASA Space Apps Challenge 2026 (source of the "expected Moon-base air" of 30% O2 or more at 10.2 psi or less, of the spacesuit value 100% O2 at 4.3 psi, and of the note that ACME's E-FIELD Flames only mimics partial gravity).

## Articles and reports
- Link, Huang, Fernandez-Pello, Olson and Ferkul (2018). The Effect of Gravity on Flame Spread over PMMA Cylinders. *Scientific Reports* 8:120. DOI [10.1038/s41598-017-18398-4](https://doi.org/10.1038/s41598-017-18398-4) (PMC5760683). Used for one context figure (≈17% vs ≈18% oxygen, one material only). Checked against the article by an AI session, not by a team member.

## Reference atmospheres (how each one was sourced)
| Scenario in the site | Values | Source | Verified by the team? |
|---|---|---|---|
| Earth / ISS reference air | 21% O2, 14.7 psi | Sea-level air and ISS cabin; 1 atm = 14.696 psi | Yes |
| Expected Moon-base air | ≥30% O2, ≤10.2 psi | Official challenge text (quoted) | Yes (quote checked) |
| NASA lunar surface habitat | 26.5% O2, 10.2 psi | NASA/TM-20220000524 *Moon to Mars (M2M) Habitation Considerations* (2022) p.14; NTRS 20240010692 *Evolution to Sustainable Lunar Habitation* (2024) p.12 | **No — "Unverified source"** |
| NASA Exploration Atmosphere | 34% O2, 8.2 psi | NTRS 20150021491 *Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere* (2015) p.4; NASA/TM-2013-217377 listed but **not read** | **No — "Unverified source"** |
| Spacesuit | 100% O2, 4.3 psi | Official challenge text; other sources give 85% O2 at 4.3 psia (NTRS 20220015741) or 5.0 psi | **No — "Unverified source"** |

## Software (full list with licenses: `THIRD_PARTY.md`)
- Python 3.12, sqlite3 (standard library), pandas, numpy, openpyxl, requests (data scripts).
- FastAPI, Pydantic, Starlette, Uvicorn, httpx (API); pytest (tests).
- React 18, React DOM, TypeScript, Vite, Vitest, Testing Library, jsdom (website).
- lucide-react (icons, ISC).
- Fonts: Inter (bundled via `@fontsource-variable/inter`, OFL-1.1); Sora and IBM Plex Mono (loaded from Google Fonts; OFL-1.1 as listed by Google Fonts — **MANUAL: re-check on fonts.google.com**).
- Ollama (runs optional local models on the demo machine; not bundled).
- Tools used during development only: Git and GitHub, `gh` CLI, Google Chrome and Microsoft Edge (screenshots), playwright-core (screenshots), Lighthouse (audit), license-checker and pip-licenses (license inventory), `pdftotext`.
- Design inspiration for our own guidelines: Anthropic's `frontend-design` skill and the "UI UX Pro Max" repository (nextlevelbuilder, MIT license). No code was copied from other teams.

## AI models and services (details: `use_of_si.md`)
| Model / service | Used for | License / terms (as verified) |
|---|---|---|
| Anthropic Claude Opus 5.5 and Sonnet 5.5, via Claude Code and claude.ai | Code, documentation, design guidelines, design reference images, extraction rules for BASS-II notes, submission drafts | Commercial service under Anthropic's terms (not an open license) |
| Llama 3.2 3B (Meta), via Ollama — "Flash" level | Optional local assistant; **configured, not run during the hackathon** | "Llama 3.2 Community License" (custom commercial license), per the Hugging Face model card meta-llama/Llama-3.2-3B-Instruct, checked 15 Nov 2026 |
| Qwen3 8B (Alibaba Qwen), via Ollama — "Medium" level | Optional local assistant; **configured, not run** | "apache-2.0", per the Hugging Face model card Qwen/Qwen3-8B, checked 15 Nov 2026 |
| Qwen3 14B (Alibaba Qwen), via Ollama — "Heavy" level | Optional local assistant; **configured, not run** | "apache-2.0", per the Hugging Face model card Qwen/Qwen3-14B, checked 15 Nov 2026 |

The Ollama library pages for these models did not show a license; the licenses above come from the Hugging Face model
cards. If Llama 3.2 is shown in the final demo, **MANUAL: read the Llama 3.2 Community License text for any attribution it
requires** (https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/LICENSE).

## Work prepared before the event (declared for transparency)
Before the event opened (Fri 13 Nov), the team prepared only a documentation package: README, `CLAUDE.md`, docs 00–06,
the decisions log, GitHub templates and 5 AI-assistant skills. The data download (Sat 14 Nov, 10:15 local time), all
scripts, processed tables, the API and the website were made during the event. (Source: `docs/00-reglas-y-checklist.md`
and `docs/AI_USAGE_LOG.md`.) **MANUAL: confirm with the Local Lead that this preparation is acceptable.**
