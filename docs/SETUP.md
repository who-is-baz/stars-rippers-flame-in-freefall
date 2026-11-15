# SETUP · Getting started with the repository

Python **3.12** (Linux/macOS; on Windows use `py -3.12` and `.venv\Scripts\activate`).

## 1. Clone
```bash
git clone https://github.com/who-is-baz/stars-rippers-flame-in-freefall.git
cd stars-rippers-flame-in-freefall
```
Set your identity **for this repository only** (leave the global one alone if you prefer):
```bash
git config user.name  "Your Name"
git config user.email "you@example.com"
```

## 2. Virtual environment and install
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt          # requests, pandas, numpy, openpyxl
pip install -r requirements-dev.txt      # optional: pytest
```
`.venv/` is in `.gitignore`: it is never committed.

## 3. Rebuild the `psi.sqlite` database (no network, <1 s)
`psi.sqlite` is **not** in the repository, but it is built from the CSV files in `data/processed/`, which are. You need
neither `data/raw/` nor a network connection:
```bash
python scripts/build_experiments.py      # creates data/processed/psi.sqlite (and rewrites experiments.csv)
```
Afterwards `git status` must stay clean (the rewritten CSV is identical). If it is not, check before committing.

## 4. Run the tests (no network)
```bash
python -m pytest tests/                  # if pytest is installed
python tests/test_psi_queries.py         # without pytest: standard-library runner (must print OK)
python tests/test_qc_flags.py            # without pytest: BASS-II quality flags (must print OK)
```
Other useful scripts that need no network:
```bash
python scripts/run_sql_examples.py       # the 6 queries of docs/sql_examples.sql
python scripts/stats_processed.py        # descriptive statistics of the CSV files
python scripts/build_coverage_grid.py    # rebuilds coverage_grid.json (changes the generated_utc field)
```

## 5. (Optional) Download the raw NASA PSI data — **needs a network connection**
Only if you are going to change the processing (`scripts/build_processed.py`), which reads `data/raw/`.
```bash
python scripts/fetch_psi.py              # downloads into data/raw/ and verifies SHA-256
python scripts/fetch_psi.py --verify-only  # only verifies what you already have
```
- It downloads **8 files** (BASS-II PSI-25 and FLEX PSI-69, ~16 requests). It takes **~40–60 s**: the script waits
  ≥1.1 s between requests on purpose; do not remove that.
- If a hash does not match, the file is kept as `<name>.mismatch` and the script fails without replacing anything.
- `data/raw/` is **read only and never modified**, and it is not committed (it is in `.gitignore`).
- Then: `python scripts/build_processed.py` → `python scripts/build_experiments.py` → `python scripts/build_coverage_grid.py`.
- The Science Documents (`data/reference/`) are **not** downloaded by `fetch_psi.py`; get them by hand from the PSI page of
  each investigation if you need them. They are not committed either.

> ⚠️ **The live PSI API is not reliable.** On 14 Nov 2026 the detail endpoint
> (`/geode-py/ws/repo/investigations/<ID>`) returned **HTTP 500** for all 6 investigations tried.
> **The site NEVER depends on the live PSI API:** it only uses `data/processed/` (versioned) and `psi.sqlite`
> rebuilt with `scripts/build_experiments.py`. The network is only used to recreate `data/raw/`.

## 6. Backend (API) + front end + local AI
The public site needs **none** of this: it works on its own in Basic mode (`frontend/public/data/*.json`).
This is for the demo laptop and for development.

```bash
# 1) dependencies (once)
source .venv/bin/activate && pip install -r requirements-dev.txt
(cd frontend && npm install)
# 2) database (once, no network)
python scripts/build_experiments.py
# 3) API at http://127.0.0.1:8000  (OpenAPI at /docs; routes under /api and also without the prefix)
uvicorn backend.app:app --app-dir src --host 127.0.0.1 --port 8000
# 4) front end at http://127.0.0.1:5173 (another terminal)
cd frontend && VITE_LLM_URL=http://127.0.0.1:8000 npm run dev
```
In the SI panel: **Connect local AI** → calls `GET /llm/status` and enables the levels whose model is installed.

### Models (Ollama, http://localhost:11434)
```bash
ollama serve                 # if it is not running as a service
ollama pull llama3.2:3b      # Flash  (~2 GB)
ollama pull qwen3:8b         # Medium (~5 GB)
ollama pull qwen3:14b        # Heavy  (~9 GB)
```
Map: Basic = `low` (no model) · Flash = `medium` + `FLASH_MODEL` · Medium = `medium` + `MEDIUM_MODEL` · Heavy = `high` + `HEAVY_MODEL`.

### Environment variables (all optional; no secrets)
| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server |
| `OLLAMA_TIMEOUT_S` | `60` | timeout per model call |
| `OLLAMA_KEEP_ALIVE` | `5m` | how long the model stays loaded |
| `FLASH_MODEL` / `MEDIUM_MODEL` / `HEAVY_MODEL` | `llama3.2:3b` / `qwen3:8b` / `qwen3:14b` | tag per level (allow-list for `model`) |
| `ASK_BUDGET_S` | `45` | if the router takes longer, a template answer is returned |
| `CORS_ORIGINS` | — | extra origins, comma separated (`*` is ignored) |
| `PSI_DB` | `data/processed/psi.sqlite` | another path for the database |
| `VITE_LLM_URL` (front end, alias `VITE_API_URL`) | — | API URL; without it, Connect uses `http://127.0.0.1:8000` |
| `VITE_LLM_TIMEOUT_MS` (front end) | `15000` | front-end timeout; raise it for Heavy on a CPU |

### If Ollama is not there
- `/llm/status` → `available:false` (HTTP 200); `/ask` at medium/high → **503** and the front end answers with Basic (and says so).
- `low` never uses Ollama.
- If `OLLAMA_MODELS` or `~/.ollama` point to an unmounted disk, start it with a local folder: `HOME=$HOME/ollama-home OLLAMA_MODELS=$HOME/ollama-models OLLAMA_MAX_LOADED_MODELS=1 ollama serve`.
- If `ollama serve` says `could not create directory ~/.ollama: file exists`, `~/.ollama` is a link to an unmounted
  disk: mount the disk or use `OLLAMA_MODELS=/another/path ollama serve`.

### Check
```bash
python -m pytest                     # everything (Ollama mocked); the -m ollama tests are skipped without Ollama
python -m pytest -m ollama -rs       # integration with a real Ollama
python scripts/smoke_e2e.py          # starts API + front end and asks a question at each level
(cd frontend && npm test)
```
