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

## 2026-11-14 (5) — Preparación del repo para el equipo y publicación en GitHub — Claude Code (Opus 5.5)

**Pedido:** integrar el paquete del equipo, definir qué se sube, revisión de seguridad, commit y push a
`who-is-baz/stars-rippers-flame-in-freefall` (privado), `docs/SETUP.md` y verificación en un clon limpio.
Reglas: sin force push, sin reescribir historial, sin borrar archivos, sin tocar `data/raw/` ni `data/reference/`,
sin cambiar la config global de git.

1. **Paquete.** Primero se usó por error el zip viejo (`stars-rippers-flame-in-freefall.zip`, 13 nov). Se corrigió
   con `paquete-equipo.zip` (14 nov), extraído en `~/paquete2`: `rsync -a --ignore-existing` (sin `LEEME-PAQUETE.md`,
   `AI_USAGE_LOG.md` ni `.gitignore`). `02-roles.md` y `03-analisis-datos.md` eran idénticos a los del zip viejo y se
   reemplazaron por los nuevos. `CLAUDE.md`: el nuevo como base + sección "Específico de este repo" (sin duplicar reglas).
   `README.md`: descripción en inglés del README de GitHub bajo el título + README del paquete, con "Estado del repo"
   actualizado y filas nuevas en el mapa (07-api-contract, tareas/, data-dictionary, sql_examples, scripts/src/tests).
2. **Qué sube.** `.gitignore` combinado (data/raw/, data/reference/, *.sqlite, .venv/, __pycache__/, .env, .env.*,
   node_modules/, dist/, .DS_Store, …). Creados `requirements.txt` (requests 2.34.2, pandas 2.1.4, numpy 1.26.4,
   openpyxl 3.1.2; versiones con las que corre hoy el proyecto) y `requirements-dev.txt` (pytest).
3. **Seguridad.** Escaneo de ghp_/github_pat_/gho_/sk-/AKIA/PRIVATE KEY/password=/api_key=/token= en los 51
   archivos: limpio. Sin llaves ni nada de ~/.ssh. Ningún archivo >1 MB (el mayor, experiments.csv, 52 KB).
   `docs/tareas/baz-lider.md` solo menciona en texto revocar el token de `keygithub` (no contiene ninguna llave).
4. **Commits.** El remoto NO estaba vacío (commit `323059d` "Initial commit" con un README creado desde la web). Se hizo
   `git fetch` + `git reset origin/main` (mixed, sin --hard), se mezcló el README y se hizo push fast-forward:
   `5aa4add` (import inicial) y `194956e` (`docs/SETUP.md`). Autor: who-is-baz con correo noreply (config local del
   repo); push con la sesión de `gh` de who-is-baz (`credential.helper` local). Sin trailer de co-autoría de Claude.
5. **Verificación** en un clon nuevo fuera del repo (sin red, venv con paquetes del sistema): 51 archivos = lista
   aprobada + SETUP.md; nada de data/raw, data/reference, *.sqlite, __pycache__ ni .env. `build_experiments.py`
   regenera `psi.sqlite` desde los CSV en <1 s y deja `git status` limpio; tests 9/9 OK con el runner de stdlib.
   No verificable sin red: la instalación desde PyPI (`requests==2.34.2` no está en el Python del sistema) ni pytest.

Excluido a propósito: `data/raw/` (8 archivos crudos, se regeneran con `fetch_psi.py`), `data/reference/` (4 Science
Documents, se descargan a mano), `data/processed/psi.sqlite`, `.venv/`, `__pycache__/`.
Peticiones de red en esta sesión: solo GitHub (gh/git). Ninguna a psi.nasa.gov.

## 2026-11-14 (6) — Correcciones tras la verificación y texto oficial del reto — Claude Code (Opus 5.5)

**Pedido:** rama `docs/correcciones-reto`, un PR sin unir; sin red (salvo `git pull`/`push`/PR); sin tocar `data/raw/`.

