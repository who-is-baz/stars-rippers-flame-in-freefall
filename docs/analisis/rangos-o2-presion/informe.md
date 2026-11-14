# Rangos de O₂ y presión en FLEX: conteos, huecos y conciliación

**Autor:** Yael (con Claude Code, Opus 5.5) · **Fecha:** 2026-11-14 · **Rama:** `feat/yael-rangos-o2-presion`
**Fuente única de cifras:** `data/processed/experiments.csv`, `program == "FLEX"` = NASA PSI-69, DOI `10.60555/mbq8-0451` (CC0-1.0).
**Reproducir:** `python scripts/analysis_rangos_o2_presion.py` (tests: `python tests/test_analysis_rangos.py`).

> Reglas que aplican a todo este documento: **n siempre visible**; 0 < n < 5 = **gris** (no se interpreta);
> el % de extinción es **descriptivo, no una probabilidad** (FLEX buscó el límite de extinción de forma iterativa);
> CO₂ y He están **confundidos con el O₂** (no hay causalidad); "disruption" **no está definido por la fuente**;
> no hay modelo predictivo. FLEX se hizo en **microgravedad en la ISS**: solo la *atmósfera* (O₂ y presión) puede
> parecerse a la de un hábitat; la gravedad, la ventilación y el combustible no.

---

## 0. Supuestos (decisiones por defecto tomadas en modo autónomo)

1. **Intérprete:** no había venv ni pandas en el Python 3.12 del sistema. Instalar con `pip` requiere red (PyPI), así que se usó
   el Anaconda local (**Python 3.14.6, pandas 3.0.3, numpy 2.4.6, pytest 9.0.3**), sin instalar nada. `requirements.txt` fija
   pandas 2.1.4: el código evita funciones exclusivas de pandas 3, pero **no se probó con 2.1.4**.
2. **Niveles de presión:** grupos = presiones separadas por más de 0.1 atm. Etiquetas: < 0.85 atm → "~0.7 atm", < 1.5 → "~1.0 atm",
   resto → ">2 atm", nula → `sin_dato`. El script comprueba que ningún grupo cruza esos cortes.
3. **"Sin supresor"** = `co2_fraction == 0` y `he_fraction == 0` exactos. Un nulo no se toma como 0 (en FLEX no hay nulos).
4. **Bandas:** cerradas a la izquierda (`right=False`), con bordes y O₂ redondeados a 4 decimales. Las tablas principales usan el
   **esquema B**, que es el que reproduce la tabla 3.1. A y C están en `comparacion_bandas.csv` (y en `--bands A|C`).
5. **Tolerancias:** intervalos cerrados `[objetivo − tol, objetivo + tol]`. Modo "solo hacia arriba" (`+0.4 psi`): para un valor
   puntual da `[objetivo, objetivo + 0.4]`; para un techo ("≤ 10.2 psi") da `≤ 10.6`. "≥ 30 % O₂" con ±0.01 se convierte en `≥ 0.29`.
   La principal es **±0.01 O₂ / ±0.5 psi** (la de Fer).
6. **1 atm = 14.696 psi.**
7. **Vecino más cercano:** se toma la condición probada (O₂ exacto × nivel de presión) que está a menor distancia, medida en
   "anchos de tolerancia" (0.01 de O₂ y 0.5 psi). **No es el escenario**, solo lo más parecido que existe.
8. **PDF, "aire" e "hipoxia":** como el PDF no define la presión ni la tolerancia, se calcularon varias lecturas razonables
   (ver `afirmaciones_pdf.csv`). Ninguna coincide.
9. **Diámetro de extinción (Charly):** se usa el de `experiments.csv`, que solo trae diámetro cuando `outcome = extinction`.
   Con eso sus 8 filas salen exactas.
10. **Hechos NASA de la sección 3.5 del pedido:** no se verificaron (no hubo red). Aparecen como "verificar".

---

