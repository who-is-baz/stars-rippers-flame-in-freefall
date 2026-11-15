---
name: flame-react-frontend
description: Use when writing or reviewing React + TypeScript code for the Flame in Freefall dashboard in frontend/. Fixes the stack (Vite, R3F, Motion, react-grid-layout, Recharts, Zustand, Zod), folder structure, TypeScript types for frontend/public/data/*.json, data layer, stores, 3D scene implementation, a11y/performance rules and the work split.
---

# Flame in Freefall · Frontend React (v3)

Cómo se **construye**. Aspecto: `flame-design-system`. Datos honestos: `flame-data-viz`. Tarjetas, personalización y
copiloto: `flame-dashboard-builder`. Si algo choca con `docs/07-api-contract.md` o `CLAUDE.md`, ganan ellos.

## 1. Reglas que no se negocian
1. **El demo funciona sin backend, sin red y sin Ollama**: la base son `frontend/public/data/*.json`. API y LLM son extras.
2. **Enlace público sin login**: `vite build` estático.
3. **El frontend no inventa estadísticas.** Muestra, filtra, ordena, cuenta filas y pinta puntos crudos. Cifras nuevas
   (promedios, porcentajes) se agregan en `scripts/build_frontend_data.py` con test.
4. Los nombres de campo del JSON no se renombran.
5. Sin secretos en el repo; `VITE_*` es público.

## 2. Stack (decidido el 14 nov; registrar en `docs/DECISIONES.md`)
| Necesidad | Elección | Por qué (y alternativa descartada) |
|---|---|---|
| Base | Vite + React 18 + TypeScript `strict` | Lo que el equipo domina. |
| Estilos | CSS Modules + `tokens.css` | Cero configuración; los tokens ya son variables CSS. (Tailwind: riesgo de hex sueltos.) |
| Escena 3D | `three` + `@react-three/fiber` + `@react-three/drei` | Órbita, zoom y anotaciones HTML listas (`OrbitControls`, `Html`). Respaldo SVG 2.5D si no hay WebGL. |
| Animación UI | `motion` (`motion/react`) | `layout`, `layoutId`, `AnimatePresence`: abrir/cerrar/reordenar con pocas líneas. |
| Tablero personalizable | `react-grid-layout` (Responsive) | Arrastrar, redimensionar y breakpoints como Power BI. (dnd-kit: habría que programar el grid.) |
| Gráficas | `recharts` para barra/línea/dispersión; **SVG propio** para anillo, mapa de calor, radar | Recharts da ejes y tooltips gratis; las tres formas propias no existen bien en librerías. |
| Estado | `zustand` (+ `persist` a localStorage con try/catch) | Layout de tarjetas, escenario y modo, sin prop drilling. |
| Validación | `zod` | Valida los JSON al cargar y **cada acción del copiloto SI** antes de tocar el tablero. |
| Iconos | `lucide-react` | Un solo set, trazo fino. |
| Navegación | hash simple (`#overview`, `#explore`, `#coverage`, `#gaps`) | Funciona en cualquier hosting estático. |
Cualquier dependencia extra pasa por `scope-guard` y va a References de la entrega.

## 3. Estructura
```
frontend/src/
  app/        App.tsx · TopBar.tsx · providers.tsx · routes.ts
  design/     tokens.css · global.css · motion.ts (presets de flame-design-system §5)
  data/       types.ts · schemas.ts (zod) · source.ts · useData.ts
  lib/        format.ts · honesty.ts · glossary.ts
  store/      dashboard.ts (layout + tarjetas) · ui.ts (escenario, modo, drawers, tour)
  scene/      FlameScene.tsx · Flame.tsx (shader) · Chamber.tsx · Annotations.tsx · ZoomControls.tsx · FallbackScene.tsx
  widgets/    registry.ts · WidgetFrame.tsx · <un archivo por tipo de tarjeta> (ver flame-dashboard-builder §3)
  board/      Board.tsx (react-grid-layout) · Gallery.tsx · CardMenu.tsx · ExpandedCard.tsx · Tour.tsx
  copilot/    CopilotDrawer.tsx · actions.ts (zod) · lowMode.ts · ollama.ts
  views/      Explore.tsx · Coverage.tsx · Gaps.tsx
```
Cada carpeta importa solo de `data/`, `lib/`, `store/`, `design/` y de `components` compartidos; nunca de otra feature.

## 4. Tipos (`src/data/types.ts`) — verificados contra los JSON del 14 nov

```ts
export type Program = 'FLEX' | 'BASS-II';
export type Fuel = 'heptane' | 'methanol';
export type Outcome =
  | 'extinction' | 'disruption' | 'completion'
  | 'blowoff' | 'no_ignition' | 'not_sustained';
export type OutcomeSource = 'observed' | 'ai_extracted' | 'not_stated';
export type CellStatus = 'ok' | 'no data';
export type O2Band = '<0.15' | '0.15-0.18' | '0.18-0.21' | '0.21-0.24' | '>=0.24';
export type PressureLevel = '~0.7 atm' | '~1.0 atm' | '>2 atm';

export interface ProgramMeta { program: Program; psi_id: string; n: number; source_doi: string; what: string }
export interface Meta {
  title: string; generated_utc: string; license: string; n_tests: number;
  programs: ProgramMeta[]; source_doi: string[];
  tolerance: { o2_fraction: number; pressure_psi: number };
  o2_bands: { label: O2Band; min_inclusive: number; max_exclusive: number }[];
  pressure_levels: { label: PressureLevel; atm_min: number; atm_max: number | null }[];
  min_n: number;
  excluded_from_pressure_views: { test_id: string; program: Program; reason: string }[];
  limitations: string[];
}

export interface ExperimentRow {
  program: Program; test_id: string; date: string;
  material_or_fuel: string; material_category: string;
  o2_fraction: number; pressure_atm: number | null;
  co2_fraction: number | null; he_fraction: number | null;
  outcome: Outcome | null; outcome_source: OutcomeSource;
  extinction_diameter_mm: number | null; burning_rate_mm2_s: number | null;
  qc_flags: string[]; source_doi: string;
  low_confidence_warning?: string;
}
export interface ExperimentsFile { columns: string[]; total: number; items: ExperimentRow[] }

export interface CoverageCell {
  fuel: Fuel; o2_band: O2Band; pressure_level: PressureLevel;
  n: number; status: CellStatus;
  n_by_suppressant: { none: number; co2: number; he: number };
  n_burning_rate: number; avg_burning_rate_mm2_s: number | null;
  n_extinction: number; n_extinction_diameter: number; avg_extinction_diameter_mm: number | null;
  pct_extinction: number | null; pct_note: string | null; warning: string | null;
  qc_flags: string[]; source_doi: string[];
}
export interface CoverageFile {
  program: 'FLEX'; note: string; n_tests: number;
  n_cells: number; n_cells_empty: number; n_cells_small: number; cells: CoverageCell[];
}

export interface ScenarioMatch {          // `exact` puede venir como { n: 0 } sin más campos
  n: number; o2_min?: number; o2_max?: number; atm_min?: number; atm_max?: number;
  psi_min?: number; psi_max?: number;
  n_by_fuel?: Partial<Record<Fuel, number>>; n_by_outcome?: Partial<Record<Outcome, number>>;
  test_ids?: string[];
}
export interface NearestMatch extends ScenarioMatch {
  pressure_level: PressureLevel; distance_in_tolerances: number; note: string; // "it is NOT this scenario"
}
type Criterion = { kind: 'point' | 'min' | 'max'; value: number };
export interface Scenario {
  id: 'earth_iss' | 'lunar_challenge' | 'lunar_nasa' | 'exploration' | 'suit';
  label: string;
  criteria: { o2: Criterion; pressure_psi: Criterion; tolerance: Meta['tolerance'] };
  n_exact: number; n_near: number; status: CellStatus;
  exact: ScenarioMatch; near: ScenarioMatch; nearest: NearestMatch | null;
  bass2_o2_only?: { n: number; note: string };
  source: string; quote: string | null; verified: boolean; note: string | null;
  excluded: { test_id: string; reason: string }[]; source_doi: string;
}
export interface ScenariosFile { program: 'FLEX'; tolerance: Meta['tolerance']; scenarios: Scenario[] }

export interface Gap { id: string; text: string; source_doi: string[]; evidence: Record<string, unknown> }
export interface GapsFile { gaps: Gap[] }

export type MaterialClass = 'flammable_demonstrated' | 'undetermined';
export interface MaterialGroup {
  n: number; n_with_outcome: number; n_not_stated: number;
  n_by_outcome: Partial<Record<Outcome, number>>; n_low_confidence: number;
  o2_min: number; o2_max: number; classification: MaterialClass;
  warning: string | null; qc_flags: string[]; test_ids: string[];
}
export interface Material extends MaterialGroup {
  material_category: string;
  by_color?: (MaterialGroup & { color: string })[];
}
export interface MaterialsFile {
  program: 'BASS-II'; source_doi: string; n_tests: number;
  classification_rule: Record<string, string>; non_flammable: string[]; notes: string[]; materials: Material[];
}

export interface Citation { query: string; params: Record<string, unknown>; source_doi: string; test_ids: string[] }
export interface Answer {
  id?: string; question?: string; answer: string; citations: Citation[];
  no_data: boolean; warnings?: string[]; level: 'low' | 'medium' | 'high'; tool_calls?: unknown[];
}
export interface AnswersFile { level: 'low'; note: string; answers: Answer[] }
```
Si `build_frontend_data.py` cambia un campo, se actualizan aquí y en `schemas.ts` en el **mismo PR**.
El widget de burning rate usa las celdas de `coverage.json` **por nivel de presión** (ya traen promedio y su n). Promediar entre presiones sería una cifra nueva: si se quiere, va en Python (`rates.json`), no en React.

## 5. Datos y estado
```ts
const BASE = import.meta.env.BASE_URL, API = import.meta.env.VITE_API_URL as string | undefined;
export const loadStatic = async <T,>(f: string, schema: z.ZodType<T>) =>
  schema.parse(await (await fetch(`${BASE}data/${f}`)).json());
```
- `DataProvider` carga los 7 JSON al inicio en paralelo; si un `schema.parse` falla → `ErrorState` claro, no gráfica en blanco.
- `store/ui.ts`: `scenarioId` (default `lunar_challenge`), `mode: 'explorer'|'engineer'`, `copilotOpen`, `galleryOpen`, `tourDone`.
- `store/dashboard.ts`: `cards: CardSpec[]`, `layouts: Layouts` (react-grid-layout), acciones `add/update/remove/move/reset`,
  `history` de 20 pasos para **Undo**. Persistir con `persist` dentro de try/catch; si falla, el tablero funciona igual.
- Datos derivados (filtros, conteos) en render, sin `useEffect`.

## 6. Escena 3D (`scene/`)
- `<Canvas dpr={[1,2]} frameloop="demand">`: renderiza solo cuando algo cambia (ahorra batería en las laptops del jurado).
- **Llama**: esfera con `ShaderMaterial` fresnel (borde azul `--flame-blue`, núcleo `--flame-core`), `blending: Additive`,
  más un sprite de halo. Escala y brillo desde el escenario (`flame-data-viz` §5). **Gota**: esfera pequeña oscura con
  fibra (cilindro fino). **Cámara/ventana**: toro + cilindro metálico grafito con luz de borde (`MeshStandardMaterial`
  metalness .8, roughness .35, una luz direccional plateada).
- `OrbitControls` con `enableDamping`, `enablePan={false}`, polar 35°–145°, distancia 2.2–9; los niveles semánticos son
  rangos de distancia (Chamber > 6, Flame 3.5–6, Droplet < 3.5). Las anotaciones (`<Html>` de drei) se muestran por nivel.
- Cambio de escenario: interpola escala/brillo en 600ms con `useFrame` + `invalidate()`.
- `FallbackScene` (SVG 2.5D) si no hay WebGL o falla el chunk; misma API: `scenario`, `onSelect`, `level`.
- Cargar la escena con `React.lazy`; mostrar primero el póster estático para que la página sea útil de inmediato.

## 7. Accesibilidad y rendimiento
- HTML semántico; todo lo interactivo es `button`/`a`. Foco visible; drawers y modal atrapan el foco y cierran con Esc.
- Escena: contenedor con `aria-label` e instrucciones; anotaciones enfocables; **todo dato de la escena también está
  en el inspector como texto**.
- Tablero: además de arrastrar, cada tarjeta tiene "Move left/right/up/down" en su menú (teclado y lectores de pantalla).
- `aria-live="polite"` en respuestas del copiloto, conteos de filtros y toasts.
- Bundle: escena y copiloto en chunks lazy; tablero inicial < 250 KB gz sin la escena.
- Tabla: 403 filas, paginar de 50; `key` = `${program}:${test_id}` (+índice solo en el duplicado 193F001).

## 8. Reparto de trabajo (por dependencia)
| Paquete | Contenido | Depende | Prioridad |
|---|---|---|---|
| A · Base | Vite, deps, tokens, types+schemas, DataProvider, stores, TopBar, hash routes | — | P0, primero |
| B · Kit | WidgetFrame, GlassPanel, chips, badges, Tooltip, Drawer, Toast, motion presets | A | P0 |
| C · Escena | FlameScene 3D + FallbackScene + anotaciones + zoom | A | P0 |
| D · Tablero | Board, 6 widgets del Starter, Gallery, CardMenu, ExpandedCard, Tour | A, B | P0 |
| E · Copiloto | Drawer, modo Low (reglas), acciones zod, conexión Ollama/API | A, B, D | P1 (Low es P0 para el demo) |
| F · Vistas | Explore (tabla+filtros+CSV), Coverage, Gaps | A, B | P1 |
Recorrido del demo que debe funcionar antes del congelamiento: primera vista → cambiar a Moon base → abrir tarjeta →
pedir al copiloto (Low) "compare heptane and methanol" → aparece la tarjeta con su fuente.

## 9. Calidad por PR
`npm run build` sin errores TS · checklists de `flame-design-system` §8 y `flame-data-viz` §7 · tests (Vitest) mínimos
de `honesty.ts` y de `copilot/actions.ts` (una acción inválida se rechaza) · bitácora en `docs/AI_USAGE_LOG.md`.
