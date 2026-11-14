# Data dictionary — `data/processed/`

Generado por `scripts/build_processed.py` a partir de `data/raw/`, que no se modifica.
Los crudos se descargan y verifican con `scripts/fetch_psi.py`.
Fuente: NASA Physical Sciences Informatics (PSI), licencia CC0-1.0.

Convenciones:
- Los nombres van en snake_case, con la unidad al final (`_mm`, `_mm2_s`, `_mmhg`, `_pct_vol`, `_ppm`, `_cm_s`).
- Las celdas vacías son null. Un texto no numérico en una columna numérica ("–", "none", "OR") se convierte en null.
- `qc_flags` lista problemas separados por `;`. Vacío = sin problemas detectados. Nunca se descarta una fila.

---

## `flex_tests.csv` — FLEX (PSI-69), 274 pruebas, una fila por prueba

Origen: `PSI-69_Experimental table_FLEX.csv` (cp1252).

| Columna | Tipo | Unidad | Columna original | Notas |
|---|---|---|---|---|
| `flex_test_number` | int | — | FLEX Test # | |
| `flex_id` | str | — | FLEX Identifier | Ej. `20CAL10`. Las pruebas `*CAL*` están en la carpeta *Calibration* de PSI; las demás en *Raw Data*. |
| `test_date` | date ISO | — | Test Date | El original mezcla `m/d/YYYY` y `m/d/YY`; se aceptan ambos. |
| `test_time_gmt` | str HH:MM:SS | GMT | Test GMT | 1 nulo (30CAL07). |
| `fuel` | str | — | Fuel | `methanol` \| `heptane` |
| `pressure_mmhg` | float | mmHg | Ambient pressure; mmHg | **C11M201 traía 0.0 → se puso null** (flag `pressure_zero_set_null`). |
| `pressure_atm` | float | atm | *(derivada)* | `pressure_mmhg / 760`. |
| `o2_mole_fraction` | float | fracción molar | **"O** initial ambient composition" | En el CSV se perdieron los subíndices: "O" = O₂. |
| `n2_mole_fraction` | float | fracción molar | **"N** initial …" | "N" = N₂ (diluyente). |
| `co2_mole_fraction` | float | fracción molar | **"CO** initial …" | **"CO" = CO₂** (supresor), no monóxido de carbono. Ver *Evidencia* abajo. |
| `he_mole_fraction` | float | fracción molar | He initial … | Helio (supresor). |
| `droplet_initial_diameter_mm` | float | mm | Droplet initial diameter; mm | `–` → null. |
| `flame_extinction_diameter_mm` | float | mm | Visible flame extinction diameter; mm | Nulos: 13/27 completion, 37/61 disruption, 27/186 extinction. ⚠️ 14 pruebas `completion` **sí** tienen valor, lo que no cuadra con "se quemó completa": revisar antes de usarlo. |
| `burning_rate_mm2_s` | float | **mm²/s** | Burning rate; **mm** | **Unidad corregida.** Ver abajo. |
| `burn_time_s` | float | s | Burn time; s | `~6` → 6 con `burn_time_is_approx = true`. |
| `burn_time_is_approx` | bool | — | *(derivada)* | True si el original tenía `~`. |
| `test_end` | str | — | Test end | `extinction` \| `disruption` \| `completion`. Ver definiciones abajo. |
| `qc_flags` | str | — | — | `pressure_zero_set_null`, `mole_fractions_do_not_sum_to_1` (\|Σ−1\| > 0.015; 6 filas), `burn_time_approx`, `test_date_unparsed`, `duplicate_flex_id` (193F001). |
| `source_file` | str | — | — | |

### Corrección de unidades: `burning_rate`
El original etiqueta la tasa de combustión como **"mm"**. Es la constante de la ley d² (K = −d(D²)/dt) y su unidad es **mm²/s**:
1. Los archivos de resultados por prueba del mismo repositorio (`PSI-69_Raw Data_Test 002 Results.xls`, `…30CAL07-Test009 Results.xls`) la llaman `Burning Rate (mm2/s)` y grafican `t/D0² (mm²/s)`.
2. Los valores (0.05–1.06) están en el rango típico de K para gotas de metanol y heptano (~0.4–0.8 mm²/s).
3. Una longitud en mm no tiene sentido como "tasa".

