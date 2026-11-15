---
name: flame-dashboard-builder
description: Use when building the Flame in Freefall first-run view, cards (widgets), dashboard customization (add, move, resize, change chart, color-by, presets) or the SI copilot drawer that builds the dashboard from chat (Ollama/API with a Low rules-based fallback). Defines the starter layout, card anatomy, widget catalog, CardSpec and the validated action contract.
---

# Flame in Freefall · Tablero personalizable y copiloto SI

Objetivo: **en 10 segundos cualquier persona sabe qué es esto, qué está viendo y qué puede hacer**; después, cada quien
arma su tablero (como Power BI) a mano o pidiéndoselo al copiloto SI. Visual: `flame-design-system`. Honestidad:
`flame-data-viz`. Código y librerías: `flame-react-frontend` (react-grid-layout, Motion, Zustand, Zod).

## 1. Primera vista ("Starter"): poco y claro
```
┌ Top bar ───────────────────────────────────────────────────────── [Customize] [Explorer|Engineer] ┐
│ ┌SI┐  Fire behaves differently in space.                                 ┌ What air are we … ┐ │
│ │ ✦│  Explore 403 NASA fire tests from the ISS and see what they           │ Moon base         │ │
│ │  │  say about spacecraft and Moon-base air.  [Take the 30-s tour]        │ O₂ ≥30% · ≤10.2psi│ │
│ └──┘  ┌ How many tests match this air? ┐        ( llama 3D )             │ 0 exact · 17 near │ │
│       │ ◔ 17 close · 0 exact           │                                 │ [Show 17 tests]   │ │
│       └────────────────────────────────┘                                 └───────────────────┘ │
│       ┌ What can't these data tell us? ┐                                                       │
│       │ ∅ No Moon-gravity fire data…   │                                                       │
│       └────────────────────────────────┘                                                       │
│  Choose an atmosphere:  (Earth/ISS) (●Moon base) (NASA lunar habitat) (Exploration) (Spacesuit)  │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Una frase de qué es** (arriba a la izquierda, sobre la escena), descartable; vuelve con "?" en la barra.
- **Tres tarjetas** como máximo + la escena + el selector de atmósfera. Nada más hasta que el usuario lo pida.
- **Tour de 3 pasos** (opcional, recordado en `tourDone`): 1) "Pick an atmosphere" → selector · 2) "See which NASA tests
  match it" → tarjeta de coincidencias · 3) "Add cards or ask the SI assistant" → Customize y pestaña SI.
  Globo con flecha, fondo atenuado, botones "Next" / "Skip". Sin modal que bloquee.

## 2. Anatomía de una tarjeta (igual en todas)
```
┌ [icono] How many tests match this air?          ⓘ  ⋯ ┐   ← título = pregunta en lenguaje común
│        ◔  17 close  ·  0 exact                       │   ← UNA visualización
│ None match exactly; 17 are within ±1% O₂, ±0.5 psi.  │   ← frase de lectura (1 línea)
│ FLEX · PSI-69                                n = 17  │   ← fuente + n
└──────────────────────────────────────────────────────┘
```
- `ⓘ` voltea la tarjeta: "How to read this" (2–3 frases, Explorer/Engineer) + qué datos usa.
- `⋯` menú: Change chart · Color by · Filters · Size (S/M/L) · Expand · Duplicate · Move (←↑↓→) · Remove.
- Clic en el cuerpo → **Expand**: la tarjeta crece a modal (`layoutId`) con la vista grande, tabla de datos y "Open in Explore".
- Estados: loading (skeleton del tamaño final) · empty (qué filtro quitar) · no data (rayado + motivo) · error (+ Retry).
- Tamaños en el grid de 12 columnas: S = 3×2, M = 4×3, L = 6×4. Badge "Added by SI" en las que creó el copiloto.

## 3. Catálogo de tarjetas (`widgets/registry.ts`)
| type | Pregunta (título por defecto) | Datos | Vistas (default primero) | Tamaño | Parámetros |
|---|---|---|---|---|---|
| `scenario_inspector` | What air are we looking at? | scenarios.json | inspector | L | scenarioId |
| `scenario_match` | How many tests match this air? | scenarios.json | ring · big | S | scenarioId |
| `outcomes` | How did those tests end? | scenarios.json (`near.n_by_outcome`) | bars · ring | M | scenarioId |
| `burning_rate` | Does more oxygen make fuel burn faster? | coverage.json (por nivel de presión) | line · bars | M | fuel(both), pressureLevel(~1.0 atm) |
| `coverage` | Which conditions were tested? | coverage.json | heatmap · radar | M/L | fuel, metric(n·burning rate) |
| `materials` | Which solid materials were shown to burn? | materials.json | bars | M | — |
| `gaps` | What can't these data tell us? | gaps.json | list | M | limit |
| `tests_scatter` | Every test: oxygen vs burning rate | experiments.json | scatter | L | program, colorBy(fuel·outcome) |
| `tests_table` | Browse the tests | experiments.json | table | L | filters |
| `answer` | (la pregunta respondida) | answers.json / respuesta del copiloto | text · big | S/M | answerId |
| `kpi` | Dataset at a glance | meta · materials · coverage | ring | S | metric(tests_total·outcome_stated·conditions_tested) |
Agregar un tipo = una fila aquí + un componente en `widgets/`. Si necesita una cifra que no está en los JSON, primero
se agrega en Python (regla 3 de `flame-react-frontend`).

```ts
type WidgetType = 'scenario_inspector'|'scenario_match'|'outcomes'|'burning_rate'|'coverage'|'materials'
  |'gaps'|'tests_scatter'|'tests_table'|'answer'|'kpi';