## 1. Tabla final de conteos y huecos (esquema B, n por celda)

Los niveles de presión **salen de los datos**: al ordenar las 273 presiones no nulas, aparecen dos saltos grandes,
0.7163 → 0.9895 atm (0.27) y 1.0186 → 2.0338 atm (1.02). Los 9 valores > 2 atm forman 3 subgrupos pequeños
(2.03–2.04, 2.70–2.73 y 3.05 atm). Como solo son 9 pruebas, se agrupan en ">2 atm" (`grupos_presion_detectados.csv`).

| Nivel | n | atm | psi |
|---|---|---|---|
| ~0.7 atm | 103 | 0.6925–0.7163 | 10.18–10.53 |
| ~1.0 atm | 161 | 0.9895–1.0186 | 14.54–14.97 |
| >2 atm | 9 | 2.0338–3.0525 | 29.89–44.86 (todas con O₂ 0.21 y CO₂ 0.70) |
| sin_dato | 1 | — | — (C11M201: el original traía 0.0 mmHg; se dejó nula y no se imputó) |

**No hay ninguna prueba entre 10.53 y 14.54 psi ni por debajo de 10.18 psi.** El O₂ va de 0.12 a 0.34.

**Todas las pruebas** (`conteos_total.csv`):

| O₂ \ presión | ~0.7 atm | ~1.0 atm | >2 atm | sin dato | total |
|---|---|---|---|---|---|
| <0.15 | **0** | 28 | **0** | 0 | 28 |
| 0.15–0.18 | 15 ⚠ | 36 | **0** | 0 | 51 |
| 0.18–0.21 | 25 | 47 | **0** | 1 | 73 |
| 0.21–0.24 | 30 ⚠ | 34 | 9 ⚠ | 0 | 73 |
| 0.24–0.28 | 16 ⚠ | 9 ⚠ | **0** | 0 | 25 |
| ≥0.28 | 17 | 7 | **0** | 0 | 24 |
| **total** | 103 | 161 | 9 | 1 | **274** |

**Sin supresor** (CO₂ = 0 y He = 0; `conteos_sin_supresor.csv`):

| O₂ \ presión | ~0.7 atm | ~1.0 atm | >2 atm | total |
|---|---|---|---|---|
| <0.15 | 0 | 23 | 0 | 23 |
| 0.15–0.18 | 0 | 13 | 0 | 13 |
| 0.18–0.21 | 5 | 7 | 0 | 12 |
| 0.21–0.24 | 0 | 29 | 0 | 29 |
| 0.24–0.28 | 0 | 0 | 0 | 0 |
| ≥0.28 | 17 | 7 | 0 | 24 |
| **total** | 22 | 79 | 0 | **101** |

- **Negrita 0** = hueco (6 celdas con n = 0). **⚠** = hay pruebas, pero **ninguna sin supresor** (5 celdas). En esas celdas
  cualquier resultado mezcla O₂ con CO₂/He.
- A nivel banda × presión no hay celdas grises (0 < n < 5). Las celdas grises aparecen al separar por combustible: de 36
  celdas, 13 tienen n = 0 y 5 son grises; de las de sin supresor, 6 son grises y 10 tienen datos pero 0 pruebas limpias
  (`conteos_por_combustible.csv`).
- **193F001** está duplicado: se cuentan las 2 filas (n = 274) y también se informa n deduplicado = 273
  (`conteos_total_dedup.csv`). Las dos filas tienen la misma condición (O₂ 0.15, 1.0013 atm).
- **Verificación:** suma de celdas = 274 = filas FLEX. Sin supresor (101) ≤ total (274). La tabla 3.1 de Yael y sus cifras
  sin supresor se reproducen **celda por celda** (`verificaciones.csv`, filas Y31-*).

---

## 2. Escenarios (misma tolerancia para todos)

### 2.1 Matriz tolerancia × escenario (n total; `escenarios.csv`, `matriz_tolerancia_escenario.csv`)

