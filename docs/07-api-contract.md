# 07 · Contrato de la API (propuesta; ajustar en 5 min entre Yael y Charly)

Base: `/api`. FastAPI + Pydantic genera el OpenAPI. Mientras el backend no esté, el frontend usa un **mock** servido desde `data/processed/experiments.csv` y `coverage_grid.json`.

## Reglas de todas las respuestas
- Incluyen `sources` (DOIs) y `limitations` (lista corta de textos).
- Nunca se imputan nulos.
- Todo porcentaje trae `pct_note: "descriptive, not a probability"`; si `n < 5` trae `warning`.
- Si una fila incluye extracciones de IA con el flag `low_confidence` (BASS-II P5, P13a, O6), trae `low_confidence_warning`: la UI lo muestra visible y el asistente lo menciona en su respuesta.
- La UI y las respuestas están en **inglés** (la entrega es en inglés).

## Endpoints
| Método | Ruta | Parámetros | Devuelve |
|---|---|---|---|
| GET | `/meta` | — | programas, combustibles, rangos de O₂ y presión, versión de datos, DOIs, limitaciones |
| GET | `/experiments` | `program`, `fuel`, `o2_min`, `o2_max`, `pressure_min`, `pressure_max`, `suppressant` (any/none/co2/he), `outcome`, `limit`, `offset` | `{total, items:[fila de experiments.csv]}` |
| GET | `/coverage` | `fuel`, `suppressant` | celdas del grid: `{fuel, o2_band, pressure_atm, suppressant, n, mean_burning_rate, mean_ext_diameter, pct_extinction, pct_note, warning?, flags, doi}` |
| GET | `/ranking` | `fuel`, `w_burning_rate`, `w_ext_diameter`, `w_confidence` | condiciones ordenadas con `score` y desglose por componente, `n`, `flags` |
| GET | `/compare` | `a`, `b` (test_id) | dos pruebas lado a lado + `same` y `different` |
| GET | `/gaps` | — | "Qué falta": celdas n=0 o n<5 y vacíos conocidos (p. ej. gravedad parcial), validados por Fer |
| POST | `/ask` | `{question, level: "low"\|"medium"\|"high"}` | `{answer, citations:[{query, params, doi, test_ids}], tool_calls, no_data}` |

## Ejemplo de celda de `/coverage`
```json
{
  "fuel": "methanol", "o2_band": "0.21-0.24", "pressure_atm": 1.0, "suppressant": "none",
  "n": 12, "mean_burning_rate": 0.60, "mean_ext_diameter": 1.8,
  "pct_extinction": 75.0, "pct_note": "descriptive, not a probability",
  "flags": [], "doi": "10.60555/mbq8-0451"
}
```
(Valores ilustrativos; los reales salen de `coverage_grid.json`.)

## `/ask`
- `low`: sin LLM; la pregunta se enruta con reglas a una consulta y se responde con plantilla.
- `medium`: modelo pequeño elige la consulta y sus parámetros; redacta con citas.
- `high`: modelo mayor, varios pasos y verificación de que cada cita exista.
- Si no hay evidencia: `{"answer": "No data available for that question.", "no_data": true}`.
- **El modo `low` debe funcionar sin Ollama** (el enlace público no tendrá modelo local).

## Errores
`400` parámetros inválidos (mensaje claro), `404` test_id inexistente, `503` LLM no disponible (el cliente cae a `low`).