**Solo se corrigió el nombre y la unidad; los valores numéricos no cambian.**

⚠️ **Discrepancia sin resolver:** para 20CAL10, el CSV dice K = 0.60, D₀ = 1.86 y D_ext = 0.94. El `.xls` de esa misma prueba dice K = 0.5356, D₀ = 1.850 y D_ext = 0.920. No se corrigió: se usa el valor del CSV (la Experiment Table oficial). Conviene revisarlo si se usa K de forma cuantitativa.

### Definición de `test_end`
- `completion`: la gota se quemó completa, "as opposed to extinguishing at a finite droplet size" (FLEX Test Plan, PDF p.4 / impresa p.44, paso 3).
- `extinction`: la flama se apagó con la gota todavía de tamaño finito (mismo pasaje, pasos 5–6).
- `disruption`: **no está definido en los Science Documents.** En la literatura de gotas, "disruption" suele referirse a microexplosión o fragmentación de la gota. Es una **interpretación no confirmada**.

---

## `bass2_tests.csv` — BASS-II (PSI-25), 129 pruebas, una fila por prueba

Origen: `PSI-25_Experimental table_BASS-II.csv` unida 1:1 por `Test #` con las hojas de `PSI-25_Science Documents_BASS-II_Test.Matrices.xlsx`. Las 129 filas coinciden.
Las definiciones de columnas vienen del **BASS-II ReadMe** (`PSI-25_Science Documents_BASS-II_ReadMe.docx`, sección "Columns in test matrix"; el documento no tiene paginación).

| Columna | Tipo | Unidad | Notas |
|---|---|---|---|
| `pi` | str | — | Investigador principal (una hoja por PI en Test.Matrices). |
| `test_id` | str | — | Inicial del PI + número; `a`/`b` = varias corridas con la misma muestra el mismo día. |
| `test_date` | date | — | Fecha real. El video muestra un día más por un error de año bisiesto (ReadMe). |
| `gmt_day_of_year` | int | día del año | Columna "GMT" (ReadMe: "number is day of the year"). |
| `sample_id` | str | — | Una muestra puede usarse en varias pruebas. |
| `material_raw` | str | — | Texto original normalizado en espacios. 49 variantes. No se estructuró. |
| `flow_restrictor` | int | — | 0 = flujo máximo / menor restricción, 2 = flujo mínimo (ReadMe). |
| `radiometer_gain_raw` | str | — | Ganancia **sin calibrar** (ReadMe). Valores tipo `250>50` = cambio durante la prueba. |
| `total_frames_shot` | int | — | Fotos de la cámara Nikon. Textos como `video` → null. |
| `o2_initial_pct_vol`, `o2_final_pct_vol` | float | % vol | O₂ calibrado con offset contra el MCA de la ISS (ReadMe). |
| `co2_initial_pct_vol`, `co2_final_pct_vol` | float | % vol | Sensor CDM. |
| `co_initial_ppm`, `co_final_ppm` | float | ppm | Sensor CSA-CP. `OR`/`over` = fuera de rango (>1000 ppm) → null + `co_*_over_range = true`. |
| `co_initial_over_range`, `co_final_over_range` | bool | — | |
| **`ai_outcome`** | str | — | **Extraído por IA.** `extinction` \| `blowoff` \| `no_ignition` \| `not_sustained` \| null |
| **`ai_extinguished`** | bool | — | **IA.** True si el texto menciona extinción o blowoff. **Null ≠ "no se extinguió"**: solo indica que la nota no lo dice. |
| **`ai_extinction_mode`** | str | — | **IA.** `low_flow` (se bajó el flujo hasta extinguir) \| `blowoff_high_flow` |
| **`ai_fan_pot_at_extinction`** | float | posición del pot (0–10) | **IA.** Posición del potenciómetro del ventilador escrita junto a "ext"/"blowoff". `0` = ventilador apagado. Es una **posición del control, no una velocidad**; para pasar a cm/s se necesita `Fan calibration data.xlsx` (no aplicado). |
| **`ai_initial_air_speed_cm_s`** | float | cm/s | **IA.** Primer valor de *Air display* ("flow speed measured in the duct in cm/s", ReadMe; respuesta lenta, ~1 min). Si el primer número es > 40, es una lectura del ventilador → se usa el valor junto a `cm/s` o entre paréntesis (O5b, O13a). |
| `extracted_by` | str | — | `AI`; aplica a todas las columnas `ai_*`. |
| `raw_note` | str | — | Texto original: `Fan display: … \| Air display: …` (de Test.Matrices). |
| `qc_flags` | str | — | Ver abajo. |
| `source_file` | str | — | |

