# AI Usage Log

## 2026-11-14 — Descarga de datos de combustión (NASA PSI) — Claude Code (Opus 5.5)

**Pedido:** descubrir la API de PSI, listar investigaciones de Combustion Science y descargar
las tablas de datos y la Experiment Table de BASS-II y FLEX, con MANIFEST y muestras.

### Qué se hizo
1. **Descubrimiento de endpoints.** No se usó Playwright: se rechazó su instalación. Pero
   `pip install playwright requests` alcanzó a ejecutarse parcialmente en `.venv/`. Chromium
   no se descargó y el `.venv` no se usó. Los endpoints se sacaron leyendo el bundle JS del
   front-end (Angular): `https://psi.nasa.gov/physci/repo/main.5216219a85b99359.js`.
   Endpoints confirmados (sin login, sin captcha):
   | Uso | Método | Endpoint |
   |---|---|---|
   | Buscar/listar investigaciones | GET | `/geode-py/ws/repo/search?source=psi&type=investigation&from=0&size=200` (formato Elasticsearch) |
   | Detalle de una investigación | GET | `/geode-py/ws/repo/investigations/<PSI-ID>` |
   | Árbol "Data Files and Documents" | POST | `/geode-py/ws/files/v2` body `{"folder":"","fileType":"study","studyId":"<PSI-ID>","version":<v>}` |
   | URL firmada de descarga (S3) | GET | `/geode-py/ws/studies/<PSI-ID>/download?file=<nombre>&version=<versión del archivo>&redirect=false` |
   | Opciones de filtros | GET | `/geode-py/ws/repo/filter-options` (no usado) |
   Nota: `added`/`removed` del detalle son diffs entre versiones, no el listado completo.
2. **Combustion Science:** 24 investigaciones. SoFIE no aparece en PSI.
3. **Descargas** con `requests`, ≥1.1 s entre peticiones (`scripts/psi_client.py`), y
   `scripts/download.py`, que guarda en `data/raw/<exp>/`, deja los archivos en solo lectura
   (0444), no sobrescribe y registra todo en `data/raw/MANIFEST.csv`. La URL de origen se
   guarda sin la firma temporal de S3.
4. **No se modificó ningún archivo crudo.** Las vistas previas se leyeron con pandas en modo lectura.

### Archivos descargados (8)
- BASS-II (PSI-25): Experimental table CSV, Test.Matrices.xlsx, Fan calibration data.xlsx
- FLEX (PSI-69): Experimental table CSV, `Test 002 Results.xls`, `30CAL07-Test009 Results.xls`,
  y una muestra de `20CAL10_Chamber_Readings.txt` y `20CAL10_Radiometer_Readings.txt` (Calibration)

### Pendiente / decisiones abiertas
- FLEX tiene 313 `Chamber_Readings` + 314 `Radiometer_Readings` (~173 MB, ~1,250 peticiones,
  ~25 min a 1 req/s). No se descargaron todavía: falta confirmación.
- `.venv/` con playwright quedó del intento de instalación cancelado y **no** está en
  `.gitignore` (solo `data/raw/` y `__pycache__/`). Decidir si se borra.

### Scripts
`scripts/psi_client.py`, `scripts/psi_files.py`, `scripts/list_investigations.py`, `scripts/download.py`

## 2026-11-14 (2) — Limpieza, script reproducible y tablas procesadas — Claude Code (Opus 5.5)

**Pedido:** .gitignore + quitar playwright; `fetch_psi.py` reproducible; `flex_tests.csv` y `bass2_tests.csv`;
data dictionary; estadísticas; revisar los Science Documents. Regla: no tocar `data/raw/`.

1. `.gitignore` ahora: `data/raw/`, `.venv/`, `__pycache__/`, `data/reference/` (este último lo agregó la IA
   para los documentos de referencia). Se desinstalaron `playwright` y `greenlet` (su dependencia) del `.venv`.
   El `.venv` queda con `requests` y sus dependencias.
2. `scripts/fetch_psi.py`: solo usa requests, ≥1.1 s entre peticiones y tiene los SHA-256/tamaños fijados en el
   código (el MANIFEST está en `data/raw/`, que no se versiona). Se probó con `--verify-only` sobre `data/raw/`
   (8/8 OK, en solo lectura) y con una descarga limpia en una carpeta temporal fuera del repo (8/8 hashes
   idénticos, 41 s). No se escribió nada en `data/raw/`.
3. `scripts/build_processed.py` → `data/processed/flex_tests.csv` (274×19) y `bass2_tests.csv` (129×26).
   - FLEX: unidad de burning rate corregida a mm²/s (solo el nombre). Presión 0.0 en C11M201 → null con flag.
     Fechas con formatos mezclados. Encabezados "O/N/CO" interpretados como O2/N2/CO2.
   - BASS-II: la extracción por IA (`ai_*`, `extracted_by=AI`, `raw_note`) sale del texto libre de las
     columnas Fan/Air display de Test.Matrices (no existe una columna de notas). Hubo 3 iteraciones de reglas
     tras revisión manual: P10 (pot anotado en Air display), O8a (coma antes de "extinguished") y B14 (no
     confundir velocidad del aire con posición del pot). Además, O5b/O13a tenían lecturas del ventilador en
     la columna de aire. Resultado: 26/129 con resultado extraído; lo ambiguo queda en null. Tiempo ~20 min.
   - No se corrigieron valores dudosos; se marcaron en `qc_flags` (O2 final imposible, año 2018 vs GMT 2014, CO fuera de rango).
