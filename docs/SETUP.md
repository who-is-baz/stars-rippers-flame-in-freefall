# SETUP · Cómo empezar a trabajar en el repo

Guía para un compañero nuevo. Python **3.12** (Linux/macOS; en Windows usa `py -3.12` y `.venv\Scripts\activate`).

## 1. Clonar
El repo es privado: necesitas que Baz te agregue como colaborador.
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

## 6. Flujo de trabajo
1. Lee `CLAUDE.md`, `docs/03-analisis-datos.md`, `docs/07-api-contract.md`, `docs/data-dictionary.md` y **tu archivo en `docs/tareas/`**.
2. Rama por issue: `git switch -c feat/<nombre>-<tema>` (p. ej. `feat/fer-material-mapping`); el PR lleva `Closes #N`.
3. Commits pequeños; PR con la plantilla y revisión de otra persona. Nada de force push a `main`.
4. Todo uso de IA se anota en `docs/AI_USAGE_LOG.md`. Nunca subas secretos (`.env` está ignorado).