### Reglas de la extracción por IA (`ai_*`)
Claude (Opus 5.5) leyó las 129 notas una por una el 2026-11-14. Las reglas están en `ai_extract()` dentro de `scripts/build_processed.py` y las 26 filas con resultado se revisaron a mano contra `raw_note`.
- `no ign` → `no_ignition` (O12)
- `would not stay lit` → `not_sustained` (P8)
- `blowoff` / `blow off` → `blowoff` (B18, B19, O7, O8b, O9, O11, O22)
- `ext`, `extinguished`, `out` → `extinction` (17 pruebas)
- Se dejaron en **null** a propósito por ser ambiguos:
  - P4 y P6 ("pots … off": no queda claro si se apagó la flama o el ventilador).
  - O13b ("7, 4? (49, ?)").
  - F4 ("see notes": las notas no están en PSI).
  - Todas las pruebas sin palabra clave (103).
- `ai_fan_pot_at_extinction` queda null cuando el pot de extinción no está explícito (B14, B21, O14, O19, P1: "5 down to ext"; B18/B19: "incr to 7.0 / 6.0" sin decir en qué valor ocurrió el blowoff).

### `qc_flags` de BASS-II (no se corrigieron valores; solo se marcaron)
| Flag | Pruebas | Motivo |
|---|---|---|
| `o2_final_implausibly_low` (< 5 %) | B2 (1.6), P22a (0.6), T28a (0.9) | Imposible en cabina ISS; probable error de captura. |
| `o2_final_implausibly_high` (> 30 %) | P22b (39.1), T28b (40.4) | Ídem. Los pares a/b sugieren valores corridos entre columnas. |
| `date_year_inconsistent_with_gmt` | T9, T18 | La fecha dice 2018 pero el GMT 175 coincide con el 2014-06-24. Probable error de año. |
| `co_over_range_gt_1000ppm` | O4, O12, O13b | CO "OR"/"over" (>1000 ppm). |
| `co_final_censored` | M5 | CO final ">500" en el original: es una cota inferior. `co_final_ppm` queda null; no se imputa. |
| `co_initial_negative` | B4, B21, B22, M10, O1, O2, O5a, O20, T25, T26, T27, T28a, T29 (13) | CO inicial −1 a −3 ppm (probable offset del sensor). Se conserva el valor. |
| `low_confidence` | P5, P13a, O6 | Extracción de IA ambigua (P5/P13a: pot 0 al extinguirse; O6: "out .275" sin "ext"). Pendiente de Fer; `src/psi_queries.py` añade `low_confidence_warning` a toda fila agregada que las incluya. |

La tabla de BASS-II **no tiene columna de presión**: las pruebas se hicieron en la Microgravity Science Glovebox a presión de cabina.

---

## Evidencia de los Science Documents
| Pregunta | Respuesta | Fuente |
|---|---|---|
| ¿"CO" en FLEX es CO₂? | Sí. El plan define las matrices de supresor con fracciones molares X_O2, X_CO2 y X_He, con `X_N2 = 1.0 − X_O2 − X_CO2`. No se menciona CO como variable de prueba. | *FLEX_Test_Plan.pdf*, Tabla 8 (PDF p.8 / impresa p.48) y Tabla 9 He (PDF p.10 / impresa p.50) |
| ¿Unidad de He / CO₂? | Fracción molar | Mismas tablas |
| ¿Qué es "Disruption"? | **No aparece en los Science Documents** (Test Plan, DoD). Solo se definen burn-to-completion y extinction. | *FLEX_Test_Plan.pdf* PDF p.4 / impresa p.44 |
| ¿Unidades del radiómetro de FLEX? | **No aparecen en los Science Documents.** En `Radiometer_Readings.txt` las muestras vienen con unidad vacía `()`. | — |
| ¿Unidades del radiómetro de BASS-II? | "Uncalibrated radiometer gain … useful for relative flame intensity": relativas, sin calibrar. | *BASS-II_ReadMe.docx*, "Columns in test matrix" |