4. `scripts/stats_processed.py`: estadísticas descriptivas.
5. Science Documents: se descargaron 4 (FLEX DoD.docx, FLEX_Test_Plan.pdf, BASS-II ReadMe.docx, BASS-II SRD.pdf)
   en `data/reference/` (8 peticiones), **no** en `data/raw/`. Hallazgos en `docs/data-dictionary.md`
   ("Evidencia"). "Disruption" y las unidades del radiómetro de FLEX **no aparecen** en esos documentos.
6. Corrección propia: el primer borrador del diccionario decía que el diámetro de extinción era nulo "en la
   mayoría" de las pruebas completion. Al verificarlo resultó falso (14/27 tienen valor) y se corrigió.

Peticiones de red en esta sesión: ~16 (prueba de fetch) + 8 (documentos). Siempre ≥1.1 s entre peticiones.

## 2026-11-14 (3) — Tabla unificada, SQLite, propuesta de materiales, limitaciones — Claude Code (Opus 5.5)

**Pedido:** experiments.csv unificado; propuesta (sin aplicar) de categorías de material; SQLite con vistas y 6
consultas; sección "Limitaciones conocidas". Reglas: no tocar data/raw/, no borrar nada. Sin peticiones de red.

1. `scripts/build_experiments.py` → `data/processed/experiments.csv` (403×15) y `data/processed/psi.sqlite`
   (tabla `experiments`, vistas `v_flex` y `v_bass2`). Los DOI salen del JSON de PSI que ya se había descargado.
   - Decisiones: `material_category` de BASS-II = null (la normalización no está aprobada). En BASS-II, O2 y CO2 de
     % vol → fracción. `extinction_diameter_mm` solo si outcome=extinction: se omitieron 38 valores, con flag.
   - Hallazgo: `flex_id` 193F001 duplicado (#70 y #73). Se agregó el flag `duplicate_flex_id` en
     `build_processed.py` y la PK de SQLite pasó a índice no único. No se eliminó ninguna fila.
2. `scripts/propose_material_mapping.py` → `docs/material_mapping_proposal.csv`: 49 textos → 7 categorías, con
   atributos (espesor, ancho, diámetro, color, caras) y `needs_review` en 11 textos. **No se aplicó.**
3. `docs/sql_examples.sql` + `scripts/run_sql_examples.py` (abre la base en solo lectura): 6 consultas.
4. `docs/data-dictionary.md`: sección de experiments.csv y "Limitaciones conocidas" (20 puntos).
5. Verificación: `fetch_psi.py --verify-only` 8/8 después de los cambios. No se borró ningún archivo
   (`psi.sqlite` se recrea en cada corrida del script porque es un archivo generado).

## 2026-11-14 (4) — Módulo de consultas, tests y coverage grid — Claude Code (Opus 5.5)

**Pedido:** `src/psi_queries.py` con las 6 consultas parametrizadas y tests con pytest; `coverage_grid.json`;
(3) aplicar el mapeo de materiales **cuando Fer lo apruebe**. Reglas: sin red, sin tocar `data/raw/`.

1. `src/psi_queries.py`: solo stdlib (sqlite3, conexión de solo lectura). Los parámetros enumerados se validan
   y todo filtro usa placeholders. Cada fila devuelve `n`, `qc_flags` y `source_doi`; los `pct_*` traen `pct_note`
   y `warning` si n<5. Q6 de BASS-II no da % de extinción, porque el resultado está incompleto.
2. `tests/test_psi_queries.py`: 9 tests (uno por consulta, el de n<5 con advertencia, parámetros inválidos y
   conexión de solo lectura). **pytest no está instalado** (ni en el sistema ni en el `.venv`) y no se instaló
   (sin red; requiere autorización). Los tests son compatibles con pytest e incluyen un runner con la stdlib:
   9/9 OK.
   - Los tests encontraron un bug real en Q6: `SUM(outcome='x')` daba NULL en bandas con todos los outcome null.
     Se corrigió con COALESCE.
   - Prueba de mutación: si se quita la advertencia, el test de n<5 falla (verificado). Se corrigió que el
     test contaba `pct_note` como porcentaje.
3. `scripts/build_coverage_grid.py` → `data/processed/coverage_grid.json`: 49 celdas y 274 pruebas, 25 celdas
   con n<5. El campo `pct_extinction_descriptive_not_probability` lleva una nota de método en el JSON.
4. Punto 3 del pedido (aplicar el mapeo de materiales): **pendiente; esperando la aprobación de Fer.** No se hizo nada.
5. `fetch_psi.py --verify-only`: 8/8. No se borró nada.
