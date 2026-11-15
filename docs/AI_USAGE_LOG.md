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

## 2026-11-14 (8) — Revisión previa al congelado (#19) y mapeo de materiales — Claude Code (Opus 5.5)

**Pedido:** comprobar #3, #7, #27 y la coherencia antes de congelar el esquema; después, aplicar el mapeo aprobado por
Fer. Rama `feat/baz-mapeo-materiales`, un PR sin unir; sin red salvo `gh`/git; sin tocar `data/raw/`.

1. **Congelado (#19) NO hecho:** #7 no tiene comentarios ("Firmado" de Yael y Charly pendiente) y el contrato
   (`docs/07`) no coincide con `src/psi_queries.py` ni con `coverage_grid.json` (nombres de campos, idioma de
   `pct_note`/`warning`, endpoints frente a Q1–Q6). No se creó la etiqueta `schema-v1`.
2. **Mapeo de materiales:** `docs/material_mapping.csv` es igual a la propuesta (Fer la aprobó en #3 sin cambiar
   valores) y conserva las marcas que pidió: `material_assumed_from_readme` (7 pruebas) y `material_text_typo` (M5, M19).
   T23/T24 ("SIBAL" en el comentario de Fer) = tela SIBAL; la variante de ignición no es material.
3. `data/processed` regenerado: en `experiments.csv` solo cambian `material_category` y `qc_flags` de las 129 filas de
   BASS-II (comprobado columna por columna); `bass2_tests.csv` suma 6 columnas y no cambia las anteriores;
   `flex_tests.csv` y `coverage_grid.json` sin cambios; SHA-256 de `data/raw/` idénticos antes y después.
4. Tests: `test_psi_queries.py` y `test_qc_flags.py` OK (incluye el test nuevo del mapeo), sin pytest.
5. Commits con "AI-assisted: yes", sin trailer `Co-Authored-By`. Peticiones de red: solo GitHub (gh/git).

## 2026-11-14 (9) — Alinear el contrato de la API con el código (#7) — Claude Code (Opus 5.5)

**Pedido (Baz):** rama `fix/alinear-contrato` desde main, un PR sin unir. Claude alinea el contrato; Yael y Charly
solo revisan y firman #7. Sin red salvo `gh`/git; sin tocar `data/raw/`.

1. `docs/07-api-contract.md` reescrito: los nombres del código/CSV son el estándar; tabla endpoint → función
   (Q1–Q6 en `/queries/<clave de ALL_QUERIES>`); `/ranking`, `/compare` y `/gaps` PROVISIONAL (no tienen función).
2. Decisión: `outcome`, `limit` (1–500) y `offset` se mantienen y se implementan en la función nueva
   `list_experiments`; también se agregó `meta` para `/meta` (regla 4: sin SQL fuera de `src/psi_queries.py`).
3. Mensajes en inglés (`PCT_NOTE`, `SMALL_N_WARNING`, `LOW_CONFIDENCE_WARNING`); banda `0.12-0.15` → `<0.15`.
   Efecto colateral detectado y corregido: `<0.15` quedaba al final al ordenar por etiqueta; ahora Q6 y el grid ordenan
   por valor de O₂.
4. `coverage_grid.json` regenerado: `pct_extinction_descriptive_not_probability` → `pct_extinction`; valores
   idénticos celda por celda. `experiments.csv` regenerado sin cambios.
5. Tests: `test_psi_queries.py` 12/12 (3 nuevos) y `test_qc_flags.py` OK, sin pytest.
6. Commits con "AI-assisted: yes", sin trailer `Co-Authored-By`. Peticiones de red: solo GitHub (gh/git).

## 2026-11-14 (10) — Escenarios de atmósfera y datos para el frontend — Claude Code (Opus 5.5)

**Pedido (Baz):** rama `feat/baz-decisiones-y-datos`, un PR sin unir; sin tocar `data/raw/`. La rama incluye #28
(mapeo de materiales) y #29 (contrato alineado) por merge, porque `materials.json` necesita `material_category` y los
textos en inglés del contrato.

1. `src/scenarios.py`: tolerancia (O₂ ±0.01, ±0.5 psi), bandas de O₂ (las de `psi_queries`), niveles de presión
   discretos y 5 escenarios con `source` y `verified`. Regla: los criterios puntuales se cumplen dentro de la
   tolerancia; los límites son estrictos en `n_exact` y se relajan en `n_near`. Resultado: earth_iss 49/49,
   lunar_challenge 0/17, lunar_nasa 0/0, exploration 0/0, suit 0/0; C11M201 excluida (sin presión). Coincide con el
   análisis de Yael (`feat/baz-resumen-equipo`, t1_escenarios.csv), incluidas las condiciones más cercanas.
2. Citas de NASA: leídas en una sesión anterior de solo lectura (red limitada a nasa.gov y ntrs.nasa.gov; texto
   extraído de los PDF con `pdftotext`). NASA/TM-2013-217377 **no** se leyó; se deja como fuente porque Baz la indicó,
   con una nota. `lunar_nasa`, `exploration` y `suit` quedan `verified: false` hasta que Fer confirme.
3. `scripts/build_frontend_data.py` → `frontend/public/data/` (7 JSON). Todo número se calcula; textos en inglés;
   null + `"status": "no data"` si falta un dato. Corrección detectada: con niveles discretos, la frase ">1 atm solo con
   n<5" no es cierta por celda (metanol >2 atm tiene n = 7); `gaps.json` dice lo exacto: 9 pruebas, todas con CO₂ y
   O₂ 0.21–0.24, y n < 5 en cada presión real (2.0, 2.7 y 3.1 atm).
4. `docs/DECISIONES.md`: 5 entradas (tolerancia, bandas/niveles, doble definición lunar, 0/17, camino del demo).
5. Tests: `test_scenarios.py` 7/7 y `test_frontend_data.py` 6/6 (nuevos); `test_psi_queries.py` y `test_qc_flags.py`
   OK. Sin pytest. `data/raw/` sin cambios.
6. Commits con "AI-assisted: yes", sin trailer `Co-Authored-By`. Peticiones de red en esta sesión: solo GitHub (gh/git).
## 2026-11-14 (11) — Marca fer_corrected en P14 (corrección pedida por Fer en #28) — Claude Code (Opus 5.5)

**Pedido (Baz, por encargo de Fer):** en `feat/baz-mapeo-materiales` (#28), marcar la corrección de P14 antes de que Fer
apruebe. Numerada (11) porque (9) y (10) ya existen en #29 y #30.

1. `docs/material_mapping.csv`: `material_flag = fer_corrected` en "1/4 blac rod" (P14). `scripts/build_processed.py`
   lleva la marca a `qc_flags` de `bass2_tests.csv` y `experiments.csv`. Se conservan `material_raw` "1/4 blac rod" y
   `color` "black".
2. Test nuevo `test_fer_corrected_marks_every_corrected_value` (en `tests/test_qc_flags.py`): P14 y toda fila cuyo
   color no aparezca en el texto original deben llevar la marca. Se comprobó que falla antes de regenerar y pasa después.
3. `data/processed` y `psi.sqlite` regenerados: solo cambia la fila de P14. SHA-256 de `data/raw/` (9 archivos)
   idénticos antes y después. Diccionario de datos actualizado.
4. Después se unió esta versión de #28 en `feat/baz-decisiones-y-datos` (#30) con merge, sin force push, y se
   regeneraron `frontend/public/data/*.json`.
5. Commits con "AI-assisted: yes", sin trailer `Co-Authored-By`. Peticiones de red: solo GitHub (gh/git).

## 2026-11-14 (12) — Skills de diseño y frontend React — Claude (Opus 5.5, claude.ai, Project del hackatón)

**Pedido (Yael):** crear skills para diseñar el dashboard en React, más futurista y profesional que el prototipo,
tomando como base la skill `frontend-design` (Anthropic), el repo UI UX Pro Max (nextlevelbuilder, licencia MIT) y una
imagen de referencia de un dashboard estilo NASA. Solo skills: el diseño lo reparte el equipo.

1. Nuevas: `.claude/skills/flame-design-system`, `flame-react-frontend`, `flame-data-viz` (generadas por IA, revisión
   humana pendiente). Tokens y fuentes heredados del prototipo publicado (Michroma + Manrope, cian/llama).
2. Tipos TypeScript escritos a partir de la forma real de `frontend/public/data/*.json` (generados el 14 nov 22:41 UTC);
   compilan con `tsc --strict`. Contraste de colores calculado (texto ≥ 6:1 sobre el fondo).
3. Cifras de ejemplo en las skills (17 pruebas cercanas al escenario lunar, 19 pruebas en una celda, etc.) verificadas
   contra los JSON. Etiquetas de `qc_flags` redactadas a partir de `docs/data-dictionary.md`.
4. De la imagen de referencia se toma solo la estructura; se excluyen logo/marca NASA y la tarjeta "Predictions".
5. `CLAUDE.md`: lista de skills actualizada. Sin peticiones de red al repo; sin cambios en datos.
## 2026-11-14 (13) — Skills de diseño v2 ("mission console") — Claude (Opus 5.5, claude.ai, Project del hackatón)

**Pedido (Yael):** acercar el diseño a tres referencias de dashboards espaciales (objeto central a pantalla completa,
paneles de vidrio, widgets circulares) manteniendo la interacción (arrastrar, zoom, hover).

1. `flame-design-system` reescrita: paleta grafito + acento menta `#7FF5E1`, Sora + IBM Plex Mono (solo anotaciones),
   layout de consola (riel izquierdo, inspector, dock, barra superior), contrato de interacción de la escena con zoom
   semántico (Chamber / Flame / Droplet), vocabulario prohibido (risk, threat, safe, probability, impact zone).
2. `flame-react-frontend`: decisión 2.5D vs React Three Fiber con un mismo contrato `<FlameScene>`; nuevos
   componentes (ConsoleLayout, Inspector, Dock, RingGauge, MiniHistogram, CoverageRadar); paquetes C1/C2.
3. `flame-data-viz` §3: inspector, radar de cobertura, dock y tabla de traducción honesta de cada widget de las
   referencias. Nota: el histograma de q06 necesita un campo estructurado en `build_frontend_data.py`.
4. Vista previa interactiva (HTML, no es código del repo) publicada como artefacto privado; cifras tomadas de los JSON.
   Las referencias de imagen tienen logo NASA: no se copia.
## 2026-11-14 (14) — Skills v3: primera vista amable, tablero personalizable y copiloto SI — Claude (Opus 5.5, claude.ai)

**Pedido (Yael):** primera vista entendible para cualquier persona, tarjetas personalizables (estilo Power BI),
especificación de animaciones/3D para construir y el diseño del copiloto SI (Ollama) que arma el tablero desde el chat.
Yael pidió que Claude tomara las decisiones abiertas.

1. Nueva skill `flame-dashboard-builder`: primera vista (1 frase + ≤3 tarjetas + tour de 3 pasos), anatomía de tarjeta
   (pregunta, una vista, frase de lectura, fuente, n), catálogo de 11 tipos con `CardSpec`, modo Customize con galería,
   presets y límite de 9 tarjetas, copiloto en drawer izquierdo con contrato de acciones validado con Zod y modo Low por reglas.
2. Stack decidido en `flame-react-frontend`: R3F + drei (escena 3D, respaldo SVG), Motion, react-grid-layout, Recharts +
   SVG propio, Zustand, Zod, Lucide. Pendiente registrar en `docs/DECISIONES.md` y revisar con `scope-guard`.
3. `flame-design-system` y `flame-data-viz` compactadas; especificación de animaciones con valores; color por variable.
4. Cambio de contrato propuesto (PROVISIONAL): `POST /api/ask` devuelve `actions[]`. Requiere PR a `docs/07-api-contract.md`.
5. Vista previa interactiva v3 (HTML de referencia, no es código del repo) publicada como artefacto privado; cifras de
   `scenarios.json`, `coverage.json` y `gaps.json`. Tipos TS de las skills compilan con `tsc --strict`.

## 2026-11-14 (15) — Skills de frontend al repo y prompt del primer maquetado — Claude (Sonnet 5.5, claude.ai, Project del hackatón)

**Pedido (Yael):** subir las skills al repo con varios commits y dejar un prompt para que Claude Code genere el primer avance del frontend.

1. Rama `feat/yael-frontend-skills` con 11 commits: 4 skills, registro en `CLAUDE.md` y `docs/DECISIONES.md`, tarea de Charly, imágenes de referencia, prompt y bitácora. Cada commit lleva `AI-assisted: yes`.
2. `docs/prompts/01-maquetado-frontend.md`: alcance de los paquetes A–D, reglas duras, plan de 16 commits y verificación. Texto generado por IA; revisión humana pendiente.
3. `docs/design/*.png`: tres vistas de referencia generadas por IA a partir de las skills, sin logos ni marcas NASA.
4. Sin cambios en datos, `src/`, `scripts/` ni `docs/07-api-contract.md`. Sin peticiones de red salvo `git clone` del repo.

## 2026-11-14 · Frontend v2 de una página (Claude Code)

**Pedido (Baz):** construir el dashboard completo según el brief de diseño (una página, estilo oscuro con vidrio, panel SI deslizable), sin romper las reglas de honestidad de los datos.

1. Rama `feat/baz-front` (sobre `feat/baz-frontend-base`). Código generado por IA: `frontend/src/design/*`, `components/ui.tsx`, `sections/*`, `assistant/*`, `state/ui.tsx`, `lib/table.ts`, pruebas y `frontend/README.md`. Se reutilizan `src/data` y `src/lib` de la versión anterior (también asistidos por IA).
2. Ninguna cifra fue escrita por la IA: todo se lee de `frontend/public/data/*.json`. Esa carpeta no se modificó. El navegador solo cuenta, filtra, ordena y da formato.
3. Texto de interfaz en inglés redactado por IA (títulos, notas, avisos). Revisión humana pendiente.
4. Sin imágenes generadas: el fondo es CSS. Sin logos ni marcas NASA.
5. Verificación hecha por la IA: `tsc`, 28 pruebas Vitest, build de producción y capturas en Chrome a 1440 px y 360 px. No se corrió Lighthouse ni lector de pantalla.
6. Red: solo `npm install` de las dependencias aprobadas.

## 2026-11-14 (16) — Referencia visual ejecutable, consola espacial v3 y gráficas SVG honestas

**Pedido (Jovanny / Yael):** aplicar la referencia visual aprobada (`flame-v3-reference.html`, `DESIGN_BRIEF.md`) y mejorar el frontend con la consola interactiva de combustión en microgravedad y las gráficas SVG honestas conectadas a `frontend/public/data/*.json`.

1. Se integraron `docs/design/reference/flame-v3-reference.html`, `docs/design/DESIGN_BRIEF.md`, `docs/prompts/00-contexto-companeros.md` y la actualización de `docs/prompts/01-maquetado-frontend.md`.
2. En `frontend/src/`: paleta grafito + menta (`#7FF5E1`) y tipografía Sora + IBM Plex Mono en `tokens.css` y `global.css`; escena interactiva `<FlameScene>` (`src/components/FlameScene.tsx`) con rotación, zoom semántico (`Chamber · Flame · Droplet`) y anotaciones con líneas guía; gráficas SVG en `src/components/charts.tsx` (`MatchRingSvg`, `KpiRingSvg`, `BurningRateChartSvg` en modos barras y líneas con alerta `n < 5`, `CoverageRadarSvg`, `OutcomePills`, `OutcomeBarsSvg`, `Bass2CountBar` sin porcentajes); consola completa en `Hero.tsx`, galería Customize, tour de 3 pasos y drawer izquierdo del `SI Assistant` con adición automática de tarjetas.
3. Todas las cifras provienen de `frontend/public/data/*.json`; 29 pruebas en Vitest y build de producción verificados. Revisión humana pendiente.

## 2026-11-14 (17) — Consola de una sola pantalla con tablero guardable — Claude (Opus 5.5, Claude Code)

**Pedido (Carlos):** todo en la pantalla principal sin saturar, sin scroll, con tarjetas que el usuario pueda guardar y menús; basado en la referencia v3 (patches 0001–0005, ya aplicados en el repo).

1. `frontend/src/state/board.ts`: tablero por usuario (izquierda máx. 3, derecha máx. 2), presets, deshacer, guardado en `localStorage` con validación al leer. Código generado con IA; revisión humana pendiente.
2. `components/Cards.tsx`, `components/Gallery.tsx`, `sections/Console.tsx`, `sections/Sources.tsx`: 8 tarjetas con menú ⋯ (mover, colapsar, quitar, abrir vista completa), drawer Customize, dock de atmósferas y paneles de vista completa (Explore, Coverage, Gaps, Scenarios, Fuels, Materials, Sources). Sustituye a `Hero.tsx` y a la página con scroll.
3. Todas las cifras siguen saliendo de `public/data/*.json`; sin datos nuevos ni valores inventados. Pruebas: 35 en verde (se añadieron 7 sobre consola y almacenamiento).
4. Sin cambios en datos, `src/`, `scripts/` ni `docs/07-api-contract.md`. Sin peticiones de red.
