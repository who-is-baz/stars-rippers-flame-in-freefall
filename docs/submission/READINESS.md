# Submission readiness — 15 Nov 2026, updated ~03:00 (UNAQ time). Global deadline: Sun 15 Nov, 23:59.

| Requirement | Status | Evidence / note |
|---|---|---|
| Form: 8 fields drafted in English | **PASS (draft)** | `project_name.md`, `high_level_summary.md` (839 chars), `demo_link.md`, `final_project_link.md`, `detailed_description.md` (~6,050 chars), `use_of_si.md`, `nasa_data.md`, `references.md`. Character limits are **not stated** in the 2026 guide → check the live form counters. |
| Demo ≤30 s or ≤7 slides | **PASS (script ready) / MANUAL (record)** | `DEMO_PLAN.md`: 29 s video with timed shots and ~70-word English narration, or 7 slides. Not recorded yet. |
| Public link to the site | **MANUAL** | Team publishes `frontend/dist` (static). Test in a private window. |
| Public repository | **PASS** | Already PUBLIC (`gh repo view`). Secrets scan of the full history: 0 findings (`docs/maintenance/SECURITY_REPORT.md`). Team e-mail addresses are visible in commit metadata: decision for the team. |
| LICENSE (Apache-2.0) and third-party licenses | **PASS** | `LICENSE` = canonical Apache-2.0 text (md5 3b83ef96…). `THIRD_PARTY.md`: all permissive; MPL-2.0 only in `certifi` and build-only `lightningcss`; Inter font (OFL-1.1) bundled. No GPL family. README states code Apache-2.0, data CC0-1.0, use of AI. |
| SI declared | **PASS** | `use_of_si.md`, README, `docs/AI_USAGE_LOG.md`, `AI-assisted: yes` commits, `ai_*` columns, "AI-generated text" label. The 3 AI-generated design images were deleted (`docs/maintenance/CLEANUP_REPORT.md`). |
| References | **PASS (MANUAL checks marked)** | `references.md`: data, PMMA article, every atmosphere source with verified/unverified, software, fonts, models (licenses checked on Hugging Face model cards on 15 Nov), pre-event preparation. |
| Tests and build | **PASS** | Python 331 passed + 68 skipped (Ollama integration/real-model); Vitest 159 passed; `tsc` + `vite build` OK; `scripts/audit_numbers.py`: 182 checks, 0 discrepancies. |
| Static site, no third parties | **PASS** | Fonts self-hosted; `scripts/check_static_site.mjs` at `/` and in a sub-directory, 390/768/1280 px: 0 console errors, 0 failed or external requests. `frontend/dist` and `site.zip` ready; **not deployed** (no Netlify session). |
| Assistant scope | **PASS** | One refusal for anything outside the PSI data (`src/backend/scope.py`, mirrored in Basic, 78 shared cases, no model call). |
| Site without backend (Basic only) | **PASS** | Production build, no `VITE_LLM_URL`: 0 console errors/warnings; 0 requests to :8000 or :11434; Flash/Medium/Heavy disabled with "Local AI — runs on the demo machine"; Basic answers the lunar-gravity trap with "No data". Only external requests: Google Fonts. |
| Lighthouse (local `vite preview`, Lighthouse 12.8.2, system Chrome) | **PASS** | Mobile before → after: Performance 95→97, Accessibility 95→100, Best practices 93→100, SEO 91→100. Desktop: 100→98 (run-to-run noise), 100→100, 96→100, 91→100. |
| Mobile without horizontal overflow | **PASS** | `scrollWidth == innerWidth` at 390 px and 768 px, default and Custom; no element wider than the viewport. |
| Local AI models (Ollama) | **NOT RUN** | Ollama not reachable (`~/.ollama` points to an unmounted disk). Benchmark and `-m ollama` tests skipped; no claim of model quality is made anywhere. |

## Manual actions for Baz (most urgent first)
0. **Decide on the team e-mail addresses visible in the public git history** (`docs/maintenance/SECURITY_REPORT.md`) and **revoke the `keygithub` token** if still active.
1. **Record the demo** with `docs/submission/DEMO_PLAN.md` (Basic mode is enough) and check it is ≤ 0:30; upload, set public, paste in `docs/submission/demo_link.md` and in the form.
2. **Publish the site**: drag `frontend/dist` (or unzip `site.zip`) to https://app.netlify.com/drop, or run the `pages` workflow (repo is public). Steps: `docs/submission/DEPLOY.md`. Test in a private window and paste in `docs/submission/final_project_link.md`. Then optionally `docs/submission/FORTIGUARD.md`.
3. (done) clean-up and secrets review: see `docs/maintenance/`.
4. Confirm **team members' full names** (`DEMO_PLAN.md`, form) and that the team lead reviewed `docs/submission/use_of_si.md` (it says so).
5. Paste the 8 fields into the form (check each character counter), tick *Terms and Conditions* and *Confirm All Work is Original*, **Submit for Judging** with ≥ 3 h margin; reopen in a private window.
6. Optional before the video: mount the "Windows Extend" disk, `ollama serve`, then `python -m pytest -m ollama -rs` and `python scripts/bench_models.py`; only show a model level if those pass.
7. Pending confirmations listed in `references.md`: Sora/IBM Plex Mono license on Google Fonts, the 3 unverified atmosphere sources, pre-event documentation with the Local Lead.
