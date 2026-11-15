> Nota 2026-11-15: las imágenes `docs/design/v3_*.png` citadas abajo se eliminaron del repo (eran generadas por IA); usa el HTML de referencia y el sitio.

# Prompt 00 · Contexto de diseño para cada compañero (pégalo PRIMERO)

Cada Claude empieza sin memoria: no sabe qué diseño aprobó el equipo. Este paquete se lo da. **Úsalo antes del prompt 01
o de cualquier tarea de UI.** Funciona igual en Claude Code (repo clonado) y en Claude web (con archivos adjuntos).

## A. Si usas Claude Code (repo clonado, rama actualizada desde `main`)
Abre Claude Code en la raíz del repo y pega esto tal cual:

```text
Vas a trabajar en el frontend de Flame in Freefall. Antes de proponer o escribir NADA:

1. Lee en este orden: CLAUDE.md, docs/design/DESIGN_BRIEF.md, docs/tareas/<mi archivo>.md.
2. MIRA las tres imágenes con Read: docs/design/v3_starter.png, v3_edit.png y v3_copilot.png. Son el diseño APROBADO por
   el equipo. No es una inspiración: es lo que hay que construir.
3. Abre docs/design/reference/flame-v3-reference.html (código de la referencia). Copia sus tokens (:root), tamaños y
   estructura. Si puedes, ábrelo en un navegador y toma capturas a 1600x950 para comparar con las imágenes.
4. Carga las skills flame-design-system, flame-dashboard-builder, flame-data-viz y flame-react-frontend.
   Orden de autoridad: referencia (imágenes + HTML) > skills > tus ideas.
5. Resúmeme en 8 líneas QUÉ vas a construir y qué zonas tiene la pantalla (escena central, barra superior, riel
   izquierdo con 2 tarjetas, inspector derecho, dock de atmósferas, drawer del copiloto a la izquierda, galería a la
   derecha). Si tu resumen no coincide con las imágenes, corrígete antes de seguir.

Reglas duras: no inventes cifras (todo sale de frontend/public/data/*.json; la gráfica de líneas y la respuesta del
copiloto de la referencia son ilustrativas); UI en inglés; un solo acento menta #7FF5E1; sin logos NASA; commits pequeños
con "AI-assisted: yes"; no tocar data/raw ni docs/07-api-contract.md. Mi tarea es: <PEGA AQUÍ TU PAQUETE>.
```

## B. Si usas Claude en la web (claude.ai)
1. Crea un chat nuevo (o un Project del equipo) y **adjunta estos 9 archivos** del repo:
   `docs/design/DESIGN_BRIEF.md`, `v3_starter.png`, `v3_edit.png`, `v3_copilot.png`, `reference/flame-v3-reference.html` y las
   cuatro `SKILL.md` (`.claude/skills/flame-*/SKILL.md`).
2. Pega este mensaje:

```text
Adjunto el diseño APROBADO por mi equipo (3 imágenes + HTML de referencia), el brief y 4 skills. Mira las imágenes y
lee el HTML antes de contestar. No propongas un diseño nuevo: reproduce este. Primero dime en 8 líneas qué ves
(zonas, paleta, tipografía, comportamiento de la escena) para confirmar que lo entendiste. Después haremos: <TU TAREA>.
Reglas: UI en inglés, un solo acento menta #7FF5E1, sin logos NASA, nada de cifras inventadas (la gráfica de líneas y el
chat de la referencia son ilustrativos), React + TypeScript + CSS Modules con los tokens del HTML.
```

Tip: guarda el chat o el Project para no repetir el contexto. Si tu Claude contesta con un diseño claro, barra lateral
blanca o gráficas sin escena central, **no sigas**: pídele que vuelva a mirar las imágenes y compare punto por punto con
el checklist de `DESIGN_BRIEF.md` §9.

## C. Cómo comprobar que lo entendió (30 segundos)
Pídele: "describe la primera vista sin mirar el HTML". Debe mencionar: escena de cámara circular con llama azul al centro,
titular "Fire behaves differently in space.", dos tarjetas a la izquierda, inspector "What air are we looking at?" a la
derecha, dock con atmósferas (Moon base activa) y el tour blanco. Si no lo menciona, reenvía las imágenes.
