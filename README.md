# 🔥 Stars Rippers — Flame in Freefall

Stars Rippers · NASA Space Apps 2026 (UNAQ, Querétaro). Evidence-first dashboard + AI assistant for NASA microgravity combustion data (PSI: FLEX, BASS-II) to inform fire safety on spacecraft and Moon/Mars habitats. Every answer cites its source; data gaps are shown. Independent project, not endorsed by NASA.

**NASA Space Apps Challenge 2026 · Sede UNAQ (Colón, Querétaro) · 14–15 nov 2026**
**Reto:** *Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data*

> Un dashboard interactivo con IA que resume, ordena e interpreta décadas de experimentos de combustión en microgravedad de la NASA y los convierte en **insights de seguridad contra incendios para misiones a la Luna y Marte**.

## Equipo
Estudiantes de ITIID, Universidad Politécnica de Querétaro (UPQ). Mentora: Dra. Argelia (UPQ). Primer hackatón del equipo.

## Estado del repo
Documentación del equipo + **pipeline de datos PSI** (descarga reproducible, tablas procesadas, SQLite y módulo de consultas). Para empezar: [`docs/SETUP.md`](docs/SETUP.md).
Las reglas 2026 sobre trabajo previo y uso de IA deben confirmarse en las guías oficiales (ver `docs/00-reglas-y-checklist.md`).

**Explorador de atmósfera (Overview → pestaña Custom):** recupera las pruebas FLEX observadas dentro de ±0.01 O₂ y ±0.5 psi
de los valores elegidos (combustible, O₂, presión, supresor) y muestra conteos y medias con su n; no interpola ni predice.

## Correr API + front (laptop del demo)
```bash
source .venv/bin/activate && pip install -r requirements-dev.txt && python scripts/build_experiments.py
uvicorn backend.app:app --app-dir src --host 127.0.0.1 --port 8000          # API (OpenAPI en /docs)
cd frontend && npm install && VITE_LLM_URL=http://127.0.0.1:8000 npm run dev  # front en :5173
```
IA local opcional (Ollama): `ollama pull llama3.2:3b`, `ollama pull qwen3:8b`, `ollama pull qwen3:14b`; luego **Connect local AI** en el panel SI.
Sin backend ni Ollama el sitio funciona igual en modo Basic. Detalle y variables: [`docs/SETUP.md`](docs/SETUP.md) §7.

## Mapa de documentos
| Archivo | Para qué |
|---|---|
| `docs/00-reglas-y-checklist.md` | Reglas, fechas, requisitos de entrega, pendientes por confirmar |
| `docs/01-roadmap-48h.md` | Plan hora por hora del hackatón |
| `docs/02-roles.md` | Quién hace qué (5 personas) |
| `docs/03-analisis-datos.md` | Fuente PSI, experimentos del MVP, tabla unificada, reglas de interpretación y ranking |
| `docs/04-arquitectura.md` | Opciones de stack y arquitectura (el stack vigente está en `CLAUDE.md`) |
| `docs/05-entrega-draft-en.md` | Borradores en inglés para el formulario de entrega |
| `docs/06-pitch.md` | Estructura del demo (≤30 s video o ≤7 diapositivas) |
| `docs/07-api-contract.md` | Contrato de la API entre backend y frontend |
| `docs/tareas/` | Una ficha de tareas por persona/rol (5 archivos) |
| `docs/AI_USAGE_LOG.md` | Bitácora de uso de IA (obligatoria para la declaración) |
| `docs/DECISIONES.md` | Registro de decisiones |
| `docs/data-dictionary.md` | Diccionario de datos y limitaciones conocidas |
| `docs/sql_examples.sql` | 6 consultas de ejemplo sobre `psi.sqlite` |
| `scripts/`, `src/`, `tests/` | Pipeline PSI, `psi_queries.py`, API en `src/backend/` y sus tests |
| `docs/bench/` | Benchmark de modelos locales (`scripts/bench_models.py`) |
| `docs/HANDOFF.md` | Estado al cierre de la última sesión |
| `CLAUDE.md` + `.claude/skills/` | Instrucciones para Claude mientras programamos |

## Flujo de trabajo
1. Una tarea = un issue (plantilla en `.github/ISSUE_TEMPLATE/`).
2. Una rama por issue: `feat/<nombre>-<tema>` (p. ej. `feat/fer-material-mapping`). Se usa el nombre propio y no el rol porque los roles se solapan (Baz y Yael hacen backend). PR pequeño con `Closes #N`, revisado por otra persona; sin push directo a `main`.
3. Todo uso de IA se anota en `docs/AI_USAGE_LOG.md`.
4. Congelamiento de funciones: **dom 15 nov, 2:00 PM** (ajustar al horario real de UNAQ).

## License · Data · Use of AI
- **Code:** Apache-2.0 (`LICENSE`). Third-party licenses: `THIRD_PARTY.md`.
- **Data:** NASA Physical Sciences Informatics (PSI), **CC0-1.0** — FLEX (PSI-69, DOI 10.60555/mbq8-0451) and BASS-II (PSI-25, DOI 10.60555/4qc4-de67). Not endorsed by NASA.
- **Use of AI (SI):** a large part of the code, documentation and UI text was generated with AI assistants (Anthropic Claude: Claude Code and claude.ai); the log records, task by task, what the team reviewed and what review is still pending; BASS-II outcomes were extracted by AI from free-text notes and are labelled (`ai_*`, `extracted_by=AI`, `outcome_source = ai_extracted`). Commits with AI-generated changes carry `AI-assisted: yes`. Full log: `docs/AI_USAGE_LOG.md`; summary: `docs/submission/use_of_si.md`.
