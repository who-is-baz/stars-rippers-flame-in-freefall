# Registro de decisiones

| Fecha | Decisión | Alternativas | Razón | Quién |
|---|---|---|---|---|
| 2026-11-13 | Repo solo con docs hasta confirmar reglas 2026 de trabajo previo/IA | Empezar código hoy | Evitar riesgo de descalificación | Baz |
| 2026-11-13 | Stack propuesto: Python/FastAPI + React | Streamlit, NestJS | Ver docs/04 | (pendiente de aprobar) |
| 2026-11-14 | Tolerancia única para todos los escenarios: O₂ ±0.01 y presión ±0.5 psi. Un criterio puntual (21 %, 14.7 psi) se cumple dentro de la tolerancia; un límite (≥30 %, ≤10.2 psi) es estricto en `n_exact` y se relaja con la tolerancia en `n_near`. Definido en `src/scenarios.py` | ±0.02 O₂; sin tolerancia | Ninguna medida es idéntica al valor nominal. ±0.5 psi abarca un nivel de presión completo sin mezclar niveles. Coincide con el análisis de Yael (`feat/yael-rangos-o2-presion`) | Baz |
| 2026-11-14 | Bandas de O₂: `<0.15`, `0.15-0.18`, `0.18-0.21`, `0.21-0.24`, `>=0.24`. Niveles de presión **discretos**: ~0.7 atm (103 pruebas), ~1.0 atm (161), >2 atm (9); C11M201 (sin presión) se excluye y se informa | Esquema B de Yael (`0.24-0.28` / `>=0.28`); presión en rangos continuos | FLEX solo se probó en tres niveles de presión. Las bandas son las de `src/psi_queries.py` (una sola definición) | Baz |
| 2026-11-14 | Doble definición lunar: `lunar_challenge` = O₂ ≥30 % y ≤10.2 psi (texto oficial del reto, `docs/08`; verificada: es la cita del reto) y `lunar_nasa` = 10.2 psia con 26.5 % O₂ (NASA/TM-20220000524 p.14; NTRS 20240010692 p.12; **no verificada** hasta que Fer confirme la cita). También `exploration` 8.2 psia / 34 % O₂ (NTRS 20150021491; NASA/TM-2013-217377) y `suit` 100 % O₂ / 4.3 psi (reto), ambas sin verificar | Solo la del reto; solo la de NASA | La del reto es una estimación, no una especificación técnica; mostrar las dos evita afirmar algo que la NASA no dice | Baz |
| 2026-11-14 | Conteo del escenario lunar del reto: **0 pruebas exactas / 17 cercanas** (FLEX, 0.703–0.714 atm = 10.33–10.50 psi, O₂ 30–34 %, heptano 8 y metanol 9; disruption 15, completion 2, ninguna extinción). `lunar_nasa`, `exploration` y `suit`: 0 / 0 (se muestra la condición más cercana, que no es el escenario) | Mostrar solo el conteo estricto | El corte depende de 0.1–0.3 psi; decir "0 exactas, 17 a menos de 0.5 psi" es el hallazgo honesto que pide el reto | Baz |
| 2026-11-14 | Camino del demo: los datos precalculados son la base (`frontend/public/data/*.json`, generados por `scripts/build_frontend_data.py`, incluido `answers.json` para el asistente en modo `low`). Ollama solo aparece en el video | Demo en vivo con Ollama | El enlace público no tendrá modelo local; el demo no puede depender del LLM ni de la red | Baz |

## Backlog (fuera del MVP)
- (añadir aquí lo que scope-guard rechace)
