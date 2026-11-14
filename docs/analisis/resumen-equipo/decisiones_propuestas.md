# Decisiones propuestas (para copiar a `docs/DECISIONES.md` si Baz las aprueba)

> **No se editó `docs/DECISIONES.md`.** Cada fila está en el formato de esa tabla. "Quién" queda como "Baz (pendiente)" hasta que
> Baz decida. Si elige otra alternativa, cambia la columna "Decisión".

| Fecha | Decisión | Alternativas | Razón | Quién |
|---|---|---|---|---|
| 2026-11-14 | Tolerancia única para todos los escenarios: ±0.01 en O₂ y ±0.5 psi | ±0.02 O₂; +0.4 psi solo hacia arriba; estricta | ±0.5 psi abarca un nivel completo (los niveles miden 0.35–0.43 psi) sin mezclar niveles. ±0.02 mezcla 19 % y 25 % con supresor; +0.4 parte el nivel de 1 atm (49 → 33). Reproduce los 49/29 de Fer | Baz (pendiente) |
| 2026-11-14 | Bandas de O₂ esquema B, cerradas a la izquierda: <0.15, 0.15–0.18, 0.18–0.21, 0.21–0.24, 0.24–0.28, ≥0.28 | A (vigente); C (0.20–0.22, 0.22–0.28) | El borde 0.28 cae en un vacío: ninguna prueba cambia de celda en `coverage_grid.json` (49 celdas, 25 con n<5) y separa 0.24–0.25 (todas con supresor) de 0.30–0.34 (todas sin supresor). Parche probado: `docs/analisis/rangos-o2-presion/patch_propuesto.diff` | Baz (pendiente) |
| 2026-11-14 | Escenario lunar = "expected Moon-base air (challenge statement)": ≥30 % O₂, ≤10.2 psi; se muestra junto a la Exploration Atmosphere de la NASA | Solo NTRS 10.2/26.5 u 8.2/34; definición estricta sin tolerancia | La fuente es el texto oficial del reto (`docs/08`). Con la tolerancia única da n=17; estricta da 0 (el corte depende de 0.1–0.3 psi). Se dice explícitamente | Baz (pendiente) |
| 2026-11-14 | Escenario Marte = "Exploration Atmosphere 8.2 psia / 34 % O₂ — Moon & Mars surface" (n=0 en FLEX; vecino 34 % a ~10.4 psi, n=9) | "Mars surface habitat 8.2 psia" sin O₂; no incluir Marte | NTRS 20230009095 p.16 da 8.2 psia para la superficie de Marte sin % O₂; el 34 % viene de NTRS 20220015741 y 20170001585 p.4. Ver `escenario_marte.md` | Baz (pendiente) |
| 2026-11-14 | Traje: mostrar 100 % O₂ / 4.3 psi (reto) y 85 % O₂ / 4.3 psia (NTRS, EVA simulada), ambos con n=0 | Solo uno de los dos | Las dos fuentes son válidas en contextos distintos; ninguna prueba FLEX está por debajo de 10.18 psi | Baz (pendiente) |
| 2026-11-14 | Unir `feat/baz-mapeo-materiales` (mapeo aprobado por Fer en #3) antes del análisis de BASS-II por material | Usar el mapeo por `test_id` fuera de la base | Sin el merge, `material_category` es nula en las 129 filas y el `groupby` devuelve vacío | Baz (pendiente) |
| 2026-11-14 | Camino del demo: "Medio" (mapa de huecos + escenarios + ranking con n) + asistente nivel Low; Medium/High solo si pasa las 10 preguntas de prueba antes de la hora acordada | Corto; Largo | Cubre resumir/ordenar/SI sin depender del LLM el día del demo. Ver `brief-reunion.md` | Baz (pendiente) |
| 2026-11-14 | La sección 7 (FLEX) del PDF "Clasificación de materiales" no se cita; no se adopta la etiqueta "inflamable/no inflamable" | Citarlo con advertencia | Sus cifras de FLEX no coinciden con el CSV (160/114 frente a 157/117; 19 frente a 17; 1 frente a 2 extinciones) | Baz (pendiente) |

## Backlog sugerido (fuera del MVP, por `scope-guard`)
- Bandas C alineadas a escenarios: más trabajo y rompe etiquetas cerca del congelamiento.
- Verificar la versión de la tabla PSI-69 con red (comando en `docs/analisis/rangos-o2-presion/informe.md`, sección 4).
