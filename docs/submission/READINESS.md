# Submission readiness — 15 Nov 2026, ~01:45 (UNAQ time). Global deadline: Sun 15 Nov, 23:59.

| Requirement | Status | Evidence / note |
|---|---|---|
| Form: 8 fields drafted in English | **PASS (draft)** | `project_name.md`, `high_level_summary.md` (839 chars), `demo_link.md`, `final_project_link.md`, `detailed_description.md` (~6,050 chars), `use_of_si.md`, `nasa_data.md`, `references.md`. Character limits are **not stated** in the 2026 guide → check the live form counters. |
| Demo ≤30 s or ≤7 slides | **PASS (script ready) / MANUAL (record)** | `DEMO_PLAN.md`: 29 s video with timed shots and ~70-word English narration, or 7 slides. Not recorded yet. |
| Public link to the site | **MANUAL** | Team publishes `frontend/dist` (static). Test in a private window. |
| Public repository | **MANUAL** | Repo is private; make public only after the separate clean-up / secrets review. |
| LICENSE (Apache-2.0) and third-party licenses | **PASS** | `LICENSE` = canonical Apache-2.0 text (md5 3b83ef96…). `THIRD_PARTY.md`: all permissive; MPL-2.0 only in `certifi` and build-only `lightningcss`; Inter font (OFL-1.1) bundled. No GPL family. README states code Apache-2.0, data CC0-1.0, use of AI. |
| SI declared | **PASS** | `use_of_si.md`, README, `docs/AI_USAGE_LOG.md`, `AI-assisted: yes` commits, `ai_*` columns, "AI-generated text" label. Open item: 3 AI-generated images in `docs/design/` need a visible watermark or removal before the repo is public. |
| References | **PASS (MANUAL checks marked)** | `references.md`: data, PMMA article, every atmosphere source with verified/unverified, software, fonts, models (licenses checked on Hugging Face model cards on 15 Nov), pre-event preparation. |
| Tests and build | **PASS** | Python 129 passed + 8 skipped (Ollama integration); Vitest 70 passed; `tsc` + `vite build` OK. |
| Site without backend (Basic only) | **PASS** | Production build, no `VITE_LLM_URL`: 0 console errors/warnings; 0 requests to :8000 or :11434; Flash/Medium/Heavy disabled with "Local AI — runs on the demo machine"; Basic answers the lunar-gravity trap with "No data". Only external requests: Google Fonts. |
| Lighthouse (local `vite preview`, Lighthouse 12.8.2, system Chrome) | **PASS** | Mobile before → after: Performance 95→97, Accessibility 95→100, Best practices 93→100, SEO 91→100. Desktop: 100→98 (run-to-run noise), 100→100, 96→100, 91→100. |
| Mobile without horizontal overflow | **PASS** | `scrollWidth == innerWidth` at 390 px and 768 px, default and Custom; no element wider than the viewport. |
| Local AI models (Ollama) | **NOT RUN** | Ollama not reachable (`~/.ollama` points to an unmounted disk). Benchmark and `-m ollama` tests skipped; no claim of model quality is made anywhere. |

## Manual actions for Baz (most urgent first)
1. **Record the demo** with `docs/submission/DEMO_PLAN.md` (Basic mode is enough) and check it is ≤ 0:30; upload, set public, paste in `docs/submission/demo_link.md` and in the form.
2. **Publish the site** (`cd frontend && npm run build`, upload `frontend/dist/`), test in a private window, paste in `docs/submission/final_project_link.md`.
3. Run the **separate clean-up / secrets prompt**, then make the GitHub repo public; decide on the 3 AI images in `docs/design/` (watermark or remove).
4. Confirm **team members' full names** (`DEMO_PLAN.md`, form) and that the team lead reviewed `docs/submission/use_of_si.md` (it says so).
5. Paste the 8 fields into the form (check each character counter), tick *Terms and Conditions* and *Confirm All Work is Original*, **Submit for Judging** with ≥ 3 h margin; reopen in a private window.
6. Optional before the video: mount the "Windows Extend" disk, `ollama serve`, then `python -m pytest -m ollama -rs` and `python scripts/bench_models.py`; only show a model level if those pass.
7. Pending confirmations listed in `references.md`: Sora/IBM Plex Mono license on Google Fonts, the 3 unverified atmosphere sources, pre-event documentation with the Local Lead.
