# Cleanup report — 2026-11-15

## Deleted (`git rm`)
| What | Why | Evidence |
|---|---|---|
| `0001…0005-*.patch` (5 files in the repo root) | `git format-patch` leftovers from a design PR; not part of the site, tests, scripts or docs | `grep -rn "\.patch"` over md/py/json/yml: 0 references. Contents (only `docs/design` and prompt text) are already committed as normal files. |
| `docs/design/v3_copilot.png`, `v3_edit.png`, `v3_starter.png` | AI-generated design reference images (rule: AI images need a visible "AI-generated" watermark). Not used by the site, README, DEMO_PLAN or submission; only cited by internal design prompts | `grep -rn "v3_(copilot|edit|starter)"`: references only in `docs/design/DESIGN_BRIEF.md` and `docs/prompts/*` (notes added there). Deleted instead of watermarking. |

## Kept although unreferenced or doubtful (conservative)
- `scripts/list_investigations.py`, `scripts/psi_files.py`, `scripts/download.py`, `scripts/psi_client.py`: data-pipeline discovery tools mentioned only in `docs/AI_USAGE_LOG.md`; they document how the data were obtained (reproducibility). Kept.
- `docs/material_mapping_proposal.csv` + `scripts/propose_material_mapping.py`: history of the proposal Fer approved (referenced by `CLAUDE.md`, docs 03 and `docs/tareas/fer-datos.md`). Kept.
- `docs/05-entrega-draft-en.md`: superseded by `docs/submission/` but linked from the README map. Kept.
- `docs/design/reference/flame-v3-reference.html`: human-made-with-AI HTML reference, cited by `DESIGN_BRIEF.md`. Kept.
- `.claude/skills/*`: project instructions for AI assistants (part of the AI-use evidence). Kept.
- `docs/tareas/*`, `docs/prompts/*`, `docs/guia-*.md`: team working documents (Spanish). Kept.
- Remote branches (`feat/*`, `docs/*`, `jovanny/mis-cambios`, `verificacion/datos`): not deleted (history rewrite/branch deletion not requested). Review manually.

## Not run
`knip`/`depcheck`/`vulture` were not run in this session (time). `npm ls` shows the direct dependencies are all imported
by `frontend/src` (react, react-dom, lucide-react, fontsource packages) or by the build/test config.
