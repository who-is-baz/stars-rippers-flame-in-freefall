# Verificación independiente — datos, DOIs y reglas

**Fecha de verificación:** 2026-11-14 (≈17:15–18:00 UTC) · **Rama:** `verificacion/datos` · **Hecho por:** Claude Code (Opus 5.5), ver §6.
**Método:** pandas directo sobre `data/raw/` (sin `src/psi_queries.py` ni `scripts/build_*`), API pública de PSI, API de DataCite y
los Science Documents de `data/reference/`. Semilla de muestreo: `20261114`. Ningún archivo de datos ni doc existente fue modificado.

## 1. Resumen ejecutivo
- **Datos: bien.** DOIs, licencia CC0-1.0, conteos (274/129/403), 20/20 filas muestreadas campo por campo, 10/10 celdas del coverage grid y los 10 tipos de `qc_flags` coinciden con las fuentes.
- **Discrepancias menores:** el ejemplo de heptano en `docs/03` cita O₂ 0.12 (no hay heptano a 0.12 a ~1 atm); 2 casos de CO de BASS-II quedan sin flag (M5 ">500" → nulo; 13 CO iniciales negativos); la lista de `docs/tareas/fer-datos.md` omite T28a/T28b; `docs/00` dice que el repo "no tiene código aún".
- **Falló:** **toda la Parte B (reto y reglas 2026) es NO VERIFICABLE**: www.spaceappschallenge.org sirve un certificado TLS que no se puede validar (ver §2, B0). No se rodeó.
- **Riesgo principal:** las reglas de entrega del repo (IA, demo, licencia, trabajo previo, hora de cierre) siguen basadas en la guía 2025 sin confirmar; la política de IA es la de mayor impacto.
- **Riesgo secundario:** el endpoint `/geode-py/ws/repo/investigations/<ID>` de PSI devuelve 500 hoy (6/6 IDs).

## 2. Tabla de verificación

Estados: **VERIFICADO** / **DISCREPANCIA** / **NO VERIFICABLE**. Todas las filas: fecha 2026-11-14.

### Parte A — Datos