1. `docs/08-reto-oficial.md` copiado tal cual de `~/Downloads` (texto del reto pegado por Baz). `CLAUDE.md`: 08 en "Antes de
   trabajar, lee" + regla 10 (terminología "SI"). Nada más cambiado en CLAUDE.md.
2. **`docs/00-reglas-y-checklist.md` NO se reemplazó:** el diff no solo cambia reglas/fechas; además afirma que "el andamio
   del repo y el procesamiento de datos se hicieron el vie 13 nov", y la evidencia lo contradice: `data/raw/MANIFEST.csv`
   registra las descargas el 2026-11-14 16:15 UTC (sáb 10:15 local) y los scripts tienen fecha sáb 10:12–10:36; del vie 13
   solo es el paquete de docs. Queda pendiente la decisión de Baz.
3. `docs/03`: el ejemplo de heptano pasó de O₂ 0.12 (no existe a ~1 atm) a O₂ 0.14 (n=3: 193R002, N04H101, N04H201), con n
   en cada valor; pendiente de licencia cerrado (CC0-1.0, DataCite, 14 nov). `docs/data-dictionary.md`: frase de SoFIE matizada
   (la entrada (1) de esta bitácora no se reescribió: es histórica). `docs/tareas/fer-datos.md`: T28a/T28b y P5, P13a, O6.
4. QC (sin imputar): `co_final_censored` (M5), `co_initial_negative` (13), `low_confidence` (P5, P13a, O6) en
   `scripts/build_processed.py`; `data/processed` regenerado: solo cambia la columna `qc_flags` en 17 filas de
   `bass2_tests.csv`/`experiments.csv` (comprobado columna por columna); `flex_tests.csv` y `coverage_grid.json` sin cambios;
   SHA-256 de `data/raw/` idénticos antes y después. `src/psi_queries.py` añade `low_confidence_warning`.
   `tests/test_qc_flags.py`: 4 tests OK; prueba de mutación: sin la advertencia, el test falla. `test_psi_queries.py` 9/9 OK.
5. `docs/SETUP.md`: la demo nunca depende de la API viva de PSI (endpoint de detalle con 500 el 14 nov).
6. Filtro "condiciones lunares" (O₂ ≥ 0.30 y presión ≤ 0.70 atm) sobre `psi.sqlite`: **0 pruebas** (FLEX 0/274, BASS-II
   0/129: O₂ máx. 22.2 % y presión no registrada). Hay 17 pruebas FLEX con O₂ 0.30–0.34 a 0.703–0.714 atm (10.33–10.50 psi),
   justo por encima del umbral; todas terminaron en disruption (15) o completion (2), sin supresor.
7. Commits con "AI-assisted: yes" y trailer `Co-Authored-By: Claude` (pedido explícito en esta sesión).
8. `docs/00-reglas-y-checklist.md` reemplazado por la versión actualizada de Baz (`00-reglas-y-checklist (1).md`), que ya
   corrige lo del vie 13. Única modificación propia (aprobada por Baz): el contrato de API (07), las fichas de `docs/tareas/`,
   3 skills y las versiones nuevas de CLAUDE.md/02/03 son del **sáb 14, 10:38–10:39** según las fechas de `paquete-equipo.zip`,
   no del vie 13. Del vie 13 (zip viejo, 9:59–10:00) son README, CLAUDE.md, docs 00–06, DECISIONES, `.github` y 5 skills.

## 2026-11-14 (7) — Tablero de issues, protección de main y guías de estudio — Claude Code (Opus 5.5)

**Pedido:** crear el tablero (con OK de Baz en cada paso), asignar, proteger `main` tras unir #1/#2/#26 y subir las guías.