| Escenario | estricto | ±0.01 / ±0.5 psi | ±0.01 / +0.4 psi | ±0.02 / ±0.5 psi | ±0.02 / +0.4 psi |
|---|---|---|---|---|---|
| S1 Tierra/ISS 21 % · 14.7 psi | 0 | **49** | 33 | 56 | 33 |
| S2a Lunar (Fer) ≥30 % · ≤10.2 psi | **0** | **17** | 17 | 17 | 17 |
| S2b Hábitat NASA 26.5 % · 10.2 psi | 0 | 0 | 0 | 6 | 6 |
| S2c Exploración 34 % · 8.2 psi | 0 | 0 | 0 | 0 | 0 |
| S3a Traje 100 % · 4.3 psi | 0 | 0 | 0 | 0 | 0 |
| S3b Traje 85 % · 4.3 psi | 0 | 0 | 0 | 0 | 0 |

### 2.2 Detalle con la tolerancia principal (±0.01 O₂, ±0.5 psi)

| Escenario | n (dedup) | sin supresor | metanol / heptano | extinction / disruption / completion | condiciones reales | ejemplos `test_id` |
|---|---|---|---|---|---|---|
| S1 Tierra/ISS | 49 (49) | 29 | 23 / 26 | 29 / 15 / 5 | O₂ 0.20–0.21; 14.58–14.92 psi | 177F001, 181F001, 205F001, 209F001 |
| S2a Lunar (Fer) | 17 (17) | 17 | 9 / 8 | 0 / 15 / 2 | O₂ 0.30 y 0.34; 10.33–10.50 psi | 191F001, 192F001, 196F001, 219F001 |
| S2b, S2c, S3a, S3b | 0 | — | — | — | **sin dato** | — |

**Vecino más cercano (NO es el escenario):**

| Escenario sin datos | Condición probada más cercana | ΔO₂ | Δpsi | n | sin supresor | resultados | `test_id` |
|---|---|---|---|---|---|---|---|
| S2b 26.5 % · 10.2 psi | O₂ 0.25 a ~0.7 atm (10.37–10.43 psi) | −1.5 pp | +0.17 | 6 | **0** (todas con CO₂/He) | 6 disruption | 053F001, 053R001, 061F002, 141F001, 141R001, 149F001 |
| S2c 34 % · 8.2 psi | O₂ 0.34 a ~0.7 atm (10.33–10.50 psi) | 0 | **+2.13** | 9 | 9 | 8 disruption, 1 completion | 192F001–003, 196F001–003, 220R001, 220R002, 224F001 |
| S3a 100 % · 4.3 psi | mismo vecino (O₂ 0.34, ~0.7 atm) | −66 pp | +6.03 | 9 | 9 | ídem | ídem |
| S3b 85 % · 4.3 psi | mismo vecino | −51 pp | +6.03 | 9 | 9 | ídem | ídem |

### 2.3 Lo que se ve en la matriz
- **Se reproducen los 49 / 29 de Fer** (±0.01, ±0.5 psi) **y el 56** con ±0.02. El 56 sale porque ±0.02 incluye O₂ 0.19 (7 pruebas
  más a ~1 atm, todas con supresor): el número de pruebas sin supresor sigue siendo 29.
- **La inconsistencia de Fer se confirma:** aplicó ±0.5 psi a Tierra pero no al corte lunar. Con la misma tolerancia, S2a da **17**,
  no 0. Ojo: con ±0.5 psi, "≤ 10.2 psi" se convierte en "≤ 10.7 psi", que incluye **todo** el nivel ~0.7 atm. En la práctica, S2a con
  tolerancia significa "O₂ ≥ 0.29 a ~0.7 atm".