type ViewType = 'inspector'|'ring'|'big'|'bars'|'line'|'heatmap'|'radar'|'scatter'|'table'|'list'|'text';
interface CardSpec {
  id: string; type: WidgetType; view: ViewType; size: 'S'|'M'|'L';
  title?: string;                                   // por defecto, la pregunta del catálogo
  params: { scenarioId?: Scenario['id']; fuel?: Fuel|'both'; program?: Program; pressureLevel?: PressureLevel;
            colorBy?: 'fuel'|'program'|'outcome'; metric?: string; answerId?: string; limit?: number };
  addedBy: 'preset'|'user'|'si';
}
```

## 4. Personalizar (modo Customize)
- Botón **Customize** en la barra → modo edición: aparecen manijas de arrastre y redimensión, el `⋯` queda fijo,
  huecos libres muestran "+ Add card". **Done** sale del modo. Fuera del modo, las tarjetas no se mueven por accidente.
- **Galería** (drawer derecho, 380px): buscador + grupos *Start here* · *Compare* · *Coverage & gaps* · *Raw tests*.
  Cada entrada = pregunta + mini vista previa con datos reales. Clic = se añade al primer hueco; o arrastrar al tablero.
- **Change chart** solo ofrece las vistas permitidas de su tipo. **Color by** elige variable (combustible, programa,
  resultado), nunca colores libres (`flame-data-viz` §4).
- **Presets**: *Starter* (default) · *Engineer* (coverage heatmap, burning_rate, outcomes, tests_scatter, materials, gaps)
  · *Moon-base story* (inspector, scenario_match, outcomes, gaps, answer q10). "Save as my view" guarda el actual.
- **Límite anti-saturación**: 9 tarjetas en el tablero; al llegar: "Your board is full. Remove or expand a card."
- El **centro de la escena está reservado** (ítem estático invisible del grid). "Focus" (tecla F) oculta las tarjetas.
- Undo (Ctrl+Z y toast) para añadir, quitar, mover y cambios del copiloto. Persistencia local; "Reset to Starter".

## 5. Copiloto SI (drawer izquierdo)
```
┌ ✦ SI assistant ─────────────────── Low ▾  ⨯ ┐
│ Answers only from these NASA data.          │
│ ┌ You ───────────────────────────────────┐  │
│ │ Compare heptane and methanol burn rates │  │
│ └─────────────────────────────────────────┘  │
│ Heptane burns faster in every O₂ band…      │
│ ⚙ Adding card: "Does more oxygen make…"  ✓  │  ← acción visible, con estado
│ [FLEX · PSI-69] [n per band ▾]               │  ← citas
│ ☑ Build my board automatically               │
│ [ Ask about the data…                    ➤ ] │
│ Try: (What changes on a Moon base?) (…)      │
└──────────────────────────────────────────────┘
```
- Se abre con la pestaña ✦ del borde izquierdo o al enfocar "Ask SI" de la barra. Desliza 420ms; el tablero no se
  reacomoda, el drawer flota sobre la zona A.
- **Build my board automatically** (activado por defecto): las acciones se aplican al momento con la animación de
  "añadir" y el toast "Added by SI · Undo". Desactivado: cada acción aparece como propuesta con vista previa y "Add".
- Respuestas en streaming; cada acción se muestra como chip "⚙ Adding card…" → "✓ Added" o "✕ Not possible: <motivo>".
- Niveles: **Low** (sin LLM, siempre disponible, es el del enlace público) · **Medium/High** (Ollama vía backend).
  Si el backend no responde en 15 s o da 503 → vuelve a Low con aviso "The SI model is offline. Using quick answers (Low)."

### Contrato de acciones (el LLM nunca escribe cifras ni SQL)
El modelo solo devuelve acciones; Zod las valida contra el catálogo; las cifras las pone cada tarjeta desde los datos.
```ts
type CopilotAction =
  | { type: 'answer'; text: string; citations: Citation[]; no_data: boolean }
  | { type: 'add_card'; card: Omit<CardSpec,'id'|'addedBy'> }
  | { type: 'update_card'; id: string; patch: Partial<Pick<CardSpec,'view'|'size'|'params'|'title'>> }
  | { type: 'remove_card'; id: string }
  | { type: 'set_scenario'; scenarioId: Scenario['id'] }
  | { type: 'focus_scene'; level: 'chamber'|'flame'|'droplet' };
