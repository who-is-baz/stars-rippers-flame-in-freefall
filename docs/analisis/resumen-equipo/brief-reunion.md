# Brief de reunión: cómo lo mostramos, por qué y para qué

**Para:** Baz y el equipo · 2026-11-14 · Base: `resumen.md` y `tablas.txt` de esta carpeta.
**Para qué:** contar en el demo **qué se probó → a qué ambiente se parece → qué falta**, con datos NASA citados. El reto pide un
dashboard "SI-powered" que **resuma, ordene (rank) e interprete** (`docs/08`).
**Criterios del jurado:** Impact · Creativity · Validity · Relevance · Presentation (`docs/00`, guía 2025: falta confirmar la de 2026).
**Demo:** video ≤30 s o ≤7 diapositivas; si se excede, el proyecto no es elegible.

## Tres caminos

| | **Corto**: mapa de huecos + tabla de escenarios | **Medio**: corto + ranking descriptivo con n | **Largo**: medio + asistente SI que elige funciones de `psi_queries.py` |
|---|---|---|---|
| Qué se ve | Matriz O₂ × presión (n, gris si n<5, huecos) y 6 escenarios con "sin datos + vecino" | + lista ordenada de condiciones (tasa K, diámetro de extinción, confianza = n) con desglose de pesos | + pregunta en inglés → respuesta con cita (`query`, `params`, DOI) o `no_data` |
| Costo aprox. | 2–3 h (Charly; los CSV ya existen) | +3–4 h (Yael `/ranking` + Charly) | +6–8 h (Yael `/ask` con Low sin LLM y Medium/High con Ollama, más pruebas trampa) |
| Riesgo para el congelamiento (dom 14:00) | Bajo | Medio | **Alto** (LLM local, latencia, respuestas sin cita) |
| Qué sacrifica | "rank" y "SI" del reto (pega en Relevance) | El "SI" conversacional | Tiempo de pulido y de ensayo del demo |
| Impact | Muestra el hueco 8.2/4.3 psi: útil para planear pruebas | + qué condiciones probadas importan más | + acceso rápido para ingenieros |
| Creativity | Media (mapa de huecos honesto) | Media | Alta |
| Validity | **Alta** (cada celda con n, DOI y `test_id`) | Alta si el ranking muestra n y pesos | Alta solo si toda respuesta trae cita o `no_data` |
| Relevance | Parcial: no hay rank ni SI | Buena: resume + ordena | **Completa**: resume, ordena, interpreta, SI |
| Presentation | Cabe en 30 s (1 pantalla) | Cabe en 7 diapositivas; 30 s apretados | 30 s muy apretados; mejor 7 diapositivas |

**Recomendación (la decisión es de Baz):** **Medio, más el nivel "Low" del asistente** (plantillas sin LLM, ya previsto en
`docs/tareas/yael-backend.md`) como versión mínima de "SI". Medium/High se activan solo si a una hora acordada `/ask` ya pasa las 10
preguntas de prueba con citas. Así se cubre "resume / ordena / SI" sin depender del LLM el día del demo. `scope-guard`: mejora Validity
y Relevance, cada pieza cabe en menos de 2 h por persona y, si `/ask` falla, el MVP sigue en pie.

**Mensaje del demo (las 3 partes):** (1) "49 tests look like cabin air." (2) "17 tests approach the expected Moon-base air." (3) "**Zero
tests at 8.2 psi or 4.3 psi** — that's the gap." Cada número con n y DOI en pantalla.

## Decisiones que necesita Baz (detalle en `decisiones_propuestas.md`)
1. **Tolerancia:**
   - **±0.01 / ±0.5 psi (recomendada):** cubre un nivel de presión completo sin mezclar.
   - ±0.02: mete 19 % en Tierra y 25 % con supresor en 26.5 %.
   - +0.4 psi solo hacia arriba: parte el nivel de 1 atm (49 → 33).
2. **Bandas de O₂:**
   - A, vigente: cero trabajo, pero "≥0.24" esconde que 0.24–0.25 lleva supresor.
   - **B (recomendada; parche probado en la rama de Yael):** 9 etiquetas cambian, ninguna prueba cambia de celda.
   - C: alinea Tierra, pero cambia casi todas las etiquetas.
3. **Definición lunar:**
   - (a) **Texto del reto, ≥30 % / ≤10.2 psi:** con fuente oficial del reto, n=17 con tolerancia, pero "likely" y 0 si es estricta.
   - (b) NTRS 10.2 psi / 26.5 %: n=0.
   - (c) NTRS 8.2 / 34 %: n=0.
   - *Propuesta:* mostrar (a) como "expected Moon-base air (challenge statement)" junto con (c) como "Exploration Atmosphere (NASA)".
4. **Nombre del escenario Marte:**
   - "Mars surface habitat (8.2 psia)": sin % O₂ en esa fuente.
   - **"Exploration Atmosphere 8.2 psia / 34 % O₂ — Moon & Mars surface" (recomendado).**
   - No usar "Mars atmosphere": se confunde con el CO₂ marciano.
5. **Traje:**
   - 100 % O₂ / 4.3 psi (texto del reto).
   - 85 % O₂ / 4.3 psia (NTRS, EVA simulada).
   - Ambos dan n=0. *Propuesta:* mostrar los dos, con su fuente.
6. **Mapeo de materiales:** Fer ya lo aprobó (#3). Falta **unir** `feat/baz-mapeo-materiales` a `main`. Si no se une, el
   `groupby` de Jovanny seguirá vacío.
7. **Orden de PRs:** Yael (`feat/yael-rangos-o2-presion`) → Baz (`feat/baz-resumen-equipo`, apilada).
