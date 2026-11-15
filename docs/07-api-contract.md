# 07 · Contrato de la API (alineado con `src/psi_queries.py`; pendiente de firma de Yael y Charly en #7)

Base: `/api`. FastAPI + Pydantic genera el OpenAPI (`/docs`). Implementación: `src/backend/` (`uvicorn backend.app:app --app-dir src`).
Las mismas rutas responden también **sin** `/api` (alias oculto del OpenAPI) porque el frontend llama a `<VITE_LLM_URL>/ask`. Mientras el backend no esté, el frontend usa un **mock** servido desde
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
| GET | `/coverage` | `flex_coverage_grid(con)` | `fuel`, `suppressant` ∈ `none`,`co2`,`he`,`co2+he` (la API filtra en memoria las celdas devueltas) | `{program:"FLEX", cells:[…]}`, ver abajo |
| GET | `/queries/q1_extinction_rate_by_o2_pressure` | Q1 `extinction_rate_by_o2_pressure` | `program`=FLEX, `fuel`=methanol, `o2_*`, `pressure_*`, `suppressant`=none | `{pressure_atm, o2_fraction, n, n_extinction, pct_extinction, …comunes}` |
| GET | `/queries/q2_co2_effect` | Q2 `co2_effect` | `fuel`, `o2_*`, `pressure_*` (por defecto 0.9–1.1) | `{fuel, pressure_atm, co2_fraction, n, pct_extinction, avg_o2_fraction, avg_burning_rate_mm2_s, …comunes}` |
| GET | `/queries/q3_he_effect` | Q3 `he_effect` | `fuel`, `o2_*`, `pressure_*` (por defecto todas) | igual que Q2 con `he_fraction` |
| GET | `/queries/q4_burning_rate_by_o2` | Q4 `burning_rate_by_o2` | `fuel`, `o2_*`, `pressure_*` (por defecto 0.9–1.1), `suppressant`=none | `{fuel, o2_fraction, n, n_k, min_burning_rate_mm2_s, avg_burning_rate_mm2_s, max_burning_rate_mm2_s, …comunes}` |
| GET | `/queries/q5_extinction_diameter_by_pressure` | Q5 `extinction_diameter_by_pressure` | `fuel`, `o2_*`, `pressure_*`, `suppressant`=any | `{fuel, pressure_atm, n, n_d, avg_extinction_diameter_mm, min_extinction_diameter_mm, max_extinction_diameter_mm, …comunes}` |
| GET | `/queries/q6_bass2_outcomes_by_o2_band` | Q6 `bass2_outcomes_by_o2_band` | `material`, `o2_*` | `{o2_band, n, n_low_flow_extinction, n_blowoff, n_no_ignition_or_not_sustained, n_not_stated, pct_outcome_stated, …comunes}`. **Sin % de extinción.** |
| GET | `/queries/{name}` | Q1–Q6 por nombre (forma real implementada) | los de cada fila de arriba; un parámetro que la consulta no acepta → 400 | `{query, params, rows:[…], sources, limitations}` |
| GET | `/ranking` | **PROVISIONAL**: no hay función | `fuel`, `w_burning_rate`, `w_ext_diameter`, `w_confidence` | condiciones ordenadas con `score`, desglose por componente, `n`, `qc_flags` |
| GET | `/compare` | `get_experiment(con, test_id, program)` | `a`, `b` = `test_id` o `PROGRAM:test_id` (193F001 está repetido en FLEX: vienen ambas filas) | `{a:[filas], b:[filas], same, different}` (`same`/`different` comparan la primera fila de cada lado); 404 si no existe |
| GET | `/gaps` | `build_gaps` de `scripts/build_frontend_data.py` (mismo contenido que `gaps.json`) | — | `{gaps:[{id, text, evidence, source_doi}]}` |
| POST | `/ask` | elige entre las herramientas de `src/backend/tools.py` (Q1–Q6, `list_experiments`, `get_experiment`, `scenario`, `meta`) | `{question (1–500 car.), level: "low"\|"medium"\|"high", model?: string}` | `{answer, citations:[{query, params, source_doi, test_ids, test_ids_total}], tool_calls, no_data, meta:{level, model, mode, ms, warnings}}`; `query` es la clave de la herramienta (p. ej. `q4_burning_rate_by_o2`) |
| GET | `/llm/status` | consulta `GET /api/tags` de Ollama (timeout 1.5 s) | — | `{available, ollama_url, models:[{tag, tier: "flash"\|"medium"\|"heavy", installed}]}`; si Ollama no responde: `available:false` con **200** |

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

### Extensión aditiva (2026-11-15, no rompe a quien consume)
- **`model`** (opcional) en la petición: etiqueta de Ollama. Debe ser una de las de `/llm/status`
  (`FLASH_MODEL`=llama3.2:3b, `MEDIUM_MODEL`=qwen3:8b, `HEAVY_MODEL`=qwen3:14b por defecto); si no, **400**.
  Sin `model`: `medium` usa `MEDIUM_MODEL` y `high` usa `HEAVY_MODEL`. En `low` se ignora.
- **`meta`** (aditivo) en la respuesta: `level`, `model` (null en low), `mode` (`low` = reglas sin modelo,
  `ollama` = texto redactado por el modelo y verificado, `fallback` = el modelo falló la verificación o no dio una
  llamada válida y se muestra la plantilla), `ms`, `warnings` (avisos obligatorios: n<5, no es probabilidad,
  confundido CO₂/He–O₂, `not_stated`, baja confianza, motivo del fallback).
- **`test_ids`**: máximo 20 por cita; **`test_ids_total`** da el total (p. ej. Earth/ISS: 20 de 49).
- `citations`, `test_ids` y `no_data` los calcula **el código**, nunca el modelo. Sin pruebas → `citations: []`.
- Fuera de tema → `"That is not in the PSI data shown on this page."` con `no_data: true`.
- Mapa de la interfaz: Basic=`low`; Flash=`medium`+`FLASH_MODEL`; Medium=`medium`+`MEDIUM_MODEL`;
  Heavy=`high`+`HEAVY_MODEL`.
- `503` si Ollama no responde, el modelo no está instalado o la llamada falla; el frontend cae a Basic.

## Errores
`400` parámetros inválidos: las funciones lanzan `ValueError` con el motivo y la API lo devuelve tal cual (`{"detail": "…"}`).
Los errores de validación de FastAPI/Pydantic (tipo, rango) también salen como `400`, no `422`.
`503` también si falta `psi.sqlite` (el `detail` dice qué script correr).
`404` test_id inexistente. `503` LLM no disponible (el cliente cae a `low`).

## Cambios a este contrato
Una vez congelado (#19), cualquier cambio exige un PR que avise a quien lo consume (Yael: backend; Charly: frontend).