```
- Acción inválida (tipo/vista/parámetro fuera del catálogo) → se rechaza y se muestra el motivo; nunca se "adivina".
- `answer.text` con números debe traer citas (`test_ids`/DOI); si no, se muestra solo la tarjeta, no el texto.
- Backend: `POST /api/ask` añade `actions: CopilotAction[]` a su respuesta (**cambio de contrato**: PR a
  `docs/07-api-contract.md` marcado PROVISIONAL, avisando a Yael/Charly). El navegador no llama a Ollama directo.
- Prompt del sistema (en backend): rol, catálogo de tipos/vistas/params, "answer only from tools", "no live or
  current-day data exists", "no partial-gravity data", formato JSON de acciones.

### Modo Low (reglas, `copilot/lowMode.ts`)
| Si la pregunta menciona… | Acciones |
|---|---|
| Moon / lunar base / habitat | `set_scenario lunar_challenge` + `add_card scenario_match` + `add_card outcomes` + answer q03 |
| heptane, methanol, burn faster | `add_card burning_rate {fuel:'both'}` + answer q06 |
| CO₂, helium, suppress, put out | `add_card answer {answerId:'q08'}` (con advertencia descriptiva) |
| material, PMMA, fabric, BASS | `add_card materials` + answer q09 |
| coverage, tested, conditions | `add_card coverage {view:'heatmap'}` |
| lunar gravity, Mars gravity, partial | answer q10 (`no_data`) + `add_card gaps` |
| today, now, latest, live, real time | answer `no_data`: "These are archived ISS experiments; there is no live data." |
| suit, spacesuit / exploration atmosphere | `set_scenario suit` / `exploration` + answer q05 / q04 (`no_data`) |
| nada coincide | "No quick answer for that. Try one of these:" + 3 sugerencias |

## 6. Checklist
- [ ] Primera vista: 1 frase + ≤3 tarjetas + escena + selector; se entiende sin el tour.
- [ ] Cada tarjeta: pregunta, una vista, frase de lectura, fuente y n; `ⓘ` y `⋯` funcionan con teclado.
- [ ] Añadir/mover/redimensionar/quitar con ratón **y** teclado; Undo funciona; límite de 9.
- [ ] Copiloto: Low funciona sin red; acciones inválidas se rechazan con motivo; "today/live" responde no_data.
- [ ] Animaciones según `flame-design-system` §5; reducidas respetadas.
