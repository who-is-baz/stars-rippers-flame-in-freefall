# Recomendaciones de la mentora (Dra. Argelia): qué se hizo y qué no — 2026-11-15

## Hecho (con pruebas; definiciones en `docs/DECISIONES.md` y en Methods & Sources del sitio)
1. **Entender qué investigaciones sirven para un escenario:** indicadores (Tests, Investigations, Complete, Partial, Scenario coverage, Conditions without evidence) y tarjeta "What do these tests tell us?" con *Useful evidence*, *What the nearest tests show* y *What remains unresolved*.
2. **Ordenarlas por relevancia:** vista **Experiments** (403 pruebas, filtros, hash en la URL, panel de detalle) con fórmula transparente: Exact → Near → Not near → No pressure recorded; distancia max(|ΔO₂|/tol, |Δpsi|/tol); desempate por resultado declarado, mayor n y test_id.
3. **Interpretar y decir qué NO se puede resolver (incertidumbre):** lista calculada por escenario, texto "Descriptive summary of NASA test records. Not a safety assessment or a forecast.", y respuestas del asistente (herramienta `most_relevant_tests`, preguntas sugeridas, temas "about" nuevos).
4. **Instrumentos de O₂, presión y flujo:** el flujo se muestra medido solo donde existe (BASS-II, extraído por IA, con n) y si no, "Airflow (conceptual)".

## No hecho, a propósito (por las reglas de datos)
- **Catálogo de 13–15 investigaciones y su ranking.** Solo hay dos investigaciones procesadas (FLEX PSI-69 y BASS-II PSI-25) y la regla de esta entrega es no añadir datos de otras fuentes. Lo que sí hace el sitio: ordenar las 403 **pruebas** por relevancia al escenario, con la fórmula visible.
- **Ranking o puntaje de seguridad / "nivel de riesgo".** El sitio describe pruebas observadas; no evalúa ni predice. Cobertura y relevancia cuentan registros disponibles y miden cercanía de condiciones, no peligro.
- **Marco Prevención / Detección / Supresión, aplicaciones en la Tierra.** Sin datos de detección ni de prevención en las tablas procesadas no se puede respaldar; la parte de supresión (CO₂/He) ya está con sus advertencias de confusión con O₂.
- **Gravedad parcial o normal:** no existe en PSI; la comparación "Earth 1 g (illustration)" es solo una ilustración sin datos.

## Pendiente (humano)
- Revisión humana de las definiciones de *Complete/Partial* y de la fórmula de relevancia (propuestas por la IA a partir del esquema real) y de los textos de interpretación.
- Revisión humana de las 26 salidas de BASS-II extraídas por IA y de los valores de velocidad de aire (121, también extraídos por IA).
- Confirmar las 3 fuentes de escenario sin verificar (lunar habitat, Exploration, Spacesuit).
- Del análisis de Yael (`ANALISIS_15NOV_COBERTURA.md`): P2 de UX (navegación redundante, nº de tarjetas, tamaño de la escena) sigue sin hacerse.
- Heavy (qwen3:14b) no se descargó ni se evaluó (`docs/bench/`).
