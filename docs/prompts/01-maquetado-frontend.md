> Nota 2026-11-15: las imágenes `docs/design/v3_*.png` citadas abajo se eliminaron del repo (eran generadas por IA); usa el HTML de referencia y el sitio.

# Prompt 01 · Primer avance del frontend (maquetado)

> Para pegar en Claude Code, abierto en la raíz del repo, en una rama nueva. Producto: la base del dashboard
> (paquetes A–D de `flame-react-frontend` §8). Copiloto (E) y vistas extra (F) van en prompts posteriores.

---

## Prompt

Eres el desarrollador frontend de **Flame in Freefall** (NASA Space Apps 2026). Vas a construir el **primer avance
ejecutable** del dashboard en `frontend/`, sobre el que el equipo seguirá trabajando en paralelo.

### 0. Antes de escribir código
1. Lee `CLAUDE.md`, `docs/design/DESIGN_BRIEF.md`, `docs/03-analisis-datos.md`, `docs/07-api-contract.md`, `docs/tareas/charly-frontend.md`.
   **Mira con Read** `docs/design/v3_starter.png`, `v3_edit.png` y `v3_copilot.png` y abre `docs/design/reference/flame-v3-reference.html`:
   es el diseño aprobado, y se reproduce 1:1 (estructura, paleta, tipografía, comportamiento de la escena). Antes de codificar,
   describe en 8 líneas lo que ves; si no coincide con las imágenes, corrígete. La gráfica de líneas y el chat de la referencia
   son ilustrativos: no son datos. (Contexto para compañeros: `docs/prompts/00-contexto-companeros.md`.)
2. Carga y sigue las cuatro skills: `flame-react-frontend` (cómo se construye), `flame-design-system` (aspecto),
   `flame-data-viz` (datos honestos) y `flame-dashboard-builder` (tarjetas y primera vista). Ganan sobre `frontend-design`.
3. Inspecciona `frontend/public/data/*.json`. **Las formas reales mandan** sobre cualquier suposición.
4. Pasa `scope-guard` por la lista de dependencias de `flame-react-frontend` §2 y dime si algo sobra. No agregues
   dependencias fuera de esa lista.
5. Crea la rama `feat/<tu-nombre>-frontend-base` desde `main` actualizada. Nunca trabajes en `main`.

### 1. Alcance de ESTE avance (nada más)
Al terminar, `npm run dev` y `npm run build && npm run preview` muestran:
- **Primera vista (Starter)** de `flame-dashboard-builder` §1: una frase que explica la app, la escena central, el
  selector de atmósfera (escenarios de `scenarios.json`) y **como máximo 3 tarjetas**, con su pregunta, una sola
  vista, frase de lectura, fuente (DOI) y `n`. El tour de 3 pasos puede ser un esqueleto.
- **Escena**: primero `FallbackScene` (SVG 2.5D: girar, zoom con rueda, hover con descripción), con el contrato
  `<FlameScene>` de la skill. La versión React Three Fiber entra como commit aparte **solo si el resto ya funciona**;
  si WebGL falla debe caer al respaldo sin error.
- **Cambio de escenario** (p. ej. Moon base): las tarjetas y la escena reaccionan; el conteo lunar sigue siendo
  0 exactas / 17 cercanas, tal como sale de los JSON.
- **Customize** básico: arrastrar y redimensionar tarjetas (`react-grid-layout`) y **deshacer**. La galería completa
  de 11 tipos NO entra aún: solo los tipos que usen las 3 tarjetas del Starter más uno extra para probar el cambio.
- No incluir: copiloto, Explore/Coverage/Gaps como vistas completas, backend, Ollama, autenticación.

### 2. Reglas duras (de `CLAUDE.md` y las skills)
- UI y textos visibles **en inglés**; código y commits en español o inglés, pero consistente.
- **Cero cifras inventadas.** Todo número sale de `frontend/public/data/*.json` y la tarjeta cita su `source_doi`.
  Falta un dato → "No data available". Si necesitas una cifra nueva, no la calcules en el frontend: déjala como
  tarea para `scripts/build_frontend_data.py` y deja un `// TODO(data)`.