- **Sensibilidad del umbral "≤ 10.2 psi"** (`sensibilidad_umbral_10_2psi.csv`), sin filtrar por O₂: ≤10.2 → 1; ≤10.3 → 29; ≤10.4 → 84;
  ≤10.5 → 101; ≤10.6 → 103. Con O₂ ≥ 0.30: 0, 0, 8, 17, 17. El "0" de Fer depende de **0.1–0.3 psi**.
- **"+0.4 psi solo hacia arriba" no sirve para valores puntuales:** 14.7 psi cae en medio del nivel ~1 atm (14.54–14.97), así que
  S1 baja de 49 a 33 al cortar la mitad del nivel. Solo tiene sentido para techos ("≤ X").
- **±0.02 en O₂ cambia S2b de 0 a 6**, porque incluye las pruebas de O₂ 0.25, que tienen supresor. Es decir, ensancha el escenario
  hasta mezclarlo con otra condición.
- **Ninguna tolerancia produce pruebas a 8.2 psi ni a 4.3 psi.** La presión mínima probada es 10.18 psi.

### 2.4 Filas de control
| `test_id` | Lo que dijo Fer | CSV | Nota |
|---|---|---|---|
| 178F001 | O₂ 0.30, 1.0121 atm | O₂ 0.30, 1.0121 atm ✔ | metanol, **extinction**, ~1.0 atm |
| 196F001 | O₂ 0.34, 0.7093 atm | O₂ 0.34, 0.7093 atm ✔ | heptano, disruption, ~0.7 atm |
| C11M201 | sin presión | `sin_dato` ✔ | flag `pressure_zero_set_null`; O₂ 0.20, metanol, extinction. No entra en ningún escenario |

**Rangos de presión de Fer:** "14.5–15.0 psi → 161" ✔. "10.2–10.5 psi → 103" ✘: en ese rango estricto hay **100**, porque el nivel
real va de 10.18 a 10.53 psi. "30–45 psi → 9" ✘: hay **8**, porque 240R003 está a 29.89 psi. Son errores de redondeo en las
etiquetas; los niveles en sí están bien.

---

## 3. Conciliación del CSV de Charly (`charly_conciliacion.csv`, `charly_cambios_de_banda.csv`)

**(a) Sus 8 filas se reproducen exactamente** (n, tasa media/mín/máx, diámetros, CO₂/He y extinciones; columna `coincide_con_charly`).

**(b) Pruebas que cambian de banda según la convención.** Las bandas de Charly están cerradas a la derecha (por defecto en `pd.cut`):

| O₂ | n | Charly (derecha) | Charly con `right=False` | Esquema A (grid) | Esquema B |
|---|---|---|---|---|---|
| 0.15 | 20 | (0, 0.15] | [0.15, 0.21) | 0.15–0.18 | 0.15–0.18 |
| 0.21 (aire) | 54 | (0.15, 0.21] | [0.21, 0.30) | 0.21–0.24 | 0.21–0.24 |
| 0.30 | 15 | (0.21, 0.30] | [0.30, 1.01) | ≥0.24 | ≥0.28 |

En total, **89 pruebas** caen en otra banda. En particular, su "(0.3, 1.01]" contiene **solo las de O₂ 0.34** (heptano 4, metanol 5),
y el aire (0.21) queda junto con 0.16–0.20. La lista completa de `test_id` está en `charly_cambios_de_banda.csv`.

**Otros problemas de su tabla:**
- La tasa media **mezcla presiones y supresores**. Por ejemplo, en metanol (0.15, 0.21], 66 de 85 pruebas tienen CO₂ o He.
- La fila metanol (0.3, 1.01] con n = 5 no queda en gris, pero es frágil.

**(c) Versión estratificada** (esquema B, solo sin supresor, por nivel de presión). Tasa K media en mm²/s (promedio solo de las
pruebas que tienen K; `n_con_tasa` está en el CSV), con su n:

