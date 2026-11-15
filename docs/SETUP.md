# SETUP · Cómo empezar a trabajar en el repo

Python **3.12** (Linux/macOS; en Windows usa `py -3.12` y `.venv\Scripts\activate`).

## 1. Clonar
```bash
git clone https://github.com/who-is-baz/stars-rippers-flame-in-freefall.git
cd stars-rippers-flame-in-freefall
```
Configura tu identidad **solo para este repo** (no cambies la global si no quieres):
```bash
git config user.name  "Tu Nombre"
git config user.email "tu-correo@ejemplo.com"
```

## 2. Entorno virtual e instalación
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt          # requests, pandas, numpy, openpyxl
pip install -r requirements-dev.txt      # opcional: pytest
```
`.venv/` está en `.gitignore`: nunca se sube.

## 3. Regenerar la base `psi.sqlite` (sin red, <1 s)
`psi.sqlite` **no** está en el repo, pero se genera a partir de los CSV de `data/processed/`, que sí están. No necesitas `data/raw/` ni red:
```bash
python scripts/build_experiments.py      # crea data/processed/psi.sqlite (y reescribe experiments.csv)
```
Después de esto, `git status` debe seguir limpio (el CSV que se reescribe es idéntico). Si no lo está, avisa en el canal antes de hacer commit.

## 4. Correr los tests (sin red)
```bash
python -m pytest tests/                  # si instalaste pytest
python tests/test_psi_queries.py         # sin pytest: runner con la librería estándar (debe decir OK)
python tests/test_qc_flags.py            # sin pytest: flags de calidad de BASS-II (debe decir OK)
```
Otros scripts útiles sin red:
```bash
python scripts/run_sql_examples.py       # las 6 consultas de docs/sql_examples.sql
python scripts/stats_processed.py        # estadísticas descriptivas de los CSV
python scripts/build_coverage_grid.py    # regenera coverage_grid.json (cambia el campo generated_utc)
```

## 5. (Opcional) Descargar los datos crudos de NASA PSI — **necesita red**
Solo si vas a tocar el procesamiento (`scripts/build_processed.py`), que lee `data/raw/`.
```bash
python scripts/fetch_psi.py              # descarga a data/raw/ y verifica SHA-256
python scripts/fetch_psi.py --verify-only  # solo verifica lo que ya tienes
```
- Descarga **8 archivos** (BASS-II PSI-25 y FLEX PSI-69, ~16 peticiones). Tarda **~40–60 s**: el script deja ≥1.1 s entre peticiones a propósito; no lo quites.
- Si un hash no coincide, el archivo queda como `<nombre>.mismatch` y el script falla sin reemplazar nada.
- `data/raw/` es **de solo lectura e intocable** y no se sube (está en `.gitignore`).
- Luego: `python scripts/build_processed.py` → `python scripts/build_experiments.py` → `python scripts/build_coverage_grid.py`.
- Los Science Documents (`data/reference/`) **no** los descarga `fetch_psi.py`; se bajan a mano desde la ficha PSI de cada investigación si los necesitas. Tampoco se suben.

> ⚠️ **La API de PSI no es confiable en vivo.** El 14 nov 2026 el endpoint de detalle
> (`/geode-py/ws/repo/investigations/<ID>`) devolvió **HTTP 500** en las 6 investigaciones probadas.
> **La demo NUNCA depende de la API viva de PSI:** solo usa `data/processed/` (versionado) y `psi.sqlite`
> regenerado con `scripts/build_experiments.py`. La red solo se usa para recrear `data/raw/`.

## 6. Backend (API) + frontend + IA local
El sitio público **no** necesita nada de esto: funciona solo con Basic (`frontend/public/data/*.json`).
Esto es para la laptop del demo y para desarrollo.

```bash
# 1) dependencias (una vez)
source .venv/bin/activate && pip install -r requirements-dev.txt
(cd frontend && npm install)
# 2) base de datos (una vez, sin red)
python scripts/build_experiments.py
# 3) API en http://127.0.0.1:8000  (OpenAPI en /docs; rutas bajo /api y también sin prefijo)
uvicorn backend.app:app --app-dir src --host 127.0.0.1 --port 8000
# 4) front en http://127.0.0.1:5173 (otra terminal)
cd frontend && VITE_LLM_URL=http://127.0.0.1:8000 npm run dev
```
En el panel SI: **Connect local AI** → llama a `GET /llm/status` y habilita los niveles cuyo modelo esté instalado.

### Modelos (Ollama, http://localhost:11434)
```bash
ollama serve                 # si no corre como servicio
ollama pull llama3.2:3b      # Flash  (~2 GB)
ollama pull qwen3:8b         # Medium (~5 GB)
ollama pull qwen3:14b        # Heavy  (~9 GB)
```
Mapa: Basic = `low` (sin modelo) · Flash = `medium` + `FLASH_MODEL` · Medium = `medium` + `MEDIUM_MODEL` · Heavy = `high` + `HEAVY_MODEL`.

### Variables de entorno (todas opcionales; ningún secreto)
| Variable | Defecto | Para qué |
|---|---|---|
| `OLLAMA_URL` | `http://localhost:11434` | servidor de Ollama |
| `OLLAMA_TIMEOUT_S` | `60` | timeout por llamada al modelo |
| `OLLAMA_KEEP_ALIVE` | `5m` | cuánto queda cargado el modelo |
| `FLASH_MODEL` / `MEDIUM_MODEL` / `HEAVY_MODEL` | `llama3.2:3b` / `qwen3:8b` / `qwen3:14b` | etiqueta por nivel (lista permitida de `model`) |
| `ASK_BUDGET_S` | `45` | si el router tarda más, se responde con plantilla |
| `CORS_ORIGINS` | — | orígenes extra separados por coma (`*` se ignora) |
| `PSI_DB` | `data/processed/psi.sqlite` | otra ruta para la base |
| `VITE_LLM_URL` (front, alias `VITE_API_URL`) | — | URL de la API; sin ella, Connect usa `http://127.0.0.1:8000` |
| `VITE_LLM_TIMEOUT_MS` (front) | `15000` | timeout del front; súbelo para Heavy en CPU |

### Si Ollama no está
- `/llm/status` → `available:false` (HTTP 200); `/ask` en medium/high → **503** y el front responde con Basic (lo avisa).
- `low` nunca usa Ollama.
- Si `OLLAMA_MODELS` o `~/.ollama` apuntan a un disco no montado, arranca con un directorio local: `HOME=$HOME/ollama-home OLLAMA_MODELS=$HOME/ollama-models OLLAMA_MAX_LOADED_MODELS=1 ollama serve`.
- Si `ollama serve` dice `could not create directory ~/.ollama: file exists`, `~/.ollama` es un enlace a un disco no
  montado: monta el disco o usa `OLLAMA_MODELS=/otra/ruta ollama serve`.

### Comprobar
```bash
python -m pytest                     # todo (Ollama mockeado); las pruebas -m ollama se saltan sin Ollama
python -m pytest -m ollama -rs       # integración con Ollama real
python scripts/smoke_e2e.py          # levanta API + front y pregunta en cada nivel
(cd frontend && npm test)
```