- `n < 5` siempre con advertencia; % de extinción de FLEX es descriptivo, no probabilidad; no usar los términos
  prohibidos de `flame-design-system` (risk, threat, safe, probability, impact zone); BASS-II `not_stated` ≠ no extinción.
- El demo funciona **sin backend, sin red y sin Ollama**. Sin logos ni marcas NASA. Sin secretos ni `.env`.
- Accesibilidad: foco visible, no solo color, `prefers-reduced-motion`, navegable con teclado.
- No toques `data/raw/`, `src/`, `scripts/` ni `docs/07-api-contract.md`.

### 3. Orden de trabajo y commits
Haz **commits pequeños, uno por paso**, en este orden. Cada commit debe dejar `npm run build` pasando (si un paso
no compila solo, únelo con el siguiente). Mensaje: `tipo(alcance): resumen en imperativo`, con el cuerpo opcional
y el trailer final `AI-assisted: yes`.

1. `chore(frontend): inicializar proyecto Vite + React + TypeScript strict`
2. `chore(frontend): agregar dependencias del stack decidido y scripts` (solo lo permitido por la skill)
3. `feat(frontend): tokens.css y fuentes según flame-design-system`
4. `feat(frontend): tipos y esquemas zod de los JSON de public/data`
5. `feat(frontend): capa de datos (loadStatic) y DataProvider con estados de carga y error`
6. `feat(frontend): stores zustand de escenario y tablero con persistencia segura`
7. `feat(frontend): honesty.ts con formato de unidades, n<5 y etiquetas de qc_flags` (+ tests Vitest)
8. `feat(ui): kit base (GlassPanel, WidgetFrame, chips, badges, Tooltip, Drawer)`
9. `feat(ui): presets de movimiento y soporte de prefers-reduced-motion`
10. `feat(layout): ConsoleLayout con TopBar, riel izquierdo y rutas por hash`
11. `feat(scene): contrato FlameScene y FallbackScene SVG con zoom, giro y hover`
12. `feat(widgets): tarjetas del Starter (anillo, número grande, barras) con fuente y n`
13. `feat(board): tablero con react-grid-layout, modo Customize y deshacer`
14. `feat(app): primera vista Starter y selector de atmósfera conectado a escena y tarjetas`
15. `feat(scene): escena React Three Fiber detrás del mismo contrato (opcional)`
16. `docs(frontend): README de frontend y entrada en docs/AI_USAGE_LOG.md`

### 4. Verificación antes de dar por terminado
- `npm run build` sin errores TS; tests de `honesty.ts` pasando.
- Ejecuta el recorrido: primera vista → cambiar a Moon base → abrir una tarjeta → mover una tarjeta → deshacer.
- Revisa los checklists de `flame-design-system` §8 y `flame-data-viz` §7 y dime cuáles marcas y cuáles no.
- Abre la app y la referencia lado a lado a 1600×950 en los tres estados (Starter, Customize, Copiloto) y pasa el checklist de paridad de `docs/design/DESIGN_BRIEF.md` §9. Reporta cada diferencia.
- Lista **lo que no quedó**, lo que supusiste y cualquier cifra que no pudiste rastrear a un JSON.

### 5. Si algo se complica
- Más de ~20 min atascado en un paso → deja un stub claro (`// TODO(owner)`), commitea y sigue; avísame.
- Congelamiento del equipo: **domingo 14:00**. Si queda poco tiempo, prioriza: base → Starter → escena de respaldo.
- Al final escribe `docs/HANDOFF.md` con `shift-handoff` y registra el uso de IA con `ai-disclosure-log`.

---

## Quién lo ejecuta y cómo repartirlo
Un solo Claude Code corre este prompt para tener una base coherente (pasos 1–11). Cuando el commit 10 esté en la
rama y subido, el resto se reparte en paralelo siguiendo la tabla de `flame-react-frontend` §8:
Escena (C) · Tablero (D) · Copiloto (E, prompt aparte) · Vistas (F). Cada quien en su rama y un PR por tarea.