| Combustible | Banda | ~0.7 atm | ~1.0 atm |
|---|---|---|---|
| metanol | <0.15 | — (0) | 0.356 (n=17) |
| metanol | 0.15–0.18 | — (0) | 0.386 (n=5) |
| metanol | 0.18–0.21 | 0.440 (n=3) ⚪ | 0.428 (n=4) ⚪ |
| metanol | 0.21–0.24 | — (0) | 0.501 (n=12) |
| metanol | ≥0.28 | 0.646 (n=9) | 0.672 (n=4) ⚪ |
| heptano | <0.15 | — (0) | 0.455 (n=6; 4 con K) |
| heptano | 0.15–0.18 | — (0) | 0.484 (n=8) |
| heptano | 0.18–0.21 | 0.490 (n=2) ⚪ | 0.500 (n=3) ⚪ |
| heptano | 0.21–0.24 | — (0) | 0.559 (n=17) |
| heptano | ≥0.28 | 0.724 (n=8) | 0.743 (n=3) ⚪ |

⚪ = gris (n < 5): no se interpreta. La banda 0.24–0.28 y el nivel >2 atm no tienen ninguna prueba sin supresor.
Esto describe qué se midió en cada condición; no dice que el O₂ *cause* el cambio de K.

---

## 4. Verificación del PDF "Clasificación de materiales" (`afirmaciones_pdf.csv`)

