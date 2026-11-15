# Use of AI (Super Intelligence, SI)

Flarefall was built with heavy use of AI tools, as tools. The idea and approach (organise the PSI tests by cabin
atmosphere and show what the evidence covers) came from the team and the official challenge objectives.

## Tools
- **Anthropic Claude** (Claude Code and claude.ai; models Claude Opus, Sonnet and Fable): most of the code, scripts,
  tests, data-processing rules, interface text and documentation.
- **Google Gemini:** the logo and the app name image (see "Logo" below).
- **Local LLMs through Ollama (optional feature, not used by the public site):** Llama 3.2 3B and Qwen3 8B were run and
  benchmarked on the demo laptop; Qwen3 14B was configured but not evaluated. Their text is checked by code (every number
  must come from the data, forbidden claims are rejected) and replaced by a fixed template when the check fails.

## What the AI generated
1. **Data pipeline:** download and SHA-256 verification scripts, processing into one table of 403 tests, the read-only
   SQLite database, query module and tests. The raw NASA files were never modified.
2. **AI-extracted data (labelled):** BASS-II has no outcome column, only free-text notes. Extraction rules written by
   Claude gave an outcome to 26 of 129 tests and an initial air speed to 121 of 129; ambiguous cases stay empty.
   These values carry `ai_*` columns, `extracted_by=AI`, `outcome_source = ai_extracted` and `qc_flags`, and the site shows
   them as "AI-extracted". Three are flagged `low_confidence`.
3. **Material categories:** proposed by Claude, approved by the team's data lead (one value corrected by hand).
4. **Website:** UI code, charts, the opening animation (drawn on canvas; its sound is synthesised in code, no audio files),
   the flame illustration (SVG drawn by code, labelled "Conceptual illustration") and the English interface text.
   No figure is written by the AI: every number is computed from the data files.
5. **Investigations catalogue:** transcribed from the official challenge text only (`frontend/public/data/investigations.json`,
   one source per row; "not stated" where the text is silent).
6. **Backend and assistant:** FastAPI endpoints, the closed list of query tools the model may choose from (it cannot write
   SQL), the verification of model text, and tests.
7. **Documentation**, including this statement.

## What the team reviewed
- Reviewed by the team: data files and processing decisions, the material mapping, design decisions and dependencies.
- Checked by automated tests and an independent recomputation of every figure (`scripts/audit_numbers.py`), not yet
  line by line by a person: most backend and frontend code.
- Pending human review: the 3 `low_confidence` BASS-II outcomes and the 3 atmosphere scenarios marked "Unverified source".

## Logo
The Flarefall logo and name image were provided by the team and **generated with Gemini (Google)**, per the file names of
the originals (`frontend/public/brand/original-*.jpg`). The background was made transparent and the images resized by a
script (no redrawing). The site labels the logo "AI-generated" in Sources & credits. It contains no NASA logo, name or
insignia.

## How AI use is marked
- Commits with AI-generated changes carry `AI-assisted: yes`.
- Data: `ai_*` columns, `extracted_by=AI`, `outcome_source`, `qc_flags`.
- Website: "AI-extracted" labels; answers written by a local model are labelled "AI-generated text"; answers without a
  model say "no model".
- No NASA logos, flags or mission identifiers are used or modified by any generated content. Screenshots in
  `docs/screenshots/` are captures of the site itself.