---

## `experiments.csv` / `psi.sqlite` — tabla unificada FLEX + BASS-II (403 filas)

Generada por `scripts/build_experiments.py`. SQLite: tabla `experiments`, vistas `v_flex` y `v_bass2`, e índice no único
`(program, test_id)`. Ejemplos de consultas en `docs/sql_examples.sql` (ejecutar con `scripts/run_sql_examples.py`).

| Columna | FLEX | BASS-II |
|---|---|---|
| `program` | `FLEX` | `BASS-II` |
| `test_id` | `flex_id` (⚠️ no es único: 193F001 aparece 2 veces) | `test_id` |
| `date` | `test_date` | `test_date` |
| `material_or_fuel` | `methanol` / `heptane` | `material_raw` (texto original) |
| `material_category` | `liquid_fuel_droplet` | **null** hasta que se apruebe `docs/material_mapping_proposal.csv` |
| `o2_fraction` | fracción molar **fijada** por el ensayo | `o2_initial_pct_vol / 100`: O₂ **medido** en la cámara |
| `pressure_atm` | `pressure_atm` | null (no registrada) |
| `co2_fraction` | fracción molar del **supresor agregado** | `co2_initial_pct_vol / 100`: CO₂ **de fondo medido** (≤1.85 %), no supresor |
| `he_fraction` | fracción molar del supresor | null |
| `outcome` | `extinction` / `disruption` / `completion` | `extinction` / `blowoff` / `no_ignition` / `not_sustained` / null |
| `outcome_source` | `observed` | `ai_extracted` (26) / `not_stated` (103) |
| `extinction_diameter_mm` | solo si `outcome = extinction`; si no, null (38 valores omitidos → flag `extinction_diameter_dropped_outcome_not_extinction`) | null |
| `burning_rate_mm2_s` | K de la ley d² | null |
| `qc_flags` | flags de `flex_tests.csv` + el de arriba | flags de `bass2_tests.csv` + `material_category_pending_review` |
| `source_doi` | `10.60555/mbq8-0451` | `10.60555/4qc4-de67` |

---

## Limitaciones conocidas

### Cobertura y origen
1. **Solo se procesaron las Experiment Tables.** No se usan los ~630 archivos por prueba de FLEX (Chamber/Radiometer
   Readings), ni los videos o imágenes de BASS-II (~275 GB), ni los de FLEX (~920 GB). Solo hay una muestra (20CAL10).
2. SoFIE no es una investigación en PSI (ninguna tiene esa sigla o título), pero los objetivos de BASS-II (PSI-25) la mencionan: "Provide SoFIE PIs with preliminary data to refine Science Requirements". De Combustion Science solo se procesaron BASS-II y FLEX (de 24 investigaciones).
3. Los Science Documents consultados son 4 (FLEX DoD, FLEX Test Plan, BASS-II ReadMe, BASS-II SRD). No se revisaron los
   Engineering Documents, Presentations ni el Summary Report de BASS-II (49 MB).

### FLEX
4. **Unidad de `burning_rate` corregida** de "mm" a mm²/s, solo en el nombre (ver arriba). La evidencia es indirecta
   (archivos `.xls` y rango físico); ningún Science Document lo dice explícitamente.
5. **"CO" se interpretó como CO₂**, con apoyo del Test Plan (Tablas 8–9). Los encabezados "O/N/CO" perdieron los subíndices.
6. **"Disruption" no está definido** en los Science Documents. La interpretación "microexplosión/fragmentación" no está confirmada.
7. **Unidades del radiómetro de FLEX desconocidas:** el `.txt` trae `()` vacío y no aparecen en los Science Documents.
8. La Experiment Table y los `.xls` por prueba **no coinciden** (20CAL10: K 0.60 vs 0.536; D₀ 1.86 vs 1.850; D_ext 0.94 vs 0.920).
   Se usa la Experiment Table.
9. **14 pruebas `completion` y 24 `disruption` tienen diámetro de extinción**, lo que contradice su resultado. En
   `experiments.csv` se omiten (regla "solo si extinction") con un flag; en `flex_tests.csv` se conservan.
