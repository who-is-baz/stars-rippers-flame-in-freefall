# Tareas · Yael (Backend + IA)

Lee `docs/07-api-contract.md`, `docs/03-analisis-datos.md` y `CLAUDE.md`.

## Hasta las 12:30
1. Entorno: `.venv`, `pip install fastapi uvicorn pydantic`. Genera `data/processed/psi.sqlite` con el script del repo.
2. API FastAPI con `/meta`, `/experiments`, `/coverage` leyendo la base **solo en modo lectura**.
3. Todo acceso a datos pasa por `src/psi_queries.py`. **No escribas SQL en otro lugar.**
4. Publica el OpenAPI (`/docs`) para que Charly lo consuma; avísale cuando esté arriba.
5. Respeta las reglas: `sources` y `limitations` en toda respuesta; `pct_note` y `warning` por n<5; nunca imputar nulos.

## Hasta las 15:00
6. `/ranking` con pesos (`w_burning_rate`, `w_ext_diameter`, `w_confidence`) y desglose por componente. Pesos por defecto: los que defina Fer.
7. `/compare` y `/gaps`.
8. `/ask`:
   - Nivel `low` sin LLM (enrutado por reglas, plantilla).
   - Nivel `medium`/`high`: clase `LLMClient` con un método; el modelo **elige una de las 6 consultas** y sus parámetros; nunca SQL libre.
   - Respuesta con citas (`query`, `params`, `doi`); sin evidencia → `no_data: true`.
   - Si el LLM no está disponible, cae a `low`.
9. Pon el modelo de cada nivel en configuración (una línea por nivel), no en el código.

## Listo cuando
Charly consume tu API sin tocar tu código; `/ask` responde 10 preguntas de prueba (incluye 3 trampas sin respaldo) con citas o `no_data`.

## Recordatorios
- Cada vez que Claude genere código significativo: fila en `docs/AI_USAGE_LOG.md`.
- Usa las skills `api-contract` y `local-llm-rag`.
