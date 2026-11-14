# 07 · Contrato de la API (alineado con `src/psi_queries.py`; pendiente de firma de Yael y Charly en #7)

Base: `/api`. FastAPI + Pydantic genera el OpenAPI. Mientras el backend no esté, el frontend usa un **mock** servido desde
`data/processed/experiments.csv` y `coverage_grid.json`.

**Estándar de nombres:** los campos se llaman igual que en `src/psi_queries.py`, `experiments.csv` y `coverage_grid.json`.
La API **no renombra** nada; si un nombre cambia, cambia primero en el código y después aquí. Así el mock y la API
devuelven lo mismo.

## Reglas de todas las respuestas
- Cada respuesta es un objeto con los datos del endpoint más dos campos comunes que agrega la capa de API:
  - `sources`: lista de DOIs (unión de los `source_doi` de las filas devueltas).
  - `limitations`: lista corta de textos en inglés (de `docs/data-dictionary.md`, "Limitaciones conocidas").
- Cada fila trae su propio `source_doi` (lista en las filas agregadas, texto en las filas de `/experiments`) y `qc_flags` (lista).
- Nunca se imputan nulos.
- Toda fila con un campo `pct_*` trae `pct_note: "descriptive, not a probability"` y `warning`: `null` si `n ≥ 5`, o
  `"n<5: unstable percentage; do not read it as a rate"` si `n < 5`.
- Si una fila incluye extracciones de IA con el flag `low_confidence` (BASS-II P5, P13a, O6), trae
  `low_confidence_warning: "includes low-confidence AI-extracted outcomes (pending human review); show them with a warning"`.
  La UI lo muestra visible y el asistente lo menciona en su respuesta.
- La UI y todos los textos de las respuestas están en **inglés** (la entrega es en inglés). Los textos salen de las
  constantes `PCT_NOTE`, `SMALL_N_WARNING` y `LOW_CONFIDENCE_WARNING` de `src/psi_queries.py`, no se escriben en la API.

## Bandas de O₂ (fracción)
`<0.15` = [0, 0.15) · `0.15-0.18` · `0.18-0.21` · `0.21-0.24` (0.21 = aire abre esta banda) · `>=0.24`.
Las filas salen ordenadas por valor de O₂, no por orden alfabético de la etiqueta.

## Endpoints → funciones
Rango → tupla: `o2_min`/`o2_max` → `o2_range=(o2_min, o2_max)` y `pressure_min`/`pressure_max` → `pressure_range`
(cualquiera de los dos extremos puede faltar). `con` lo pone la API (`psi_queries.connect()`, solo lectura).

| Método | Ruta | Función | Parámetros | Devuelve |
|---|---|---|---|---|
| GET | `/meta` | `meta(con)` | — | `{programs:[{program, n, o2_min, o2_max, pressure_min, pressure_max, source_doi, materials, material_categories}], suppressants, outcomes, o2_bands, min_n, queries, source_doi}` |
| GET | `/experiments` | `list_experiments(con, …)` | `program`, `fuel`, `o2_min`, `o2_max`, `pressure_min`, `pressure_max`, `suppressant`, `outcome`, `limit`, `offset` | `{total, items:[fila de experiments.csv]}`; en cada fila `qc_flags` es lista y, si aplica, `low_confidence_warning` |
| GET | `/coverage` | `flex_coverage_grid(con)` | `fuel`, `suppressant` (la API filtra en memoria las celdas devueltas) | celdas, ver abajo |
| GET | `/queries/q1_extinction_rate_by_o2_pressure` | Q1 `extinction_rate_by_o2_pressure` | `program`=FLEX, `fuel`=methanol, `o2_*`, `pressure_*`, `suppressant`=none | `{pressure_atm, o2_fraction, n, n_extinction, pct_extinction, …comunes}` |
| GET | `/queries/q2_co2_effect` | Q2 `co2_effect` | `fuel`, `o2_*`, `pressure_*` (por defecto 0.9–1.1) | `{fuel, pressure_atm, co2_fraction, n, pct_extinction, avg_o2_fraction, avg_burning_rate_mm2_s, …comunes}` |
| GET | `/queries/q3_he_effect` | Q3 `he_effect` | `fuel`, `o2_*`, `pressure_*` (por defecto todas) | igual que Q2 con `he_fraction` |
| GET | `/queries/q4_burning_rate_by_o2` | Q4 `burning_rate_by_o2` | `fuel`, `o2_*`, `pressure_*` (por defecto 0.9–1.1), `suppressant`=none | `{fuel, o2_fraction, n, n_k, min_burning_rate_mm2_s, avg_burning_rate_mm2_s, max_burning_rate_mm2_s, …comunes}` |
| GET | `/queries/q5_extinction_diameter_by_pressure` | Q5 `extinction_diameter_by_pressure` | `fuel`, `o2_*`, `pressure_*`, `suppressant`=any | `{fuel, pressure_atm, n, n_d, avg_extinction_diameter_mm, min_extinction_diameter_mm, max_extinction_diameter_mm, …comunes}` |
| GET | `/queries/q6_bass2_outcomes_by_o2_band` | Q6 `bass2_outcomes_by_o2_band` | `material`, `o2_*` | `{o2_band, n, n_low_flow_extinction, n_blowoff, n_no_ignition_or_not_sustained, n_not_stated, pct_outcome_stated, …comunes}`. **Sin % de extinción.** |
| GET | `/ranking` | **PROVISIONAL**: no hay función | `fuel`, `w_burning_rate`, `w_ext_diameter`, `w_confidence` | condiciones ordenadas con `score`, desglose por componente, `n`, `qc_flags` |
| GET | `/compare` | **PROVISIONAL**: no hay función | `a`, `b` (`program` + `test_id`: 193F001 está repetido en FLEX) | dos filas de `/experiments` lado a lado + `same` y `different` |
| GET | `/gaps` | **PROVISIONAL**: no hay función | — | "Qué falta": celdas con n=0 o n<5 y vacíos conocidos (p. ej. gravedad parcial), validados por Fer |
| POST | `/ask` | elige entre `ALL_QUERIES` (Q1–Q6) | `{question, level: "low"\|"medium"\|"high"}` | `{answer, citations:[{query, params, source_doi, test_ids}], tool_calls, no_data}`; `query` es la clave de `ALL_QUERIES` (p. ej. `q4_burning_rate_by_o2`) |