| Afirmación del PDF | PDF | CSV | ¿Coincide? |
|---|---|---|---|
| FLEX metanol / heptano | 160 / 114 | **157 / 117** | no |
| Metanol ext / disr / compl | 124 / 26 / 10 | 126 / 23 / 8 | no |
| Heptano ext / disr / compl | 57 / 42 / 15 | 60 / 38 / 19 | no |
| Totales ext / disr / compl | 181 / 68 / 25 | 186 / 61 / 27 | no |
| Aire ~21 %, ~1 atm, sin supresor (met / hep) | 10 / 12 | 12 / 17 (O₂ = 0.21 y también 0.20–0.22) | no |
| Aire: metanol se extingue | 8/10 | 9/12 | no |
| Aire: heptano disr ; compl | 7/12 ; 3/12 | 8/17 ; 4/17 | no |
| "Base lunar" 30–34 % ~0.70 atm (met / hep) | 11 / 8 = 19 | **9 / 8 = 17** | no |
| "Base lunar" disr + compl (ext) | 15 + 4 (0) | 15 + 2 (0) | no |
| "Base lunar" tasas | 0.53–0.90 | 0.53–0.90 (16 con K) | sí |
| 30 % ~1 atm (met / hep) | 4 / 3 | 4 / 3 | sí |
| 30 % ~1 atm: extinciones | 1 (206R001) | **2 (178F001, 206R001)** | no |
| CO₂ 0.05–0.70 (met / hep) | 78 / 51 | 75 / 48 (= 123) | no |
| He 0.05–0.45 (met / hep) | 36 / 24 | 28 / 22 (= 50); nunca junto con CO₂ | no |
| "Hipoxia" 12–20 % sin supresor | 21 / 16 | 29/19 (cualquier presión); 26/17 (~1 atm o 0.12–0.19) | no |
| BASS-II: 129 pruebas; 26 con resultado | 129; 26 | 129; 26 | sí |
| BASS-II no_ignition (varilla 3/8" transparente, 13.6 %) | 1 | 1 (O12) | sí |
| Categorías varillas/telas+esferas/películas/placas/vela | 54/32/22/20/1 | 54/32/22/20/1 | sí, pero usando `docs/material_mapping_proposal.csv`, **no aprobada** |
| Con resultado: varillas/películas/placa | 21/4/1 | 21/4/1 | sí (misma salvedad) |
| SIBAL, Nomex, esferas, vela "sin determinar" | — | 0 pruebas con resultado declarado | sí |
| Ningún material "no inflamable" demostrado | — | consistente | sí |

**Conclusión:** la parte de BASS-II coincide; casi todo lo de FLEX **no coincide**, y las diferencias van en direcciones distintas
(+3 metanol, +8 pruebas de metanol con He, −5 extinciones, +7 disruption). No parece un solo error sistemático, como mover 3 pruebas de combustible.

**Causa de 160/114 frente a 157/117 (investigación):**
1. `scripts/build_experiments.py` copia `fuel → material_or_fuel` y `test_end → outcome` sin transformarlos. Comparando
   `flex_tests.csv` con `experiments.csv` fila a fila, combustible, resultado y `test_id` son **idénticos** (274/274).
2. `docs/VERIFICACION.md` A4.1 (14 nov) contó la tabla cruda `PSI-69_Experimental table_FLEX.csv` con pandas directo, sin pasar por
   nuestros scripts: **157/117 y 186/61/27**.
3. `scripts/fetch_psi.py` fija el **SHA-256 de la versión 1** de esa tabla. Cualquier descarga verificada es byte a byte la misma.
4. La letra del `test_id` (M/H) es coherente con el combustible en las 181 pruebas que la tienen. Las letras F/R/C no indican
   combustible, así que el error tampoco viene de clasificar por el código de la prueba.
5. `docs/material_mapping_proposal.csv` solo afecta a BASS-II y explica por qué las categorías del PDF coinciden: el PDF usó esa propuesta.

→ **El PDF casi seguro no salió de la versión 1 de la tabla cruda.** Puede venir de otra versión en PSI, de un artículo o de un conteo
manual. **Pendiente: necesita la tabla cruda.** `data/raw/` **no existe en este disco** y no se descargó. Alguien con red autorizada
puede comprobarlo sin tocar `data/raw/`:

```bash
python scripts/fetch_psi.py --out /tmp/psi_check        # descarga a otra carpeta y verifica SHA-256 (≥1.1 s entre peticiones)
python -c "import pandas as pd; t=pd.read_csv('/tmp/psi_check/FLEX/PSI-69_Experimental table_FLEX.csv', encoding='cp1252'); print(t['Fuel'].str.strip().str.lower().value_counts()); print(t['Test end'].str.strip().str.lower().value_counts())"
```
(En Windows, cambia `/tmp/psi_check` por una carpeta temporal, p. ej. `%TEMP%\psi_check`.) Si da 157/117, el PDF se corrige.
Lo más útil, de todos modos, es **preguntar al autor del PDF de dónde sacó sus cifras**.

---

## 5. Comparación de esquemas de bandas (`comparacion_bandas.csv`)

| | A (vigente) | B | C |
|---|---|---|---|
| Bandas | <0.15 · 0.15–0.18 · 0.18–0.21 · 0.21–0.24 · ≥0.24 | A + ≥0.24 partida en 0.24–0.28 · ≥0.28 | <0.15 · 0.15–0.20 · 0.20–0.22 · 0.22–0.28 · ≥0.28 |
| Celdas banda × presión | 15 | 18 | 15 |
| Celdas n = 0 | 5 | 6 | 5 |
| Celdas grises (0 < n < 5) | 0 | 0 | 0 |
| Celdas con datos pero 0 sin supresor | 3 | **5** | 4 |
| Celdas equivalentes en `coverage_grid` (n < 5) | 49 (25) | 49 (25) | 41 (20) |
| Tierra (S1, O₂ 0.20–0.22) alineada con bordes | no (0.20 y 0.21 en bandas distintas) | no | **sí** |
| Lunar Fer (S2a, O₂ ≥ 0.29) alineada | no (≥0.24 mezcla 0.24–0.25) | **sí** | **sí** |
| 34 % (S2c) alineado | no | no (≥0.28 incluye 0.30) | no |
| 26.5 % (S2b) | sin pruebas con ese O₂ | ídem | ídem |
| A quién afecta | nadie | `psi_queries.O2_BANDS`, `coverage_grid.json` (regenerar), etiquetas del mapa de Charly, `/coverage`, `/gaps`, data-dictionary | lo mismo + **todas** las etiquetas salvo <0.15, el ejemplo de `docs/07` y la tabla de Charly |

**Pros y contras (la decisión es del equipo):**
- **A, no cambiar.** Pro: cero trabajo y cero riesgo antes del congelamiento. Contra: "≥0.24" junta 0.24–0.25 (16 + 9 pruebas, todas con
  CO₂/He) con 0.30–0.34 (24 pruebas, todas sin supresor). La etiqueta del mapa esconde justo las pruebas más "tipo hábitat".
- **B, partir en 0.28.** Pro: el borde cae en un vacío (no hay pruebas entre 0.25 y 0.30), así que **ninguna prueba cambia de celda**
  en `coverage_grid.json` (49 celdas y 25 con n < 5, igual que hoy; solo 9 etiquetas cambian). Separa limpio de suprimido y
  alinea el escenario lunar. El parche ya está probado. Contra: Tierra sigue sin alinear, y el mapa gana una columna.
- **C, alinear a escenarios.** Pro: Tierra y lunar alineados; el grid queda menos fragmentado (41 celdas, 20 con n < 5). Contra:
  cambian casi todas las etiquetas (rompe el ejemplo de `docs/07`, el mapa y la tabla de Charly). "0.15–0.20" junta 5 niveles de O₂ y
  "0.22–0.28" junta 0.23 con 0.24–0.25. Es más trabajo cerca del congelamiento.

**Recomendación razonada: B.** Es el cambio más pequeño que corrige la etiqueta engañosa, y Tierra/26.5 % se resuelven mejor con el
**filtro de escenario por tolerancia** (sección 2) que moviendo bandas. El parche está en `patch_propuesto.diff` (**sin aplicar**;
probado en una copia temporal: aplica limpio y 21/21 tests OK).

`scope-guard`: esto es análisis, no una función nueva del producto. El script vive en `scripts/` y no se añadieron endpoints ni
dependencias. Aplicar B mejora Validity, lleva menos de 2 h y no rompe el MVP si no se aplica.

---

## 6. Hallazgos (qué se probó / a qué ambiente se parece / qué falta)

1. **Solo hay tres presiones, con un vacío enorme entre ellas.** Hay 103 pruebas a 10.18–10.53 psi, 161 a ~1 atm (14.54–14.97 psi) y
   9 a 29.9–44.9 psi. Nada entre 10.53 y 14.54 psi y nada por debajo de 10.18 psi (`niveles_presion.csv`).
2. **Las 274 pruebas cubren O₂ de 0.12 a 0.34; no hay ninguna por encima de 34 %.** El escenario de traje (85–100 % O₂, 4.3 psi) queda
   fuera en ambos ejes: el vecino más cercano está a −51/−66 puntos de O₂ y a +6 psi (n = 9).
3. **Ninguna prueba a 8.2 psi (Exploration Atmosphere) ni a 4.3 psi (traje), con ninguna tolerancia.** Lo más parecido a 34 % / 8.2 psi
   es O₂ 0.34 a 10.33–10.50 psi: n = 9, todas sin supresor, 8 disruption y 1 completion (192F001, 196F001, 224F001…). La presión es
   +2.1 psi mayor, así que **no es ese ambiente**.
4. **Las pruebas con atmósfera más parecida a un hábitat enriquecido** son 17: O₂ 0.30–0.34 a ~0.7 atm, sin supresor, 9 metanol y
   8 heptano. Resultaron 15 disruption (no definido por la fuente) y 2 completion (191R001, 192F001), con 0 extinciones. n = 17 y
   diseño iterativo: es descriptivo, no un riesgo.
5. **No hay ninguna prueba a 26.5 % O₂** (la atmósfera de 10.2 psi). La más cercana es O₂ 0.25 a ~10.4 psi: n = 6, **todas con CO₂ o He**,
   6 disruption (053F001, 141F001…). Ninguna prueba sin supresor entre O₂ 0.24 y 0.25, a ninguna presión (25 pruebas).
6. **Aire de cabina (21 %, ~1 atm) es la condición mejor cubierta:** 49 pruebas con ±0.01, de ellas 29 sin supresor (12 metanol,
   17 heptano). Resultados: 29 extinction, 15 disruption y 5 completion en las 49.
7. **La presión alta (>2 atm, n = 9) solo existe con CO₂ 0.70 y O₂ 0.21** (256F002, 248F001…). No hay pruebas sin supresor a alta
   presión, así que no se puede separar el efecto de la presión del efecto del CO₂.
8. **A ~0.7 atm casi todo tiene supresor:** de 103 pruebas, solo 22 son sin supresor (5 a O₂ 0.20 y 17 a O₂ 0.30–0.34). Las bandas
   0.15–0.18, 0.21–0.24 y 0.24–0.28 a ~0.7 atm tienen **0** pruebas sin supresor.

---

## 7. Mensaje para el grupo
Ver `mensaje_grupo.md` ("YAEL v2").

---

## 8. Párrafo para la página del proyecto (EN)

> Antes de publicar: verificar contra los NTRS citados los valores NASA (8.2 psi / 34 % O₂; 4.3 psi). No están verificados (ver
> Supuesto 10). El texto usa solo cifras del CSV.

<!-- EN -->
**Coverage gap in the FLEX data.** FLEX burned methanol and heptane droplets in microgravity aboard the International Space Station
(NASA PSI-69, DOI 10.60555/mbq8-0451; 274 test records). Only the cabin atmosphere of these tests — oxygen fraction and pressure — can
be compared with a habitat; gravity, airflow and fuel are not those of the lunar or Martian surface. Every test was run at one of three
pressure levels: 10.18–10.53 psi (n = 103), 14.54–14.97 psi (about 1 atm, n = 161) or 29.9–44.9 psi (n = 9, all with 21% O₂ and 70%
CO₂). Oxygen ranged from 12% to 34%. **There is no test below 10.18 psi and none above 34% O₂ — in particular, no test at 8.2 psi
(the proposed exploration atmosphere) and none at 4.3 psi (suit pressure).** No test used 26.5% O₂ either. The closest available
condition, 30–34% O₂ at 10.33–10.50 psi without suppressant (n = 17), is a neighbor of those atmospheres, not a measurement of them:
15 of those tests ended in "disruption" (a term the source does not define), 2 burned to completion and none were recorded as
extinction. Because FLEX chose its conditions iteratively to approach the extinction limit, these counts describe what was tested;
they are not probabilities of fire behavior in a habitat.
<!-- /EN -->

---

## 9. Archivos de esta carpeta
| Archivo | Contenido |
|---|---|
| `conteos_total.csv`, `conteos_sin_supresor.csv`, `conteos_total_dedup.csv` | Banda × presión (esquema B), con totales y `sin_dato` |
| `celdas_detalle.csv` | Una fila por celda: n, n_dedup, sin supresor, CO₂/He, combustible, resultados, `gris_*`, `hueco_n0`, `con_datos_sin_pruebas_limpias`, ejemplos |
| `conteos_por_combustible.csv` | Lo mismo por combustible |
| `niveles_presion.csv`, `grupos_presion_detectados.csv` | Niveles de presión derivados de los datos |
| `escenarios.csv`, `matriz_tolerancia_escenario.csv`, `sensibilidad_umbral_10_2psi.csv` | T2 |
| `charly_conciliacion.csv`, `charly_cambios_de_banda.csv` | T3 |
| `afirmaciones_pdf.csv` | T4 |
| `comparacion_bandas.csv`, `patch_propuesto.diff` | T5 (el parche **no está aplicado**) |
| `verificaciones.csv` | Cifras de Yael (3.1) y de Fer frente al CSV |
| `mensaje_grupo.md` | Mensaje "YAEL v2" |