1. **Tablero:** etiquetas `task`, `lider`, `datos`, `backend`, `frontend`, `infra`, `bloqueante`, `opcional`; 4 hitos; 23 issues
   (#3–#25) con checklist de aceptación y dependencias. Asignados según Baz (usuarios confirmados por él): Fer #3–6, Yael #7–10,
   Charly #11–13, Jovanny #14–16, Baz #17–20; #21–25 sin asignar. #17 pasó de `infra` a `lider` (cuerpo y fuente actualizados).
2. **Ramas:** convención `feat/<nombre>-<tema>` en README y SETUP (PR #26).
3. **`main` protegida** (después de unir #1, #2 y #26): PR obligatorio + 1 aprobación, sin bloquear administradores, sin force push.
   La API respondió sin 403.
4. **Guías:** `docs/guia-datos.md` y `docs/guia-github.md` copiadas de `~/Downloads` **sin cambios** (comparadas con `cmp`;
   escaneadas: sin secretos, PII ni instrucciones). La guía HTML no se subió (la sube Yael tras corregirla).
   Cifra del PMMA "17 % frente a 18 %" (`guia-datos.md`, sección 3): **verificada el 14 nov** contra el resumen de
   Link et al., *Sci Rep* 8:120 (2018), DOI 10.1038/s41598-017-18398-4 (BASS-II en la ISS, cilindros de PMMA, flujo opuesto
   bajo; ≈18 % en gravedad normal, medido en tierra). La verificó Claude (sesión de chat) contra el resumen del artículo;
   después Claude Code la contrastó con el texto en PMC5760683. Baz no la verificó personalmente.
   Cita añadida a la guía en un commit aparte con la advertencia "un solo material (PMMA); no generalizar".
5. `docs/tareas/`: la grabación del demo y la checklist final pasaron de `jovanny-infra.md` a `baz-lider.md` (#17).

## 2026-11-14 (12) — Rangos de O₂ y presión en FLEX y conciliación (Yael) — Claude Code (Opus 5.5)

**Pedido (Yael):** rama `feat/yael-rangos-o2-presion`; conteos FLEX por banda de O₂ × presión, escenarios, conciliar las cifras de
Fer, Charly y el PDF de materiales; sin red, sin tocar `data/raw/`, `psi_queries.py`, `coverage_grid.json` ni `experiments.csv`;
sin push ni PR.

| fecha | persona | herramienta/modelo | qué se generó | archivos | cómo se revisó |
|---|---|---|---|---|---|
| 2026-11-14 | Yael | Claude Code (Opus 5.5) | Script de análisis (solo lectura de `experiments.csv`) y 8 tests | `scripts/analysis_rangos_o2_presion.py`, `tests/test_analysis_rangos.py` | Reproduce celda a celda la tabla 3.1 de Yael, los 49/29/56 de Fer y las 8 filas de Charly; 21/21 tests OK. **Pendiente revisión humana** |
| 2026-11-14 | Yael | Claude Code (Opus 5.5) | CSV de conteos, escenarios, conciliación y verificación del PDF | `docs/analisis/rangos-o2-presion/*.csv` | Generados por el script (reproducibles); bloque de verificación suma = 274 |
| 2026-11-14 | Yael | Claude Code (Opus 5.5) | Parche de bandas B **no aplicado** | `docs/analisis/rangos-o2-presion/patch_propuesto.diff` | Probado solo en una copia temporal fuera del repo (`git apply` limpio, 21/21 tests, grid 49 celdas / 25 n<5) |
| 2026-11-14 | Yael | Claude Code (Opus 5.5) | Informe (ES + párrafo EN), mensaje "YAEL v2" | `docs/analisis/rangos-o2-presion/informe.md`, `mensaje_grupo.md` | Cifras tomadas de los CSV del script. **Los valores NASA (8.2 psi/34 %, 10.2 psi/26.5 %, 4.3 psi) no se verificaron**: marcados "verificar" |

Notas: sin peticiones de red (ni PyPI: se usó el Anaconda local, Python 3.14 + pandas 3.0.3, en lugar del venv con pandas 2.1.4).
`data/raw/` no existe en este disco: la comparación del PDF con la tabla cruda queda pendiente (comando en el informe, sección 4).
`build_experiments.py` se ejecutó y dejó `git status` limpio. Commits con "AI-assisted: yes".