"…comunes" = `n`, `qc_flags`, `source_doi`, y cuando aplica `pct_note`, `warning` y `low_confidence_warning`.

**PROVISIONAL** = la ruta y la forma pueden cambiar sin que cuente como cambio de contrato. Antes de implementarla,
hay que agregar su función a `src/psi_queries.py` (regla 4 de CLAUDE.md: no hay SQL fuera de ese archivo) y quitar la marca aquí.

### `outcome`, `limit` y `offset` en `/experiments` (decisión)
Se mantienen e implementan en `list_experiments`:
- `outcome` ∈ `extinction`, `disruption`, `completion`, `blowoff`, `no_ignition`, `not_sustained`, `not_stated`.
  `not_stated` devuelve las pruebas de BASS-II sin resultado en las notas: **no significa que no se extinguieran**.
- `limit` entre 1 y 500 (por defecto 100); `offset` ≥ 0 (por defecto 0). Orden estable: `program`, `test_id`.
- `total` cuenta todas las filas que cumplen los filtros, no solo la página.

Motivo: la tabla del frontend necesita filtrar por resultado y paginar, y con la regla 4 la API no puede hacerlo con SQL propio.

## Ejemplo de celda de `/coverage` (real, de `coverage_grid.json`)
```json
{
  "fuel": "methanol", "o2_band": "0.21-0.24", "pressure_atm_level": "1.0", "suppressant": "none",
  "n": 12, "suppressant_fraction_min": 0.0, "suppressant_fraction_max": 0.0,
  "o2_fraction_min": 0.21, "o2_fraction_max": 0.21,
  "n_burning_rate": 12, "avg_burning_rate_mm2_s": 0.501,
  "n_extinction": 9, "n_extinction_diameter": 8, "avg_extinction_diameter_mm": 1.248,
  "n_disruption": 3, "n_completion": 0,
  "pct_extinction": 75.0, "pct_note": "descriptive, not a probability", "warning": null,
  "qc_flags": ["extinction_diameter_dropped_outcome_not_extinction"], "source_doi": ["10.60555/mbq8-0451"]
}
```
`pressure_atm_level` es texto: presión redondeada a 0.1 atm o `"unknown"` si es nula (C11M201).

## `/ask`
- `low`: sin LLM; la pregunta se enruta con reglas a una de las funciones Q1–Q6 y se responde con plantilla.
- `medium`: un modelo pequeño elige la función y sus parámetros; redacta con citas.
- `high`: un modelo mayor, en varios pasos, y verifica que cada cita exista.
- Si no hay evidencia: `{"answer": "No data available for that question.", "no_data": true}`.
- **El modo `low` debe funcionar sin Ollama** (el enlace público no tendrá modelo local).

## Errores
`400` parámetros inválidos: las funciones lanzan `ValueError` con el motivo y la API lo devuelve tal cual.
`404` test_id inexistente. `503` LLM no disponible (el cliente cae a `low`).

## Cambios a este contrato
Una vez congelado (#19), cualquier cambio exige un PR que avise a quien lo consume (Yael: backend; Charly: frontend).
