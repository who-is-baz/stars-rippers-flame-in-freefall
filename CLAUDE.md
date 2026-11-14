# CLAUDE.md — Stars Rippers / Flame in Freefall

## Contexto
Hackatón NASA Space Apps 2026 (sede UNAQ, 14–15 nov). Dashboard con IA que resume, ordena e interpreta experimentos de combustión en microgravedad de NASA PSI (**FLEX** PSI-69 como núcleo y **BASS-II** PSI-25 como contexto) para insights de seguridad contra incendios en misiones lunares/marcianas.

Equipo: 5 estudiantes de ITIID (UPQ), primer hackatón. Docs internos en español; **todo lo que se entrega a NASA, la UI y las respuestas del asistente van en inglés**.

## Antes de trabajar, lee
`docs/08-reto-oficial.md` (texto oficial del reto), `docs/03-analisis-datos.md` (reglas de interpretación), `docs/07-api-contract.md`, `docs/data-dictionary.md` y tu archivo en `docs/tareas/`. Al terminar una sesión: `docs/HANDOFF.md` (skill `shift-handoff`).

## Reglas para Claude
1. **Anclaje en datos:** nunca inventes valores. Toda cifra cita `source_doi` y el experimento. Sin dato → "No data available".
2. **Reglas de interpretación (obligatorias):** % de extinción de FLEX es descriptivo, no probabilidad; n<5 siempre con advertencia; CO₂/He confundidos con O₂; en BASS-II `not_stated` ≠ "no se extinguió"; "Disruption" no está definido; sin modelo predictivo.
3. **`data/raw/` es intocable.** No lo modifiques ni lo borres; se regenera con `scripts/fetch_psi.py` y se verifica por SHA-256. No hagas peticiones de red salvo que el usuario lo autorice.
4. **Acceso a datos solo por `src/psi_queries.py`** (SQLite de solo lectura). No escribas SQL libre en otro lugar; el asistente de IA elige entre funciones, no genera SQL.
5. **Bitácora de IA:** toda generación significativa se anota en `docs/AI_USAGE_LOG.md` (skill `ai-disclosure-log`). Lo extraído por IA se etiqueta (`ai_*`, `extracted_by=AI`) hasta revisión humana.
6. **Alcance:** consulta `scope-guard` antes de añadir funciones. Congelamiento el domingo a las 14:00 (ajustar al horario real).
7. **Buenas prácticas:** tipado, tests mínimos, sin secretos en el repo, commits pequeños, un PR por tarea.
8. Explica brevemente el porqué de las decisiones técnicas: el equipo está aprendiendo.
9. Sin PII; sin marca/logos NASA en imágenes generadas; no copies código de otros equipos; registra toda dependencia en References.
10. **Terminología:** en lo que se entrega a NASA y en la UI usa "SI" (Super Intelligence), como el reto, aclarando "AI/LLM" una vez.

## Stack
Python 3.12 + FastAPI · React + TypeScript (Vite) · SQLite · LLM local vía Ollama (niveles Low/Medium/High; `low` sin LLM).

## Skills (`.claude/skills/`)
`nasa-data-grounding`, `experiment-card` (esquema histórico; el vigente es `experiments.csv`), `ai-disclosure-log`, `submission-writer`, `scope-guard`, `api-contract`, `local-llm-rag`, `shift-handoff`. Skills externas recomendadas (máx. 5–6 activas): `frontend-design`, `webapp-testing`, `baseline-ui`, `fixing-accessibility`.

## Específico de este repo (pipeline de datos PSI)
Complementa las reglas 3 y 4; no las repite.
- `data/reference/` (Science Documents) también es local: no se modifica ni se sube.
- `data/processed/*.csv` y `coverage_grid.json` sí se versionan. `psi.sqlite` **no**: se regenera con `python scripts/build_experiments.py` a partir de los CSV (sin red ni `data/raw/`). Ver `docs/SETUP.md`.
- `docs/material_mapping_proposal.csv` es una propuesta **no aplicada** hasta que Fer la apruebe.
- Cuando haya red autorizada, deja ≥1.1 s entre peticiones a psi.nasa.gov (`scripts/psi_client.py`).
