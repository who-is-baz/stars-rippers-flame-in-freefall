# Tareas · Charly (Frontend / diseño)

Lee `docs/07-api-contract.md` y `docs/03-analisis-datos.md` (sobre todo "Reglas de interpretación").

## Hasta las 12:30
1. Proyecto Vite + React + TypeScript. UI **en inglés**.
2. Trabaja contra un **mock** (servido desde `data/processed/coverage_grid.json` y `experiments.csv`) hasta que Yael publique la API.
3. Pantalla 1 · **Mapa de cobertura**: cuadrícula O₂ × presión (por combustible y supresor). Cada celda muestra `n`; **celdas con n<5 en gris** y con advertencia. No se pinta "probabilidad".
4. Pantalla 2 · **Explorador**: filtros (combustible/material, O₂, presión, supresor, resultado) + tabla.

## Hasta las 15:00
5. Panel **"What's missing"** (`/gaps`).
6. Panel **Ask** (`/ask`): selector de nivel (Low / Medium / High), respuesta con **citas clicables** y estado "No data available".
7. **Ranking** con sliders de pesos (`/ranking`) mostrando desglose y n.
8. Comparador (`/compare`) si hay tiempo.

## Reglas de la UI
- Siempre mostrar n, `limitations` y la fuente (DOI).
- Marcar visualmente lo extraído por IA (`ai_*`) y las filas con `qc_flags`.
- Accesibilidad: no usar solo el color; contraste suficiente; navegable con teclado.
- Pensar en el demo de 30 s: ¿se entiende en una pantalla?

## Skills sugeridas
`frontend-design` (Anthropic), `baseline-ui` y `fixing-accessibility` (ibelick). Máximo 5–6 skills activas.

## Listo cuando
Se puede hacer el recorrido del demo (cobertura → explorador → pregunta → cita) sin errores.
