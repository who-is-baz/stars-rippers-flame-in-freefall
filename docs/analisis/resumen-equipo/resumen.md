# Resumen del equipo: qué se probó, a qué se parece y qué falta

**Para:** Baz y el equipo · **Fecha:** 2026-11-14 · **Rama:** `feat/baz-resumen-equipo` (apilada sobre `feat/yael-rangos-o2-presion`)
**Reproducir:** `python scripts/analysis_resumen_equipo.py` → `docs/analisis/resumen-equipo/` (tablas para el chat en `tablas.txt`).
**Fuentes de cifras:** `data/processed/experiments.csv`. FLEX = NASA PSI-69, DOI `10.60555/mbq8-0451`. BASS-II = PSI-25, DOI `10.60555/4qc4-de67`.

> **Reglas.** n siempre visible; 0 < n < 5 = gris (no se interpreta); el % de extinción de FLEX es descriptivo, no probabilidad;
> CO₂/He están confundidos con el O₂ (sin causalidad); "disruption" no está definido por la fuente; en BASS-II `not_stated` ≠ "no se
> extinguió" y no hay % de extinción; los resultados de BASS-II son `ai_extracted` (pendientes de revisión humana); sin modelo
> predictivo; sin etiqueta "inflamable/no inflamable".

## Supuestos
1. **Criterios unificados** (los de la sección 2 del pedido): ±0.01 O₂ y ±0.5 psi para todos; bandas B cerradas a la izquierda;
   niveles de presión derivados de los datos.
2. **Rama apilada:** `feat/yael-rangos-o2-presion` no está en GitHub (solo existe en este disco). Para reutilizar su script sin
   duplicarlo, esta rama parte de la de Yael. **Hay que unir el PR de Yael primero**, o rebasar esta rama sobre `main` después.
3. **Entorno:** Anaconda local (Python 3.14, pandas 3.0.3) sin red. No se creó el `.venv` del SETUP porque instalar requiere PyPI, que
   no estaba en la red autorizada. No se probó con pandas 2.1.4.