| ID | Afirmación | Dónde aparece | Fuente y cita | Estado |
|---|---|---|---|---|
| A1.1 | DOI de FLEX (PSI-69) = `10.60555/mbq8-0451` | `experiments.csv` (`source_doi`, 274 filas), `docs/03` l.11, `data-dictionary.md` l.144, `07-api-contract.md` l.28, `coverage_grid.json`, scripts, tests | DataCite `https://api.datacite.org/dois/10.60555/mbq8-0451`: título "Flame Extinguishment Experiment"/"FLEX", url `https://psi.nasa.gov/physci/repo/data/investigations/PSI-69`, publisher NASA PSI, 2016, state findable | VERIFICADO |
| A1.2 | DOI de BASS-II (PSI-25) = `10.60555/4qc4-de67` | `experiments.csv` (129 filas), `docs/03` l.12, `data-dictionary.md` l.144, scripts, tests | DataCite `https://api.datacite.org/dois/10.60555/4qc4-de67`: "Burning and Suppression of Solids - II"/"BASS-II", url `…/investigations/PSI-25`, NASA PSI, 2022 | VERIFICADO |
| A1.3 | Licencia de los datos CC0-1.0 | `data-dictionary.md` l.5, `coverage_grid.json` (`license`) | DataCite `rightsList` de ambos DOIs: "Creative Commons Zero v1.0 Universal" (`cc0-1.0`, SPDX) | VERIFICADO (cierra el pendiente de `docs/03` l.45) |
| A1.4 | Metadatos PSI-69 FLEX: gotas, ISS | `docs/03` l.11 | PSI `GET /geode-py/ws/repo/search?source=psi&type=investigation&from=0&size=200` (133 hits): Acronym FLEX, "Flame Extinguishment Experiment", ISS, hardware CIR/MDCA (Multi-user Droplet Combustion Apparatus), inicio 08-01-2007, fin 07-31-2016, release 1469923200 (=2016-07-31) | VERIFICADO |
| A1.5 | Metadatos PSI-25 BASS-II: sólidos, ISS | `docs/03` l.12 | Mismo listado: "Burning and Suppression of Solids - II", ISS, MSG, 01-01-2010 → 12-31-2022, release 1672444800 (=2022-12-31) | VERIFICADO |
| A1.6 | PSI-100 = Saffire-III | `docs/03` l.14 | Listado: PSI-100 "SAFFIRE-III — Spacecraft Fire Experiment-III", Spacecraft Fire Safety, ISS. (PSI-10 = ACME/Flame Design; PSI-101 = SAME-R; PSI-159 = ACME CFI-G; el repo no afirma nada de ellas) | VERIFICADO |
| A1.7 | Combustion Science = 24 investigaciones | `AI_USAGE_LOG.md` l.22, `data-dictionary.md` l.153 | Listado: 24 de 133 con `Research Area = Combustion Science` | VERIFICADO |
| A1.8 | "SoFIE no está en PSI" | `AI_USAGE_LOG.md` l.22, `data-dictionary.md` l.153 | Listado: ninguna investigación con sigla o título SoFIE. **Matiz:** el campo *Objectives* de PSI-25 dice "Provide SoFIE PIs with preliminary data to refine Science Requirements" | VERIFICADO (con matiz) |
| A1.9 | Endpoint de detalle `/geode-py/ws/repo/investigations/<ID>` funciona sin login | `AI_USAGE_LOG.md` l.16 | 6/6 peticiones (PSI-25, 69, 10, 100, 101, 159) → HTTP 500 `{"message": "Internal Server Error"}` (17:16–17:18 UTC). No se probó el endpoint de descarga | DISCREPANCIA (temporal; reintentar) |
| A2.1 | FLEX: 274 filas | `docs/03` l.11, `data-dictionary.md` | `data/raw/FLEX/PSI-69_Experimental table_FLEX.csv` (cp1252): 274 filas × 15 columnas | VERIFICADO |
| A2.2 | BASS-II: 129 filas | `docs/03` l.12 | `PSI-25_Experimental table_BASS-II.csv`: 129 × 17; `Test.Matrices.xlsx`, 6 hojas: Bhattacharjee 22 + Ferkul 4 + Miller 20 + Olson 27 + Fernandez-Pello 27 + T'ien 29 = 129 | VERIFICADO |
| A2.3 | `experiments.csv` = 403 filas (274+129) | `data-dictionary.md` | `experiments.csv`: FLEX 274, BASS-II 129 | VERIFICADO |
| A2.4 | Encabezados "O/N/CO" = O₂/N₂/CO₂ | `AI_USAGE_LOG.md` (sesión 2) | Cabecera cruda literal: `O initial…`, `N initial…`, `CO initial…` (sin subíndices en el archivo). Coherente con Test Plan p.8 `XN2 = 1.0 − XO2 − XCO2` y con Σ fracciones ≈ 1 | VERIFICADO (inferencia respaldada) |
| A3 | 20 filas al azar (10 FLEX + 10 BASS-II; 6 con qc_flags reales) idénticas a la celda original en todos los campos | `experiments.csv` | Script independiente; líneas del CSV crudo FLEX 54, 73, 106, 142, 169, 172, 201, 224, 225, 259; BASS-II 19, 36, 43, 58, 64, 67, 91, 109, 110, 119. Conversiones: `mmHg/760` (redondeo 4 dec.), `% vol/100`, K sin cambio | VERIFICADO (20/20) |
| A4.1 | Resultados FLEX | `data-dictionary.md` | Crudo: extinction 186, disruption 61, completion 27; methanol 157, heptane 117 | VERIFICADO (sin contraparte textual explícita en docs) |
| A4.2 | Rangos FLEX | `data-dictionary.md` | O₂ 0.12–0.34; presión 526.3–2319.9 mmHg (0.69–3.05 atm) + 1 fila con 0 (C11M201); CO₂>0 en 123, He>0 en 50, nunca juntos | VERIFICADO |
| A4.3 | Fracciones que no suman 1: 6 filas (\|Σ−1\|>0.015) | `data-dictionary.md` l.37 | Crudo: 6 con \|Δ\|=0.02; otras 23 con \|Δ\|=0.01 (redondeo a 2 decimales) | VERIFICADO |
| A4.4 | CO₂ de fondo en BASS-II ≤1.85 % | `data-dictionary.md` | Crudo: máx. `Initial CO2 % by vol` = 1.85 | VERIFICADO |
| A4.5 | Metanol a ~1 atm sin supresor: K ≈ 0.36 → 0.50 → 0.67 para O₂ 0.12 → 0.21 → 0.30 | `docs/03` l.33 | Recalculado (0.9–1.1 atm, CO₂=He=0): 0.360 (n=7), 0.501 (n=12), 0.672 (n=4) | VERIFICADO |
| A4.6 | Heptano: K ≈ 0.52 → 0.56 → 0.74 para O₂ 0.12 → 0.21 → 0.30 | `docs/03` l.33 | Recalculado: **no hay heptano a O₂ 0.12** a ~1 atm. 0.13: 0.250 (n=1); 0.14: 0.523 (n=3); 0.15: 0.526 (n=5); 0.21: 0.559 (n=15); 0.30: 0.743 (n=3). "0.52" corresponde a O₂ 0.14–0.15 | DISCREPANCIA (menor, de etiqueta) |
| A4.7 | Coverage grid: 49 celdas, 274 pruebas | `coverage_grid.json` | Recálculo independiente con las bandas declaradas en el JSON: 49 celdas, 274 pruebas | VERIFICADO |
| A4.8 | 10 celdas al azar del grid (n, K medio, D_ext medio, % extinción) | `coverage_grid.json` | 10/10 coinciden. Única diferencia: (methanol, 0.21–0.24, 0.7 atm, co2) 56.25 % → JSON 56.3, recálculo 56.2: es redondeo (SQLite vs. Python), no error | VERIFICADO |
| A5.1 | CO₂ y He son supresores; N₂ = 1 − O₂ − supresor | `data-dictionary.md`, `docs/03` | `data/reference/PSI-69_…FLEX_Test_Plan.pdf`: p.8 "Table 8: CO2 suppressant efficacy test matrix … XN2 = 1.0 − XO2 − XCO2"; p.10 "Table 9: He suppressant efficacy … XN2 = 1.0 − XO2 − XHe" | VERIFICADO |
| A5.2 | Burning rate en mm²/s | `data-dictionary.md`, `flex_tests.csv` (`burning_rate_mm2_s`) | Cabecera de la Experiment Table: solo "Burning rate; mm" (truncada). Pero `data/raw/FLEX/PSI-69_Raw Data_30CAL07-Test009 Results.xls`, hoja "Test 009", fila 1: "K (mm2/s)"; `…Test 002 Results.xls`, hoja "Test 002", fila 4: "Burning Rate (mm2/s)". No aparece en los 4 Science Documents | VERIFICADO (vía .xls crudos) |
| A5.3 | "Disruption" no está definido | `CLAUDE.md` regla 2, `data-dictionary.md` | Búsqueda de "disrupt" en los 4 Science Documents (FLEX DoD, FLEX Test Plan, BASS-II ReadMe, BASS-II SRD): 0 apariciones. No se revisaron publicaciones | VERIFICADO (en esos 4 documentos) |
| A5.4 | Diseño iterativo hacia el límite (% no es probabilidad) | `data-dictionary.md` l.12, `coverage_grid.json` | Test Plan p.4: "the procedure will involve an iterative sequence of tests (burn to completion…" | VERIFICADO |
| A5.5 | Discrepancia 20CAL10 (CSV K=0.60, D_ext=0.94 vs .xls K=0.5356, D_ext=0.920) | `data-dictionary.md` l.48, l.163 | `…Test 002 Results.xls`, hoja "Test 002": fila 4 "Burning Rate (mm2/s) 0.5356", fila 5 "Extinction Diameter (mm) 0.92003"; Experiment Table l.3: 0.60 / 0.94 | VERIFICADO (la discrepancia existe en la fuente) |
| A6 | 26 extracciones de IA de BASS-II correctas | `bass2_tests.csv` (`ai_*`), `docs/03` l.12 | Revisión una a una contra `raw_note` (Fan/Air display): 26/26 coherentes. **Dudosas** (ambigüedad del texto, no error claro): **P5** y **P13a** (`ai_fan_pot_at_extinction = 0`: "…0.28, 0 ext", ¿extinción al apagar el ventilador?), **O6** ("out .275" interpretado como extinción a baja velocidad sin la palabra "ext"). Además, *blowoff* se marca `ai_extinguished=True` (correcto físicamente, pero la UI debe distinguirlo). En las 103 `not_stated`, solo 2 notas mencionan ignición (F4 "see notes", M15) y ninguna da resultado: bien clasificadas | VERIFICADO (3 dudosas para Fer) |
| A7.1 | Los 10 tipos de `qc_flags` corresponden a algo real | `experiments.csv`, `flex_tests.csv`, `bass2_tests.csv` | Recalculados desde el crudo, filas idénticas: `extinction_diameter_dropped…` 38; `mole_fractions…` 6; `duplicate_flex_id` 2 (193F001, tests #70 y #73, misma fecha/hora 3/23/2010 7:25:43, D₀ 4.67 vs 4.64, K 0.41 vs 0.56); `pressure_zero_set_null` 1 (C11M201 = 0); `burn_time_approx` 2; BASS `o2_final_implausibly_low` 3 (B2 1.6 %, P22a 0.6 %, T28a 0.9 %); `…_high` 2 (P22b 39.1 %, T28b 40.4 %); `co_over_range` 3 (O4 "OR", O12 "OR/OR", O13b "over"); `date_year_inconsistent` 2 (T9, T18: 6/24/2018 con GMT 175 en hoja "GMT 2014-"); `material_category_pending_review` 129 | VERIFICADO |
| A7.2 | Valores de CO no estándar sin flag | `bass2_tests.csv` | Crudo: **M5** CO final ">500" → `co_final_ppm` nulo sin flag (se pierde que es ≥500); **13** CO iniciales negativos (−1 a −3 ppm) conservados sin flag | DISCREPANCIA (falta de flag) |
| A7.3 | Lista de O₂ final imposible = P22a/P22b y B2 | `docs/tareas/fer-datos.md` | El CSV marca también **T28a y T28b** (mismo patrón ~0.9 % / 40.4 %) | DISCREPANCIA (doc incompleto) |

### Parte B — Reto y reglas

| ID | Afirmación | Dónde aparece | Fuente y cita | Estado |
|---|---|---|---|---|
| B0 | Acceso a fuentes oficiales | — | `www.spaceappschallenge.org` (todas las páginas: `/2026/`, `/2026/challenges/`, `/resources/project-submission-guide/`, `/resources/judging-awards-guide`, `/resources/participant-faqs/`, `/legal/`, `/2026/local-events/`): fallo TLS "unable to get local issuer certificate". `openssl s_client`: el servidor presenta `CN = www.space.apps.nasa.gov`, emisor "SSL.com TLS Issuing RSA CA R1", *Verify return code: 20*. Es un problema del certificado del servidor (cadena incompleta), no un bloqueo por bot. **No se usó `-k`, caché ni espejos** | NO VERIFICABLE |
| B1 | Texto oficial del reto "Flame in Freefall" (descripción, objetivos, recursos, dificultad) | `README.md`, `docs/00`, `docs/03` | Página oficial inaccesible (B0). Pista **no oficial**: un artículo de therecursive.com lo lista como "Flame in **Free Fall**" (ortografía distinta): no sirve como cita | NO VERIFICABLE |
| B2.1 | Contenido del formulario en inglés | `docs/00` | Guía 2026 inaccesible (B0) | NO VERIFICABLE (SIN FUENTE 2026) |
| B2.2 | Demo: video ≤30 s con subtítulos en inglés o ≤7 diapositivas; enlaces públicos | `docs/00`, `06-pitch.md`, `README` | idem | NO VERIFICABLE |
| B2.3 | Use of AI: declarar IA; marca de agua en imágenes/video IA; sin marca NASA | `docs/00`, `05-entrega`, `CLAUDE.md` regla 9 | idem | NO VERIFICABLE |
| B2.4 | References: todo recurso externo | `docs/00`, `05-entrega` | idem | NO VERIFICABLE |
| B2.5 | Checkbox "Confirm All Work is Original" | `docs/00`, `05-entrega` | idem | NO VERIFICABLE |
| B2.6 | Usar datos NASA (Global Awards); open source Apache 2.0 por defecto | `docs/00`, `README` (Licencia), `05-entrega` | idem | NO VERIFICABLE |
| B2.7 | ¿Se permite trabajo previo? | `docs/00` (pendiente) | idem | NO VERIFICABLE |
| B2.8 | Criterios: Influence/Impact · Creativity · Validity · Relevance · Presentation | `docs/00` | idem. Un resumen de buscador (no oficial) menciona "Impact, Creativity, Validity, Relevance, Presentation" atribuido a la guía **2025** | NO VERIFICABLE |
| B3.1 | Cierre dom 15 nov 11:59 PM hora local; evaluación 16 nov; Global Nominees 3 dic; Finalistas 17 dic | `docs/00` | Sitio oficial inaccesible. Resultados de búsqueda (no oficiales, sin abrir): evento 14–15 nov 2026, juzgamiento desde 16 nov | NO VERIFICABLE |
| B3.2 | Equipo 4–6 en UNAQ (máx. 6) | `docs/00` | Página del Local Event inaccesible (B0) | NO VERIFICABLE |
| B3.3 | UNAQ: prohibido salir del campus; sin transporte, tabaco ni alcohol | `docs/00` | idem; no hay fuente UNAQ en el repo | NO VERIFICABLE |
| B4.1 | "Sin código de solución" / "por eso el repo no tiene código aún" | `docs/00` (Fechas clave y Pendientes) | Estado actual del repo: hay pipeline, `src/` y tests (commit `5aa4add`) | DISCREPANCIA (interna, desactualizado) |
| B4.2 | "Repo public + Apache-2.0 LICENSE" | `05-entrega` checklist | Hoy el repo es privado y no tiene `LICENSE`: es un pendiente, no un error | NO VERIFICABLE (regla) / pendiente |

## 3. Correcciones propuestas (NO aplicadas), por prioridad
1. **[Alta] Confirmar las reglas 2026 por un humano** (B2–B3): abrir las guías en un navegador y copiar el texto de *Use of AI*, demo, licencia, trabajo previo y hora de cierre. Hasta entonces, `docs/00` debe seguir marcado "guía 2025".
2. **[Alta] Avisar del certificado** de spaceappschallenge.org a la Local Lead: si a algún integrante le falla el sitio, afecta al envío del formulario.
3. **[Media] `bass2_tests.csv`:** añadir un flag para M5 (`co_final_censored_gt_500`) y otro para CO negativos (`co_negative_sensor_offset`) en lugar de dejarlos silenciosos.
4. **[Media] `docs/tareas/fer-datos.md`:** añadir T28a/T28b a la lista de O₂ final imposible; añadir P5, P13a y O6 como extracciones dudosas.
5. **[Baja] `docs/03` l.33:** cambiar "heptano ≈0.52 … para O₂ 0.12" por "O₂ 0.14–0.15 (no hay heptano a 0.12 a ~1 atm)" y añadir n.
6. **[Baja] `docs/03` l.45:** cerrar "Confirmar licencia" con la cita de DataCite (CC0-1.0).
7. **[Baja] `docs/00`:** quitar "Sin código de solución" / "por eso el repo no tiene código aún".
8. **[Baja] `AI_USAGE_LOG`/`data-dictionary`:** precisar "SoFIE no está en PSI como investigación; se menciona en los objetivos de BASS-II".
9. **[Baja] `fetch_psi.py`/docs:** anotar que el endpoint de detalle dio 500 el 14 nov; reintentar antes de depender de él.

## 4. Lo que debe confirmar un humano
- **Fer:** extracciones dudosas P5, P13a, O6; tratamiento de M5 y CO negativos; qué valor usar para 20CAL10 (CSV vs. .xls); T28a/T28b; si "blowoff" cuenta como extinción en la UI.
- **Local Lead UNAQ:** hora límite real, tamaño mínimo de equipo, reglas de campus (salir, transporte, tabaco/alcohol), y si conoce el problema del certificado del sitio.
- **Baz (con las guías 2026 abiertas en navegador):** política de IA (declaración, marca de agua, metadatos), formato del demo, idioma, enlace público, licencia por defecto, trabajo previo permitido, criterios de evaluación y texto oficial del reto.

## 5. Peticiones de red realizadas
- PSI (`psi.nasa.gov`): 1 intento con timeout + 7 GET (6 → 500, 1 listado de 1.07 MB), ≥1.2 s entre peticiones. Sin descargas de datos.
- DataCite (`api.datacite.org`): 2 GET.
- Space Apps: 7 WebFetch (fallo TLS) + 1 `curl -I` + 1 `openssl s_client` de diagnóstico. 2 búsquedas web.
- Ninguna página contenía texto con instrucciones dirigidas a la IA (los Science Documents y el listado de PSI se revisaron).

## 6. Registro de uso de IA (esta verificación)
Claude Code (Opus 5.5) escribió los scripts de verificación (en un directorio temporal fuera del repo), ejecutó las consultas
listadas en §5 y redactó este informe. Las revisiones "una a una" (A6) y la clasificación de dudosas son juicio de la IA y
deben confirmarse por Fer. Ningún dato ni doc existente se modificó.
