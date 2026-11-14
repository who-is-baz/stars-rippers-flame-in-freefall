---
name: nasa-data-grounding
description: Use when writing code, prompts or text that states facts about microgravity combustion experiments. Forces every claim to cite a specific NASA experiment/dataset and prevents invented values.
---

# NASA data grounding

## Reglas
1. Cada afirmación numérica o cualitativa sobre combustión debe llevar `source_id` (ficha) y URL/identificador del dataset PSI.
2. Si un valor no está en los datos, responde "no disponible en los datos analizados"; nunca estimes ni rellenes.
3. Distingue **dato observado** vs **interpretación** (etiquetas `observed` / `inferred`).
4. Para el asistente de IA (RAG): el prompt de sistema debe exigir citas `[exp: <id>]` y rechazar preguntas sin respaldo.
5. Incluye unidades y condiciones (O₂ %, presión, flujo, gravedad) junto a cualquier resultado.
6. No presentes insights como recomendaciones oficiales de la NASA; son hallazgos exploratorios del equipo.

## Checklist antes de dar por buena una salida
- [ ] ¿Cada cifra tiene fuente?
- [ ] ¿Condiciones experimentales incluidas?
- [ ] ¿Hay frase de límites/incertidumbre?