4. **Categorías de BASS-II:** en esta rama, `material_category` es nula en las 129 filas. Se usó `docs/material_mapping_proposal.csv`.
   **Fer ya lo aprobó sin cambios** (issue #3, rama `origin/feat/baz-mapeo-materiales`, aún no unida a `main`): las 49 categorías y
   los `test_id` son idénticos a `docs/material_mapping.csv` de esa rama (comprobado).
5. Se buscó un "prompt de análisis del CLI" previo (`grep -ril "prompt de análisis\|CLI" docs .claude`). Solo aparece la palabra
   "CLI" en sentido genérico; **no hay un prompt de análisis** que ejecutar ni comparar.

---

## (a) La historia en 3 partes

**1. Qué se probó.** FLEX: 274 pruebas (273 `test_id`; 193F001 duplicada) de gotas de metanol (157) y heptano (117) en microgravedad,
en la ISS. Usaron O₂ de 12 a 34 % y **solo tres presiones**: 10.18–10.53 psi (n=103), 14.54–14.97 psi (n=161) y 29.9–44.9 psi (n=9).
En 123 hubo CO₂ y en 50 He (nunca juntos). BASS-II: 129 pruebas de sólidos (sobre todo PMMA y telas) a presión de cabina **no
registrada**, con O₂ medido de 13.6 a 22.2 %. Solo 26 tienen resultado, extraído por IA.

**2. A qué ambiente se parece (solo por la atmósfera).**
- Cabina de la Tierra, la ISS o el tránsito a Marte (14.7 psia, 21 % O₂): **49 pruebas**, la condición mejor cubierta.
- Hábitat lunar del texto del reto (≥30 % O₂, ≤10.2 psi): **17 pruebas**, a 10.33–10.50 psi.

**3. Qué falta.**
- **Ninguna prueba a 8.2 psi** (la Exploration Atmosphere, también hábitats de Marte) **ni a 4.3 psi** (traje).
- Ninguna con más de 34 % de O₂ ni con 26.5 %.
- No hay gravedad parcial.
- En BASS-II, 103 de 129 pruebas no declaran resultado.

### Hallazgos
1. **Tres presiones, con vacíos entre ellas.** Nada entre 10.53 y 14.54 psi y nada por debajo de 10.18 psi (C11M201 sin presión,
   no se imputa). Ejemplos: 196F001 a 10.42 psi; 178F001 a 14.87 psi; 256F002 a 44.86 psi.
2. **Aire de cabina = condición mejor cubierta.** n=49 (29 sin supresor: 12 metanol + 17 heptano). Resultados en las 49: 29
   extinction, 15 disruption, 5 completion (177F001, 181F001, 205F001…). Coincide con el tránsito a Marte nominal (NTRS 20230009095 p.7).
3. **"Hábitat lunar del reto": 17 pruebas.** O₂ 0.30/0.34 a 10.33–10.50 psi, todas sin supresor, 9 metanol + 8 heptano: 15 disruption,
   2 completion (191R001, 192F001), **0 extinction**. Con criterio estricto (≤10.2 psi) sería 0: el corte depende de 0.1–0.3 psi.
4. **8.2 psi / 34 % O₂ (Exploration Atmosphere; Marte): n=0.** El vecino es O₂ 0.34 a ~10.4 psi, n=9 (192F001, 196F001, 224F001…), a
   +2.13 psi. **No es ese ambiente.**
5. **26.5 % O₂ / 10.2 psi: n=0.** El vecino es O₂ 0.25 a ~10.4 psi, n=6, **todas con CO₂ o He**, 6 disruption (053F001, 141F001…).
   Ninguna prueba sin supresor entre O₂ 0.24 y 0.25 (25 pruebas).
6. **La alta presión solo existe con CO₂ 0.70 y O₂ 0.21** (n=9: 256F002, 248F001…). El efecto de la presión no se separa del del CO₂.
7. **A ~0.7 atm casi todo lleva supresor:** solo 22 de 103 pruebas son sin supresor. En 0.15–0.18, 0.21–0.24 y 0.24–0.28 hay 0.
8. **BASS-II:** se observó ignición en ≥1 prueba en varillas, películas y lámina de PMMA. **Sin dato** (0 resultados declarados) en
   telas SIBAL (27), Nomex (3), esferas de PMMA (2) y vela (1). Solo O12 (varilla transparente 3/8", O₂ 13.6 %) registra
   `no_ignition`. Una prueba no basta para llamar a nada "no inflamable".

---

## (b) Tabla de escenarios y mapa de huecos

**Escenarios** (±0.01 O₂, ±0.5 psi; `t1_escenarios.csv`):

| ID | Escenario | Fuente | n | sin supresor | met/hep | ext/dis/comp | Vecino si n=0 (**no es el escenario**) |
|---|---|---|---|---|---|---|---|
| E1 | Tierra/ISS/tránsito Marte 21 % · 14.7 psi | estándar; NTRS 20230009095 p.7 | **49** | 29 | 23/26 | 29/15/5 | — |
| E2 | Hábitat NASA 26.5 % · 10.2 psi | NTRS 20230009095 p.7, p.27 | **0** | — | — | — | O₂ 0.25 a ~0.7 atm: n=6, 0 sin supresor (−1.5 pp, +0.17 psi) |
| E3 | Exploration Atmosphere / Marte 34 % · 8.2 psi | NTRS 20220015741; 20230009095 p.16; 20170001585 p.4 | **0** | — | — | — | O₂ 0.34 a ~0.7 atm: n=9, 9 sin supresor, 0/8/1 (0 pp, +2.13 psi) |
| E4 | Traje NASA (EVA simulada) 85 % · 4.3 psi | NTRS 20220015741 | **0** | — | — | — | mismo vecino (−51 pp, +6.03 psi) |
| E5 | Traje 100 % · 4.3 psi | texto del reto (docs/08) | **0** | — | — | — | mismo vecino (−66 pp, +6.03 psi) |
| R1 | Hábitat lunar ≥30 % · ≤10.2 psi | texto del reto (docs/08), "likely" | **17** | 17 | 9/8 | 0/15/2 | — |

**Mapa de huecos O₂ × presión** (n total / n sin supresor; `t2_*.csv`). **0** = hueco; ⚠ = hay pruebas, pero 0 sin supresor:

| O₂ \ presión | ~0.7 atm (10.2–10.5 psi) | ~1.0 atm (14.5–15.0 psi) | >2 atm (30–45 psi) | sin dato | total |
|---|---|---|---|---|---|
| <0.15 | **0** | 28 / 23 | **0** | 0 | 28 / 23 |
| 0.15–0.18 | 15 / 0 ⚠ | 36 / 13 | **0** | 0 | 51 / 13 |
| 0.18–0.21 | 25 / 5 | 47 / 7 | **0** | 1 / 0 | 73 / 12 |
| 0.21–0.24 | 30 / 0 ⚠ | 34 / 29 | 9 / 0 ⚠ | 0 | 73 / 29 |
| 0.24–0.28 | 16 / 0 ⚠ | 9 / 0 ⚠ | **0** | 0 | 25 / 0 |
| ≥0.28 | 17 / 17 | 7 / 7 | **0** | 0 | 24 / 24 |
| **total** | 103 / 22 | 161 / 79 | 9 / 0 | 1 / 0 | **274 / 101** |
| *8.2 psi, 4.3 psi, O₂ > 34 %* | *sin pruebas* | | | | |

---

## (c) Conciliación por entrega

| Entrega | Qué dijo | Cifra oficial del equipo | De dónde sale | Qué se corrige |
|---|---|---|---|---|
| **Fer**: escenarios | Tierra 49 (29); ±0.02 → 56 | **49 (29); 56** ✔ | `t1_escenarios.csv`; `verificaciones.csv` Y:F-S1* | Nada |
| Fer | Lunar (≥30 %, ≤10.2 psi) = 0 | **17** con la misma tolerancia (0 solo con corte estricto) | R1; 191F001…224F001 | Aplicó ±0.5 psi a Tierra y no al corte lunar |
| Fer | 10.2–10.5 psi → 103; 30–45 psi → 9 | **103 a 10.18–10.53 psi; 9 a 29.89–44.86 psi** | `niveles_presion.csv` (rama Yael) | Las etiquetas leídas en sentido estricto dan 100 y 8 (240R003 está a 29.89 psi). Es redondeo |
| Fer | Lunar ≥30 %/≤10.2 y traje 100 %/4.3 "sin fuente" (según Yael y el pedido) | **Con fuente: texto oficial del reto** (docs/08) | `escenario_marte.md` | Corrección a Yael y al pedido; la NASA técnica (NTRS) da 85 % a 4.3 psia en EVA simulada |
| **Yael**: rangos O₂×presión | Tabla 3.1; 101 sin supresor; 3 niveles; vecinos | **Igual** ✔ | `t2_*.csv`; tests | Solo la fuente de R1/E5 (fila anterior) |
| **Charly**: FLEX por combustible | 8 filas (heptano 11/73/29/4; metanol 37/85/30/5) | Sus 8 filas son correctas con **sus** bandas; la cifra oficial es la **estratificada** (`t3_combustible_estratificado.csv`) | `charly_conciliacion.csv` (rama Yael) | Bandas cerradas a la derecha: 89 pruebas cambian de banda (0.15, 0.21 y 0.30 en los bordes). La tasa media mezclaba presiones y CO₂/He (66 de 85 en una fila). Tasa solo con n ≥ 5 |
| **Jovanny**: BASS-II por material | `bass.groupby(["material_category","outcome"])` | `t4_bass2_por_material.csv`: 129 = 26 con resultado + 103 not_stated; extinction 17, blowoff 7, no_ignition 1, not_sustained 1 | `verificaciones.csv` BASS-* | En `main` ese groupby devuelve **vacío** (categoría nula en 129 filas). Hay que unir `feat/baz-mapeo-materiales` o usar el mapeo por `test_id`. Sin % de extinción |
| **PDF "materiales"** (autor sin confirmar) | BASS-II: 129, 26, O12, categorías 54/32/22/20/1 | **Coincide** ✔ | `afirmaciones_pdf.csv` (rama Yael) | — |
| PDF | FLEX: 160/114; lunar 19; 1 extinción a 30 %/~1 atm; CO₂ 78/51; He 36/24; aire 10/12 | **157/117; 17; 2 (178F001, 206R001); 75/48; 28/22; 12/17** | ídem; VERIFICACION A4.1 | La sección 7 **no se cita**. La causa no es el pipeline. No se adopta su etiqueta binaria |

---

## (d) Pendientes con dueño
| Dueño | Pendiente |
|---|---|
| **Fer** | Unir `feat/baz-mapeo-materiales`: el mapeo ya está aprobado en #3, falta el merge (lo hace Baz o quien revise). Revisar las 26 extracciones `ai_*` (3 `low_confidence`: P5, P13a, O6). Confirmar si el escenario de traje es 100 % (texto del reto) u 85 % (NTRS) |
| **Jovanny** | Rehacer BASS-II por material con el mapeo unido (o con `t4_bass2_por_material.csv`); solo conteos y "ignición observada en ≥1 prueba" |
| **Charly** | Cambiar a bandas cerradas a la izquierda y a la versión estratificada (tasa solo con n ≥ 5) |
| **Autor del PDF** | Decir de dónde salen sus cifras de FLEX; si es la tabla PSI-69, correr el comando de la sección 4 del informe de Yael |
| **Yael** | Subir `feat/yael-rangos-o2-presion` y abrir su PR; actualizar su informe: la definición lunar y el traje 100 % sí tienen fuente (el reto) |
| **Baz** | Decisiones de `brief-reunion.md` / `decisiones_propuestas.md`; orden de los PRs (Yael → Baz); confirmar si el congelamiento sigue a las 14:00 del domingo |

---

## (e) Bloque EN (página del proyecto: gap statement)

> Valores NASA verificados el 14 nov contra los NTRS citados. Las cifras del reto se citan como "challenge statement". Si se cambia
> algún escenario, revisar el texto.

<!-- EN -->
**What the data cover — and what they do not.** We analyzed the Flame Extinguishment Experiment (FLEX; NASA PSI-69, DOI
10.60555/mbq8-0451): 274 records of methanol and heptane droplets burned in microgravity aboard the ISS. Only the atmosphere of these
tests — oxygen fraction and pressure — can be compared with a crew habitat; gravity, airflow and fuel differ. FLEX used three pressure
levels (10.18–10.53 psi, n = 103; about 14.7 psi, n = 161; 29.9–44.9 psi, n = 9) and 12–34% O₂. Earth-like cabin air (21% O₂,
14.7 psi; also the nominal Mars-transit atmosphere, NTRS 20230009095) is the best-covered condition (n = 49). The challenge
statement's expected Moon-base atmosphere (≥30% O₂, ≤10.2 psi) is matched only approximately, by 17 tests at 30–34% O₂ and
10.33–10.50 psi. **No FLEX test was run at 8.2 psi — the 34% O₂ "Exploration Atmosphere" studied for lunar and Martian surface
exploration (NTRS 20220015741; Mars surface habitats at 8.2 psia, NTRS 20230009095) — and none at 4.3 psi, the suit pressure.** No
test used 26.5% O₂ or more than 34% O₂, and PSI holds no partial-gravity combustion data. Our dashboard is therefore designed to show
"No data available" for those atmospheres, together with the nearest tested condition, clearly labeled as a neighbor rather than a
match; its SI (Super Intelligence; in our project, an AI/LLM assistant restricted to querying these tables) gives the same answer
instead of extrapolating. Because FLEX chose test conditions iteratively to approach the extinction limit, all counts are
descriptive, not probabilities of fire behavior.
<!-- /EN -->
