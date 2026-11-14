---
name: ai-disclosure-log
description: Use after any significant AI-generated code, text, data or media, to record it in docs/AI_USAGE_LOG.md for the Space Apps "Use of Artificial Intelligence" disclosure.
---

# AI disclosure log

Space Apps exige declarar el uso de IA (la guía 2025 pedía reconocer código/datos generados por IA y marcar imágenes/video con IA). Confirmar texto exacto 2026.

## Al terminar una tarea con IA, añade una fila a `docs/AI_USAGE_LOG.md`:
`fecha | persona | herramienta/modelo | qué se generó | archivos | cómo se revisó`

## Reglas
- Revisión humana antes de merge; anota quién revisó.
- Imágenes/video generados: marca de agua visible; sin marca NASA.
- Incluir en el commit/PR la línea `AI-assisted: yes`.
- Antes de entregar, resumir la bitácora en inglés para el campo "Use of AI".
