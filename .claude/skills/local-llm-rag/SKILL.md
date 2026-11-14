---
name: local-llm-rag
description: Use when implementing or testing the /ask assistant, the LLMClient or the Low/Medium/High levels. Enforces tool-based grounding with citations and a no-LLM fallback.
---

# Local LLM + grounded assistant

## Diseño
- El modelo **no responde de memoria ni genera SQL libre**. Elige una de las 6 funciones de `src/psi_queries.py` y sus parámetros; el backend las ejecuta; el modelo solo **redacta** con citas.
- `LLMClient` con un método; el modelo de cada nivel va en configuración.
- Niveles:
  - `low`: sin LLM (reglas + plantilla). **Debe funcionar sin Ollama**, porque el enlace público no tendrá modelo local.
  - `medium`: modelo pequeño (p. ej. ~3–4B) elige consulta y redacta.
  - `high`: modelo mayor, varios pasos y verificación de que cada cita exista.
- Si el LLM falla o tarda demasiado: caer a `low`.

## Reglas de respuesta
1. Toda afirmación cita `query` + `params` + `doi`.
2. Sin evidencia → "No data available for that question." (`no_data: true`).
3. Los números salen del código, no del modelo.
4. Respetar las reglas de `docs/03-analisis-datos.md` (n<5, "no es probabilidad", BASS-II `not_stated`).
5. No mencionar efectos causales de CO₂/He aislados del O₂.

## Pruebas obligatorias
Conjunto de 10 preguntas: 5 respondibles, 2 con n<5, 3 trampas sin respaldo (p. ej. gravedad lunar, materiales no presentes, mediciones inexistentes). La respuesta correcta a las trampas es `no_data`.

## Rendimiento
Mantener prompts cortos; no cargar varios modelos a la vez; usar `keep_alive` para evitar recargas.
