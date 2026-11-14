---
name: experiment-card
description: Use when extracting, validating or modelling a combustion experiment into the common "ficha de experimento" schema used by the backend, ranking and AI assistant.
---

# Experiment card

Esquema canónico en `docs/03-analisis-datos.md`. Campos mínimos:
`id`, `program` (SoFIE/Saffire/…), `title`, `material`, `geometry`, `oxygen_pct`, `pressure_kpa`, `flow_cm_s`, `gravity` (µg/Moon/Mars/1g), `outcome` (spread / extinguished / no_ignition), `spread_rate_mm_s` (nullable), `flame_notes`, `source_url`, `confidence` (high/med/low), `extracted_by` (human/AI).

## Proceso
1. Extraer manualmente 2–3 fichas de prueba para fijar el formato.
2. Validar con un modelo Pydantic; campos faltantes = `null`, nunca inventados.
3. Si extrajo la IA, `extracted_by: AI` + revisión humana antes de usarla en el ranking.
4. Registrar en `AI_USAGE_LOG.md`.
5. Tests: esquema válido, rangos físicos plausibles (O₂ 0–100 %).