10. `flex_id` **193F001 duplicado** (#70 y #73, misma fecha y hora, distinto D₀/K). Se conservan ambas filas con el flag `duplicate_flex_id`.
11. C11M201 tenía presión 0.0 mmHg → null. 6 pruebas tienen fracciones molares que no suman 1 (±0.015).
    Fechas en dos formatos (m/d/YYYY y m/d/YY). 2 tiempos de quemado aproximados (`~`).
12. **El diseño no es aleatorio ni balanceado:** el Test Plan (PDF p.4 / impresa p.44) describe un procedimiento
    iterativo que se acerca al límite de extinción. Los "% de extinción" por celda **no son probabilidades** y los
    efectos de CO₂/He están **confundidos con el O₂** (el O₂ promedio cambia entre niveles de supresor). Varias
    celdas tienen n ≤ 5.

### BASS-II
13. **El resultado de BASS-II no está registrado como dato**; se extrajo con IA del texto de *Fan/Air display*
    (26/129). 103 pruebas quedan `not_stated`, lo que **no** significa que no hubo extinción. Las tasas de
    extinción de BASS-II no son comparables con las de FLEX.
14. `ai_fan_pot_at_extinction` es una **posición del potenciómetro (0–10)**, no una velocidad. No se aplicó
    `Fan calibration data.xlsx` para convertirla a cm/s.
15. *Air display* tiene respuesta lenta (~1 min, ReadMe) y a veces contiene lecturas del ventilador (O5b, O13a).
16. El O₂ y el CO₂ de BASS-II son **medidos**, no fijados. En `experiments.csv` comparten columna con los de FLEX, que
    sí son de diseño. El CO₂ de BASS-II es de fondo (≤1.85 %), no un supresor.
17. Valores imposibles marcados y **no corregidos**: O₂ final de B2 (1.6 %), P22a/P22b (0.6/39.1 %), T28a/T28b (0.9/40.4 %).
    T9/T18 tienen año 2018 con GMT de 2014. CO "OR" (>1000 ppm) en O4, O12, O13b.
18. **`material_category` sigue sin aplicarse** (49 textos libres). La propuesta de 7 categorías está en
    `docs/material_mapping_proposal.csv`, pendiente de revisión.
19. No hay presión registrada; el ReadMe no explica las variantes de ignición ("top side ign", "moved igniter");
    F4 dice "see notes", pero esas notas no están en PSI.

### Proceso
20. Toda transformación es reproducible con `fetch_psi.py` → `build_processed.py` → `build_experiments.py`, pero
    las reglas de extracción con IA se ajustaron revisando a mano estos 129 textos; no están validadas con otros datos.

---

## `src/psi_queries.py` y `coverage_grid.json`

- `src/psi_queries.py`: las 6 consultas como funciones parametrizadas (`program`, `fuel`/`material`, `o2_range`,
  `pressure_range`, `suppressant` ∈ {any, none, co2, he}). Solo usa sqlite3 de la stdlib y abre la base en solo
  lectura. Cada fila trae `n`, `qc_flags` (lista) y `source_doi` (lista). Toda fila con `pct_*` trae
  `pct_note = "descriptivo, no probabilidad"` y, si `n < 5`, un `warning` obligatorio.
- Q6 (BASS-II) **no** reporta % de extinción; solo conteos y `pct_outcome_stated`, porque el resultado es incompleto.
- Bandas de O₂ (fracción): [0, 0.15), [0.15, 0.18), [0.18, 0.21), [0.21, 0.24), [0.24, 1]. 0.21 (aire) abre la 4.ª banda.
- `data/processed/coverage_grid.json` (`scripts/build_coverage_grid.py`): FLEX por combustible × banda de O₂ ×
  presión (0.1 atm; `unknown` = nula) × supresor (none/co2/he). Campos: n, K medio, diámetro de extinción medio (solo
  extinction), `pct_extinction_descriptive_not_probability`, rangos de O₂ y supresor, conteos por resultado,
  flags, DOI. 49 celdas, **25 con n<5**.
- Tests: `tests/test_psi_queries.py` (con pytest, o `python3 tests/test_psi_queries.py` si pytest no está instalado).
