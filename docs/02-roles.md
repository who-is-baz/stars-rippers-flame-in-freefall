# 02 · Roles (5 integrantes)

Cada persona es **dueña** de un área y **respaldo** de otra. Las tareas detalladas están en `docs/tareas/`.

| Persona | Rol | Responsabilidad | Respaldo de |
|---|---|---|---|
| **Fer** | Datos y validez | Aprobar mapeo de materiales, revisar `qc_flags` y extracciones hechas por IA, validar interpretaciones, glosario con fuentes, pesos por defecto del ranking | Jovanny (datos) |
| **Yael** | Backend + IA | API FastAPI según `docs/07-api-contract.md`, herramientas del asistente (`src/psi_queries.py`), cliente LLM | Baz |
| **Charly** | Frontend / diseño | Dashboard React+TS: mapa de cobertura, explorador, "Qué falta", asistente | Yael |
| **Jovanny** | Infra, despliegue y QA | Entornos, benchmark de Ollama, **enlace público** (despliegue), pruebas, grabación del demo | Charly |
| **Baz** | Líder / integración | Repo, reglas 2026, PRs, bitácora de IA, entrega en inglés, ensamblar el demo | Yael |

## Contratos entre roles
- Datos → Backend: `data/processed/experiments.csv`, `coverage_grid.json` y `psi.sqlite` (se regenera con scripts).
- Backend → Frontend: `docs/07-api-contract.md` (+ mock mientras el backend no esté).
- Todos → Baz: PRs pequeños con la plantilla.

## Reglas de equipo
- Standup de 5 min cada 3–4 horas.
- Nadie se bloquea >30 min sin pedir ayuda.
- Dormir por turnos; sin refactors de madrugada.
- Todo uso de IA se anota en `docs/AI_USAGE_LOG.md`.
- Cada integrante debe poder explicar en el demo la parte que presenta.
